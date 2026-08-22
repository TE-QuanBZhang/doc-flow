import { useState, useEffect, useRef } from 'react'
import {
  Card,
  Table,
  Tag,
  Button,
  Typography,
  Space,
  Empty,
  Spin,
  Descriptions,
  Progress,
  Row,
  Col,
  Popconfirm,
  Tabs,
  Badge,
  Tooltip,
  message,
} from 'antd'
import {
  ReloadOutlined,
  StopOutlined,
  RedoOutlined,
  UnorderedListOutlined,
  DownloadOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

const { Title, Text } = Typography

interface BatchTask {
  id: string
  title: string
  status: string
  total_count: number
  completed_count: number
  failed_count: number
  created_at: string
}

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待处理' },
  processing: { color: 'blue', label: '处理中' },
  completed: { color: 'green', label: '已完成' },
  failed: { color: 'red', label: '失败' },
  cancelled: { color: 'default', label: '已取消' },
}

export default function BatchTasks() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState<BatchTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [taskDetail, setTaskDetail] = useState<any>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadTasks = () => {
    setLoading(true)
    api.getBatchTasks()
      .then((data: any) => setTasks(Array.isArray(data) ? data : data?.data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTasks() }, [])

  useEffect(() => {
    const hasActive = tasks.some((t) => t.status === 'processing' || t.status === 'pending')
    if (hasActive) {
      if (!pollRef.current) {
        pollRef.current = setInterval(loadTasks, 5000)
      }
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    }
  }, [tasks])

  useEffect(() => {
    if (!selectedTask) { setTaskDetail(null); return }
    api.getBatchTask(selectedTask).then(setTaskDetail).catch(console.error)
  }, [selectedTask])

  const handleCancel = async (id: string) => {
    await api.cancelBatchTask(id)
    loadTasks()
  }

  const handleRetry = async (id: string) => {
    await api.retryBatchTask(id)
    loadTasks()
  }

  const handleDownloadZip = async (task: any) => {
    if (!task?.items) return
    const docIds = task.items
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
      a.download = `batch-${task.id}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      message.error('下载失败')
    }
  }

  const filteredTasks = statusFilter === 'all'
    ? tasks
    : tasks.filter((t) => t.status === statusFilter)

  const statusCounts = {
    all: tasks.length,
    processing: tasks.filter((t) => t.status === 'processing').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  }

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text: string) => <Text strong style={{ fontSize: 13 }}>{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const cfg = statusConfig[status] || { color: 'default', label: status }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: '进度',
      key: 'progress',
      width: 180,
      render: (_: any, record: BatchTask) => (
        <div style={{ minWidth: 140 }}>
          <Progress
            percent={record.total_count > 0 ? Math.round((record.completed_count / record.total_count) * 100) : 0}
            size="small"
            status={record.status === 'failed' ? 'exception' : record.status === 'completed' ? 'success' : 'active'}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.completed_count}/{record.total_count} 完成
            {record.failed_count > 0 && <span style={{ color: '#ef4444' }}> · {record.failed_count} 失败</span>}
          </Text>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (text: string) => <Text type="secondary" style={{ fontSize: 13 }}>{text}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_: any, record: BatchTask) => (
        <Space>
          {(record.status === 'processing' || record.status === 'pending') && (
            <Popconfirm title="确定取消此任务？" onConfirm={() => handleCancel(record.id)}>
              <Button size="small" danger icon={<StopOutlined />}>取消</Button>
            </Popconfirm>
          )}
          {record.status === 'failed' && record.failed_count > 0 && (
            <Tooltip title="重试失败项">
              <Button size="small" icon={<RedoOutlined />} onClick={() => handleRetry(record.id)}>
                重试
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  const selectedTaskData = tasks.find((t) => t.id === selectedTask)

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>批量任务</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>管理批量文档生成任务</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={loadTasks}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/batch-import')}>
              新建批量任务
            </Button>
          </Space>
        </div>
      </div>

      <Card style={{ borderRadius: 12, marginBottom: 16 }} styles={{ body: { padding: '4px 16px 0' } }}>
        <Tabs
          activeKey={statusFilter}
          onChange={(key) => setStatusFilter(key)}
          items={[
            { key: 'all', label: <span>全部 <Badge count={statusCounts.all} size="small" style={{ marginLeft: 4, backgroundColor: '#e2e8f0', color: '#475569' }} /></span> },
            { key: 'processing', label: <span>处理中 <Badge count={statusCounts.processing} size="small" style={{ marginLeft: 4, backgroundColor: '#2563eb' }} /></span> },
            { key: 'completed', label: <span>已完成 <Badge count={statusCounts.completed} size="small" style={{ marginLeft: 4, backgroundColor: '#10b981' }} /></span> },
            { key: 'failed', label: <span>失败 <Badge count={statusCounts.failed} size="small" style={{ marginLeft: 4, backgroundColor: '#ef4444' }} /></span> },
          ]}
        />
      </Card>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : filteredTasks.length === 0 ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty
            image={<UnorderedListOutlined style={{ fontSize: 48, color: '#cbd5e1' }} />}
            description={statusFilter === 'all' ? '暂无批量任务' : `没有${statusConfig[statusFilter]?.label || ''}的任务`}
          >
            {statusFilter === 'all' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/batch-import')}>
                创建第一个批量任务
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Row gutter={16}>
          <Col xs={24} lg={taskDetail ? 14 : 24}>
            <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={filteredTasks}
                columns={columns}
                rowKey="id"
                pagination={false}
                onRow={(record) => ({
                  onClick: () => setSelectedTask(record.id === selectedTask ? null : record.id),
                  style: {
                    cursor: 'pointer',
                    background: selectedTask === record.id ? '#eff6ff' : undefined,
                  },
                })}
              />
            </Card>
          </Col>
          {taskDetail && (
            <Col xs={24} lg={10}>
              <Card
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>任务详情</Text>
                    <Space>
                      {taskDetail.status === 'completed' && taskDetail.items?.some((i: any) => i.document_id) && (
                        <Button
                          type="primary"
                          size="small"
                          icon={<DownloadOutlined />}
                          onClick={() => handleDownloadZip(taskDetail)}
                        >
                          批量下载
                        </Button>
                      )}
                      {taskDetail.status === 'failed' && (
                        <Button
                          size="small"
                          icon={<RedoOutlined />}
                          onClick={() => handleRetry(taskDetail.id)}
                        >
                          重试
                        </Button>
                      )}
                    </Space>
                  </div>
                }
                style={{ borderRadius: 12 }}
              >
                <Descriptions column={2} size="small">
                  <Descriptions.Item label="状态" span={2}>
                    <Tag color={statusConfig[taskDetail.status]?.color}>
                      {statusConfig[taskDetail.status]?.label || taskDetail.status}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="总计">
                    <Text strong>{taskDetail.total_count}</Text> 条
                  </Descriptions.Item>
                  <Descriptions.Item label="已完成">
                    <Text style={{ color: '#10b981', fontWeight: 600 }}>{taskDetail.completed_count}</Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="失败">
                    <Text style={{ color: taskDetail.failed_count > 0 ? '#ef4444' : undefined, fontWeight: 600 }}>
                      {taskDetail.failed_count}
                    </Text>
                  </Descriptions.Item>
                  <Descriptions.Item label="进度">
                    <Progress
                      percent={taskDetail.total_count > 0
                        ? Math.round((taskDetail.completed_count / taskDetail.total_count) * 100)
                        : 0}
                      size="small"
                      style={{ width: 120 }}
                    />
                  </Descriptions.Item>
                </Descriptions>

                {taskDetail.items && taskDetail.items.length > 0 && (
                  <>
                    <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>处理记录</Title>
                    <div style={{ maxHeight: 360, overflow: 'auto' }}>
                      <Table
                        dataSource={taskDetail.items.map((item: any, i: number) => ({ ...item, key: i }))}
                        columns={[
                          {
                            title: '行',
                            dataIndex: 'row_index',
                            render: (r: number) => r + 1,
                            width: 60,
                          },
                          {
                            title: '状态',
                            dataIndex: 'status',
                            width: 80,
                            render: (s: string) => {
                              const cfg = statusConfig[s] || { color: 'default', label: s }
                              return <Tag color={cfg.color} style={{ fontSize: 11 }}>{cfg.label}</Tag>
                            },
                          },
                          {
                            title: '错误',
                            dataIndex: 'error_message',
                            ellipsis: true,
                            render: (e: string) => e
                              ? <Tooltip title={e}><Text type="danger" style={{ fontSize: 12 }}>{e}</Text></Tooltip>
                              : <Text type="secondary" style={{ fontSize: 12 }}>-</Text>,
                          },
                          {
                            title: '文档',
                            dataIndex: 'document_id',
                            width: 80,
                            render: (id: string) => id ? <Tag color="blue" style={{ fontSize: 11 }}>已生成</Tag> : '-',
                          },
                        ]}
                        pagination={false}
                        size="small"
                      />
                    </div>
                  </>
                )}
              </Card>
            </Col>
          )}
        </Row>
      )}
    </div>
  )
}
