## Context

- doc-flow 现有技术栈：`frontend/` = React 18 + Vite 5 + TS + react-router + axios；`backend/` = FastAPI + PostgreSQL + Redis + LibreOffice；`engine/` = 文档生成引擎（docxtpl + 保真替换）。
- 参考项目 sirchmunk（/Volumes/yun-ssd/AI/sirchmunk）：Next.js 14 + Tailwind 前端，FastAPI 后端，提供 AI 对话（WebSocket 流式）、知识库管理、图谱、历史、监控、设置等功能，自带 `src/sirchmunk/api/` 全套路由实现可直接参考移植。
- 目标：在 doc-flow 中实现与 sirchmunk 相同的 web + service 功能，前端放在 `frontend/`，作为项目主功能（默认首页），现有文档生成保留为次级模块。

## Goals / Non-Goals

**Goals:**
- 前端实现完整页面：主对话页、知识库页、图谱页、历史页、监控页、设置页，交互与 sirchmunk web 对齐
- 后端实现完整 service API（knowledge/files/chat/search/history/monitor/settings），行为对齐 sirchmunk
- AI 对话/搜索页成为默认首页，Sidebar 导航改造
- LLM 配置统一由设置服务管理，文档生成与对话共用

**Non-Goals:**
- 不移植 sirchmunk 的 CLI、MCP 服务器、agentic/react_agent、学习编译器等非 web 能力（除非被 API 直接依赖）
- 不复制 Next.js 框架，仅移植页面功能语义到 Vite+React
- 不在本变更中实现 sirchmunk 的 WebUI 静态托管到 FastAPI 单端口模式（doc-flow 前后端已分离）

## Decisions

