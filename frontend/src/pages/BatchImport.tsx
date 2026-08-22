import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Steps,
  Button,
  Card,
  Input,
  Select,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Empty,
  Spin,
  Result,
  Alert,
  Upload,
  Table,
  Progress,
  Tooltip,
  message,
} from 'antd'
import {
  FileTextOutlined,
  UploadOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  SearchOutlined,
  FileExcelOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined,
  StopOutlined,
  InboxOutlined,
} from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { api } from '../services/api'

const { Title, Text, Paragraph } = Typography
const { Dragger } = Upload

interface Template {
  id: string
  name: string
  category: string
  description: string | null
  status: string
  version: string
}

interface Variable {
  name: string
  label: string
  var_type: string
  is_required: boolean
  description: string | null
}

interface ParsedFile {
  headers: string[]
  rows: Record<string, any>[]
  fileName: string
}

type Mapping = Record<string, string>

const AUTO_MATCH_THRESHOLD = 0.6

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-\.]/g, '')
}

function similarity(a: string, b: string): number {
  const na = normalize(a)
  const nb = normalize(b)
  if (na === nb) return 1
  if (na.includes(nb) || nb.includes(na)) return 0.8
  let matches = 0
  const shorter = na.length < nb.length ? na : nb
  const longer = na.length >= nb.length ? na : nb
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++
  }
  return matches / longer.length
}

function autoMatch(variables: Variable[], headers: string[]): Mapping {
  const mapping: Mapping = {}
  const usedHeaders = new Set<string>()
  const sorted = variables
    .slice()
    .sort((a, b) => (b.is_required ? 1 : 0) - (a.is_required ? 1 : 0))

  for (const v of sorted) {
    let bestScore = AUTO_MATCH_THRESHOLD
    let bestHeader = ''
    const candidates = [v.name, v.label, v.description || ''].filter(Boolean)
    for (const h of headers) {
      if (usedHeaders.has(h)) continue
      for (const c of candidates) {
        const score = similarity(c, h)
        if (score > bestScore) {
          bestScore = score
          bestHeader = h
        }
      }
    }
    if (bestHeader) {
      mapping[v.name] = bestHeader
      usedHeaders.add(bestHeader)
    }
  }
  return mapping
}

