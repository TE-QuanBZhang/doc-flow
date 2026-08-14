# Tasks: 知识库生成方式改版 — anydoc 文件上传入库

## 1. 后端：anydoc 转换入库

- [x] 1.1 在 `backend/requirements.txt` 添加 `firecrawl-anydoc`
- [x] 1.2 新增转换服务模块（如 `backend/vendor/sirchmunk/utils/anydoc_converter.py`）：`convert_to_markdown(bytes, filename)` — md/markdown 直通、按扩展名/字节检测格式、异常分类（Unsupported/Encrypted/Malformed）
- [x] 1.3 扩展 `backend/vendor/sirchmunk/api/files.py` 上传链路：上传成功后对每个文件转换 → 转换结果 Markdown 写入 `~/.sirchmunk/knowledge/<collection>/`，响应中返回 per-file 转换状态（converted/skipped/error）
- [x] 1.4 删除集合时同步清理 `~/.sirchmunk/knowledge/<collection>/` 对应目录
- [x] 1.5 默认搜索路径：`SIRCHMUNK_SEARCH_PATHS` 未配置时默认包含 knowledge 目录（或更新 `~/.sirchmunk/.env` 指向 knowledge + 兼容 uploads）

## 2. 前端：Knowledge 页面上传功能

- [x] 2.1 KnowledgePage 新增上传 UI（复用 Chat 页面上传组件的交互逻辑，目标接口不变），支持选择集合与多文件上传
- [x] 2.2 上传完成后自动刷新知识库 stats/clusters，展示 per-file 转换结果（成功/失败）

## 3. 验证

- [x] 3.1 端到端验证：上传 docx/csv/PDF → 转换 Markdown 入库 → 搜索能检索到转换后的内容
- [x] 3.2 验证失败场景：不支持格式/损坏文件返回错误且不影响同批其他文件；md 文件直通入库