1. **前端技术选型：Vite + React，不用 Next.js**
   - 理由：doc-flow frontend 已是 Vite+React，移植页面组件语义而非框架；sirchmunk 页面为 `"use client"` 组件，本质是 React，可直接改写。
   - 备选：复制 Next.js 工程 → 引入双前端框架，维护成本高，否决。
   - 样式：sirchmunk 用 Tailwind，doc-flow 现有 CSS 为手写 index.css。**决定：沿用现有 index.css 风格，不引入 Tailwind**（避免破坏现有页面视觉），对话/知识库页 面按现有设计语言实现。
   - **实施修正：引入 Tailwind v3（独立 globals.css + content 限定 src/chat/**），原因：sirchmunk 页面与组件（约 4700 行）全部基于 Tailwind class，逐行重写样式不可行且严重破坏保真；content 限定后不影响现有 index.css 页面。**
   - Next.js 专有导入（next/link、next/image、next/navigation）通过 vite alias 映射到 src/chat/lib/next-shim/ 兼容层解决，页面源码零修改。

2. **WebSocket 对话：前端用原生 WebSocket + 自封装 hook，后端 FastAPI `@router.websocket("/chat")`**
   - 理由：sirchmunk 已实现成熟的消息协议（stage 事件、delta 流式文本、工具调用、终止），协议直接复用；不引入 socket.io 等额外依赖。
   - `useChatSocket` hook 封装连接、重连、停止、消息解析。

3. **API 前缀与鉴权**
   - 现有 backend 使用 `/api/v1/...` 风格（auth 用 Bearer JWT）。**决定：sirchmunk 各路由统一挂在 `/api/v1/knowledge`、`/api/v1/files` 等前缀下，沿用现有 JWT 鉴权依赖 `deps.py`**（sirchmunk 的 token 机制替换为 doc-flow 现有 JWT），WS 连接鉴权用 query 参数传 token。

4. **持久化：沿用 PostgreSQL + Redis**
   - 知识库元数据、文件记录、会话历史、设置 → PostgreSQL（新增 models + alembic 迁移）。
   - 聊天流式状态、搜索任务状态 → Redis。
   - sirchmunk 默认文件系统 JSON 存储 → 替换为 DB，保证与现有架构一致。

5. **知识库检索与文件上传**
   - 上传文件落盘 `backend/data/uploads/knowledge/`（现有 uploads 目录扩展），文件去重/集合/聚类元数据入库。
   - 检索逻辑移植 `src/sirchmunk/retrieve/` 与 `learnings/` 核心（tree indexer、summary index、text retriever），LLM 调用沿用现有 openai-compatible 客户端（DeepSeek 默认，Base URL/Key 由设置服务提供）。

6. **设置服务：LLM 配置存 DB，测试连通性**
   - `/api/v1/settings` 读写 LLM API Key/Base URL/模型、UI 语言等；Key 加密存储（现有环境变量为兜底默认值）。
   - 文档生成侧（engine/llm）改为从 settings service 读取配置，共用同一 LLM 配置。

7. **主功能入口**
   - App 路由：`/` = AI 对话/搜索页（原 Dashboard 移到 `/dashboard`），Sidebar 增加：AI 对话、知识库、图谱、历史、监控、设置；文档生成相关保留（模板、生成、任务）。

## Risks / Trade-offs

- [sirchmunk 页面体积大（主页面 1432 行），逐行移植工作量大] → 按功能模块拆分组件后移植，先主对话页，再知识库/图谱/历史/监控/设置
- [检索/聚类算法移植偏差导致行为不一致] → 直接复用 sirchmunk 的 Python 模块（retrieve/learnings/schema）而非重写，仅替换存储层
- [WS 协议细节（stage/delta/工具事件）理解偏差] → 先通读 sirchmunk chat.py 消息协议并写协议文档，前端按协议逐事件实现
- [现有文档生成功能回归] → 路由改造保留全部原路径（除默认首页外不改 URL），生成链路共用 LLM 配置处做兼容（未配置时回落环境变量）
- [依赖新增（react-markdown/katex/图表）] → 前端仅加渲染类依赖，不引入状态管理框架（沿用 useState/context）

## Migration Plan

1. 后端先行：models + alembic 迁移 + knowledge/files/chat/search/history/monitor/settings 路由与 service
2. 前端：api.ts 扩展 + 组件拆分 + 页面路由 + Sidebar 改造
3. 联调：WS 对话主流程 → 知识库上传/检索 → 其余页面
4. 入口切换：`/` 指向 AI 对话页，验证文档生成次级入口无回归
5. 回滚：路由/页面为增量新增，回滚仅需恢复 App.tsx 默认首页指向

## Implementation Notes（实施备注）

- **后端采用 vendor 直接复用而非重写**：sirchmunk 核心 Python 包整体复制到 `backend/vendor/sirchmunk`（retrieve/learnings/schema/llm 等约 2.6 万行），7 个 router 全部挂载到 doc-flow main.py，共 50+ 端点。存储层保留 sirchmunk 文件系统存储（~/.sirchmunk），未建 PostgreSQL 模型（1.1 未完成，后续如需多租户/审计再迁移）。
- **JWT 鉴权**：main.py 新增 auth_middleware 对 /api/v1/* 强制 Bearer JWT（settings/ui GET 豁免，供登录前加载主题）；WS 走 query token（vendor 校验，无 token 时放行）。
- **LLM 配置统一**：engine/app/core/llm_generator.py 改为从 settings service（~/.sirchmunk/.env）读取，未配置时回落环境变量。
- **前端适配**：`@` 别名 → src/chat；token 统一用 doc_flow_token；VITE_API_BASE 同源模式；vite proxy 需 ws: true 支持 WS 流式。
- **修复清单**：Monitor/History 页 fetch 补 Authorization 头；main.py 挂载 dashboard_router（/api/v1/dashboard/recent）；时间戳兼容 ISO 字符串（lib/time.ts toDate）。

## Open Questions

- LLM 默认模型与 Base URL 是否沿用现有 DeepSeek 配置，还是支持多供应商切换（sirchmunk 支持多 provider）？→ 默认沿用 DeepSeek，settings 提供可配置项
- 知识库文件是否支持 docx/doc 等文档格式解析（doc-flow 核心资产），sirchmunk 依赖 kreuzberg/ripgrep-all → 文档类文件解析接入 engine 现有提取能力
