"""Data models for Word format extraction and field schema."""

from dataclasses import dataclass, field
from typing import Any, Optional
from enum import Enum


# ─── Page Setup ────────────────────────────────────────────────

@dataclass
class PageMargin:
    top_cm: float = 2.54
    bottom_cm: float = 2.54
    left_cm: float = 3.17
    right_cm: float = 3.17


@dataclass
class PageSetup:
    size: str = "A4"          # A4, Letter, A3, etc.
    orientation: str = "portrait"  # portrait or landscape
    margin: PageMargin = field(default_factory=PageMargin)
    header_distance_cm: float = 1.5
    footer_distance_cm: float = 1.75
    columns: int = 1


# ─── Style System ──────────────────────────────────────────────

@dataclass
class ParagraphStyle:
    font_cn: str = ""
    font_en: str = ""
    size_pt: float = 12.0
    bold: bool = False
    italic: bool = False
    color_hex: str = ""
    alignment: str = "left"       # left, center, right, justify
    first_line_indent_chars: int = 0
    line_spacing: float = 1.15    # multiplier
    space_before_pt: float = 0
    space_after_pt: float = 0
    keep_with_next: bool = False
    keep_lines: bool = False
    page_break_before: bool = False


@dataclass
class NumberingLevel:
    level: int = 0
    number_format: str = "decimal"  # decimal, upperRoman, lowerRoman, upperLetter, lowerLetter, bullet
    template: str = "%1."           # e.g. "%1.%2" for "1.1"
    start: int = 1
    indent_left_cm: float = 0
    indent_hanging_cm: float = 0.63
    font: str = ""
    size_pt: float = 12.0


@dataclass
class NumberingDefinition:
    abstract_num_id: int = 0
    levels: list[NumberingLevel] = field(default_factory=list)


# ─── Table Format ──────────────────────────────────────────────

@dataclass
class TableFormat:
    style_name: str = "Table Grid"
    header_bold: bool = True
    cell_padding_pt: float = 4.0
    border_size_pt: float = 0.5
    border_color_hex: str = "000000"
    shading_color_hex: str = ""
    column_width_strategy: str = "auto"  # auto, fixed, proportional


# ─── Header / Footer ───────────────────────────────────────────

@dataclass
class HeaderFooter:
    content: str = ""
    different_first_page: bool = False
    different_odd_even: bool = False
    page_number_format: str = "decimal"  # decimal, upperRoman, etc.
    page_number_include_total: bool = False


# ─── Complete Format Spec ──────────────────────────────────────

@dataclass
class StyleSpec:
    template_id: str = ""
    page: PageSetup = field(default_factory=PageSetup)
    styles: dict[str, ParagraphStyle] = field(default_factory=dict)
    numbering: list[NumberingDefinition] = field(default_factory=list)
    table: TableFormat = field(default_factory=TableFormat)
    header: HeaderFooter = field(default_factory=HeaderFooter)
    footer: HeaderFooter = field(default_factory=HeaderFooter)
    constraints: list[str] = field(default_factory=list)

    def fingerprint(self) -> str:
        """Generate a hash-based fingerprint of this format spec."""
        import hashlib
        import json
        raw = json.dumps(self, default=str, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()[:16]


# ─── Field Schema ──────────────────────────────────────────────

class FieldType(str, Enum):
    STRING = "string"
    NUMBER = "number"
    DATE = "date"
    ENUM = "enum"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"


@dataclass
class FieldSchema:
    name: str
    field_type: FieldType = FieldType.STRING
    required: bool = True
    default: Any = None
    description: str = ""
    # String / Number constraints
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    pattern: Optional[str] = None
    # Date format
    date_format: str = ""
    # Enum
    enum_values: list[str] = field(default_factory=list)
    enum_labels: dict[str, str] = field(default_factory=dict)
    # LLM hints
    llm_prompt: str = ""
    llm_tone: str = "formal"
    banned_terms: list[str] = field(default_factory=list)
    reference_example: str = ""


@dataclass
class FieldSchemaSet:
    """Collection of field schemas for a template."""
    template_id: str = ""
    fields: list[FieldSchema] = field(default_factory=list)
    version: str = "1.0.0"

    def to_json_schema(self) -> dict:
        """Convert to JSON Schema draft-07 for LLM output validation."""
        properties = {}
        required_fields = []
        for f in self.fields:
            prop = self._field_to_json_schema_property(f)
            properties[f.name] = prop
            if f.required:
                required_fields.append(f.name)
        schema = {
            "$schema": "http://json-schema.org/draft-07/schema#",
            "type": "object",
            "properties": properties,
        }
        if required_fields:
            schema["required"] = required_fields
        return schema

    @staticmethod
    def _field_to_json_schema_property(f: FieldSchema) -> dict:
        prop: dict[str, Any] = {"description": f.description}
        type_map = {
            FieldType.STRING: "string",
            FieldType.NUMBER: "number",
            FieldType.DATE: "string",
            FieldType.ENUM: "string",
            FieldType.BOOLEAN: "boolean",
            FieldType.OBJECT: "object",
            FieldType.ARRAY: "array",
        }
        prop["type"] = type_map.get(f.field_type, "string")
        if f.field_type == FieldType.DATE:
            prop["format"] = f.date_format or "date"
        if f.field_type == FieldType.ENUM and f.enum_values:
            prop["enum"] = f.enum_values
        if f.min_length is not None:
            prop["minLength"] = f.min_length
        if f.max_length is not None:
            prop["maxLength"] = f.max_length
        if f.min_value is not None:
            prop["minimum"] = f.min_value
        if f.max_value is not None:
            prop["maximum"] = f.max_value
        if f.pattern:
            prop["pattern"] = f.pattern
        return prop
