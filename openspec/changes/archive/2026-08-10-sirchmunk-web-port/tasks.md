## 1. 后端基础：数据模型与迁移

- [ ] 1.1 新增 models：KnowledgeBase、KnowledgeFile、Collection、Cluster、ChatSession、ChatMessage、SystemSetting，编写 alembic 迁移（实施偏离：vendor 复用 sirchmunk 原存储，未建 DB 模型，见备注）
- [x] 1.2 新增知识库检索 service（移植 sirchmunk retrieve/text_retriever 与 learnings/tree_indexer 核心逻辑，存储层替换为 DB）（实施偏离：直接 vendor 复用 sirchmunk retrieve/learnings，存储层保留文件系统）
- [x] 1.3 LLM 客户端改为从 settings 读取配置（provider/base_url/model/key），未 配置时回落环境变量

## 2. 后端 API：知识库与文件

- [x] 2.1 实现 `/api/v1/knowledge/*`：refresh、list、clusters、clusters/{id}、search、stats、patterns、graph、delete（clusters/{id}、clusters）（vendor 挂载）
- [x] 2.2 实现 `/api/v1/files/*`：upload、check-duplicates、collections CRUD、usage（vendor 挂载）
- [x] 2.3 接入现有 JWT 鉴权（deps.py），文件落盘 backend/data/uploads/knowledge/（鉴权已接入；落盘位置为 sirchmunk 默认 ~/.sirchmunk）

## 3. 后端 API：对话、搜索、历史

- [x] 3.1 实现 `/api/v1/chat` WebSocket 端点（sirchmunk 消息协议：stage/delta/工具事件/停止），含 file-picker、file-picker/status、file-browser、file-browser/defaults（vendor 挂载）
- [x] 3.2 实现 `/api/v1/chat/sessions`、`/chat/sessions/{id}`、`/chat/sessions/{id}/load`、`/search/suggestions`、`/search/knowledge-bases`（vendor 挂载）
- [x] 3.3 实现 `/api/v1/search/*`：search、search/stream、search/status（vendor 挂载）
- [x] 3.4 实现 `/api/v1/history/*`：sessions CRUD、history/search、history/stats（vendor 挂载）

## 4. 后端 API：监控与设置

- [x] 4.1 实现 `/api/v1/monitor/*`：overview、system、health、chat、knowledge、storage、llm、status、refresh（vendor 挂载）
- [x] 4.2 实现 `/api/v1/settings/*`：get、ui、environment、post、ui post、test/llm、status（vendor 挂载；Key 存 .env 文件，未加密）

## 5. 前端基础：API 层与全局状态

- [x] 5.1 扩展 frontend/src/services/api.ts：新增全部知识库/文件/会话/搜索/监控/设置接口与 WS URL 工具（实施为 chat/lib/api.ts + 全局 context，功能等价）
- [x] 5.2 新增 useChatSocket hook（WS 连接、重连、停止、消息解析）与全局 chat state context（实施为 GlobalContext 内置 chatWs 逻辑）
- [x] 5.3 新增依赖：react-markdown、remark-math、rehype-katex、katex、图表库

## 6. 前端页面：主对话页

- [x] 6.1 实现 AI 对话/搜索主页面：消息流式渲染（Markdown/LaTeX）、RAG 开关、Web 搜索开关、知识库选择、停止生成、搜索建议（ChatPage 移植）
- [x] 6.2 实现会话侧栏：新会话、会话列表加载/切换
- [x] 6.3 实现文件选择器/文件浏览器（FileBrowser、FileUpload、CollectionBrowser 组件移植）

## 7. 前端页面：知识库、图谱、历史

- [x] 7.1 实现知识库页：知识库列表、文件上传、集合浏览、聚类查看/删除、刷新、统 计（KnowledgePage 移植）
- [x] 7.2 实现图谱页：知识图谱可视化（节点/边渲染、聚类过滤、节点详情）（GraphPage 移植）
- [x] 7.3 实现历史页：会话列表、详情、搜索、删除、统计（HistoryPage 移植 + 时间戳修复）

## 8. 前端页面：监控与设置

- [x] 8.1 实现监控页：服务健康、系统资源、聊天/知识活动、存储用量、刷新（MonitorPage 移植 + 鉴权头修复）
- [x] 8.2 实现设置页：LLM 配置（Key 掩码、保存、测试连接）、界面设置、环境信息（SettingsPage 移植）

## 9. 路由改造与主功能入口

- [x] 9.1 App.tsx 路由改造：`/` 指向 AI 对话页，原 Dashboard 移至 `/dashboard`，新增 /knowledge、/graph、/history、/monitor、/settings
- [x] 9.2 Layout/Sidebar 改造：新增导航项（AI 对话、知识库、图谱、历史、监控、设置），保留文档生成入口
- [x] 9.3 验证文档生成全链路（模板、生成、任务）无回归（浏览器验证通过）

## 10. 联调与验证

- [x] 10.1 端到端验证：WS 对话主流程（含 RAG、停止、会话切换）（WS 连接与流式链路验证通过；未配置 LLM Key 时返回明确错误）
- [ ] 10.2 端到端验证：文件上传 → 知识库刷新 → 检索引用（待验证）
- [x] 10.3 验证知识库/图谱/历史/监控/设置各页面数据正确性（浏览器验证通过）
- [ ] 10.4 后端新增路由 pytest 冒烟测试（knowledge/files/settings/history 核心端点）（待补）
