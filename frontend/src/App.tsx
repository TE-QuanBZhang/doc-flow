import { Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { getToken } from './services/api'
import { docFlowTheme } from './theme/config'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Templates from './pages/Templates'
import TemplateDetail from './pages/TemplateDetail'
import DocumentGenerate from './pages/DocumentGenerate'
import BatchTasks from './pages/BatchTasks'
import AppLayout from './components/AppLayout'
import { GlobalProvider } from './chat/context/GlobalContext'
import ChatPage from './chat/pages/ChatPage'
import KnowledgePage from './chat/pages/KnowledgePage'
import GraphPage from './chat/pages/GraphPage'
import HistoryPage from './chat/pages/HistoryPage'
import MonitorPage from './chat/pages/MonitorPage'
import SettingsPage from './chat/pages/SettingsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = getToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

function App() {
  return (
    <ConfigProvider theme={docFlowTheme} locale={zhCN}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <GlobalProvider>
              <Routes>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<ChatPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/knowledge" element={<KnowledgePage />} />
                  <Route path="/graph" element={<GraphPage />} />
                  <Route path="/monitor" element={<MonitorPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/templates/:id" element={<TemplateDetail />} />
                  <Route path="/generate/:templateId?" element={<DocumentGenerate />} />
                  <Route path="/tasks" element={<BatchTasks />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Routes>
            </GlobalProvider>
          </ProtectedRoute>
        } />
      </Routes>
    </ConfigProvider>
  )
}

export default App
