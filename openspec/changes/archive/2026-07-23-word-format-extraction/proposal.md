## Why

当前文档生成流程中，模板的格式（页面设置、样式、表格、页眉页脚等）无法被自动提取和复刻，导致生成的文档与模板格式不一致，需要大量人工排版调整。同时，内容生成依赖手动填写，缺少 LLM 辅助的智能字段填充能力。本变更旨在建立"格式 1:1 提取 + LLM 内容生成 + 自动渲染"的完整流水线，大幅降低人工排版成本，提升文档产出质量与一致性。

## What Changes

- 新增 Word 格式提取引擎，从 `.docx` 模板中提取页面设置、样式系统、段落规则、表格规则、页眉页脚、编号层级等完整格式规格
- 新增 LLM 内容生成模块，通过高约束提示词驱动 LLM 仅生成字段 JSON，不参与排版
- 新增格式一致性校验器，自动比对生成文档与模板的样式指纹
- 新增内容字段 Schema 定义与校验机制
- 修改模板上传流程，在上传时自动执行格式提取和占位符分析
- 修改文档生成流程，集成 LLM 字段生成 + schema 校验 + docxtpl 渲染
- 引入 docxtpl 作为主渲染引擎（替代当前基于 python-docx 的直接替换）

## Capabilities

### New Capabilities
- `word-format-extraction`: 从 `.docx` 模板中提取完整的格式规格（页面、样式、段落、表格、编号、页眉页脚），输出为结构化的 `style_spec.json`
- `llm-content-generation`: 基于模板字段 Schema，构建高约束系统提示词，驱动 LLM 仅输出合规的字段值 JSON，支持 schema 校验、长度约束、禁用词过滤
- `content-field-schema`: 定义模板字段的 Schema（类型、长度、格式、枚举值），用于约束 LLM 输出和前端表单验证
- `quality-validation`: 对生成文档进行自动格式一致性校验（样式比对、占位符残留检测、结构完整性），输出差异报告

### Modified Capabilities
- `template-management`: 模板上传时增加自动格式提取和占位符分析步骤
- `document-generation`: 文档生成流程中集成 LLM 字段生成 + schema 校验 + docxtpl 渲染
- `template-variables`: 变量 Schema 扩展，支持更丰富的字段约束（类型、长度、枚举、格式）

## Impact

- 后端新增 `engine/app/core/extractor.py`（格式提取器）
- 后端新增 `engine/app/core/prompt_builder.py`（提示词组装）
- 后端新增 `engine/app/core/llm_generator.py`（LLM 调用与字段生成）
- 后端新增 `engine/app/core/field_validator.py`（字段 Schema 校验）
- 后端新增 `engine/app/core/quality_checker.py`（格式一致性校验）
- 修改 `engine/app/core/renderer.py`，集成 docxtpl 渲染引擎
- 修改 `backend/app/api/templates.py`，上传时触发格式提取
- 修改 `backend/app/api/documents.py`，生成时集成 LLM 内容生成
- 新增依赖：`docxtpl`、`jsonschema`、`pydantic`
- 提示词版本管理与审计日志新增
