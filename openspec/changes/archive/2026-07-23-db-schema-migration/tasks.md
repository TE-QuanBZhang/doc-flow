## 1. 数据库修复

- [x] 1.1 ALTER TABLE 为 `templates` 添加 `format_fingerprint` 和 `style_spec` 列
- [x] 1.2 ALTER TABLE 为 `template_versions` 添加 `format_fingerprint` 列
- [x] 1.3 ALTER TABLE 为 `documents` 添加 `quality_report` 列

## 2. Alembic 初始化

- [x] 2.1 创建 `backend/alembic/` 目录结构（env.py、script.py.mako、versions/）
- [x] 2.2 配置 `env.py`，连接数据库和加载 models
- [x] 2.3 生成初始迁移脚本

## 3. 验证

- [x] 3.1 测试模板上传接口恢复正常
- [x] 3.2 验证 `alembic history` 显示初始迁移记录
