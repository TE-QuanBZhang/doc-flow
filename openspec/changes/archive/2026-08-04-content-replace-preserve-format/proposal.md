## Why

当前文档生成通过 docxtpl/python-docx 进行模板渲染，但存在一个根本性局限：**内容替换时无法保证格式 1:1 保留**。特别是图片、嵌入对象、表格这类复杂元素，常规渲染会丢失原始大小、位置、旋转等属性。用户需要一种"只替换内容、绝不改动格式"的生成方式，覆盖：文字、图片、图标（OLE/嵌入对象）、表格四类内容。

## What Changes

- 新增基于 OOXML 底层操作的**内容替换引擎**，直接操作 docx 内部 XML 节点
- **文字替换**：仅替换 `<w:t>` 文本节点，保留 `<w:rPr>`（字体、字号、颜色、加粗等）
- **图片替换**：替换 `media/` 图片文件（`r:embed` 指向），保留 `<wp:extent>`（尺寸）、`<wp:anchor>`（位置/旋转/环绕）
- **图标/嵌入对象替换**：替换 OLE 对象关联的数据文件（如内嵌 xlsx 图表数据），保留 `<o:OLEObject>` 容器
- **表格替换**：仅替换 `<w:tc>` 内文本内容，保留 `<w:tblPr>`（样式）、`<w:tblGrid>`（列宽）
- 作为现有 docxtpl 渲染路径的补充，提供 `replace_preserving_format()` 高级接口

## Capabilities

### New Capabilities
- `format-preserving-replacement`: 内容替换但格式 1:1 保留的引擎（文字/图片/嵌入对象/表格四类）

### Modified Capabilities
- `document-generation`: 生成流程新增"保格式替换"模式，用户可选择不重建文档而是原地替换内容
- `word-format-extraction`: 扩展格式提取以支持图片/嵌入对象/表格的属性提取（供替换后校验）

## Impact

- 新增 `engine/app/core/preserve_replace.py`（核心替换引擎）
- 新增 `engine/app/core/preserve_replace_images.py`（图片/嵌入对象替换）
- 修改 `engine/app/core/renderer.py`（集成保格式替换路径）
- 修改 `backend/app/api/documents.py`（新增保格式生成端点）
- 新增依赖：`python-docx`（已有，用于 XML 操作）
- 新增单元测试覆盖四类替换场景