export default function BatchImport() {
  const [currentStep, setCurrentStep] = useState(0)
  const [templates, setTemplates] = useState<Template[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null)
  const [variables, setVariables] = useState<Variable[]>([])
  const [variablesLoading, setVariablesLoading] = useState(false)
  const [searchText, setSearchText] = useState('')

  const [parsedFile, setParsedFile] = useState<ParsedFile | null>(null)
  const [fileParsing, setFileParsing] = useState(false)

  const [mapping, setMapping] = useState<Mapping>({})
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setTemplatesLoading(true)
    api.getTemplates()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? [])
        setTemplates(list)
      })
      .catch(console.error)
      .finally(() => setTemplatesLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const handleSelectTemplate = (template: Template) => {
    setSelectedTemplate(template)
    setVariablesLoading(true)
    setParsedFile(null)
    setMapping({})
    api.getVariables(template.id)
      .then((vars: any) => {
        setVariables(vars || [])
      })
      .catch(console.error)
      .finally(() => setVariablesLoading(false))
  }

  const handleFileParse = (file: File) => {
    setFileParsing(true)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' })
        if (json.length === 0) {
          message.warning('文件为空或格式不正确')
          setFileParsing(false)
          return
        }
        const headers = Object.keys(json[0])
        setParsedFile({ headers, rows: json, fileName: file.name })
        if (variables.length > 0) {
          setMapping(autoMatch(variables, headers))
        }
        setFileParsing(false)
      } catch {
        message.error('文件解析失败，请检查文件格式')
        setFileParsing(false)
      }
    }
    reader.readAsArrayBuffer(file)
    return false
  }

  useEffect(() => {
    if (parsedFile && variables.length > 0 && Object.keys(mapping).length === 0) {
      setMapping(autoMatch(variables, parsedFile.headers))
    }
  }, [variables, parsedFile])

  const handleMappingChange = (varName: string, column: string) => {
    setMapping((prev) => ({ ...prev, [varName]: column }))
  }

  const unmappedRequired = variables.filter(
    (v) => v.is_required && !mapping[v.name]
  )

  const handleSubmit = async () => {
    if (!selectedTemplate || !parsedFile) return
    setSubmitting(true)
    setError('')
    try {
      const title = `${selectedTemplate.name} - 批量生成 (${parsedFile.fileName})`
      const createRes = await api.createBatchTask(selectedTemplate.id, title)
      const newTaskId = createRes.id

      const formData = new FormData()
      const blob = new Blob([], { type: 'application/octet-stream' })
      const file = new File([blob], parsedFile.fileName, { type: 'application/octet-stream' })

      const reExported = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(parsedFile.rows)
      XLSX.utils.book_append_sheet(reExported, ws, 'Sheet1')
      const buf = XLSX.write(reExported, { type: 'array', bookType: 'xlsx' })
      const uploadFile = new File(
        [buf],
        parsedFile.fileName.replace(/\.[^.]+$/, '.xlsx'),
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      )
      formData.append('file', uploadFile)
      await api.importBatchData(newTaskId, formData)
      setTaskId(newTaskId)

      await api.startBatchTask(newTaskId)
      setCurrentStep(3)
      startPolling(newTaskId)
    } catch (err: any) {
      setError(err?.detail || err?.message || '批量任务创建失败')
    } finally {
      setSubmitting(false)
    }
  }

  const startPolling = (id: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const detail = await api.getBatchTask(id)
        setTaskStatus(detail)
        if (detail.status === 'completed' || detail.status === 'failed' || detail.status === 'cancelled') {
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch {
        // ignore polling errors
      }
    }, 3000)
  }

  const handleCancelTask = async () => {
    if (!taskId) return
    await api.cancelBatchTask(taskId)
    const detail = await api.getBatchTask(taskId)
    setTaskStatus(detail)
  }

  const handleDownloadZip = async () => {
    if (!taskStatus?.items) return
    const docIds = taskStatus.items
      .filter((item: any) => item.document_id)
      .map((item: any) => item.document_id)
    if (docIds.length === 0) {
      message.warning('没有可下载的文档')
      return
    }
    try {
      const blob = await api.downloadBatchZip(docIds)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `batch-${taskId}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('下载失败')
    }
  }

  const handleReset = () => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = null
    setCurrentStep(0)
    setSelectedTemplate(null)
    setVariables([])
    setParsedFile(null)
    setMapping({})
    setTaskId(null)
    setTaskStatus(null)
    setError('')
  }

  const filteredTemplates = templates.filter(
    (t) => !searchText || t.name.toLowerCase().includes(searchText.toLowerCase())
  )

  const steps = [
    { title: '选择模板', icon: <FileTextOutlined /> },
    { title: '上传数据', icon: <UploadOutlined /> },
    { title: '字段映射', icon: <SwapOutlined /> },
    { title: '生成进度', icon: <CheckCircleOutlined /> },
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
        <Empty description="暂无可用模板" />
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
                    width: 40, height: 40, borderRadius: 10,
                    background: selectedTemplate?.id === t.id ? '#2563eb' : '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, transition: 'all 0.2s',
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
      <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: 24 } }}>
        <div style={{ marginBottom: 16 }}>
          <Text strong style={{ fontSize: 15 }}>上传数据文件</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 13 }}>
            支持 .xlsx、.xls、.csv 格式，文件第一行将作为列标题
          </Text>
        </div>

        <Dragger
          accept=".xlsx,.xls,.csv"
          showUploadList={false}
          beforeUpload={(file) => { handleFileParse(file); return false }}
          disabled={fileParsing || variablesLoading}
          style={{
            borderRadius: 12,
            padding: '20px 0',
            border: parsedFile ? '1px dashed #10b981' : '1px dashed #e2e8f0',
            background: parsedFile ? '#f0fdf4' : undefined,
          }}
        >
          <p style={{ marginBottom: 8 }}>
            {parsedFile ? (
              <FileExcelOutlined style={{ fontSize: 40, color: '#10b981' }} />
            ) : (
              <InboxOutlined style={{ fontSize: 40, color: '#94a3b8' }} />
            )}
          </p>
          <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
            {parsedFile ? parsedFile.fileName : '点击或拖拽文件到此区域'}
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 0 }}>
            {parsedFile
              ? `${parsedFile.rows.length} 行数据 · ${parsedFile.headers.length} 列`
              : '支持 Excel (.xlsx/.xls) 和 CSV 格式'}
          </p>
        </Dragger>

        {parsedFile && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <Button
              size="small"
              icon={<DeleteOutlined />}
              onClick={() => { setParsedFile(null); setMapping({}) }}
            >
              重新上传
            </Button>
          </div>
        )}
      </Card>

      {parsedFile && parsedFile.rows.length > 0 && (
        <Card title="数据预览（前 5 行）" style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={parsedFile.rows.slice(0, 5).map((r, i) => ({ ...r, _key: i }))}
            columns={parsedFile.headers.map((h) => ({
              title: h,
              dataIndex: h,
              key: h,
              ellipsis: true,
              width: 150,
              render: (val: any) => <Text style={{ fontSize: 13 }}>{String(val ?? '')}</Text>,
            }))}
            rowKey="_key"
            pagination={false}
            scroll={{ x: 'max-content' }}
            size="small"
          />
        </Card>
      )}

      {fileParsing && (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin tip="解析文件中..." /></div>
      )}
    </div>
  )

  const renderStep2 = () => (
    <div>
      <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: 24 } }}>
        <div style={{ marginBottom: 20 }}>
          <Text strong style={{ fontSize: 15 }}>字段映射</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 13 }}>
            将数据文件的列映射到模板变量。系统已尝试自动匹配，您可以手动调整。
          </Text>
        </div>

        {variables.length === 0 ? (
          <Alert type="info" message="该模板没有需要映射的变量" showIcon />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {variables.map((v) => {
              const isMapped = !!mapping[v.name]
              return (
                <div
                  key={v.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                    padding: '12px 16px',
                    borderRadius: 10,
                    border: `1px solid ${isMapped ? '#bbf7d0' : v.is_required ? '#fecaca' : '#f1f5f9'}`,
                    background: isMapped ? '#f0fdf4' : v.is_required ? '#fef2f2' : '#fafafa',
                  }}
                >
                  <div style={{ flex: '0 0 180px' }}>
                    <Text strong style={{ fontSize: 13 }}>
                      {v.label || v.name}
                      {v.is_required && <span style={{ color: '#ef4444', marginLeft: 4 }}>*</span>}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {v.var_type} · {v.name}
                    </Text>
                  </div>
                  <div style={{ flex: '0 0 40px', textAlign: 'center' }}>
                    <SwapOutlined style={{ color: isMapped ? '#10b981' : '#cbd5e1', fontSize: 16 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select
                      value={mapping[v.name] || undefined}
                      onChange={(val) => handleMappingChange(v.name, val)}
                      placeholder="选择对应列..."
                      allowClear
                      style={{ width: '100%' }}
                      options={[
                        ...parsedFile!.headers.map((h) => ({ label: h, value: h })),
                      ]}
                    />
                  </div>
                  <div style={{ flex: '0 0 60px', textAlign: 'center' }}>
                    {isMapped ? (
                      <Tag color="success">已映射</Tag>
                    ) : v.is_required ? (
                      <Tag color="error">必填</Tag>
                    ) : (
                      <Tag>未映射</Tag>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {parsedFile && Object.keys(mapping).length > 0 && (
        <Card title="映射预览（前 3 行）" style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={parsedFile.rows.slice(0, 3).map((r, i) => {
              const row: Record<string, any> = { _key: i }
              variables.forEach((v) => {
                const col = mapping[v.name]
                if (col) row[v.label || v.name] = r[col] ?? ''
              })
              return row
            })}
            columns={variables
              .filter((v) => mapping[v.name])
              .map((v) => ({
                title: v.label || v.name,
                dataIndex: v.label || v.name,
                key: v.name,
                ellipsis: true,
                render: (val: any) => <Text style={{ fontSize: 13 }}>{String(val ?? '')}</Text>,
              }))}
            rowKey="_key"
            pagination={false}
            size="small"
          />
        </Card>
      )}
    </div>
  )

  const renderStep3 = () => (
    <div>
      {taskStatus ? (
        <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: 24 } }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <Text strong style={{ fontSize: 16 }}>批量生成进度</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 13 }}>
                任务 ID: {taskId}
              </Text>
            </div>
            <Space>
              {taskStatus.status === 'processing' && (
                <Button danger icon={<StopOutlined />} onClick={handleCancelTask}>
                  取消任务
                </Button>
              )}
              {(taskStatus.status === 'completed' || taskStatus.status === 'failed') && taskStatus.items?.some((i: any) => i.document_id) && (
                <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownloadZip}>
                  批量下载
                </Button>
              )}
              {taskStatus.status === 'failed' && (
                <Button icon={<ReloadOutlined />} onClick={() => api.retryBatchTask(taskId!).then(() => startPolling(taskId!))}>
                  重试失败项
                </Button>
              )}
            </Space>
          </div>

          <Row gutter={24} style={{ marginBottom: 20 }}>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>总计</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#0f172a' }}>
                  {taskStatus.total_count || 0}
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>已完成</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>
                  {taskStatus.completed_count || 0}
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>失败</Text>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>
                  {taskStatus.failed_count || 0}
                </div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>进度</Text>
                <div style={{ marginTop: 8 }}>
                  <Progress
                    type="circle"
                    size={64}
                    percent={taskStatus.total_count > 0
                      ? Math.round(((taskStatus.completed_count || 0) / taskStatus.total_count) * 100)
                      : 0}
                    status={taskStatus.status === 'failed' ? 'exception' : taskStatus.status === 'completed' ? 'success' : 'active'}
                  />
                </div>
              </div>
            </Col>
          </Row>

          {taskStatus.items && taskStatus.items.length > 0 && (
            <Table
              dataSource={taskStatus.items.map((item: any, i: number) => ({ ...item, key: i }))}
              columns={[
                { title: '行号', dataIndex: 'row_index', width: 70, render: (r: number) => r + 1 },
                {
                  title: '状态',
                  dataIndex: 'status',
                  width: 100,
                  render: (s: string) => {
                    const cfg: Record<string, { color: string; label: string }> = {
                      pending: { color: 'default', label: '待处理' },
                      processing: { color: 'blue', label: '处理中' },
                      completed: { color: 'green', label: '完成' },
                      failed: { color: 'red', label: '失败' },
                    }
                    const c = cfg[s] || { color: 'default', label: s }
                    return <Tag color={c.color}>{c.label}</Tag>
                  },
                },
                {
                  title: '错误信息',
                  dataIndex: 'error_message',
                  render: (e: string) => e ? <Text type="danger" style={{ fontSize: 12 }}>{e}</Text> : '-',
                },
                {
                  title: '文档',
                  dataIndex: 'document_id',
                  width: 100,
                  render: (id: string) => id ? <Tag color="blue">已生成</Tag> : '-',
                },
              ]}
              pagination={false}
              size="small"
              scroll={{ y: 300 }}
            />
          )}
        </Card>
      ) : (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" tip="正在启动批量任务..." />
        </div>
      )}

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          closable
          onClose={() => setError('')}
          style={{ borderRadius: 8 }}
        />
      )}
    </div>
  )

  const canProceed = () => {
    if (currentStep === 0) return selectedTemplate !== null
    if (currentStep === 1) return parsedFile !== null && parsedFile.rows.length > 0
    if (currentStep === 2) return unmappedRequired.length === 0
    return true
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>批量导入生成</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          上传 Excel/CSV 数据文件，批量生成文档
        </Text>
      </div>

      <Card style={{ borderRadius: 12, marginBottom: 24 }} styles={{ body: { padding: '24px 48px' } }}>
        <Steps
          current={currentStep}
          items={steps}
          style={{ maxWidth: 640, margin: '0 auto' }}
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
            onClick={() => currentStep === 0 ? setCurrentStep(0) : setCurrentStep(currentStep - 1)}
            disabled={currentStep === 0}
          >
            上一步
          </Button>
          {currentStep < 2 && (
            <Button
              type="primary"
              icon={<ArrowRightOutlined />}
              disabled={!canProceed()}
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          )}
          {currentStep === 2 && (
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={submitting}
              disabled={!canProceed()}
              onClick={handleSubmit}
            >
              开始批量生成 ({parsedFile?.rows.length || 0} 条)
            </Button>
          )}
        </div>
      )}

      {currentStep === 3 && taskStatus?.status !== 'processing' && (
        <div style={{ textAlign: 'center' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleReset}>
            新建批量任务
          </Button>
        </div>
      )}
    </div>
  )
}
