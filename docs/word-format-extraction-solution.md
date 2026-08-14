# Word 格式提取与内容替换技术方案（含提示词设计）

## 1. 目标与范围

**目标**：基于现有 Word 模板（`.docx`）实现“**格式 1:1 复刻** + **内容自定义替换**”，并通过提示词与自动化流程降低人工排版成本。

**范围包含**：
- 模板格式自动提取（页面、样式、段落、表格、页眉页脚等）
- 内容变量化与替换
- LLM 提示词设计（仅生成内容，不破坏格式）
- 渲染与质量校验
- 工程化落地建议（可扩展、可审计、可维护）

**不包含**：
- 扫描版 PDF 的复杂 OCR 版式还原
- Word 宏安全策略与企业终端分发策略（仅给接口建议）

---

## 2. 设计原则

1. **格式与内容解耦**：  
   - 程序负责格式保真（模板 + 样式）  
   - LLM 负责内容生成（字段值）  

2. **模板优先**：  
   不让模型直接“重写整篇文档”，只让其填充字段，避免样式漂移。

3. **可追溯**：  
   每次生成保留：模板版本、提示词版本、输入数据、输出文档、校验报告。

4. **可回归**：  
   建立格式一致性校验，支持批量回归测试。

---

## 3. 总体架构

```text
[template.docx]
      │
      ▼
[格式提取器 extractor]
  ├─ style_spec.json       (样式规格)
  ├─ placeholder_map.json  (占位符映射)
  └─ template_fingerprint  (模板指纹)
      │
      ▼
[内容生成层]
  ├─ Prompt Builder (系统提示词+约束+字段定义)
  ├─ LLM 生成字段值 (JSON)
  └─ 内容合规校验
      │
      ▼
[文档渲染层]
  ├─ docxtpl/python-docx 填充
  └─ 输出 final.docx
      │
      ▼
[质量校验层]
  ├─ 样式一致性比对
  ├─ 结构完整性校验
  └─ 差异报告 diff_report.md
```

---

## 4. 技术选型（开源优先）

### 4.1 核心库
- **docxtpl**：基于 Jinja2 的 docx 模板渲染（推荐主渲染引擎）
- **python-docx**：读取/分析 docx 样式、段落、表格（推荐做提取器）
- **lxml**：深度解析 OpenXML（必要时处理底层 XML）
- **pydantic**：定义字段 Schema，约束 LLM 输出结构
- **jsonschema**：对生成内容做 schema 校验

### 4.2 辅助工具
- **Presidio / 自定义脱敏规则**：输入数据隐私脱敏（如需）
- **Promptfoo（可选）**：提示词回归评测
- **Langfuse（可选）**：提示词版本与效果追踪

---

## 5. 模板格式提取方案

## 5.1 提取对象

1. 页面设置  
   - 纸张、方向、页边距、页眉页脚距离、分栏

2. 样式系统  
   - 段落样式（Normal, Heading1/2/...）
   - 字符样式（字体、字号、加粗、颜色）
   - 列表与多级编号（abstractNum/num）

3. 段落规则  
   - 对齐、首行缩进、行距、段前段后、分页控制

4. 表格规则  
   - 表格样式、边框、底纹、单元格边距、垂直对齐、列宽策略

5. 页眉页脚与页码  
   - 首页不同、奇偶页不同、页码域格式

6. 媒体与题注（可选）  
   - 图片尺寸/环绕、题注样式

## 5.2 提取输出格式（示例）

```json
{
  "template_id": "contract_v3",
  "page": {
    "size": "A4",
    "orientation": "portrait",
    "margin": {"top": 2.54, "bottom": 2.54, "left": 3.17, "right": 3.17}
  },
  "styles": {
    "Normal": {
      "font_cn": "宋体",
      "font_en": "Times New Roman",
      "size_pt": 12,
      "line_spacing": 1.5,
      "first_line_indent_chars": 2
    },
    "Heading1": {
      "font_cn": "黑体",
      "size_pt": 16,
      "bold": true,
      "space_before_pt": 12,
      "space_after_pt": 6
    }
  },
  "numbering": {
    "level_1": "第%1章",
    "level_2": "%1.%2"
  },
  "table": {
    "default_style": "Table Grid",
    "header_bold": true,
    "cell_padding_pt": 4
  },
  "constraints": [
    "禁止新增样式",
    "禁止修改既有编号层级",
    "仅允许替换占位符"
  ]
}
```

---

## 6. 内容变量化与占位符策略

## 6.1 占位符规范

建议统一采用：

- 文本：`{{customer_name}}`
- 富文本片段：`{{rich_summary}}`
- 表格循环：
  - `{% for item in items %} ... {% endfor %}`

## 6.2 映射文件（示例）

```json
{
  "customer_name": "甲方名称",
  "project_name": "项目名称",
  "effective_date": "生效日期",
  "items": "明细列表"
}
```

## 6.3 替换策略

- **强约束**：仅替换占位符，不触碰样式定义。
- **空值策略**：空值字段输出默认文案或隐藏段落（可配置）。
- **长文本策略**：超长内容自动分段，但继承原段落样式。

---

