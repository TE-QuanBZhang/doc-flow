import { useState } from 'react'
import { Layout, Menu, Tooltip, Avatar, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  HomeOutlined,
  HistoryOutlined,
  BookOutlined,
  SettingOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  AppstoreOutlined,
  ImportOutlined,
} from '@ant-design/icons'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { clearToken } from '../services/api'

const { Sider, Content } = Layout

type MenuItem = Required<MenuProps>['items'][number]

const menuItems: MenuItem[] = [
  {
    key: '/',
    icon: <HomeOutlined />,
    label: 'AI 助手',
  },
  {
    key: '/history',
    icon: <HistoryOutlined />,
    label: '对话历史',
  },
  {
    key: '/knowledge',
    icon: <BookOutlined />,
    label: '知识库',
  },
  {
    type: 'divider',
  },
  {
    key: 'doc-group',
    label: '文档管理',
    icon: <AppstoreOutlined />,
    children: [
      {
        key: '/templates',
        icon: <FileTextOutlined />,
        label: '模板中心',
      },
      {
        key: '/generate',
        icon: <ThunderboltOutlined />,
        label: '文档生成',
      },
      {
        key: '/batch-import',
        icon: <ImportOutlined />,
        label: '批量导入',
      },
      {
        key: '/tasks',
        icon: <UnorderedListOutlined />,
        label: '批量任务',
      },
    ],
  },
  {
    type: 'divider' as const,
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: '设置',
  },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const selectedKey = location.pathname === '/' ? '/' : location.pathname

  const openKeys = menuItems
    .filter((item): item is MenuItem & { children: MenuItem[] } => 'children' in (item || {}) && !!(item as any)?.children?.some((c: any) => selectedKey.startsWith((c as any).key)))
    .map((item) => (item as any).key as string)
    .filter(Boolean)

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key.startsWith('/')) {
      navigate(key)
    }
  }

  const handleLogout = () => {
    clearToken()
    navigate('/login')
  }

  const userMenuItems = [
    { key: 'settings', icon: <SettingOutlined />, label: '设置', onClick: () => navigate('/settings') },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: handleLogout },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        collapsedWidth={64}
        style={{
          borderRight: '1px solid #f1f5f9',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          padding: collapsed ? '0 16px' : '0 20px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 10,
          borderBottom: '1px solid #f1f5f9',
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}>
            D
          </div>
          {!collapsed && (
            <span style={{ fontWeight: 700, fontSize: 16, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Doc Flow
            </span>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          defaultOpenKeys={openKeys}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ border: 'none', padding: '8px 0' }}
        />

        <div style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          padding: '12px 16px',
          borderTop: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: 8,
        }}>
          {!collapsed && (
            <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <Avatar size={28} icon={<UserOutlined />} style={{ background: '#2563eb' }} />
                <span style={{ fontSize: 13, color: '#475569' }}>用户</span>
              </div>
            </Dropdown>
          )}
          <Tooltip title={collapsed ? '展开菜单' : '收起菜单'} placement="right">
            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                fontSize: 16,
              }}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </Tooltip>
        </div>
      </Sider>

      <Layout style={{ marginLeft: collapsed ? 64 : 240, transition: 'margin-left 0.2s ease' }}>
        <Content style={{
          margin: 0,
          padding: 24,
          minHeight: '100vh',
          background: '#f8fafc',
          overflow: 'auto',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
