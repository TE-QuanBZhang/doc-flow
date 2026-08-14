## 1. 依赖与环境准备

- [x] 1.1 添加新依赖到 `engine/requirements.txt`：`docxtpl`、`jsonschema`
- [x] 1.2 在 `engine/app/core/` 下创建模块文件结构
- [x] 1.3 定义格式提取的公共数据模型和类型（StyleSpec, FieldSchema 等）

## 2. 格式提取引擎

- [x] 2.1 实现 `extractor.py`：页面设置提取（纸张、方向、边距、分栏）
- [x] 2.2 实现样式系统提取（段落样式名称、字体、字号、粗斜体、对齐、缩进、行距）
- [x] 2.3 实现编号层级提取（多级编号格式、层级缩进）
- [x] 2.4 实现表格格式提取（表格样式、边框、底纹、单元格边距、列宽策略）
- [x] 2.5 实现页眉/页脚/页码提取（首页不同、奇偶页、页码格式）
- [x] 2.6 实现模板指纹生成（对 `style_spec.json` 计算 hash）
- [x] 2.7 实现格式提取入口函数 `extract_format(template_path) -> StyleSpec`
- [x] 2.8 编写格式提取器的单元测试

## 3. 内容字段 Schema 与校验

- [x] 3.1 定义字段 Schema 数据结构（支持 string/number/date/enum/boolean/object/array 类型）
- [x] 3.2 实现 Schema 验证器 `field_validator.py`：字段存在性、类型检查、长度/范围校验
- [x] 3.3 实现枚举值校验和禁用词检测
- [x] 3.4 实现 Schema 从模板变量定义的自动生成

## 4. LLM 内容生成模块

- [x] 4.1 实现 `prompt_builder.py`：系统提示词模板（JSON-only 约束、不输出排版指令）
- [x] 4.2 实现用户提示词模板（嵌入字段 Schema + 业务输入 + 写作约束）
- [x] 4.3 实现 `llm_generator.py`：DeepSeek API 调用封装（OpenAI 兼容接口，支持 Function Calling）
- [x] 4.4 实现 LLM 输出解析与自动重试逻辑（schema 校验失败时降低 temperature 重试）
- [x] 4.5 实现提示词版本号生成和审计日志记录
- [x] 4.6 配置 DeepSeek API Key（通过 `DEEPSEEK_API_KEY` 环境变量）
- [x] 4.7 支持 LLM 提供者切换（通过 `LLM_API_BASE` / `LLM_MODEL` 环境变量）
- [x] 4.8 编写 LLM 生成模块的单元测试

## 5. 渲染引擎升级

- [x] 5.1 安装 docxtpl 到 `engine/requirements.txt`
- [x] 5.2 实现语法预处理层：将 `{{var}}` → `{{ var }}`、`{{#if:cond}}` → `{% if cond %}`、`{{#each:list}}` → `{% for item in list %}`
- [x] 5.3 在 `renderer.py` 中集成 docxtpl 渲染路径（保留当前 python-docx 路径作为 fallback）
- [x] 5.4 实现渲染入口：支持纯手动填充和 LLM 生成两种模式
- [x] 5.5 更新 `detect_unresolved_placeholders` 函数支持 Jinja2 语法检测
- [x] 5.6 编写渲染引擎的回归测试（含新旧语法兼容性测试）

## 6. 质量校验模块

- [x] 6.1 实现 `quality_checker.py`：样式一致性比对（页面、样式参数、编号层级、表格）
- [x] 6.2 实现占位符残留检测
- [x] 6.3 实现质量报告生成（JSON 格式：各部分得分、偏差列表、pass/fail 状态）
- [x] 6.4 实现可配置的质量阈值
- [x] 6.5 编写质量校验的单元测试

## 7. 后端 API 集成

- [x] 7.1 修改 `backend/app/api/templates.py`：上传时调用格式提取器，存储 `style_spec.json`
- [x] 7.2 修改 `backend/app/api/documents.py`：生成时集成 LLM 内容生成 + schema 校验 + quality check
- [x] 7.3 新增 `POST /api/documents/generate-with-llm` 端点（接受业务输入 + 生成配置）
- [x] 7.4 在文档详情 API 中返回质量报告
- [x] 7.5 在模板版本管理中添加格式指纹比对和变更告警
- [x] 7.6 编写 API 集成测试

## 8. 端到端集成与验收

- [x] 8.1 搭建回归测试集：准备测试模板（含页面设置、样式、表格、编号、页眉页脚）
- [x] 8.2 编写端到端测试：上传模板 → 格式提取 → LLM 生成 → 渲染 → 质量校验
- [x] 8.3 验证格式一致率 ≥ 98%
- [x] 8.4 验证占位符替换成功率 = 100%
- [x] 8.5 更新 `engine/requirements.txt` 锁定所有新增依赖版本
