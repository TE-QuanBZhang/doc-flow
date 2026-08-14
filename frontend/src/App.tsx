import { Routes, Route, Navigate } from 'react-router-dom'
import { getToken } from './services/api'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import Templates from './pages/Templates'
import TemplateDetail from './pages/TemplateDetail'
import DocumentGenerate from './pages/DocumentGenerate'
import BatchTasks from './pages/BatchTasks'
// doc-flow chat module (main functionality)
import { GlobalProvider } from './chat/context/GlobalContext'
import Sidebar from './chat/components/Sidebar'
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
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <GlobalProvider>
            <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-200">
              <Sidebar />
              <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900">
                <Routes>
                  {/* Main functionality: AI chat / search */}
                  <Route path="/" element={<ChatPage />} />
                  <Route path="/knowledge" element={<KnowledgePage />} />
                  <Route path="/graph" element={<GraphPage />} />
                  <Route path="/history" element={<HistoryPage />} />
                  <Route path="/monitor" element={<MonitorPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  {/* Secondary module: document generation */}
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/templates/:id" element={<TemplateDetail />} />
                  <Route path="/generate/:templateId?" element={<DocumentGenerate />} />
                  <Route path="/tasks" element={<BatchTasks />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </GlobalProvider>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default App
