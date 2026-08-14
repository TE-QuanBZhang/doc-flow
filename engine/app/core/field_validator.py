"""Field schema validator - validates LLM-generated content against field schemas."""

import re
from typing import Any

from .models import FieldSchema, FieldSchemaSet, FieldType


class ValidationError(Exception):
    """Raised when field validation fails."""

    def __init__(self, field: str, reason: str):
        self.field = field
        self.reason = reason
        super().__init__(f"[{field}] {reason}")


class ValidationResult:
    """Result of a field validation operation."""

    def __init__(self):
        self.errors: list[ValidationError] = []
        self.warnings: list[str] = []
        self.validated_data: dict[str, Any] = {}

    @property
    def is_valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, field: str, reason: str) -> None:
        self.errors.append(ValidationError(field, reason))

    def add_warning(self, msg: str) -> None:
        self.warnings.append(msg)


# ─── 3.2 Field-level Validation ──────────────────────────────

def validate_field(value: Any, schema: FieldSchema) -> list[str]:
    """Validate a single field value against its schema. Returns list of error messages."""
    errors: list[str] = []

    # Required check
    if schema.required and (value is None or value == ""):
        errors.append(f"必填字段 '{schema.name}' 缺少值")
        return errors

    # Optional empty is OK
    if value is None or value == "":
        return errors

    # Type check
    type_errors = _check_type(value, schema.field_type)
    errors.extend(type_errors)

    # String constraints
    if schema.field_type == FieldType.STRING and isinstance(value, str):
        if schema.min_length is not None and len(value) < schema.min_length:
            errors.append(f"'{schema.name}' 长度不足: 最少 {schema.min_length} 字符")
        if schema.max_length is not None and len(value) > schema.max_length:
            errors.append(f"'{schema.name}' 超出长度限制: 最多 {schema.max_length} 字符")
        if schema.pattern and not re.match(schema.pattern, value):
            errors.append(f"'{schema.name}' 格式不匹配: {schema.pattern}")

    # Number constraints
    if schema.field_type == FieldType.NUMBER and isinstance(value, (int, float)):
        if schema.min_value is not None and value < schema.min_value:
            errors.append(f"'{schema.name}' 低于最小值: {schema.min_value}")
        if schema.max_value is not None and value > schema.max_value:
            errors.append(f"'{schema.name}' 超出最大值: {schema.max_value}")

    # Date format
    if schema.field_type == FieldType.DATE and isinstance(value, str):
        if schema.date_format:
            fmt = schema.date_format.replace("YYYY", r"\d{4}").replace("MM", r"\d{2}").replace("DD", r"\d{2}")
            if not re.match(f"^{fmt}$", value):
                errors.append(f"'{schema.name}' 日期格式不匹配: {schema.date_format}")

    # Enum check
    if schema.field_type == FieldType.ENUM and schema.enum_values:
        if str(value) not in schema.enum_values:
            errors.append(f"'{schema.name}' 值 '{value}' 不在允许范围内: {schema.enum_values}")

    return errors


def _check_type(value: Any, expected: FieldType) -> list[str]:
    """Check if value matches the expected field type."""
    if value is None:
        return []
    type_map = {
        FieldType.STRING: str,
        FieldType.NUMBER: (int, float),
        FieldType.DATE: str,
        FieldType.ENUM: (str,),
        FieldType.BOOLEAN: bool,
        FieldType.OBJECT: dict,
        FieldType.ARRAY: list,
    }
    expected_type = type_map.get(expected)
    if expected_type and not isinstance(value, expected_type):
        expected_name = expected_type.__name__ if hasattr(expected_type, '__name__') else 'number'
        return [f"'{expected}' 应为 {expected_name} 类型，实际为 {type(value).__name__}"]
    return []


# ─── 3.3 Banned Terms Check ─────────────────────────────────

def check_banned_terms(value: str, banned_terms: list[str]) -> list[str]:
    """Check if a string value contains any banned terms."""
    if not banned_terms or not isinstance(value, str):
        return []
    found = [term for term in banned_terms if term in value]
    return [f"包含禁用词: '{term}'" for term in found]


# ─── Full Validation Pipeline ────────────────────────────────

def validate_content(
    data: dict[str, Any],
    schema_set: FieldSchemaSet,
    global_banned_terms: list[str] | None = None,
) -> ValidationResult:
    """Validate LLM-generated content against a field schema set."""
    result = ValidationResult()
    global_banned = global_banned_terms or []
    field_map = {f.name: f for f in schema_set.fields}

    # Check for unknown fields
    for key in data:
        if key not in field_map and key != "_warnings":
            result.add_warning(f"未知字段: '{key}'")

    # Validate each field
    for field_schema in schema_set.fields:
        value = data.get(field_schema.name)

        # Type + constraint validation
        field_errors = validate_field(value, field_schema)
        for err in field_errors:
            result.add_error(field_schema.name, err)

        # Banned terms (for string fields)
        if isinstance(value, str):
            banned = list(set(global_banned + field_schema.banned_terms))
            term_errors = check_banned_terms(value, banned)
            for err in term_errors:
                result.add_error(field_schema.name, err)

        # Store validated value
        if field_schema.name not in [e.field for e in result.errors]:
            result.validated_data[field_schema.name] = value

    return result


# ─── 3.4 Auto-generate Schema from Template Variables ────────

def generate_schema_from_variables(
    template_id: str,
    variable_names: list[str],
) -> FieldSchemaSet:
    """Auto-generate a FieldSchemaSet from extracted variable names.
    
    All variables default to string type (most common in Word templates).
    Can be refined manually by template admin later.
    """
    schema_set = FieldSchemaSet(template_id=template_id)
    for var_name in variable_names:
        schema_set.fields.append(
            FieldSchema(
                name=var_name,
                field_type=FieldType.STRING,
                required=True,
                description=f"模板变量: {var_name}",
            )
        )
    return schema_set
