import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Steps,
  Button,
  Card,
  Input,
  Select,
  Form,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Empty,
  Spin,
  Result,
  Alert,
  Divider,
  Tooltip,
} from 'antd'
import {
  FileTextOutlined,
  EditOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  RedoOutlined,
  SearchOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  ImportOutlined,
} from '@ant-design/icons'
import { api } from '../services/api'

const { Title, Text, Paragraph } = Typography

interface Template {
  id: string
  name: string
  category: string
  description: string | null
  status: string
  version: string
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

export default function DocumentGenerate() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [variables, setVariables] = useState<Variable[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [variablesLoading, setVariablesLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    setTemplatesLoading(true)
    api.getTemplates()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? [])
        setTemplates(list)
        if (templateId) {
          const found = list.find((t: Template) => t.id === templateId)
          if (found) handleSelectTemplate(found)
        }
      })
      .catch(console.error)
      .finally(() => setTemplatesLoading(false))
  }, [templateId])

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setVariablesLoading(true)
    api.getVariables(template.id)
      .then((vars: any) => {
        const varList = vars || []
        setVariables(varList)
        const defaults: Record<string, string> = {}
        varList.forEach((v: Variable) => {
          defaults[v.name] = v.default_value || ''
        })
        setValues(defaults)
      })
      .catch(console.error)
      .finally(() => setVariablesLoading(false))
  }

  const handleValueChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const validateFields = (): boolean => {
    const required = variables.filter((v) => v.is_required)
    return required.every((v) => {
      const val = values[v.name]
      return val !== undefined && val !== null && val.toString().trim() !== ''
    })
  }

  const handleGenerate = async () => {
    if (!selectedTemplate) return
    setGenerating(true)
    setError('')
    setResult(null)
    try {
      const res = await api.generateDocumentPreserving({
        template_id: selectedTemplate.id,
        variables: values,
      })
      setResult(res)
      setCurrentStep(3)
    } catch (err: any) {
      setError(err?.detail || '生成失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleReset = () => {
    setCurrentStep(0)
    setSelectedTemplate(null)
    setVariables([])
    setValues({})
    setResult(null)
    setError('')
  }

  const filteredTemplates = templates.filter(
    (t) => !searchText || t.name.toLowerCase().includes(searchText.toLowerCase())
  )

  const steps = [
    { title: '选择模板', icon: <FileTextOutlined /> },
    { title: '填写数据', icon: <EditOutlined /> },
    { title: '确认预览', icon: <EyeOutlined /> },
    { title: '生成完成', icon: <CheckCircleOutlined /> },
  ]

  const renderStep0 = () => (
    <div>
      <div style={{ marginBottom: 20 }}>
        <Input
          placeholder="搜索模板..."
          prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 360 }}
          allowClear
          size="large"
        />
      </div>

      {templatesLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : filteredTemplates.length === 0 ? (
        <Empty description="暂无可用模板，请先在模板中心上传" />
      ) : (
        <Row gutter={[16, 16]}>
          {filteredTemplates.map((t) => (
            <Col key={t.id} xs={24} sm={12} lg={8} xl={6}>
              <Card
                hoverable
                onClick={() => handleSelectTemplate(t)}
                style={{
                  borderRadius: 12,
                  border: selectedTemplate?.id === t.id ? '2px solid #2563eb' : '1px solid #f1f5f9',
                  background: selectedTemplate?.id === t.id ? '#eff6ff' : '#fff',
                }}
                styles={{ body: { padding: 20 } }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: selectedTemplate?.id === t.id ? '#2563eb' : '#f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.2s',
                  }}>
                    <FileTextOutlined style={{
                      fontSize: 18,
                      color: selectedTemplate?.id === t.id ? '#fff' : '#64748b',
                    }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 4 }}>
                      {t.name}
                    </Text>
                    <Space size={4} wrap>
                      {t.category && <Tag style={{ borderRadius: 4, fontSize: 11 }}>{t.category}</Tag>}
                      <Text type="secondary" style={{ fontSize: 12 }}>v{t.version}</Text>
                    </Space>
                    {t.description && (
                      <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 6, marginBottom: 0 }} ellipsis={{ rows: 2 }}>
                        {t.description}
                      </Paragraph>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )

  const renderStep1 = () => (
    <div>
      {variablesLoading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : variables.length === 0 ? (
        <Result
          icon={<CheckCircleOutlined style={{ color: '#10b981' }} />}
          title="该模板无需填写字段"
          subTitle="模板中没有检测到变量，可以直接生成文档"
          extra={
            <Button type="primary" onClick={() => setCurrentStep(2)}>
              下一步
            </Button>
          }
        />
      ) : (
        <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 24 } }}>
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ fontSize: 15 }}>填写文档字段</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>
              共 {variables.length} 个字段，{variables.filter((v) => v.is_required).length} 个必填
            </Text>
          </div>

          <Row gutter={[24, 20]}>
            {variables.map((v) => (
              <Col key={v.name} xs={24} sm={12}>
                <Form.Item
                  label={
                    <Space>
                      <span>{v.label || v.name}</span>
                      {v.is_required && <span style={{ color: '#ef4444' }}>*</span>}
                    </Space>
                  }
                  required={v.is_required}
                  style={{ marginBottom: 0 }}
                  help={v.description}
                >
                  {v.var_type === 'boolean' ? (
                    <Select
                      value={values[v.name] || undefined}
                      onChange={(val) => handleValueChange(v.name, val)}
                      placeholder="请选择"
                      options={[
                        { label: '是', value: 'true' },
                        { label: '否', value: 'false' },
                      ]}
                    />
                  ) : v.var_type === 'enum' && v.enum_options ? (
                    <Select
                      value={values[v.name] || undefined}
                      onChange={(val) => handleValueChange(v.name, val)}
                      placeholder="请选择"
                      options={v.enum_options.map((o) => ({ label: o, value: o }))}
                    />
                  ) : v.var_type === 'number' ? (
                    <Input
                      type="number"
                      value={values[v.name] || ''}
                      onChange={(e) => handleValueChange(v.name, e.target.value)}
                      placeholder={`输入${v.label || v.name}`}
                    />
                  ) : (
                    <Input
                      value={values[v.name] || ''}
                      onChange={(e) => handleValueChange(v.name, e.target.value)}
                      placeholder={`输入${v.label || v.name}`}
                    />
                  )}
                </Form.Item>
              </Col>
            ))}
          </Row>
        </Card>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div>
      <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: 24 } }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <Text strong style={{ fontSize: 15 }}>确认文档信息</Text>
            <br />
            <Text type="secondary" style={{ fontSize: 13 }}>请检查以下信息，确认无误后生成文档</Text>
          </div>
          <Tag color="blue" icon={<ThunderboltOutlined />}>1:1 保真模式</Tag>
        </div>

        <Divider style={{ margin: '12px 0 16px' }} />

        <Row gutter={[24, 16]}>
          <Col xs={24} sm={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>使用模板</Text>
            <div style={{ fontWeight: 500, marginTop: 4 }}>{selectedTemplate?.name}</div>
          </Col>
          <Col xs={24} sm={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>模板分类</Text>
            <div style={{ fontWeight: 500, marginTop: 4 }}>{selectedTemplate?.category || '未分类'}</div>
          </Col>
          <Col xs={24} sm={8}>
            <Text type="secondary" style={{ fontSize: 12 }}>填写字段数</Text>
            <div style={{ fontWeight: 500, marginTop: 4 }}>
              {Object.values(values).filter((v) => v && v.trim() !== '').length} / {variables.length}
            </div>
          </Col>
        </Row>

        {variables.length > 0 && (
          <>
            <Divider style={{ margin: '16px 0' }} />
            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>字段值预览</Text>
            <Row gutter={[16, 8]}>
              {variables.map((v) => (
                <Col key={v.name} xs={24} sm={12}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f8fafc' }}>
                    <Text type="secondary" style={{ fontSize: 13 }}>{v.label || v.name}</Text>
                    <Text style={{ fontSize: 13, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {values[v.name] || <Text type="secondary">未填写</Text>}
                    </Text>
                  </div>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Card>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={() => setError('')}
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}
    </div>
  )

  const renderStep3 = () => {
    if (!result) return null
    return (
      <Result
        status="success"
        title="文档生成成功"
        subTitle={`文档 ID: ${result.id}`}
        extra={[
          <Button
            key="word"
            type="primary"
            icon={<DownloadOutlined />}
            href={`/api/documents/${result.id}/export/word`}
          >
            下载 Word
          </Button>,
          <Button
            key="pdf"
            icon={<DownloadOutlined />}
            href={`/api/documents/${result.id}/export/pdf`}
          >
            下载 PDF
          </Button>,
          <Button key="reset" icon={<RedoOutlined />} onClick={handleReset}>
            重新生成
          </Button>,
        ]}
      >
        {result.unresolved_placeholders?.length > 0 && (
          <Alert
            type="warning"
            message="以下占位符未替换"
            description={result.unresolved_placeholders.join(', ')}
            showIcon
            style={{ marginTop: 16, borderRadius: 8, textAlign: 'left' }}
          />
        )}
      </Result>
    )
  }

  const canProceed = () => {
    if (currentStep === 0) return selectedTemplate !== null
    if (currentStep === 1) return validateFields()
    return true
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>文档生成</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>选择模板，填写数据，一键生成保真文档</Text>
          </div>
          <Button icon={<ImportOutlined />} onClick={() => navigate('/batch-import')}>
            批量导入
          </Button>
        </div>
      </div>

      <Card style={{ borderRadius: 12, marginBottom: 24 }} styles={{ body: { padding: '24px 48px' } }}>
        <Steps
          current={currentStep}
          items={steps}
          style={{ maxWidth: 600, margin: '0 auto' }}
        />
      </Card>

      <div style={{ marginBottom: 24 }}>
        {currentStep === 0 && renderStep0()}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
      </div>

      {currentStep < 3 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => currentStep === 0 ? navigate('/templates') : setCurrentStep(currentStep - 1)}
          >
            {currentStep === 0 ? '返回模板中心' : '上一步'}
          </Button>
          {currentStep < 2 && (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              disabled={!canProceed()}
              onClick={() => {
                if (currentStep === 1 && variables.length === 0) {
                  setCurrentStep(2)
                } else {
                  setCurrentStep(currentStep + 1)
                }
              }}
            >
              下一步
            </Button>
          )}
          {currentStep === 2 && (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={generating}
              onClick={handleGenerate}
            >
              生成文档
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
