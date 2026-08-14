## 1. 核心替换引擎

- [x] 1.1 创建 `preserve_replace.py`：定义 `replace_preserving_format()` 入口和验证逻辑
- [x] 1.2 文字替换：单 run 占位符替换（保留 rPr/pPr）
- [x] 1.3 文字替换：跨 run 占位符合并替换
- [x] 1.4 表格替换：固定行数单元格文本替换（保留 tblPr/tblGrid）
- [x] 1.5 替换后 python-docx 完整性验证

## 2. 图片替换

- [x] 2.1 创建 `preserve_replace_images.py`：定位 `<a:blip r:embed>` 获取关系 ID
- [x] 2.2 图片二进制替换（保留 extent/anchor 几何属性）
- [x] 2.3 图片格式转换（新图格式匹配原部件 content_type）
- [x] 2.4 嵌入对象（OLE）数据文件替换

## 3. 引擎集成

- [x] 3.1 修改 `renderer.py` 集成保格式替换路径
- [x] 3.2 修改 `backend/app/api/documents.py` 新增保格式生成端点
- [x] 3.3 前端文档生成页新增"保格式替换"模式选项

## 4. 测试

- [x] 4.1 文字替换保格式单元测试（单 run + 跨 run）
- [x] 4.2 图片替换保几何属性单元测试
- [x] 4.3 嵌入对象替换单元测试
- [x] 4.4 表格替换保样式单元测试
- [x] 4.5 端到端测试：模板→替换→验证格式指纹不变
