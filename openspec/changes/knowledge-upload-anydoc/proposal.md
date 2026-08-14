# Proposal: 知识库生成方式改版 — anydoc 文件上传入库

## Why

当前知识库内容来自聊天/搜索时 LLM 动态抽取的知识集群（AgenticSearch），上传文件只是存入文件集合、不会直接成为知识库内容，知识来源不明确、不可控。用户希望改为：在 Knowledge 页面显式上传文件，文件经 anydoc 转换为 Markdown 后直接作为知识库内容，来源清晰、即传即用。

## What Changes

- **Knowledge 页面新增文件上传功能**：在 Knowledge 页面提供上传入口（当前上传 UI 位于 Chat 页面），支持拖拽/选择文件上传到知识库。
- **上传即转换**：上传的 office 文档（Word/PPT/Excel/ODF/RTF/EPUB/CSV/PDF）通过 anydoc（firecrawl-anydoc，本地 Rust 转换）转为 Markdown；Markdown 文件直接入库，不重复转换。
- **Markdown 作为知识库内容**：转换后的 Markdown 存入知识库文档目录（`~/.sirchmunk/knowledge/<collection>/`），RAG 搜索/聊天直接检索该目录内容。
- **转换失败处理**：加密/损坏/不支持的格式返回明确错误，不影响其他文件上传。

## Capabilities

### New Capabilities
- `knowledge-anydoc-ingestion`: 知识库文件上传 → anydoc 转换 Markdown → 入库的完整链路，含 Knowledge 页面上传 UI、后端转换入库接口、转换失败处理。

### Modified Capabilities
- `knowledge-base-management`: 知识库内容来源从"聊天/搜索动态抽取"改为"上传文件转换的 Markdown 显式入库"；Knowledge 页面展示上传入口与入库状态。

## Impact

- **后端**：`backend/vendor/sirchmunk/api/files.py`（上传链路扩展）、新增转换入库服务（复用 `anydoc` 库）、`~/.sirchmunk/knowledge/` 新目录
- **前端**：`frontend/src/chat/pages/KnowledgePage.tsx` 新增上传 UI；Chat 页面上传入口保留或收敛
- **依赖**：新增 `firecrawl-anydoc`（已装于 conda base 环境，与后端运行环境一致）
- **配置**：`SIRCHMUNK_SEARCH_PATHS` 指向知识库文档目录（默认 `~/.sirchmunk/uploads/...` 切换为 `~/.sirchmunk/knowledge/`）
