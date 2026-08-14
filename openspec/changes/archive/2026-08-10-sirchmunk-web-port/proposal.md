## Why

项目需要将 AI + 知识库能力作为主功能落地。参考项目 sirchmunk 已具备一套完整、经过验证的 Web 功能（AI 对话搜索、知识库管理、知识图谱、历史、监控、设置）及其对应的 FastAPI service API。在 doc-flow 中实现同样完整的功能，将 AI 对话与知识库检索作为产品主入口，替代当前的"文档生成"作为默认首页，让知识库成为文档生成的底座。

## What Changes

- 在 `frontend/`（React + Vite + TS）中实现 sirchmunk web 的全部页面功能：
  - 主页面：AI 对话/搜索（WebSocket 流式对话、RAG 知识库切换、Web 搜索开关、搜索建议、文件选择器、会话管理）
  - 知识库页：知识库列表、文件上传、集合浏览、聚类查看与删除
  - 图谱页：知识图谱可视化（聚类/关系图）
  - 历史页：会话历史、搜索、删除、统计
  - 监控页：系统/LLM/存储/知识库运行状态监控
  - 设置页：LLM 配置（API Key、Base URL、模型）、界面设置、环境信息、LLM 连通性测试
- 在 `backend/`（FastAPI）中实现对应的 service API：
  - `/api/v1/knowledge/*`：refresh、list、clusters、search、stats、patterns、graph、delete
  - `/api/v1/files/*`：upload、check-duplicates、collections CRUD、usage
  - `/api/v1/chat`（WebSocket）、chat/sessions、search/suggestions、file-browser、file-picker
  - `/api/v1/search/*`：search、search/stream、search/status
  - `/api/v1/history/*`：sessions CRUD、search、stats
  - `/api/v1/monitor/*`：overview、system、health、chat、knowledge、storage、llm、status
  - `/api/v1/settings/*`：get、ui、environment、test/llm、status
- 路由调整：AI 对话/搜索页成为项目主功能与默认首页，现有文档生成功能保留为次级模块
- 前端路由、布局（Sidebar）相应改造；依赖新增：WS 客户端、Markdown 渲染、KaTeX、图表可视化等

## Capabilities

### New Capabilities
- `ai-knowledge-chat`: AI 对话与知识库检索主界面（WebSocket 流式对话、RAG/Web 搜索开关、搜索建议、会话管理）
- `knowledge-base-management`: 知识库管理（文件上传、集合、聚类、统计、删除）
- `knowledge-graph`: 知识图谱可视化
- `chat-history`: 会话历史管理（列表、搜索、删除、统计）
- `system-monitor`: 系统运行监控（服务、LLM、存储、知识库状态）
- `system-settings`: 系统设置（LLM 配置、界面设置、连通性测试）
- `file-browser-service`: 文件浏览与选取服务（file-browser、file-picker、文件去重、用量统计）

### Modified Capabilities
- `llm-content-generation`: 扩展 LLM 配置来源——由后端设置服务（/api/v1/settings）统一管理 LLM API Key/Base URL/模型，文档生成与对话搜索共用同一 LLM 配置
- `document-generation`: 入口调整——文档生成不再是默认首页，改为从 AI 对话/知识库主界面进入的次级功能

## Impact

- 代码：`frontend/src/`（新增页面与组件、改造 App 路由与 Layout）、`backend/app/api/`（新增 knowledge/files/chat/search/history/monitor/settings 路由与 service）、`backend/app/models/` 与 `backend/app/services/`（知识库、会话、监控数据持久化）
- 依赖：前端新增 WS、react-markdown、katex、图表库等；后端沿用现有 FastAPI/PostgreSQL/Redis 栈，新增知识库检索相关依赖
- 参考实现：/Volumes/yun-ssd/AI/sirchmunk（web/ 与 src/sirchmunk/api/），功能对齐但技术栈适配 doc-flow（Vite+React 而非 Next.js）
- 配置：`.env` 增加 LLM 相关配置项（API Key、Base URL、模型名）
