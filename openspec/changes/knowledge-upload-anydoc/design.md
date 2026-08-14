# Design: 知识库生成方式改版 — anydoc 文件上传入库

## Context

当前知识库内容由 AgenticSearch 在搜索/聊天时经 LLM 动态抽取生成知识集群；`POST /api/v1/files/upload` 仅将文件存入 `~/.sirchmunk/uploads/<collection>/`，上传与知识库内容生成解耦。用户希望改版为：Knowledge 页面显式上传文件 → anydoc 转 Markdown → Markdown 直接作为知识库内容。

现有可复用资产：上传接口（查重/集合管理）、搜索链路（AgenticSearch 直接读取 md 文件）、Knowledge 页面（stats/graph/clusters 展示）、Chat 页面上传组件（FileUpload.tsx）。

## Goals / Non-Goals

**Goals**
- Knowledge 页面提供上传入口，文件上传后经 anydoc 转为 Markdown 并入库
- 转换后的 Markdown 立即可被 RAG 搜索/聊天检索
- 转换失败（加密/损坏/不支持）返回清晰错误且不影响其余文件

**Non-Goals**
- 不做 OCR（图片型 PDF 不支持，由 anydoc 返回 Unsupported）
- 不改动现有知识集群（clusters）的展示与统计
- 不提供在线文档编辑/预览

## Decisions

### D1: 转换引擎 — firecrawl-anydoc 本地 Python 库
- **选型**：`firecrawl-anydoc`（Rust 实现，Python binding），本地转换无外部服务，毫秒级，支持 Word/PPT/Excel/ODF/RTF/EPUB/CSV/PDF 共 14 格式，输出统一 GFM Markdown
- **备选**：LibreOffice（慢、格式少、需系统依赖）、pandoc（格式少）、Firecrawl 托管 API（需服务与 API key）→ 均被否
- **约束**：已安装于 conda base（python 3.12），与后端运行环境一致；需写入 `backend/requirements.txt`

### D2: 入库目录 — `~/.sirchmunk/knowledge/<collection>/`
- 转换后的 Markdown 存于此新目录，按集合组织；`SIRCHMUNK_SEARCH_PATHS` 指向该目录
- **理由**：与 `uploads/`（原始文件）分离，语义清晰；现有 AgenticSearch 直接读 md 文件，检索链路零改动
- **备选**：直接在 uploads 下存 md → 检索路径不变但原始/转换文件混杂，删除集合时难区分

### D3: 转换时机 — 上传请求内同步转换
- anydoc 单文档毫秒级，同步转换足够；上传接口返回 per-file 结果（成功/转换失败/查重拒绝），与现有响应结构一致
- **备选**：后台任务队列 → 复杂度高，当前无吞吐需求（YAGNI）

### D4: Markdown 直通
- `.md`/`.markdown` 文件跳过转换直接复制入库（anydoc 本身不支持 md 输入）
- 其他格式（含无扩展名文件）按字节内容检测（`anydoc.format_from_bytes`），检测失败返回 Unsupported 错误

### D5: 前端上传 UI — 复用现有组件
- Knowledge 页面复用 Chat 页面上传组件（FileUpload.tsx）与集合选择逻辑，仅调整目标 API 与展示
- 上传成功刷新 stats/clusters（复用现有 fetchStats）

## Risks / Trade-offs

- [图片型 PDF / 加密文档无法转换] → 返回 per-file 错误信息，提示改用文本型 PDF；不阻断其他文件
- [任何 doc 环境 Python 不一致（此前 3.9/3.12 混用）] → 启动脚本/文档固定用 `/Users/zhangquan/miniconda3/bin/uvicorn`；requirements.txt 记录 firecrawl-anydoc
- [旧数据（uploads 下的 md 文件）不可见] → 将 `SIRCHMUNK_SEARCH_PATHS` 同时包含 `uploads/docflow-docs` 与 `knowledge/`，或迁移存量文件（迁移脚本按需提供）

## Migration Plan

1. 后端新增转换入库逻辑（files 上传链路扩展或独立端点），实现 D1-D4
2. 前端 Knowledge 页面上传 UI（D5），默认集合可配
3. `SIRCHMUNK_SEARCH_PATHS` 指向 `~/.sirchmunk/knowledge`（保留 uploads 路径兼容存量）
4. 回滚：上传接口保留原行为开关（`SIRCHMUNK_UPLOAD_ENABLED` 不变），删除转换逻辑即可回退

## Open Questions

- Knowledge 页面上传的目标集合：沿用 Chat 页面选择的集合，还是 Knowledge 页独立集合（默认 `default`）？→ 倾向独立默认集合，避免与 Chat 页面上传入口冲突
- 存量 `uploads/` 中的文档是否迁移到 `knowledge/`？→ 默认不迁移，SIRCHMUNK_SEARCH_PATHS 兼容双目录
