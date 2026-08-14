## 1. 图片渲染支持

- [x] 1.1 确认 Mammoth 默认将图片转为 base64 data URI（无需自定义 handler）
- [x] 1.2 删除多余的自定义 handler 代码
- [x] 1.3 添加 CSS `img { max-width: 100%; height: auto; }`

## 2. 验证

- [x] 2.1 69 个测试全部通过
- [x] 2.2 上传含 logo 图片的模板并预览，图片以 data URI 正确显示
- [x] 2.3 页眉/页脚/表格/列表同时正常渲染
