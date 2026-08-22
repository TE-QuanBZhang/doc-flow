"""Document generation API routes."""

import json
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.models.template import Template, TemplateStatus
from app.models.document import Document, DocumentStatus
from app.models.task import BatchTask, BatchTaskStatus, BatchTaskItem
from app.models.user import User
from app.api.deps import get_current_user
from app.services.storage import document_storage, import_storage, template_storage
from app.core.config import settings
from engine.app.core.renderer import generate_document, generate_document_with_result, detect_unresolved_placeholders
from engine.app.core.html_renderer import render_to_html

router = APIRouter(prefix="/api/documents", tags=["documents"])


class GenerateRequest(BaseModel):
    template_id: str
    title: str | None = None
    variables: dict


class GeneratePreservingRequest(BaseModel):
    """Generate document via in-place replacement, preserving all formatting."""
    template_id: str
    title: str | None = None
    variables: dict = {}
    table_data: dict[str, list[list]] | None = None
    image_map: dict[str, str] | None = None  # placeholder -> base64 data URI or file path
    object_map: dict[str, str] | None = None


class GenerateWithLLMRequest(BaseModel):
    template_id: str
    title: str | None = None
    business_input: str
    tone: str = "formal"
    max_length: int = 500
    banned_terms: list[str] | None = None


class SaveDraftRequest(BaseModel):
    template_id: str
    title: str | None = None
    variables: dict
    document_id: str | None = None


