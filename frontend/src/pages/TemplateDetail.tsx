import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Tabs,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  Descriptions,
  Input,
  Select,
  Checkbox,
  Empty,
  Spin,
  Row,
  Col,
  Statistic,
} from 'antd'
import {
  ThunderboltOutlined,
  PlusOutlined,
  SaveOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  FileTextOutlined,
} from '@ant-design/icons'
import { api } from '../services/api'

const { Title, Text, Paragraph } = Typography

interface TemplateData {
  id: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  status: string
  current_version: number
  format_fingerprint: string | null
  style_spec: any
  updated_at: string
}

interface Variable {
  id?: string
  name: string
  label: string
  var_type: string
  default_value: string | null
  description: string | null
  enum_options: string[] | null
  is_required: boolean
}

const VAR_TYPES = ['text', 'number', 'date', 'enum', 'boolean', 'object', 'list']

const statusColors: Record<string, string> = {
  active: 'green',
  draft: 'orange',
  archived: 'default',
}

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<TemplateData | null>(null)
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getTemplate(id),
      api.getVariables(id),
    ]).then(([tpl, vars]) => {
      setTemplate(tpl as any)
      setVariables((vars as any) || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const addVariable = () => {
    setVariables([...variables, {
      name: '', label: '', var_type: 'text',
      default_value: null, description: null, enum_options: null, is_required: false,
    }])
    setEditing(true)
  }

  const updateVariable = (index: number, field: string, value: any) => {
    const updated = [...variables]
    ;(updated[index] as any)[field] = value
    setVariables(updated)
  }

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index))
  }

  const saveVariables = async () => {
    if (!id) return
    try {
      await api.updateVariables(id, variables)
      setEditing(false)
    } catch (err) {
      console.error('Failed to save variables:', err)
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
  if (!template) return <Empty description="模板不存在" />

  const variableColumns = [
    {
      title: '变量名',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      render: (text: string, _: any, i: number) => editing
        ? <Input size="small" value={text} onChange={e => updateVariable(i, 'name', e.target.value)} />
        : <Text code>{text}</Text>,
    },
    {
      title: '显示名',
      dataIndex: 'label',
      key: 'label',
      width: 150,
      render: (text: string, _: any, i: number) => editing
        ? <Input size="small" value={text} onChange={e => updateVariable(i, 'label', e.target.value)} />
        : text || '-',
    },
    {
      title: '类型',
      dataIndex: 'var_type',
      key: 'var_type',
      width: 100,
      render: (text: string, _: any, i: number) => editing
        ? <Select size="small" value={text} onChange={v => updateVariable(i, 'var_type', v)} options={VAR_TYPES.map(t => ({ label: t, value: t }))} />
        : <Tag>{text}</Tag>,
    },
    {
      title: '必填',
      dataIndex: 'is_required',
      key: 'is_required',
      width: 60,
      align: 'center' as const,
      render: (checked: boolean, _: any, i: number) => editing
        ? <Checkbox checked={checked} onChange={e => updateVariable(i, 'is_required', e.target.checked)} />
        : checked ? <Tag color="red">必填</Tag> : '-',
    },
    {
      title: '默认值',
      dataIndex: 'default_value',
      key: 'default_value',
      render: (text: string, _: any, i: number) => editing
        ? <Input size="small" value={text || ''} onChange={e => updateVariable(i, 'default_value', e.target.value)} />
        : text || '-',
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_: any, __: any, i: number) => editing
        ? <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => removeVariable(i)} />
        : null,
    },
  ]

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 24 } }}>
          <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
            <Descriptions.Item label="描述" span={2}>
              {template.description || <Text type="secondary">暂无描述</Text>}
            </Descriptions.Item>
            <Descriptions.Item label="分类">{template.category || '-'}</Descriptions.Item>
            <Descriptions.Item label="版本">v{template.current_version}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={statusColors[template.status]}>{template.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="更新时间">{template.updated_at}</Descriptions.Item>
            <Descriptions.Item label="标签" span={2}>
              {template.tags.length > 0
                ? template.tags.map((tag, i) => <Tag key={i} color="blue">{tag}</Tag>)
                : <Text type="secondary">无标签</Text>}
            </Descriptions.Item>
            {template.format_fingerprint && (
              <Descriptions.Item label="样式指纹" span={2}>
                <Text code style={{ fontSize: 12 }}>{template.format_fingerprint}</Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      ),
    },
    {
      key: 'variables',
      label: `变量配置 (${variables.length})`,
      children: (
        <Card
          style={{ borderRadius: 12 }}
          extra={
            <Space>
              <Button icon={<PlusOutlined />} onClick={addVariable}>添加变量</Button>
              {editing && <Button type="primary" icon={<SaveOutlined />} onClick={saveVariables}>保存</Button>}
            </Space>
          }
        >
          {variables.length === 0 ? (
            <Empty description="暂无变量，点击「添加变量」开始配置" />
          ) : (
            <Table
              dataSource={variables.map((v, i) => ({ ...v, key: i }))}
              columns={variableColumns}
              pagination={false}
              size="small"
            />
          )}
        </Card>
      ),
    },
    {
      key: 'styles',
      label: '样式信息',
      children: template.style_spec ? (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            {[
              { label: '页面尺寸', value: template.style_spec.page?.size || '-' },
              { label: '页面方向', value: template.style_spec.page?.orientation || '-' },
              { label: '检测样式数', value: Object.keys(template.style_spec.styles || {}).length + ' 个' },
              { label: '编号定义', value: (template.style_spec.numbering || []).length + ' 个' },
            ].map((item, i) => (
              <Col key={i} xs={12} sm={6}>
                <Card size="small" style={{ borderRadius: 8, textAlign: 'center' }}>
                  <Statistic title={item.label} value={item.value} valueStyle={{ fontSize: 16 }} />
                </Card>
              </Col>
            ))}
          </Row>

          {Object.keys(template.style_spec.styles || {}).length > 0 && (
            <Card title="段落样式列表" style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={Object.entries(template.style_spec.styles || {}).map(([name, s]: [string, any], i) => ({
                  key: i, name, ...s,
                }))}
                columns={[
                  { title: '样式名', dataIndex: 'name', render: (t: string) => <Text strong>{t}</Text> },
                  { title: '字体', dataIndex: 'font_en', render: (v: string, r: any) => v || r.font_cn || '-' },
                  { title: '字号', dataIndex: 'size_pt', render: (v: number) => v ? `${v}pt` : '-' },
                  { title: '粗体', dataIndex: 'bold', render: (v: boolean) => v ? 'Yes' : '-' },
                  { title: '斜体', dataIndex: 'italic', render: (v: boolean) => v ? 'Yes' : '-' },
                  { title: '对齐', dataIndex: 'alignment', render: (v: string) => v || 'left' },
                ]}
                pagination={false}
                size="small"
              />
            </Card>
          )}
        </div>
      ) : (
        <Empty description="暂未提取样式信息" />
      ),
    },
    {
      key: 'preview',
      label: '模板预览',
      children: <PreviewContent templateId={template.id} />,
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/templates')}
          style={{ marginBottom: 12, padding: 0 }}
        >
          返回模板中心
        </Button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>{template.name}</Title>
            <Space style={{ marginTop: 8 }}>
              {template.category && <Tag>{template.category}</Tag>}
              <Text type="secondary">v{template.current_version}</Text>
              <Tag color={statusColors[template.status]}>{template.status}</Tag>
            </Space>
          </div>
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => navigate(`/generate/${id}`)}
          >
            生成文档
          </Button>
        </div>
      </div>

      <Tabs items={tabItems} defaultActiveKey="info" />
    </div>
  )
}