## 7. 提示词设计方案（核心）

## 7.1 提示词目标

让 LLM 只做两件事：
1. 生成字段内容（JSON）
2. 严格遵循字段约束（长度、语气、禁用词）

**禁止**让 LLM 直接输出完整 Word 排版文本。

## 7.2 系统提示词模板（推荐）

```text
你是企业文档内容生成助手。
你的职责是根据输入业务信息，生成“占位符字段对应的内容JSON”。
你不得输出Markdown、不得输出多余解释、不得改动字段名。

硬性规则：
1) 仅输出合法JSON对象。
2) 字段必须与给定schema完全一致，不得新增/缺失。
3) 不生成任何排版指令（如字体、字号、标题样式）。
4) 遵循长度限制、语气要求、合规要求。
5) 若信息不足，使用空字符串并在"_warnings"中说明原因（如schema允许）。
```

## 7.3 用户提示词模板（推荐）

```text
任务：为Word模板填充字段内容。

[字段Schema]
{{schema_json}}

[业务输入]
{{business_input}}

[写作约束]
- 语气：{{tone}}
- 每段不超过{{max_len}}字
- 禁用词：{{banned_terms}}

请返回JSON，字段如下：
{{required_fields}}
```

## 7.4 反漂移约束（建议加入）

- “禁止输出字段之外的任何键”
- “禁止使用代码块包裹 JSON”
- “禁止输出排版建议”
- “输出前先自检字段完整性”

---

## 8. 端到端流程

1. **模板导入**：上传 `template.docx`
2. **格式提取**：生成 `style_spec.json`
3. **占位符检查**：校验模板变量完整性
4. **组装提示词**：system + user + schema
5. **LLM 生成字段值 JSON**
6. **字段校验**：schema / 长度 / 合规词
7. **模板渲染**：docxtpl 输出 `final.docx`
8. **格式一致性校验**：对比模板样式签名
9. **归档审计**：保存提示词版本、输入输出、校验报告

---

## 9. 质量校验与验收标准

## 9.1 自动校验项

- 样式数量与样式名一致
- 正文/标题关键样式参数一致（字体、字号、缩进、行距）
- 编号层级一致
- 表格样式一致
- 页眉页脚存在且页码规则一致
- 占位符全部被替换，无残留 `{{...}}`

## 9.2 验收指标（建议）

- 格式一致率 ≥ 98%
- 占位符替换成功率 = 100%
- 非法字段输出率 = 0%
- 人工返工率 ≤ 5%

---

## 10. 风险与应对

1. **复杂域对象（目录、交叉引用）漂移**  
   - 应对：模板中保留域，渲染后由 Word/脚本更新域

2. **长文本导致分页变化**  
   - 应对：字段长度阈值 + 自动摘要策略 + 人工审批节点

3. **模型输出 JSON 不稳定**  
   - 应对：schema 校验 + 自动重试（温度降低）+ 函数调用模式

4. **模板版本混乱**  
   - 应对：模板指纹（hash）+ 版本命名规范 + 灰度发布

---

## 11. 实施计划（4 周示例）

- **第1周**：模板规范梳理、占位符命名规范、PoC 打通
- **第2周**：格式提取器 + 渲染器 + JSON 校验
- **第3周**：提示词优化、回归集构建、质量看板
- **第4周**：联调上线、权限与审计、操作文档培训

---

## 12. 最小可行实现（MVP）清单

- `extractor.py`：提取 style_spec
- `prompt_builder.py`：拼装系统/用户提示词
- `generator.py`：调用 LLM 返回字段 JSON
- `validator.py`：schema + 合规校验
- `renderer.py`：docxtpl 渲染 docx
- `diff_checker.py`：样式一致性报告
- `configs/`：模板配置、禁用词、字��� schema

---

## 13. 结论与推荐

对于“模板 1:1 + 内容替换”场景，推荐采用：

**`python-docx(提取)` + `docxtpl(渲染)` + `LLM(仅字段内容生成)` + `schema校验`**

这比“让模型直接按自然语言复刻 Word 格式”稳定得多，且便于企业级审计与持续优化。

---

## 附录 A：示例高约束提示词（可直接使用）

```text
[System]
你是文档字段生成引擎。仅输出JSON，不输出解释。
不得输出任何排版相关内容（字体、字号、段落样式）。
不得新增或删除字段。

[User]
请根据以下信息生成模板字段值：

schema:
{
  "title": "string<=30",
  "summary": "string<=200",
  "customer_name": "string",
  "effective_date": "YYYY-MM-DD"
}

constraints:
- 语气：正式、专业
- 禁用词：["最优","国家级","100%保证"]

business_input:
{{BUSINESS_INPUT}}

返回严格JSON：
{
  "title": "...",
  "summary": "...",
  "customer_name": "...",
  "effective_date": "..."
}
```

## 附录 B：推荐开源项目

- docxtpl: https://github.com/elapouya/python-docx-template
- python-docx: https://github.com/python-openxml/python-docx
- lxml: https://github.com/lxml/lxml
- Promptfoo: https://github.com/promptfoo/promptfoo
- Langfuse: https://github.com/langfuse/langfuse
```