@router.post("/drafts")
def save_draft(
    req: SaveDraftRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Save document as draft (without generating the actual file)."""
    if req.document_id:
        doc = db.query(Document).filter(Document.id == req.document_id, Document.created_by == current_user.id).first()
        if not doc:
            raise HTTPException(status_code=404, detail="草稿不存在")
        doc.variable_values = req.variables
        if req.title:
            doc.title = req.title
        doc.updated_at = datetime.utcnow()
        db.commit()
        return {"id": str(doc.id), "status": "draft_updated"}
    else:
        doc = Document(
            title=req.title or f"草稿_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
            template_id=req.template_id,
            template_version=1,
            status=DocumentStatus.DRAFT,
            variable_values=req.variables,
            created_by=current_user.id,
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        return {"id": str(doc.id), "status": "draft_created"}


@router.post("/generate")
def generate_single_document(
    req: GenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a single document from a template."""
    template = db.query(Template).filter(Template.id == req.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    if template.status != TemplateStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="模板未发布")

    # Generate document
    template_full_path = template_storage.get_full_path(template.file_path)
    output_filename = f"{uuid.uuid4().hex}.docx"
    output_rel_path = document_storage.save("", output_filename, b"")

    # Generate the actual document using unified pipeline (preserve mode first)
    output_full_path = document_storage.get_full_path(output_rel_path)
    render_result = generate_document_with_result(template_full_path, req.variables, output_full_path)

    # Check for unresolved placeholders
    unresolved = detect_unresolved_placeholders(output_full_path)

    # Run quality check
    quality = None
    try:
        from engine.app.core.quality_checker import run_quality_check
        quality = run_quality_check(template_full_path, output_full_path)
    except Exception:
        pass

    # Create document record
    doc = Document(
        title=req.title or f"文档_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        template_id=template.id,
        template_version=template.current_version,
        status=DocumentStatus.DRAFT,
        variable_values=req.variables,
        file_path=output_rel_path,
        quality_report=quality.to_dict() if quality else None,
        created_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id": str(doc.id),
        "title": doc.title,
        "status": doc.status.value,
        "render_mode_used": render_result.render_mode,
        "warnings": render_result.warnings,
        "unresolved_placeholders": unresolved,
        "quality": quality.to_dict() if quality else None,
    }


@router.post("/generate-preserving")
def generate_preserving_format(
    req: GeneratePreservingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a document via in-place replacement, preserving all formatting.

    Text/tables/images/OLE objects are replaced in-place without rebuilding the
    document, so all formatting (fonts, image geometry, table style) is preserved.
    """
    template = db.query(Template).filter(Template.id == req.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    if template.status != TemplateStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="模板未发布")

    from engine.app.core.renderer import generate_document_preserving_format

    template_full_path = template_storage.get_full_path(template.file_path)
    output_filename = f"{uuid.uuid4().hex}.docx"
    output_rel_path = document_storage.save("", output_filename, b"")
    output_full_path = document_storage.get_full_path(output_rel_path)

    # Decode base64 image data URIs into bytes
    image_map = None
    if req.image_map:
        image_map = {}
        for key, value in req.image_map.items():
            image_map[key] = _decode_image_value(value)

    try:
        generate_document_preserving_format(
            template_path=template_full_path,
            output_path=output_full_path,
            variables=req.variables or {},
            table_data=req.table_data,
            image_map=image_map,
            object_map=req.object_map,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"保格式生成失败: {str(e)}")

    # Check for unresolved placeholders
    unresolved = detect_unresolved_placeholders(output_full_path)

    doc = Document(
        title=req.title or f"文档_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        template_id=template.id,
        template_version=template.current_version,
        status=DocumentStatus.DRAFT,
        variable_values=req.variables or {},
        file_path=output_rel_path,
        created_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id": str(doc.id),
        "title": doc.title,
        "status": doc.status.value,
        "mode": "preserving",
        "unresolved_placeholders": unresolved,
    }


def _decode_image_value(value: str) -> bytes:
    """Decode a base64 data URI into bytes, or return the value as a file path."""
    import base64
    if value.startswith('data:'):
        try:
            b64_data = value.split(',', 1)[1]
            return base64.b64decode(b64_data)
        except Exception:
            pass
    # Assume file path
    return value


@router.post("/generate-with-llm")
def generate_with_llm(
    req: GenerateWithLLMRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a document with LLM-assisted field content."""
    template = db.query(Template).filter(Template.id == req.template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    if template.status != TemplateStatus.PUBLISHED:
        raise HTTPException(status_code=400, detail="模板未发布")

    try:
        from engine.app.core.llm_generator import generate_field_values, is_llm_configured
        from engine.app.core.models import FieldSchemaSet, FieldSchema, FieldType
        from engine.app.core.prompt_builder import PromptVersion
        from engine.app.core.renderer import generate_document, detect_unresolved_placeholders
        from engine.app.core.quality_checker import run_quality_check
    except ImportError as e:
        raise HTTPException(status_code=500, detail=f"引擎模块加载失败: {e}")

    if not is_llm_configured():
        raise HTTPException(status_code=400, detail="LLM 未配置: 请设置 DEEPSEEK_API_KEY 环境变量")

    # Build schema from template variables
    from app.models.variable import TemplateVariable
    variables_db = db.query(TemplateVariable).filter(
        TemplateVariable.template_id == template.id
    ).all()

    schema_set = FieldSchemaSet(template_id=str(template.id))
    for v in variables_db:
        schema_set.fields.append(
            FieldSchema(
                name=v.name,
                field_type=FieldType.STRING,
                required=True,
                description=v.description or f"模板变量: {v.name}",
            )
        )

    if not schema_set.fields:
        raise HTTPException(status_code=400, detail="模板没有定义的变量，无需 LLM 生成")

    # Call LLM
    result = generate_field_values(
        schema_set=schema_set,
        business_input=req.business_input,
        tone=req.tone,
        max_length=req.max_length,
        banned_terms=req.banned_terms,
    )

    if not result.success:
        raise HTTPException(status_code=500, detail=f"LLM 生成失败: {result.error}")

    # Generate document with LLM-produced values
    template_full_path = template_storage.get_full_path(template.file_path)
    output_filename = f"{uuid.uuid4().hex}.docx"
    output_rel_path = document_storage.save("", output_filename, b"")
    output_full_path = document_storage.get_full_path(output_rel_path)

    generate_document(template_full_path, result.data, output_full_path)
    unresolved = detect_unresolved_placeholders(output_full_path)

    # Quality check
    quality = None
    try:
        quality = run_quality_check(template_full_path, output_full_path)
    except Exception:
        pass

    # Create document record
    doc = Document(
        title=req.title or f"文档_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}",
        template_id=template.id,
        template_version=template.current_version,
        status=DocumentStatus.DRAFT,
        variable_values=result.data,
        file_path=output_rel_path,
        quality_report=quality.to_dict() if quality else None,
        created_by=current_user.id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    return {
        "id": str(doc.id),
        "title": doc.title,
        "status": doc.status.value,
        "llm_generated_fields": result.data,
        "prompt_version": result.prompt_version,
        "llm_model": result.model,
        "unresolved_placeholders": unresolved,
        "quality": quality.to_dict() if quality else None,
    }


@router.get("/{document_id}")
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get document details."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="文档不存在")
    return {
        "id": str(doc.id),
        "title": doc.title,
        "template_id": str(doc.template_id),
        "template_version": doc.template_version,
        "status": doc.status.value,
        "variable_values": doc.variable_values,
        "file_path": doc.file_path,
        "quality_report": doc.quality_report,
        "created_by": str(doc.created_by),
        "created_at": doc.created_at.isoformat() if doc.created_at else None,
        "updated_at": doc.updated_at.isoformat() if doc.updated_at else None,
    }


@router.get("/{document_id}/preview")
def preview_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get HTML preview of a document."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.file_path:
        raise HTTPException(status_code=404, detail="文档不存在或未生成")

    full_path = document_storage.get_full_path(doc.file_path)
    html = render_to_html(full_path)
    return {"html": html}


@router.get("/{document_id}/export/word")
def export_word(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export document as Word (.docx) file."""
    from fastapi.responses import FileResponse

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.file_path:
        raise HTTPException(status_code=404, detail="文档不存在")

    full_path = document_storage.get_full_path(doc.file_path)
    return FileResponse(
        full_path,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=f"{doc.title or 'document'}.docx",
    )


@router.get("/{document_id}/export/pdf")
def export_pdf(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export document as PDF."""
    from fastapi.responses import FileResponse

    from engine.app.core.pdf_converter import convert_to_pdf

    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc or not doc.file_path:
        raise HTTPException(status_code=404, detail="文档不存在")

    docx_path = document_storage.get_full_path(doc.file_path)

    import tempfile
    import os
    with tempfile.TemporaryDirectory() as tmpdir:
        try:
            pdf_path = convert_to_pdf(docx_path, tmpdir)
            filename = f"{doc.title or 'document'}.pdf"
            return FileResponse(pdf_path, media_type="application/pdf", filename=filename)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF 转换失败: {str(e)}")


@router.post("/export/batch-zip")
def batch_export_zip(
    document_ids: list[str],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export multiple documents as a ZIP package."""
    import zipfile
    import io
    from fastapi.responses import StreamingResponse

    documents = db.query(Document).filter(
        Document.id.in_(document_ids),
        Document.created_by == current_user.id,
        Document.file_path.isnot(None),
    ).all()

    if not documents:
        raise HTTPException(status_code=404, detail="未找到可导出的文档")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for doc in documents:
            full_path = document_storage.get_full_path(doc.file_path)
            arcname = f"{doc.title or 'document'}.docx"
            zf.write(full_path, arcname)

    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=documents_{datetime.utcnow().strftime('%Y%m%d')}.zip"},
    )