const PREVIEW_PAGE_W = 720
const PREVIEW_PAGE_H = Math.round((PREVIEW_PAGE_W * 297) / 210)

function PreviewContent({ templateId }: { templateId: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState('')
  const [pages, setPages] = useState<Element[][]>([])
  const measureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoadingPreview(true)
    setPreviewError('')
    api.previewTemplate(templateId)
      .then((res: any) => setHtml(res.html || ''))
      .catch((err: any) => setPreviewError(typeof err === 'string' ? err : err?.detail || '预览加载失败'))
      .finally(() => setLoadingPreview(false))
  }, [templateId])

  useEffect(() => {
    if (!html) return
    const container = measureRef.current
    if (!container) return
    const content = container.querySelector('.doc-preview') as HTMLElement | null
    if (!content || content.children.length === 0) return

    const cs = getComputedStyle(content)
    const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
    const pageH = content.clientWidth * (297 / 210) - padV
    const groups: Element[][] = []
    let current: Element[] = []
    let pageTop = 0
    Array.from(content.children).forEach((child) => {
      const el = child as HTMLElement
      if (current.length > 0 && el.offsetTop - pageTop + el.offsetHeight > pageH) {
        groups.push(current)
        current = []
        pageTop = el.offsetTop
      }
      current.push(el)
    })
    if (current.length) groups.push(current)
    setPages(groups)
  }, [html])

  if (loadingPreview) return <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
  if (previewError) return <Empty description={previewError} />

  return (
    <div>
      <div
        ref={measureRef}
        style={{ position: 'absolute', visibility: 'hidden', left: -9999, top: 0, width: PREVIEW_PAGE_W }}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
      <div style={{ maxHeight: '70vh', overflow: 'auto', padding: 16, background: '#f8fafc', borderRadius: 12 }}>
        {pages.length === 0 ? (
          <Empty description="文档内容为空" />
        ) : pages.map((els, i) => (
          <div
            key={i}
            ref={(node) => {
              if (node && node.childElementCount === 0) {
                els.forEach((el) => node.appendChild(el.cloneNode(true)))
              }
            }}
            className="doc-preview"
            style={{
              width: PREVIEW_PAGE_W,
              minHeight: PREVIEW_PAGE_H,
              background: '#fff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              margin: '0 auto 24px',
              position: 'relative',
              boxSizing: 'border-box',
              borderRadius: 4,
            }}
          >
            <span style={{ position: 'absolute', right: 10, bottom: 6, fontSize: 11, color: '#bbb' }}>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
