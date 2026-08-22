import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  Button,
  Input,
  Select,
  Tag,
  Space,
  Empty,
  Spin,
  Row,
  Col,
  Typography,
  Modal,
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  FileTextOutlined,
  FilterOutlined,
  EyeOutlined,
  EditOutlined,
} from '@ant-design/icons'
import { api } from '../services/api'
import UploadTemplateModal from '../components/UploadTemplateModal'

const { Title, Text } = Typography

interface Template {
  id: string
  name: string
  category: string
  status: string
  version: string
  updated_at: string
  description?: string
  tags?: string[]
}

const PAGE_W = 800
const PAGE_H = Math.round((PAGE_W * 297) / 210)

function PreviewThumb({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.25)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / PAGE_W)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div
      ref={ref}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '210 / 297',
        overflow: 'hidden',
        background: '#fff',
        borderRadius: 6,
      }}
    >
      <div
        style={{
          width: PAGE_W,
          height: PAGE_H,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

const statusColors: Record<string, string> = {
  active: 'green',
  draft: 'orange',
  archived: 'default',
}

const statusLabels: Record<string, string> = {
  active: '已发布',
  draft: '草稿',
  archived: '已归档',
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const loadTemplates = () => {
    setLoading(true)
    api.getTemplates()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? [])
        setTemplates(list)
        list.forEach((t: Template) => {
          api.previewTemplate(t.id)
            .then((r) => {
              const html = r?.html ?? r?.data?.html
              if (html) setPreviews((prev) => ({ ...prev, [t.id]: html }))
            })
            .catch(() => {})
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))]

  const filteredTemplates = templates.filter((t) => {
    const matchSearch = !searchText || t.name.toLowerCase().includes(searchText.toLowerCase())
    const matchCategory = !categoryFilter || t.category === categoryFilter
    const matchStatus = !statusFilter || t.status === statusFilter
    return matchSearch && matchCategory && matchStatus
  })

  const handleUploadComplete = () => {
    setShowUpload(false)
    loadTemplates()
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>模板中心</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>管理和使用文档模板</Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowUpload(true)}>
            上传模板
          </Button>
        </div>

        <Space wrap size={12}>
          <Input
            placeholder="搜索模板名称..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            placeholder="分类筛选"
            value={categoryFilter || undefined}
            onChange={(v) => setCategoryFilter(v || '')}
            allowClear
            style={{ width: 160 }}
            options={categories.map((c) => ({ label: c, value: c }))}
            suffixIcon={<FilterOutlined />}
          />
          <Select
            placeholder="状态筛选"
            value={statusFilter || undefined}
            onChange={(v) => setStatusFilter(v || '')}
            allowClear
            style={{ width: 140 }}
            options={[
              { label: '已发布', value: 'active' },
              { label: '草稿', value: 'draft' },
              { label: '已归档', value: 'archived' },
            ]}
          />
        </Space>
      </div>

      {showUpload && <UploadTemplateModal onClose={handleUploadComplete} />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="加载中..." />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <Empty
            image={<FileTextOutlined style={{ fontSize: 48, color: '#cbd5e1' }} />}
            description={
              searchText || categoryFilter || statusFilter
                ? '没有匹配的模板'
                : '暂无模板，上传您的第一个 Word 模板开始使用'
            }
          >
            {!searchText && !categoryFilter && !statusFilter && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowUpload(true)}>
                上传模板
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {filteredTemplates.map((t) => (
            <Col key={t.id} xs={24} sm={12} lg={8} xl={6}>
              <Link to={`/templates/${t.id}`} style={{ display: 'block' }}>
                <Card
                  hoverable
                  styles={{ body: { padding: 0 } }}
                  style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid #f1f5f9' }}
                  cover={
                    <div style={{ background: '#f8fafc', padding: 12, borderBottom: '1px solid #f1f5f9' }}>
                      {previews[t.id] ? (
                        <PreviewThumb html={previews[t.id]} />
                      ) : (
                        <div style={{
                          aspectRatio: '210 / 297',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#fff',
                          borderRadius: 6,
                        }}>
                          <FileTextOutlined style={{ fontSize: 40, color: '#cbd5e1' }} />
                        </div>
                      )}
                    </div>
                  }
                >
                  <div style={{ padding: '12px 16px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <Text strong style={{ fontSize: 14, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </Text>
                      <Tag color={statusColors[t.status] || 'default'} style={{ marginLeft: 8, borderRadius: 4 }}>
                        {statusLabels[t.status] || t.status}
                      </Tag>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {t.category && <Tag style={{ borderRadius: 4 }}>{t.category}</Tag>}
                      <Text type="secondary" style={{ fontSize: 12 }}>v{t.version}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{t.updated_at}</Text>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <Button size="small" icon={<EyeOutlined />} type="text">
                        预览
                      </Button>
                      <Button size="small" icon={<EditOutlined />} type="text">
                        生成
                      </Button>
                    </div>
                  </div>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}
