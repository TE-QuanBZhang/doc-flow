## Why

上一个变更 `word-format-extraction` 在 Template、TemplateVersion、Document 模型中新增了 `format_fingerprint`、`style_spec`、`quality_report` 列，但没有执行数据库迁移，导致模板上传时 SQLAlchemy 尝试插入这些不存在的列，报错 `column "format_fingerprint" of relation "templates" does not exist`。同时，项目虽然有 `alembic.ini`，但 `alembic/` 迁移目录未初始化，缺乏规范的数据库版本管理。

## What Changes

- 执行 ALTER TABLE 为现有表添加缺失的列
- 初始化 Alembic 迁移目录（env.py、script.py.mako、versions/）
- 生成初始迁移脚本，捕获当前 schema 状态
- 验证模板上传和文档生成接口恢复正常

## Capabilities

### New Capabilities
- `db-migrations`: 数据库迁移基础设施（Alembic 初始化 + 迁移脚本管理）

### Modified Capabilities
无

## Impact

- 数据库表 `templates` 增加 `format_fingerprint`、`style_spec` 列
- 数据库表 `template_versions` 增加 `format_fingerprint` 列
- 数据库表 `documents` 增加 `quality_report` 列
- 新增 `backend/alembic/env.py`、`backend/alembic/script.py.mako`、`backend/alembic/versions/` 目录
