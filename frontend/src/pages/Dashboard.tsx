import { Card, Col, Row, Statistic, Typography } from 'antd'
import { FileTextOutlined, FileDoneOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons'

const { Title, Text } = Typography

const stats = [
  { title: '模板总数', value: 0, icon: <FileTextOutlined />, color: '#2563eb' },
  { title: '本月生成文档', value: 0, icon: <FileDoneOutlined />, color: '#7c3aed' },
  { title: '进行中任务', value: 0, icon: <ThunderboltOutlined />, color: '#f59e0b' },
  { title: '已完成任务', value: 0, icon: <CheckCircleOutlined />, color: '#10b981' },
]

export default function Dashboard() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>工作台</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>文档生成概览</Text>
      </div>

      <Row gutter={[16, 16]}>
        {stats.map((s) => (
          <Col key={s.title} xs={24} sm={12} lg={6}>
            <Card style={{ borderRadius: 12 }} styles={{ body: { padding: 24 } }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Statistic title={s.title} value={s.value} />
                <div style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: `${s.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: s.color,
                  fontSize: 20,
                }}>
                  {s.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}
