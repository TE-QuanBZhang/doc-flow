## 1. Schema 修复

- [x] 1.1 修复 `TemplateResponse` UUID 字段序列化
- [x] 1.2 修复 `TemplateVersionResponse` UUID 字段序列化
- [x] 1.3 检查并修复其他所有 response schema 的 UUID 字段（auth, documents, users, tasks, variables）
- [x] 1.4 验证 POST /api/templates 返回 201

## 2. 测试

- [x] 2.1 所有现有测试通过
- [x] 2.2 上传模板接口恢复正常
