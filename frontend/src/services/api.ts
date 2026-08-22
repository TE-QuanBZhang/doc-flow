import axios, { AxiosResponse } from 'axios'

// Axios interceptor extracts data, so ApiResponse<T> = Promise<T>
type ApiResponse<T> = Promise<T>

const STORAGE_KEY = 'doc_flow_token'

export function getToken(): string | null {
  return localStorage.getItem(STORAGE_KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(STORAGE_KEY)
}

const http = axios.create({
  baseURL: '/api',
  timeout: 30000,
})

// Export for components that need direct axios access (e.g., upload progress)
export { http }

// Attach JWT token to every request
http.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

http.interceptors.response.use(
  (res: AxiosResponse) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      clearToken()
    }
    return Promise.reject(err.response?.data || err.message)
  }
)

export const api = {
  // Health
  health: (): ApiResponse<any> => http.get('/health'),

  // Templates
  getTemplates: (params?: Record<string, any>): ApiResponse<any> => http.get('/templates', { params }),
  getTemplate: (id: string): ApiResponse<any> => http.get(`/templates/${id}`),
  previewTemplate: (id: string): ApiResponse<any> => http.get(`/templates/${id}/preview`),
  uploadTemplate: (formData: FormData): ApiResponse<any> => http.post('/templates', formData),
  updateTemplate: (id: string, data: any): ApiResponse<any> => http.put(`/templates/${id}`, data),
  deleteTemplate: (id: string): ApiResponse<any> => http.delete(`/templates/${id}`),

  // Template versions
  getTemplateVersions: (id: string): ApiResponse<any> => http.get(`/templates/${id}/versions`),
  rollbackTemplate: (id: string, versionId: string): ApiResponse<any> => http.post(`/templates/${id}/versions/${versionId}/rollback`),

  // Variables
  getVariables: (templateId: string): ApiResponse<any> => http.get(`/templates/${templateId}/variables`),
  updateVariables: (templateId: string, data: any): ApiResponse<any> => http.put(`/templates/${templateId}/variables`, data),

  // Documents
  generateDocument: (data: any): ApiResponse<any> => http.post('/documents/generate', data),
  generateDocumentPreserving: (data: any): ApiResponse<any> => http.post('/documents/generate-preserving', data),
  saveDraft: (data: any): ApiResponse<any> => http.post('/documents/drafts', data),
  getDocument: (id: string): ApiResponse<any> => http.get(`/documents/${id}`),
  previewDocument: (id: string): ApiResponse<any> => http.get(`/documents/${id}/preview`),

  // Export
  exportWord: (id: string): ApiResponse<Blob> => http.get(`/documents/${id}/export/word`, { responseType: 'blob' }),
  exportPdf: (id: string): ApiResponse<Blob> => http.get(`/documents/${id}/export/pdf`, { responseType: 'blob' }),

  // Batch tasks
  createBatchTask: (templateId: string, title: string): ApiResponse<any> =>
    http.post('/tasks/batch', null, { params: { template_id: templateId, title } }),
  importBatchData: (taskId: string, formData: FormData): ApiResponse<any> =>
    http.post(`/tasks/batch/${taskId}/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  startBatchTask: (taskId: string): ApiResponse<any> => http.post(`/tasks/${taskId}/start`),
  getBatchTasks: (params?: Record<string, any>): ApiResponse<any> => http.get('/tasks', { params }),
  getBatchTask: (id: string): ApiResponse<any> => http.get(`/tasks/${id}`),
  retryBatchTask: (id: string): ApiResponse<any> => http.post(`/tasks/${id}/retry`),
  cancelBatchTask: (id: string): ApiResponse<any> => http.post(`/tasks/${id}/cancel`),
  downloadBatchZip: (documentIds: string[]): ApiResponse<Blob> =>
    http.post('/documents/export/batch-zip', { document_ids: documentIds }, { responseType: 'blob' }),

  // Auth
  login: (data: { username: string; password: string }): ApiResponse<any> => http.post('/auth/login', data),
  register: (data: any): ApiResponse<any> => http.post('/auth/register', data),

  // Users (admin)
  getUsers: (): ApiResponse<any> => http.get('/users'),
  createUser: (data: any): ApiResponse<any> => http.post('/users', data),
  updateUser: (id: string, data: any): ApiResponse<any> => http.put(`/users/${id}`, data),
}
