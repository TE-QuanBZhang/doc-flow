import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { api, setToken } from '../services/api'

const { Title, Text, Link } = Typography

type Mode = 'login' | 'register'

export default function LoginPage() {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (values: any) => {
    setError('')
    setLoading(true)
    try {
      let res: any
      if (mode === 'login') {
        res = await api.login({ username: values.username, password: values.password })
      } else {
        res = await api.register({
          username: values.username,
          email: values.email,
          password: values.password,
          display_name: values.displayName || undefined,
        })
      }
      setToken(res.access_token)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(typeof err === 'string' ? err : err?.detail || err?.message || '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f0f5ff 0%, #e8f4f8 50%, #f8fafc 100%)',
    }}>
      <Card
        style={{
          width: 420,
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          border: '1px solid #f1f5f9',
        }}
        styles={{ body: { padding: '40px 36px' } }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 800,
            fontSize: 20,
            marginBottom: 16,
          }}>
            D
          </div>
          <Title level={3} style={{ margin: 0 }}>Doc Flow</Title>
          <Text type="secondary">企业文档自动化平台</Text>
        </div>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            closable
            onClose={() => setError('')}
            style={{ marginBottom: 20, borderRadius: 8 }}
          />
        )}

        <Form layout="vertical" onFinish={handleSubmit} size="large" autoComplete="off">
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="用户名" />
          </Form.Item>

          {mode === 'register' && (
            <Form.Item
              name="email"
              rules={[
                { required: true, message: '请输入邮箱' },
                { type: 'email', message: '请输入有效邮箱' },
              ]}
            >
              <Input prefix={<MailOutlined style={{ color: '#94a3b8' }} />} placeholder="邮箱" />
            </Form.Item>
          )}

          {mode === 'register' && (
            <Form.Item name="displayName">
              <Input prefix={<UserOutlined style={{ color: '#94a3b8' }} />} placeholder="显示名称（可选）" />
            </Form.Item>
          )}

          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#94a3b8' }} />} placeholder="密码" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 16 }}>
            <Button type="primary" htmlType="submit" loading={loading} block style={{ height: 44, borderRadius: 8, fontWeight: 600 }}>
              {mode === 'login' ? '登录' : '注册'}
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center' }}>
          {mode === 'login' ? (
            <Text type="secondary">
              还没有账号？{' '}
              <Link onClick={() => { setMode('register'); setError('') }}>立即注册</Link>
            </Text>
          ) : (
            <Text type="secondary">
              已有账号？{' '}
              <Link onClick={() => { setMode('login'); setError('') }}>立即登录</Link>
            </Text>
          )}
        </div>
      </Card>
    </div>
  )
}
