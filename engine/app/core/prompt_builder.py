"""Prompt builder - constructs system and user prompts for LLM content generation."""

import json
from typing import Any

from .models import FieldSchemaSet, FieldType


SYSTEM_PROMPT_TEMPLATE = """你是企业文档内容生成助手。
你的职责是根据输入业务信息，生成"占位符字段对应的内容JSON"。
你不得输出Markdown、不得输出多余解释、不得改动字段名。

硬性规则：
1) 仅输出合法JSON对象。
2) 字段必须与给定schema完全一致，不得新增或缺失字段。
3) 不生成任何排版指令（如字体、字号、标题样式）。
4) 遵循长度限制、语气要求、合规要求。
5) 若信息不足，对可选字段使用空字符串，并在"_warnings"中说明原因。
6) 禁止使用代码块包裹JSON。
7) 输出前先自检字段完整性。"""

USER_PROMPT_TEMPLATE = """任务：为Word模板填充字段内容。

[字段Schema]
{schema_json}

[业务输入]
{business_input}

[写作约束]
- 语气：{tone}
- 每段不超过{max_length}字
{ban_terms_section}

请返回JSON，字段如下：
{schema_fields}"""


def build_system_prompt() -> str:
    """Build the system prompt with constraints for JSON-only output."""
    return SYSTEM_PROMPT_TEMPLATE.strip()


def build_user_prompt(
    schema_set: FieldSchemaSet,
    business_input: str,
    tone: str = "formal",
    max_length: int = 500,
    banned_terms: list[str] | None = None,
) -> str:
    """Build the user prompt embedding field schema and business input."""
    schema_json = json.dumps(schema_set.to_json_schema(), indent=2, ensure_ascii=False)
    field_names = [f.name for f in schema_set.fields]

    ban_terms_section = ""
    if banned_terms:
        ban_terms_section = f"- 禁用词：{json.dumps(banned_terms, ensure_ascii=False)}"

    return USER_PROMPT_TEMPLATE.format(
        schema_json=schema_json,
        business_input=business_input,
        tone=tone,
        max_length=max_length,
        ban_terms_section=ban_terms_section,
        schema_fields=json.dumps({f: f"<{f}值>" for f in field_names}, indent=2, ensure_ascii=False),
    )


# ─── 4.5 Prompt Versioning ──────────────────────────────────

class PromptVersion:
    """Track prompt template versions for audit trail."""
    _version = "1.0.0"

    @classmethod
    def current(cls) -> str:
        return cls._version

    @classmethod
    def get_metadata(cls) -> dict:
        return {
            "prompt_version": cls._version,
            "system_template_length": len(SYSTEM_PROMPT_TEMPLATE),
            "user_template_length": len(USER_PROMPT_TEMPLATE),
        }
