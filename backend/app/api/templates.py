"""Template management API routes."""

import json
import logging
import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.template import TemplateCreate, TemplateUpdate, TemplateResponse, TemplateVersionResponse
from app.models.template import Template, TemplateStatus, TemplateVersion
from app.models.user import User
from app.api.deps import get_current_user
from app.services.storage import template_storage
from app.core.config import settings

logger = logging.getLogger("docflow.templates")

router = APIRouter(prefix="/api/templates", tags=["templates"])


@router.post("", response_model=TemplateResponse, status_code=201)
def upload_template(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(""),
    category: str = Form(""),
    tags: str = Form("[]"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a new Word template."""
    logger.info("[UPLOAD] Step 1: Request received - filename=%s, name=%s, user=%s",
                file.filename, name, current_user.id)

    if not file.filename or not file.filename.endswith(".docx"):
        logger.warning("[UPLOAD] Rejected: invalid file format - %s", file.filename)
        raise HTTPException(status_code=400, detail="仅支持 .docx 格式的模板文件")

    # Validate file size
    logger.info("[UPLOAD] Step 2: Reading file content")
    content = file.file.read()
    logger.info("[UPLOAD] File size: %d bytes", len(content))

    if len(content) > settings.MAX_UPLOAD_SIZE:
        logger.warning("[UPLOAD] Rejected: file too large - %d bytes", len(content))
        raise HTTPException(status_code=400, detail="文件大小超过限制 (50MB)")

    # Save file
    logger.info("[UPLOAD] Step 3: Saving file to storage")
    tags_list = json.loads(tags)
    file_path = template_storage.save("", file.filename, content)
    logger.info("[UPLOAD] File saved - path=%s", file_path)

    # Create template record
    logger.info("[UPLOAD] Step 4: Creating database record")
    template = Template(
        name=name,
        description=description,
        category=category,
        tags=tags_list,
        status=TemplateStatus.DRAFT,
        file_path=file_path,
        created_by=current_user.id,
    )
    db.add(template)
    db.commit()
    db.refresh(template)
    logger.info("[UPLOAD] Template created - id=%s", template.id)

    # Run format extraction
    logger.info("[UPLOAD] Step 5: Running format extraction")
    style_count = 0
    try:
        from dataclasses import asdict
        from engine.app.core.extractor import extract_format
        full_path = template_storage.get_full_path(file_path)
        logger.info("[UPLOAD] Extracting from: %s", full_path)
        spec = extract_format(full_path)
        template.format_fingerprint = spec.fingerprint()
        spec_dict = asdict(spec)
        template.style_spec = json.loads(json.dumps(spec_dict, default=str))
        style_count = len(spec.styles)
        logger.info("[UPLOAD] Format extraction complete - fingerprint=%s, styles=%d",
                    template.format_fingerprint, style_count)
    except Exception as e:
        logger.warning("[UPLOAD] Format extraction skipped: %s", str(e))

    # Create initial version
    logger.info("[UPLOAD] Step 6: Creating initial version")
    version = TemplateVersion(
        template_id=template.id,
        version_number=1,
        file_path=file_path,
        format_fingerprint=template.format_fingerprint,
        change_description="初始版本",
        created_by=current_user.id,
    )
    db.add(version)
    db.commit()

    logger.info("[UPLOAD] Step 7: Upload complete - template_id=%s", template.id)
    return template


@router.get("", response_model=list[TemplateResponse])
def list_templates(
    category: str | None = Query(None),
    search: str | None = Query(None),
    status: str | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List templates with optional filtering."""
    query = db.query(Template)

    if category:
        query = query.filter(Template.category == category)
    if status:
        query = query.filter(Template.status == status)
    if search:
        query = query.filter(Template.name.ilike(f"%{search}%"))

    return query.order_by(Template.updated_at.desc()).all()


@router.get("/{template_id}", response_model=TemplateResponse)
def get_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get template details."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    return template


@router.get("/{template_id}/preview")
def preview_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get HTML preview of a template document."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")

    full_path = template_storage.get_full_path(template.file_path)
    logger.info("[PREVIEW] Rendering template to HTML: %s", full_path)

    try:
        from engine.app.core.html_renderer import render_to_html
        html = render_to_html(full_path)
        return {"html": html}
    except Exception as e:
        logger.error("[PREVIEW] Failed to render template: %s", str(e))
        raise HTTPException(status_code=500, detail=f"模板预览渲染失败: {str(e)}")


@router.put("/{template_id}", response_model=TemplateResponse)
def update_template(
    template_id: str,
    update: TemplateUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update template metadata or status."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)
    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a template."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    db.delete(template)
    db.commit()


@router.get("/{template_id}/versions", response_model=list[TemplateVersionResponse])
def get_template_versions(
    template_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get version history for a template."""
    return db.query(TemplateVersion).filter(
        TemplateVersion.template_id == template_id
    ).order_by(TemplateVersion.version_number.desc()).all()


@router.post("/{template_id}/versions/{version_id}/rollback", response_model=TemplateResponse)
def rollback_template(
    template_id: str,
    version_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rollback template to a previous version."""
    template = db.query(Template).filter(Template.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")

    version = db.query(TemplateVersion).filter(
        TemplateVersion.id == version_id,
        TemplateVersion.template_id == template_id,
    ).first()
    if not version:
        raise HTTPException(status_code=404, detail="版本不存在")

    # Create new version from the rollback target
    new_version = TemplateVersion(
        template_id=template_id,
        version_number=template.current_version + 1,
        file_path=version.file_path,
        change_description=f"回滚至版本 {version.version_number}",
        created_by=current_user.id,
    )
    template.file_path = version.file_path
    template.current_version += 1
    db.add(new_version)
    db.commit()
    db.refresh(template)
    return template
