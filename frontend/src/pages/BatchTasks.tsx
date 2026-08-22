import { useState, useEffect } from 'react'
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
} from 'antd'
import {
  ReloadOutlined,
  StopOutlined,
  RedoOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons'
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
  const [tasks, setTasks] = useState<BatchTask[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [taskDetail, setTaskDetail] = useState<any>(null)

  const loadTasks = () => {
    setLoading(true)
    api.getBatchTasks()
      .then((data: any) => setTasks(data || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTasks() }, [])

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

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const cfg = statusConfig[status] || { color: 'default', label: status }
        return <Tag color={cfg.color}>{cfg.label}</Tag>
      },
    },
    {
      title: '进度',
      key: 'progress',
      render: (_: any, record: BatchTask) => (
        <div style={{ minWidth: 120 }}>
          <Progress
            percent={record.total_count > 0 ? Math.round((record.completed_count / record.total_count) * 100) : 0}
            size="small"
            status={record.status === 'failed' ? 'exception' : undefined}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.completed_count}/{record.total_count} 完成
            {record.failed_count > 0 && ` · ${record.failed_count} 失败`}
          </Text>
        </div>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => <Text type="secondary" style={{ fontSize: 13 }}>{text}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: BatchTask) => (
        <Space>
          {record.status === 'processing' && (
            <Popconfirm title="确定取消此任务？" onConfirm={() => handleCancel(record.id)}>
              <Button size="small" danger icon={<StopOutlined />}>取消</Button>
            </Popconfirm>
          )}
          {record.failed_count > 0 && (
            <Button size="small" icon={<RedoOutlined />} onClick={() => handleRetry(record.id)}>
              重试
            </Button>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>批量任务</Title>
            <Text type="secondary" style={{ fontSize: 13 }}>管理批量文档生成任务</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={loadTasks}>刷新</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>
      ) : tasks.length === 0 ? (
        <Card style={{ borderRadius: 12 }}>
          <Empty
            image={<UnorderedListOutlined style={{ fontSize: 48, color: '#cbd5e1' }} />}
            description="暂无批量任务"
          />
        </Card>
      ) : (
        <Row gutter={16}>
          <Col xs={24} lg={taskDetail ? 14 : 24}>
            <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 0 } }}>
              <Table
                dataSource={tasks}
                columns={columns}
                rowKey="id"
                pagination={false}
                onRow={(record) => ({
                  onClick: () => setSelectedTask(record.id),
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
              <Card title="任务详情" style={{ borderRadius: 12 }}>
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="状态">
                    <Tag color={statusConfig[taskDetail.status]?.color}>
                      {statusConfig[taskDetail.status]?.label || taskDetail.status}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="总计">{taskDetail.total_count} 条</Descriptions.Item>
                  <Descriptions.Item label="已完成">{taskDetail.completed_count}</Descriptions.Item>
                  <Descriptions.Item label="失败">{taskDetail.failed_count}</Descriptions.Item>
                </Descriptions>

                {taskDetail.items && taskDetail.items.length > 0 && (
                  <>
                    <Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>处理记录</Title>
                    <div style={{ maxHeight: 300, overflow: 'auto' }}>
                      <Table
                        dataSource={taskDetail.items.map((item: any, i: number) => ({ ...item, key: i }))}
                        columns={[
                          { title: '行', dataIndex: 'row', render: (r: number) => r + 1, width: 60 },
                          { title: '状态', dataIndex: 'status', width: 80 },
                          { title: '错误', dataIndex: 'error', render: (e: string) => e || '-' },
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
