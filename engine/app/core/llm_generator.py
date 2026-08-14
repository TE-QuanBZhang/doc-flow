"""LLM content generator - calls DeepSeek API (OpenAI-compatible) to generate field values.

Supports Function Calling for structured JSON output, auto-retry on validation
failure, and configurable provider switching.
"""

import json
import os
import time
from typing import Any, Optional

from .models import FieldSchemaSet
from .field_validator import ValidationResult, validate_content, generate_schema_from_variables
from .prompt_builder import build_system_prompt, build_user_prompt, PromptVersion


# ─── Configuration ───────────────────────────────────────────

def get_llm_config() -> dict:
    """Get LLM configuration from settings service (.env) with env fallback.

    Priority: SIRCHMUNK_WORK_PATH/.env (settings service) > environment variables.
    """
    saved = _saved_llm_settings()
    return {
        "api_key": saved.get("api_key") or os.getenv("DEEPSEEK_API_KEY", ""),
        "api_base": saved.get("api_base") or os.getenv("LLM_API_BASE", "https://api.deepseek.com/v1"),
        "model": saved.get("model") or os.getenv("LLM_MODEL", "deepseek-chat"),
        "temperature": float(os.getenv("LLM_TEMPERATURE", "0.3")),
        "max_tokens": int(os.getenv("LLM_MAX_TOKENS", "4096")),
    }


def _saved_llm_settings() -> dict:
    """Read LLM settings saved by the settings service (~/.sirchmunk/.env)."""
    try:
        from dotenv import dotenv_values
    except ImportError:
        return {}
    work_path = os.getenv("SIRCHMUNK_WORK_PATH", os.path.expanduser("~/.sirchmunk"))
    env = dotenv_values(os.path.join(work_path, ".env"))
    return {
        "api_key": env.get("LLM_API_KEY", ""),
        "api_base": env.get("LLM_BASE_URL", ""),
        "model": env.get("LLM_MODEL_NAME", ""),
    }


def is_llm_configured() -> bool:
    """Check if LLM is configured with an API key."""
    config = get_llm_config()
    return bool(config["api_key"])


# ─── 4.3 DeepSeek API Call ──────────────────────────────────

def _call_llm_api(
    system_prompt: str,
    user_prompt: str,
    json_schema: dict,
    config: dict,
) -> Optional[str]:
    """Call the LLM API with Function Calling for structured output.
    
    Uses OpenAI-compatible API (DeepSeek by default).
    Returns raw response text, or None on failure.
    """
    try:
        from openai import OpenAI
    except ImportError:
        raise ImportError("openai package required. Install: pip install openai")

    client = OpenAI(
        api_key=config["api_key"],
        base_url=config["api_base"],
    )

    # Use Function Calling to enforce JSON structure
    functions = [{
        "name": "generate_fields",
        "description": "Generate field values for template variables",
        "parameters": json_schema,
    }]

    try:
        response = client.chat.completions.create(
            model=config["model"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            functions=functions,
            function_call={"name": "generate_fields"},
            temperature=config["temperature"],
            max_tokens=config["max_tokens"],
        )
        msg = response.choices[0].message
        if msg.function_call and msg.function_call.arguments:
            return msg.function_call.arguments
        # Fallback: try content
        return msg.content
    except Exception as e:
        raise RuntimeError(f"LLM API call failed: {e}")


def _parse_llm_response(raw: str) -> dict[str, Any]:
    """Parse LLM response, handling potential Markdown code blocks."""
    text = raw.strip()

    # Remove markdown code blocks if present
    if text.startswith("```"):
        # Find the first { or [ after ```
        lines = text.split("\n")
        cleaned = []
        in_code = False
        for line in lines:
            if line.startswith("```"):
                in_code = not in_code
                continue
            if not in_code:
                continue
            cleaned.append(line)
        text = "\n".join(cleaned).strip()

    # Try to parse as JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON object within the text
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass
        raise ValueError(f"LLM output is not valid JSON: {text[:200]}")


# ─── 4.4 Auto-Retry Logic ───────────────────────────────────

class LLMGenerationResult:
    """Result of an LLM content generation attempt."""

    def __init__(self):
        self.success: bool = False
        self.data: dict[str, Any] = {}
        self.validation: ValidationResult = ValidationResult()
        self.attempts: int = 0
        self.prompt_version: str = ""
        self.model: str = ""
        self.error: str = ""


def generate_field_values(
    schema_set: FieldSchemaSet,
    business_input: str,
    tone: str = "formal",
    max_length: int = 500,
    banned_terms: list[str] | None = None,
    max_retries: int = 3,
    config: dict | None = None,
) -> LLMGenerationResult:
    """Generate field values via LLM with auto-retry on validation failure.
    
    Args:
        schema_set: Field schema defining expected fields.
        business_input: Business context for content generation.
        tone: Writing tone (formal, professional, casual).
        max_length: Max characters per field.
        banned_terms: List of prohibited terms.
        max_retries: Number of retry attempts on validation failure.
        config: LLM config override (uses env vars if None).
    
    Returns:
        LLMGenerationResult with success status, data, and validation info.
    """
    result = LLMGenerationResult()
    cfg = config or get_llm_config()

    if not cfg["api_key"]:
        result.error = "LLM 未配置: 请设置 DEEPSEEK_API_KEY 环境变量"
        return result

    system_prompt = build_system_prompt()
    json_schema = schema_set.to_json_schema()
    result.prompt_version = PromptVersion.current()
    result.model = cfg["model"]

    for attempt in range(1, max_retries + 1):
        result.attempts = attempt
        user_prompt = build_user_prompt(
            schema_set=schema_set,
            business_input=business_input,
            tone=tone,
            max_length=max_length,
            banned_terms=banned_terms,
        )

        try:
            raw = _call_llm_api(system_prompt, user_prompt, json_schema, cfg)
            if not raw:
                result.error = "LLM 返回空响应"
                continue

            data = _parse_llm_response(raw)
        except (RuntimeError, ValueError) as e:
            result.error = str(e)
            continue

        # Validate output
        validation = validate_content(data, schema_set, banned_terms)
        if validation.is_valid:
            result.success = True
            result.data = validation.validated_data
            result.validation = validation
            return result
        else:
            result.validation = validation
            # Lower temperature for retry
            if attempt < max_retries:
                cfg["temperature"] = max(0.1, cfg["temperature"] - 0.1)

    # All retries exhausted
    if not result.error:
        error_details = "; ".join(f"{e.field}: {e.reason}" for e in result.validation.errors)
        result.error = f"验证失败（已重试{max_retries}次）: {error_details}"
    return result
