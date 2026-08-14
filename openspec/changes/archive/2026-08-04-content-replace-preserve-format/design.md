## Context

现有渲染基于 docxtpl（Jinja2）重建文档，内容替换时会重写 XML 节点，导致直接格式、图片属性、表格样式丢失。实现"1:1 格式保留"必须放弃重建思路，改为**原地修改 OOXML 节点**。

## Goals / Non-Goals

**Goals:**
- 文字替换：仅改 `<w:t>`，保留 `<w:rPr>` 与 `<w:pPr>`
- 图片替换：仅改 `r:embed` 指向的二进制文件，保留 `<wp:extent>`/`<wp:anchor>`
- 嵌入对象替换：仅替换 OLE 关联的数据文件，保留容器节点
- 表格替换：仅改 `<w:tc>` 文本内容，保留 `<w:tblPr>`/`<w:tblGrid>`

**Non-Goals:**
- 不重建文档结构（页眉/页脚/分节符）
- 不支持文本增删导致的重新排版（仅等长/占位符替换）
- 不处理公式域、交叉引用等自动更新对象

## Decisions

### 1. 替换引擎基于 python-docx 底层 oxml + lxml

**选择**：直接操作 `run._r`、`para._element`、`table._tbl` 等底层元素，通过 lxml 修改节点
**理由**：python-docx 高层 API 会触发重建；底层 oxml 可精确保留所有属性
**备选**：直接解压 zip 操作 document.xml —— 更底层但需自行处理关系文件

### 2. 文字替换：保留 run 属性，只改文本

- 定位包含 `{{placeholder}}` 的 `<w:t>` 节点
- 仅修改 `text` 内容，不触碰兄弟节点 `<w:rPr>`
- 支持跨 run 占位符：合并相邻 run 的文本后再替换（保留首个 run 的格式）

### 3. 图片替换：替换二进制，保留几何属性

- 从 `<a:blip r:embed="rIdN">` 拿到关系 ID
- 通过 `part.rels[rIdN].target_part` 获取图片部件
- **直接覆盖** `target_part._blob` 为新图片字节
- `<wp:extent>`（尺寸）、`<wp:anchor>`（位置/旋转）节点完全不改

### 4. 嵌入对象替换：替换数据流

- 定位 `<o:OLEObject r:id="rIdN">` 或 `<w:object>`
- 替换关联的 `embeddings/*.xlsx` 或 `embeddings/*.bin` 部件内容
- 保留 `<o:OLEObject>` 的 ProgID、Shape 属性

### 5. 表格替换：内容与样式解耦

- 表格按占位符标记（如 `{{#table:items}}`）定位
- 复制模板行（`<w:tr>`）结构，仅替换单元格内 `<w:t>` 文本
- `<w:tblPr>`（表格样式）、`<w:tblGrid>`（列宽）原样保留

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 直接改 XML 破坏文档结构 | 替换前校验 XML 合法性；替换后 python-docx 重新打开验证 |
| 图片格式不一致（PNG vs JPG） | 新图片转换格式以匹配原部件 content_type |
| 跨 run 占位符拆散 | 合并相邻 run 文本，替换后重新拆分写入 |
| 嵌入对象体积大 | 流式写入，避免一次性加载到内存 |
| 表格循环行数不匹配 | 限制表格替换为固定行数；动态行走 docxtpl 路径 |
