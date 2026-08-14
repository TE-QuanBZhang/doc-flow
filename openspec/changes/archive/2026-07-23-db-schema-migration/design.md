## Context

当前数据库 schema 与 SQLAlchemy 模型不同步。上一个变更 `word-format-extraction` 在模型层添加了列，但未迁移数据库。项目有 `alembic.ini` 但缺少 `alembic/` 迁移目录。

## Decisions

### 1. 修复方式：ALTER TABLE + Alembic 初始化

直接对 dev 数据库执行 ALTER TABLE 添加缺失列，同时初始化 Alembic 并在初始化脚本中捕获当前 schema 状态，为后续变更建立迁移规范。

### 2. 执行顺序

先 ALTER TABLE 修复上传 → 再初始化 Alembic → 生成初始迁移 → 验证

## Risks

- ALTER TABLE 在开发环境安全，生产环境需走迁移脚本
- 初始化 Alembic 的自动生成迁移需后续验证完整性
