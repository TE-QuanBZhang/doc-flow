import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../services/api'

interface Template {
  id: string
  name: string
  category: string
  description: string | null
}

interface Variable {
  id?: string
  name: string
  label: string
  var_type: string
  default_value: string | null
  description: string | null
  enum_options: string[] | null
  is_required: boolean
}

export default function DocumentGenerate() {
  const { templateId } = useParams()
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string>(templateId || '')
  const [variables, setVariables] = useState<Variable[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'standard' | 'preserving'>('standard')

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch(console.error)
  }, [])

  useEffect(() => {
    if (!selectedTemplate) {
      setVariables([])
      setValues({})
      return
    }
    api.getVariables(selectedTemplate).then((vars: any) => {
      setVariables(vars || [])
      const defaults: Record<string, string> = {}
      ;(vars || []).forEach((v: Variable) => {
        defaults[v.name] = v.default_value || ''
      })
      setValues(defaults)
    }).catch(console.error)
  }, [selectedTemplate])

  const handleGenerate = async () => {
    if (!selectedTemplate) return
    setGenerating(true)
    setError('')
    setResult(null)
    try {
      const payload = {
        template_id: selectedTemplate,
        variables: values,
      }
      const res = mode === 'preserving'
        ? await api.generateDocumentPreserving(payload)
        : await api.generateDocument(payload)
      setResult(res)
    } catch (err: any) {
      setError(err?.detail || '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 24 }}>文档生成</h1>

      {result ? (
        <div style={{ background: '#fff', borderRadius: 8, padding: 24, border: '1px solid var(--border)' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
            <h3 style={{ marginBottom: 4 }}>文档生成成功</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>文档 ID: {result.id}</p>
          </div>

          {result.unresolved_placeholders?.length > 0 && (
            <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 13 }}>
              ⚠️ 以下占位符未替换：{result.unresolved_placeholders.join(', ')}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <a href={`/api/documents/${result.id}/export/word`} download
              style={{ background: 'var(--primary)', color: '#fff', padding: '10px 24px', borderRadius: 6, fontSize: 14 }}>
              下载 Word
            </a>
            <a href={`/api/documents/${result.id}/export/pdf`} download
              style={{ background: '#52c41a', color: '#fff', padding: '10px 24px', borderRadius: 6, fontSize: 14 }}>
              下载 PDF
            </a>
            <button onClick={() => { setResult(null); setGenerating(false) }}
              style={{ background: 'var(--bg)', color: 'var(--text)', padding: '10px 24px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 14 }}>
              重新生成
            </button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, border: '1px solid var(--border)', marginBottom: 16 }}>
            <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 8 }}>选择模板</label>
            <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
              style={{ maxWidth: 400 }}>
              <option value="">-- 请选择模板 --</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.category || '未分类'})</option>
              ))}
            </select>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <label style={{ fontSize: 14, fontWeight: 500, display: 'block', marginBottom: 8 }}>生成模式</label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="gen-mode" checked={mode === 'standard'}
                    onChange={() => setMode('standard')} />
                  标准生成（重建文档）
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                  <input type="radio" name="gen-mode" checked={mode === 'preserving'}
                    onChange={() => setMode('preserving')} />
                  保格式替换（1:1 保留样式/图片/表格）
                </label>
              </div>
              {mode === 'preserving' && (
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                  仅替换内容，不重建文档：字体、字号、图片大小位置、表格样式全部保留。
                </p>
              )}
            </div>
          </div>

          {variables.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 8, padding: 24, border: '1px solid var(--border)', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>填写字段</h3>
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {variables.map((v) => (
                  <div key={v.name}>
                    <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                      {v.label || v.name}
                      {v.is_required && <span style={{ color: 'var(--error)' }}> *</span>}
                    </label>
                    {v.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{v.description}</p>
                    )}
                    {v.var_type === 'boolean' ? (
                      <select value={values[v.name] || ''} onChange={e => setValues({...values, [v.name]: e.target.value})}>
                        <option value="">请选择</option>
                        <option value="true">是</option>
                        <option value="false">否</option>
                      </select>
                    ) : v.var_type === 'enum' && v.enum_options ? (
                      <select value={values[v.name] || ''} onChange={e => setValues({...values, [v.name]: e.target.value})}>
                        <option value="">请选择</option>
                        {v.enum_options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : v.var_type === 'number' ? (
                      <input type="number" value={values[v.name] || ''}
                        onChange={e => setValues({...values, [v.name]: e.target.value})} />
                    ) : (
                      <input type="text" value={values[v.name] || ''}
                        onChange={e => setValues({...values, [v.name]: e.target.value})}
                        placeholder={`输入${v.label || v.name}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, padding: 12, marginBottom: 16, color: 'var(--error)', fontSize: 14 }}>
              ❌ {error}
            </div>
          )}

          <button onClick={handleGenerate} disabled={!selectedTemplate || generating}
            style={{
              background: !selectedTemplate ? '#d9d9d9' : 'var(--primary)',
              color: '#fff', padding: '12px 32px', borderRadius: 6, fontSize: 15, fontWeight: 600,
              opacity: generating ? 0.7 : 1,
            }}>
            {generating ? '生成中...' : '生成文档'}
          </button>
        </>
      )}
    </div>
  )
}
