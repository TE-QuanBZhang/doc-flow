"""Document Engine - FastAPI service for template parsing and generation."""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.core.template_parser import parse_template, validate_template_structure
from app.core.renderer import generate_document_with_result, detect_unresolved_placeholders
from app.core.html_renderer import render_to_html
from app.core.pdf_converter import convert_to_pdf

app = FastAPI(title="Doc Flow Engine", version="0.1.0")


class GenerateRequest(BaseModel):
    template_path: str
    variables: dict
    output_path: str


class ParseRequest(BaseModel):
    template_path: str


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "document-engine"}


@app.post("/parse")
def parse_template_endpoint(req: ParseRequest):
    """Parse a template and extract variables and structure."""
    try:
        result = parse_template(req.template_path)
        errors = validate_template_structure(req.template_path)
        return {
            "variables": [v.name for v in result.variables],
            "has_condition_blocks": result.has_condition_blocks,
            "has_loop_blocks": result.has_loop_blocks,
            "block_count": result.block_count,
            "errors": errors,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/generate")
def generate_document_endpoint(req: GenerateRequest):
    """Generate a document from a template with variable values."""
    try:
        result = generate_document_with_result(req.template_path, req.variables, req.output_path)
        unresolved = detect_unresolved_placeholders(result.output_path)
        return {
            "output_path": result.output_path,
            "render_mode_used": result.render_mode,
            "warnings": result.warnings,
            "unresolved_placeholders": unresolved,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/preview")
def preview_document(req: ParseRequest):
    """Generate HTML preview of a document."""
    try:
        html = render_to_html(req.template_path)
        return {"html": html}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/validate")
def validate_template(req: ParseRequest):
    """Validate template structure and syntax."""
    try:
        errors = validate_template_structure(req.template_path)
        return {"valid": len(errors) == 0, "errors": errors}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
