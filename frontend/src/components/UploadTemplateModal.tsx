import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'

type UploadStep = 'select' | 'form' | 'result' | 'error'

interface UploadResult {
  id: string
  name: string
  status: string
  variables_count?: number
  format_fingerprint?: string | null
}

export default function UploadTemplateModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState<UploadStep>('select')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [description, setDescription] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [formError, setFormError] = useState('')

  const MAX_SIZE = 50 * 1024 * 1024 // 50MB

  const validateFile = (f: File): string => {
    if (!f.name.toLowerCase().endsWith('.docx')) {
      return '仅支持 .docx 格式的模板文件'
    }
    if (f.size > MAX_SIZE) {
      return `文件大小超过限制 (最大 50MB，当前 ${(f.size / 1024 / 1024).toFixed(1)}MB)`
    }
    return ''
  }

  const handleFileSelect = useCallback((f: File) => {
    const err = validateFile(f)
    if (err) {
      setFileError(err)
      setFile(null)
      return
    }
    setFileError('')
    setFile(f)
    // Auto-advance to form with filename as default name
    setName(f.name.replace(/\.docx$/i, ''))
    setStep('form')
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) handleFileSelect(droppedFile)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleFilePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) handleFileSelect(selected)
  }

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag))

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const resetModal = () => {
    setStep('select')
    setFile(null)
    setFileError('')
    setUploadProgress(0)
    setUploading(false)
    setResult(null)
    setErrorMsg('')
    setName('')
    setCategory('')
    setDescription('')
    setTags([])
    setTagInput('')
    setFormError('')
  }

  const handleSubmit = async () => {
    if (!name.trim()) {
      setFormError('请输入模板名称')
      return
    }
    setFormError('')
    setUploading(true)
    setUploadProgress(0)

    console.log('[UPLOAD] Step 1: Submit triggered', { name, category, description, tags, fileName: file?.name })

    try {
      const formData = new FormData()
      if (file) formData.append('file', file)
      formData.append('name', name.trim())
      formData.append('category', category)
      formData.append('description', description)
      formData.append('tags', JSON.stringify(tags))

      console.log('[UPLOAD] Step 2: FormData prepared, sending request...')

      // Upload with progress tracking using shared http instance
      const { http } = await import('../services/api')
      console.log('[UPLOAD] Request URL:', http.defaults.baseURL + '/templates')
      const res = await http.post('/templates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0
          console.log('[UPLOAD] Progress:', percent, '%')
          setUploadProgress(percent)
        },
      })

      console.log('[UPLOAD] Step 3: Response data:', res)

      setResult(res as unknown as UploadResult)
      setStep('result')
    } catch (err: any) {
      console.error('[UPLOAD] Step 4: Upload failed')
      console.error('[UPLOAD] Error:', err)
      console.error('[UPLOAD] Error response:', err?.response)
      console.error('[UPLOAD] Error status:', err?.response?.status)
      console.error('[UPLOAD] Error data:', err?.response?.data)
      const detail = err?.response?.data?.detail || err?.message || '上传失败，请重试'
      setErrorMsg(detail)
      setStep('error')
    } finally {
      setUploading(false)
    }
  }

  // --- Modal overlay style ---
  const overlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.45)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  const modalStyle: React.CSSProperties = {
    background: '#fff', borderRadius: 12, width: 520,
    maxHeight: '80vh', overflow: 'auto',
    boxShadow: '0 6px 30px rgba(0,0,0,0.15)',
  }

  const headerStyle: React.CSSProperties = {
    padding: '20px 24px 0', fontSize: 18, fontWeight: 600,
  }

  const bodyStyle: React.CSSProperties = {
    padding: 24,
  }

  const footerStyle: React.CSSProperties = {
    padding: '16px 24px', borderTop: '1px solid var(--border)',
    display: 'flex', justifyContent: 'flex-end', gap: 8,
  }

  // --- Drop zone ---
  const dropZoneStyle: React.CSSProperties = {
    border: `2px dashed ${dragOver ? 'var(--primary)' : 'var(--border)'}`,
    borderRadius: 10, padding: 48, textAlign: 'center',
    cursor: 'pointer', transition: 'all 0.2s',
    background: dragOver ? 'rgba(22,119,255,0.04)' : '#fafafa',
  }

  // --- Step indicator ---
  const StepIndicator = () => {
    const steps = ['选择文件', '配置信息', '完成']
    const currentIdx = step === 'select' ? 0 : step === 'form' ? 1 : 2
    return (
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
        {steps.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <div style={{ width: 24, height: 1, background: i <= currentIdx ? 'var(--primary)' : 'var(--border)' }} />}
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600,
              background: i <= currentIdx ? 'var(--primary)' : 'var(--bg)',
              color: i <= currentIdx ? '#fff' : 'var(--text-secondary)',
            }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: i <= currentIdx ? 'var(--primary)' : 'var(--text-secondary)' }}>{s}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          上传模板
          {step !== 'result' && step !== 'error' && <StepIndicator />}
        </div>

        <div style={bodyStyle}>
          {/* Step 1: File selection */}
          {step === 'select' && (
            <>
              <div
                style={dropZoneStyle}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <div style={{ fontSize: 40, marginBottom: 8 }}>📄</div>
                <p style={{ fontWeight: 500, marginBottom: 4 }}>拖拽 .docx 文件到此处</p>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>或点击选择文件</p>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>支持 .docx 格式，最大 50MB</p>
              </div>
              {fileError && (
                <div style={{ background: '#fff2f0', borderRadius: 6, padding: 10, marginTop: 12, color: 'var(--error)', fontSize: 13 }}>
                  ❌ {fileError}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept=".docx" style={{ display: 'none' }} onChange={handleFilePickerChange} />
            </>
          )}

          {/* Step 2: Metadata form */}
          {step === 'form' && (
            <>
              {file && (
                <div style={{ background: '#f6ffed', borderRadius: 6, padding: '8px 12px', marginBottom: 16, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✅ {file.name} ({(file.size / 1024).toFixed(0)}KB)
                </div>
              )}

              {uploading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <div style={{ fontSize: 14, marginBottom: 12, color: 'var(--text-secondary)' }}>上传中 {uploadProgress}%</div>
                  <div style={{ background: 'var(--bg)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s', borderRadius: 8 }} />
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>
                      模板名称 <span style={{ color: 'var(--error)' }}>*</span>
                    </label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="输入模板名称" />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>分类</label>
                    <select value={category} onChange={e => setCategory(e.target.value)}>
                      <option value="">请选择分类</option>
                      <option value="HR">HR</option>
                      <option value="Legal">法务</option>
                      <option value="Sales">销售</option>
                      <option value="Finance">财务</option>
                      <option value="Admin">行政</option>
                      <option value="Other">其他</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>标签</label>
                    <div style={{ display: 'flex', gap: 4, marginBottom: 4, flexWrap: 'wrap' }}>
                      {tags.map(tag => (
                        <span key={tag} style={{ background: '#f0f5ff', color: 'var(--primary)', padding: '2px 8px', borderRadius: 12, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {tag}
                          <button onClick={() => removeTag(tag)} style={{ background: 'none', color: 'var(--primary)', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyDown}
                        placeholder="输入标签后按回车" style={{ flex: 1 }} />
                      <button onClick={addTag}
                        style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
                        + 添加
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>描述</label>
                    <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                      placeholder="模板用途描述（可选）" />
                  </div>
                  {formError && (
                    <div style={{ color: 'var(--error)', fontSize: 13 }}>⚠️ {formError}</div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Step 3: Result */}
          {step === 'result' && result && (
            <div style={{ textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <h3 style={{ marginBottom: 8 }}>模板创建成功</h3>
              <div style={{ background: '#f6ffed', borderRadius: 8, padding: 16, marginTop: 12, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{result.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span>状态：{result.status === 'draft' ? '草稿' : result.status}</span>
                  {result.variables_count !== undefined && (
                    <span>检测到变量：{result.variables_count} 个</span>
                  )}
                  {result.format_fingerprint && (
                    <span style={{ fontSize: 11, fontFamily: 'monospace' }}>
                      样式指纹：{result.format_fingerprint}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error step */}
          {step === 'error' && (
            <div style={{ textAlign: 'center', padding: 12 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
              <h3 style={{ marginBottom: 8, color: 'var(--error)' }}>上传失败</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={footerStyle}>
          {step === 'select' && (
            <button onClick={onClose}
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '8px 20px', borderRadius: 6, fontSize: 14 }}>
              取消
            </button>
          )}
          {step === 'form' && !uploading && (
            <>
              <button onClick={() => { resetModal(); setStep('select') }}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '8px 20px', borderRadius: 6, fontSize: 14 }}>
                上一步
              </button>
              <button onClick={handleSubmit}
                style={{ background: 'var(--primary)', color: '#fff', padding: '8px 20px', borderRadius: 6, fontSize: 14, fontWeight: 600 }}>
                创建模板
              </button>
            </>
          )}
          {step === 'result' && result && (
            <>
              <button onClick={onClose}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '8px 20px', borderRadius: 6, fontSize: 14 }}>
                关闭
              </button>
              <button onClick={() => { onClose(); navigate(`/templates/${result.id}`) }}
                style={{ background: 'var(--primary)', color: '#fff', padding: '8px 20px', borderRadius: 6, fontSize: 14 }}>
                查看模板
              </button>
            </>
          )}
          {step === 'error' && (
            <>
              <button onClick={onClose}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', padding: '8px 20px', borderRadius: 6, fontSize: 14 }}>
                关闭
              </button>
              <button onClick={resetModal}
                style={{ background: 'var(--primary)', color: '#fff', padding: '8px 20px', borderRadius: 6, fontSize: 14 }}>
                重新上传
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
