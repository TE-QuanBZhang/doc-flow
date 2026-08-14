## Context

当前 Doc Flow 的文档生成流程基于 `python-docx` 直接替换模板中的占位符，存在两个核心问题：

1. **格式丢失**：替换过程不保留模板的完整样式规格，生成的文档在页面设置、段落样式、表格样式、编号层级等方面与模板存在偏差，需要人工二次调整。
2. **内容全靠手动**：所有字段值依赖用户手动输入，缺乏 LLM 辅助生成能力，无法利用已有业务数据自动填充文档。

同时，现有引擎代码位于 `engine/` 目录下作为独立服务，但后端直接 import 引擎模块而非通过 API 调用，架构上需要梳理。

## Goals / Non-Goals

**Goals:**
- 实现从 `.docx` 模板中自动提取完整格式规格（页面、样式、段落、表格、编号、页眉页脚），输出结构化 `style_spec.json`
- 构建 LLM 内容生成模块，通过高约束提示词驱动 LLM 仅生成字段值 JSON，不参与排版
- 建立字段 Schema 定义与校验机制，约束 LLM 输出质量和格式
- 引入 docxtpl（基于 Jinja2）作为主渲染引擎，实现格式与内容解耦
- 新增格式一致性校验，自动检测生成文档与模板的样式偏差
- 修改模板上传和文档生成 API，集成新流程

**Non-Goals:**
- 不支持扫描版 PDF 的 OCR 版式还原
- 不处理 Word 宏安全策略与企业终端分发
- 不实现 LLM 模型自身的训练或微调（仅使用 prompt engineering）
- 不处理交叉引用、目录等复杂域对象的自动更新（渲染后由 Word 更新）

## Decisions

### 1. 渲染引擎：docxtpl（基于 Jinja2）替代纯 python-docx

**选择**：docxtpl
**理由**：
- docxtpl 基于 Jinja2 模板语法，天然支持变量替换、循环、条件等逻辑
- 与 python-docx 兼容，可在同一项目中混用（提取用 python-docx，渲染用 docxtpl）
- 替换过程不修改样式定义，保留模板的完整格式
- 社区活跃，成熟度高

**语法兼容策略**：
- 当前模板使用 `{{var}}`（无空格），docxtpl/Jinja2 使用 `{{ var }}`（有空格）
- 实现语法预处理层：读取模板 OOXML 后，将 `{{var}}` → `{{ var }}`、`{{#if:cond}}` → `{% if cond %}`、`{{#each:list}}` → `{% for item in list %}`
- 渲染完成后不写回原始模板文件，仅在内存中处理
- 保留对旧模板语法的向后兼容

**备选方案**：
- 纯 python-docx 直接操作 XML：灵活性高但工作量大，易出错
- 直接调用 LibreOffice 转换：依赖外部进程，不适合高频调用

### 2. LLM 模型选型：DeepSeek（OpenAI 兼容接口）

**选择**：DeepSeek API（deepseek-chat 模型）
**理由**：
- DeepSeek API 兼容 OpenAI 接口格式，可直接复用 OpenAI Python SDK
- 性价比高，适合 MVP 阶段的频繁调用
- 中文文档生成场景下，DeepSeek 的中文能力表现优异
- 支持 JSON output mode（Function Calling），提高输出稳定性

**配置方式**：
- API Key 通过环境变量 `DEEPSEEK_API_KEY` 配置
- API 端点：`https://api.deepseek.com/v1`
- 默认模型：`deepseek-chat`
- 可在 `.env` 中切换为其他兼容接口（如 OpenAI、通义千问等）

### 3. 格式提取范围：全部提取项

**选择**：覆盖文档中列出的全部提取项
**优先级分层**：
- **P0（必须）**：段落样式（字体/字号/粗斜体/颜色）、对齐/缩进/行距、表格样式/边框/底纹
- **P1（重要）**：页面设置（纸张/方向/边距）、编号层级（多级编号格式）、页眉页脚配置
- **P2（增强）**：分栏设置、图片尺寸与环绕、题注样式、域代码

所有提取项在同一 `extractor.py` 中按优先级逐步实现，P0 先行。

### 4. 格式提取方式：python-docx + lxml 组合

**选择**：python-docx 提供高层 API + lxml 处理底层 OpenXML
**理由**：
- python-docx 能覆盖 80% 的格式提取需求（段落样式、表格、页面设置）
- lxml 用于深度提取 python-docx 未暴露的底层 XML（编号层级、域代码、页眉页脚细节）
- 分层策略：python-docx 先做快速提取，lxml 做补充

### 5. LLM 交互模式：JSON 输出 + Schema 校验

**选择**：LLM 只输出字段值的 JSON，不做任何排版
**理由**：
- 格式与内容完全解耦，LLM 不接触排版逻辑，从根本上避免样式漂移
- JSON 结构便于 schema 校验和自动重试
- 提示词中嵌入字段 Schema 作为约束，配合 `jsonschema` 做输出校验

### 6. 架构模式：引擎模块内嵌而非独立服务

**选择**：继续沿用当前模式（backend 直接 import engine 模块），暂不拆分为独立 API 服务
**理由**：
- 当前后端已有 `engine_path` 的 sys.path 配置，直接 import 成本最低
- MVP 阶段减少网络开销和部署复杂度
- 预留接口抽象，后续可拆分为独立微服务

### 7. 输出格式：JSON + JSON Schema

**选择**：格式提取输出为 `style_spec.json`，字段约束使用 JSON Schema
**理由**：
- JSON 序列化/反序列化零依赖，便于存储和比对
- JSON Schema 生态成熟，`jsonschema` 库可直接用于校验
- 与 LLM 的 JSON 输出格式天然一致

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| LLM 输出 JSON 不稳定（格式错误、字段缺失） | schema 校验 + 自动重试（降低 temperature）+ 函数调用模式 |
| 复杂模板的格式提取不全（如嵌套表格、自定义 XML） | 渐进式覆盖：先覆盖 80% 常见场景，复杂场景走人工辅助 |
| docxtpl 对某些 OOXML 特性支持有限 | 保留 lxml 底层操作作为 fallback |
| 长文本字段替换后分页变化 | 字段长度阈值告警 + 自动摘要 + 人工审批节点 |
| 模板版本混乱导致格式漂移 | 模板指纹（hash）+ 版本命名规范 + 灰度发布 |
| 提示词版本与 LLM 行为耦合 | 提示词版本化管理 + 回归测试集（Promptfoo） |
