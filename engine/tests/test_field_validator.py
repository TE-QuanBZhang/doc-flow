"""Tests for field validator, prompt builder, and LLM generator."""

from app.core.models import (
    FieldSchema, FieldSchemaSet, FieldType,
)
from app.core.field_validator import (
    validate_field, validate_content, check_banned_terms,
    generate_schema_from_variables, ValidationResult,
)
from app.core.prompt_builder import (
    build_system_prompt, build_user_prompt, PromptVersion,
)


class TestFieldValidator:
    """Test field-level validation rules."""

    def test_required_field_missing(self):
        schema = FieldSchema(name="name", required=True)
        errors = validate_field(None, schema)
        assert len(errors) == 1
        assert "必填" in errors[0]

    def test_optional_field_empty_is_ok(self):
        schema = FieldSchema(name="name", required=False)
        errors = validate_field(None, schema)
        assert len(errors) == 0

    def test_string_max_length(self):
        schema = FieldSchema(name="summary", field_type=FieldType.STRING, max_length=5)
        errors = validate_field("太长了的文本", schema)
        assert len(errors) == 1
        assert "超出长度" in errors[0]

    def test_string_within_length(self):
        schema = FieldSchema(name="summary", field_type=FieldType.STRING, max_length=100)
        errors = validate_field("正常文本", schema)
        assert len(errors) == 0

    def test_number_range(self):
        schema = FieldSchema(name="amount", field_type=FieldType.NUMBER, min_value=0, max_value=1000)
        errors = validate_field(500, schema)
        assert len(errors) == 0

    def test_number_out_of_range(self):
        schema = FieldSchema(name="amount", field_type=FieldType.NUMBER, max_value=100)
        errors = validate_field(200, schema)
        assert len(errors) == 1

    def test_enum_valid(self):
        schema = FieldSchema(name="dept", field_type=FieldType.ENUM, enum_values=["HR", "Sales"])
        errors = validate_field("HR", schema)
        assert len(errors) == 0

    def test_enum_invalid(self):
        schema = FieldSchema(name="dept", field_type=FieldType.ENUM, enum_values=["HR", "Sales"])
        errors = validate_field("Engineering", schema)
        assert len(errors) == 1

    def test_type_mismatch(self):
        schema = FieldSchema(name="count", field_type=FieldType.NUMBER)
        errors = validate_field("not_a_number", schema)
        assert len(errors) == 1

    def test_date_format(self):
        schema = FieldSchema(name="date", field_type=FieldType.DATE, date_format="YYYY-MM-DD")
        errors = validate_field("2026-07-22", schema)
        assert len(errors) == 0

    def test_date_format_mismatch(self):
        schema = FieldSchema(name="date", field_type=FieldType.DATE, date_format="YYYY-MM-DD")
        errors = validate_field("07/22/2026", schema)
        assert len(errors) == 1

    def test_boolean_type(self):
        schema = FieldSchema(name="flag", field_type=FieldType.BOOLEAN)
        errors = validate_field(True, schema)
        assert len(errors) == 0
        errors = validate_field("true", schema)
        assert len(errors) == 1  # string not bool


class TestBannedTerms:
    """Test banned terms detection."""

    def test_no_banned_terms(self):
        errors = check_banned_terms("正常内容", ["禁用词A", "禁用词B"])
        assert len(errors) == 0

    def test_banned_term_detected(self):
        errors = check_banned_terms("这是最优方案", ["最优", "国家级"])
        assert len(errors) == 1
        assert "最优" in errors[0]

    def test_multiple_banned_terms(self):
        errors = check_banned_terms("国家级最优方案", ["最优", "国家级"])
        assert len(errors) == 2


class TestValidateContent:
    """Test full content validation pipeline."""

    def setup_method(self):
        self.schema_set = FieldSchemaSet(template_id="test-001")
        self.schema_set.fields = [
            FieldSchema(name="title", required=True, max_length=50),
            FieldSchema(name="amount", field_type=FieldType.NUMBER, min_value=0),
            FieldSchema(name="notes", required=False),
        ]

    def test_valid_content(self):
        data = {"title": "合同标题", "amount": 10000, "notes": "备注"}
        result = validate_content(data, self.schema_set)
        assert result.is_valid
        assert result.validated_data["title"] == "合同标题"

    def test_missing_required_field(self):
        data = {"title": "", "amount": 10000}
        result = validate_content(data, self.schema_set)
        assert not result.is_valid

    def test_unknown_field_warning(self):
        data = {"title": "标题", "amount": 100, "unknown_field": "值"}
        result = validate_content(data, self.schema_set)
        assert result.is_valid  # unknown fields don't fail
        assert len(result.warnings) > 0

    def test_banned_terms_global(self):
        data = {"title": "国家级最优项目"}
        result = validate_content(data, self.schema_set, global_banned_terms=["最优", "国家级"])
        assert not result.is_valid


class TestGenerateSchemaFromVariables:
    """Test auto-generation of schema from variable names."""

    def test_generates_schema(self):
        schema_set = generate_schema_from_variables("test-001", ["name", "date", "amount"])
        assert len(schema_set.fields) == 3
        assert all(f.field_type == FieldType.STRING for f in schema_set.fields)
        assert all(f.required for f in schema_set.fields)


class TestPromptBuilder:
    """Test prompt construction."""

    def test_system_prompt_contains_constraints(self):
        prompt = build_system_prompt()
        assert "JSON" in prompt
        assert "排版" in prompt
        assert "不得" in prompt

    def test_user_prompt_contains_schema(self):
        schema_set = FieldSchemaSet(template_id="test")
        schema_set.fields = [FieldSchema(name="name", required=True)]
        prompt = build_user_prompt(schema_set, "输入内容", tone="formal", max_length=200)
        assert "输入内容" in prompt
        assert "formal" in prompt or "正式" in prompt
        assert "name" in prompt

    def test_user_prompt_with_banned_terms(self):
        schema_set = FieldSchemaSet(template_id="test")
        schema_set.fields = [FieldSchema(name="title", required=True)]
        prompt = build_user_prompt(schema_set, "输入", banned_terms=["禁用词A"])
        assert "禁用词" in prompt


class TestPromptVersion:
    """Test prompt version tracking."""

    def test_version_string(self):
        assert PromptVersion.current() == "1.0.0"

    def test_metadata(self):
        meta = PromptVersion.get_metadata()
        assert "prompt_version" in meta
        assert "system_template_length" in meta
