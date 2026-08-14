"""Template and template version schemas."""

import uuid
from datetime import datetime
from pydantic import BaseModel, field_validator
from typing import Any


class TemplateCreate(BaseModel):
    name: str
    description: str | None = None
    category: str | None = None
    tags: list[str] = []


class TemplateUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    status: str | None = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    description: str | None
    category: str | None
    tags: list[Any]
    status: str
    current_version: int
    format_fingerprint: str | None = None
    style_spec: dict | None = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator('id', 'created_by', mode='before')
    @classmethod
    def coerce_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v

    @field_validator('style_spec', mode='before')
    @classmethod
    def parse_style_spec(cls, v):
        """Handle both dict (new format) and string (old format) style_spec."""
        if isinstance(v, dict):
            return v
        if isinstance(v, str):
            # Old format: stored as str(spec) - not parseable JSON, skip
            return None
        return v


class TemplateVersionResponse(BaseModel):
    id: str
    template_id: str
    version_number: int
    change_description: str | None
    created_by: str
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator('id', 'template_id', 'created_by', mode='before')
    @classmethod
    def coerce_uuid(cls, v):
        if isinstance(v, uuid.UUID):
            return str(v)
        return v
