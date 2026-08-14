import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../services/api'

interface TemplateDetail {
  id: string
  name: string
  description: string | null
  category: string | null
  tags: string[]
  status: string
  current_version: number
  format_fingerprint: string | null
  style_spec: any
  updated_at: string
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

const VAR_TYPES = ['text', 'number', 'date', 'enum', 'boolean', 'object', 'list']

export default function TemplateDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [template, setTemplate] = useState<TemplateDetail | null>(null)
  const [variables, setVariables] = useState<Variable[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'info' | 'variables' | 'styles' | 'preview'>('info')

  useEffect(() => {
    if (!id) return
    Promise.all([
      api.getTemplate(id),
      api.getVariables(id),
    ]).then(([tpl, vars]) => {
      setTemplate(tpl as any)
      setVariables((vars as any) || [])
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const addVariable = () => {
    setVariables([...variables, {
      name: '',
      label: '',
      var_type: 'text',
      default_value: null,
      description: null,
      enum_options: null,
      is_required: false,
    }])
    setEditing(true)
  }

  const updateVariable = (index: number, field: string, value: any) => {
    const updated = [...variables]
    ;(updated[index] as any)[field] = value
    setVariables(updated)
  }

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index))
  }

  const saveVariables = async () => {
    if (!id) return
    try {
      await api.updateVariables(id, variables)
      setEditing(false)
    } catch (err) {
      console.error('Failed to save variables:', err)
    }
  }

  const handleGenerate = () => {
    navigate(`/generate/${id}`)
  }

  if (loading) return <div>加载中...</div>
  if (!template) return <div>模板不存在</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>{template.name}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            {template.category} · v{template.current_version} · {template.status}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleGenerate}
            style={{ background: 'var(--primary)', color: '#fff', padding: '8px 20px', borderRadius: 6, fontSize: 14 }}>
            生成文档
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {(['info', 'variables', 'styles', 'preview'] as const).map(tab => (
          <button key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 16px',
              background: 'none',
              color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent',
              fontWeight: activeTab === tab ? 600 : 400,
              fontSize: 14,
            }}>
            {{ info: '基本信息', variables: '变量配置', styles: '样式信息', preview: '模板预览' }[tab]}
          </button>
        ))}
      </div>

      {activeTab === 'info' && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 24, border: '1px solid var(--border)' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>描述</label>
            <p>{template.description || '暂无描述'}</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>标签</label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {template.tags.length > 0 ? template.tags.map((tag, i) => (
                <span key={i} style={{ background: '#f0f5ff', color: 'var(--primary)', padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>
                  {tag}
                </span>
              )) : <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>无标签</span>}
            </div>
          </div>
          {template.format_fingerprint && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>样式指纹</label>
              <span style={{ fontSize: 12, fontFamily: 'monospace', background: '#f5f5f5', padding: '4px 8px', borderRadius: 4 }}>
                {template.format_fingerprint}
              </span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'variables' && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 24, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>变量列表（{variables.length}）</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={addVariable}
                style={{ background: 'var(--bg)', color: 'var(--text)', padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}>
                + 添加变量
              </button>
              {editing && (
                <button onClick={saveVariables}
                  style={{ background: 'var(--primary)', color: '#fff', padding: '6px 16px', borderRadius: 6, fontSize: 13 }}>
                  保存
                </button>
              )}
            </div>
          </div>

          {variables.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
              暂无变量，点击"添加变量"开始配置
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', fontSize: 13, color: 'var(--text-secondary)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>变量名</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>显示名</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>类型</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>必填</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>默认值</th>
                  <th style={{ width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {variables.map((v, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '8px 12px' }}>
                      <input value={v.name} onChange={e => updateVariable(i, 'name', e.target.value)}
                        style={{ fontSize: 13, padding: '4px 8px' }} />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input value={v.label} onChange={e => updateVariable(i, 'label', e.target.value)}
                        style={{ fontSize: 13, padding: '4px 8px' }} />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <select value={v.var_type} onChange={e => updateVariable(i, 'var_type', e.target.value)}
                        style={{ fontSize: 13, padding: '4px 8px', width: 'auto' }}>
                        {VAR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input type="checkbox" checked={v.is_required}
                        onChange={e => updateVariable(i, 'is_required', e.target.checked)} />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <input value={v.default_value || ''} onChange={e => updateVariable(i, 'default_value', e.target.value)}
                        style={{ fontSize: 13, padding: '4px 8px' }} />
                    </td>
                    <td style={{ padding: '8px 12px' }}>
                      <button onClick={() => removeVariable(i)}
                        style={{ color: 'var(--error)', background: 'none', fontSize: 16 }}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'styles' && template.style_spec && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 24, border: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>样式概览</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: '页面尺寸', value: template.style_spec.page?.size || '-' },
              { label: '页面方向', value: template.style_spec.page?.orientation || '-' },
              { label: '检测样式数', value: Object.keys(template.style_spec.styles || {}).length + ' 个' },
              { label: '编号定义', value: (template.style_spec.numbering || []).length + ' 个' },
              { label: '表格样式', value: template.style_spec.table?.style_name || '-' },
              { label: '样式指纹', value: template.format_fingerprint || '-', mono: true },
            ].map((item, i) => (
              <div key={i} style={{ background: '#fafafa', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6 }}>{item.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, fontFamily: (item as any).mono ? 'monospace' : 'inherit' }}>{item.value}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>段落样式列表</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>样式名</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>字体</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>字号</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>粗体</th>
                  <th style={{ textAlign: 'center', padding: '8px 10px' }}>斜体</th>
                  <th style={{ textAlign: 'left', padding: '8px 10px' }}>对齐</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>行距</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>段前</th>
                  <th style={{ textAlign: 'right', padding: '8px 10px' }}>段后</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(template.style_spec.styles || {}).map(([name, s]: [string, any]) => (
                  <tr key={name} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '6px 10px', fontWeight: 500 }}>{name}</td>
                    <td style={{ padding: '6px 10px' }}>{s.font_en || s.font_cn || '-'}</td>
                    <td style={{ padding: '6px 10px' }}>{s.size_pt}pt</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{s.bold ? '✅' : '-'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>{s.italic ? '✅' : '-'}</td>
                    <td style={{ padding: '6px 10px' }}>{s.alignment || 'left'}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{s.line_spacing}</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{s.space_before_pt}pt</td>
                    <td style={{ padding: '6px 10px', textAlign: 'right' }}>{s.space_after_pt}pt</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {template.style_spec.constraints && template.style_spec.constraints.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>格式约束</h3>
              <ul style={{ paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                {template.style_spec.constraints.map((c: string, i: number) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {activeTab === 'styles' && !template.style_spec && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 40, textAlign: 'center', border: '1px solid var(--border)' }}>
          <p style={{ color: 'var(--text-secondary)' }}>暂未提取样式信息，请重新上传模板。</p>
        </div>
      )}

      {activeTab === 'preview' && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 24, border: '1px solid var(--border)' }}>
          <PreviewContent templateId={template.id} />
        </div>
      )}
    </div>
  )
}

const PREVIEW_PAGE_W = 720
const PREVIEW_PAGE_H = Math.round((PREVIEW_PAGE_W * 297) / 210)

function PreviewContent({ templateId }: { templateId: string }) {
  const [html, setHtml] = useState<string | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [previewError, setPreviewError] = useState('')
  const [pages, setPages] = useState<Element[][]>([])
  const measureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoadingPreview(true)
    setPreviewError('')
    api.previewTemplate(templateId)
      .then((res: any) => {
        setHtml(res.html || '')
      })
      .catch((err: any) => {
        setPreviewError(typeof err === 'string' ? err : err?.detail || '预览加载失败')
      })
      .finally(() => setLoadingPreview(false))
  }, [templateId])

  // Paginate: group doc blocks by A4 page height (blocks never split mid-element)
  useEffect(() => {
    if (!html) return
    const container = measureRef.current
    if (!container) return
    const content = container.querySelector('.doc-preview') as HTMLElement | null
    if (!content || content.children.length === 0) return

    const cs = getComputedStyle(content)
    const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
    const pageH = content.clientWidth * (297 / 210) - padV
    const groups: Element[][] = []
    let current: Element[] = []
    let pageTop = 0
    Array.from(content.children).forEach((child) => {
      const el = child as HTMLElement
      if (current.length > 0 && el.offsetTop - pageTop + el.offsetHeight > pageH) {
        groups.push(current)
        current = []
        pageTop = el.offsetTop
      }
      current.push(el)
    })
    if (current.length) groups.push(current)
    setPages(groups)
  }, [html])

  if (loadingPreview) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>加载预览中...</div>
  }

  if (previewError) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <p style={{ color: 'var(--error)', marginBottom: 8 }}>❌ {previewError}</p>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>请确认模板文件存在且格式正确</p>
      </div>
    )
  }

  return (
    <div>
      {/* Off-screen measuring container (same width as pages) */}
      <div
        ref={measureRef}
        style={{ position: 'absolute', visibility: 'hidden', left: -9999, top: 0, width: PREVIEW_PAGE_W }}
        dangerouslySetInnerHTML={{ __html: html || '' }}
      />
      {/* Paginated A4 pages */}
      <div style={{ maxHeight: '70vh', overflow: 'auto', padding: 16, background: '#f0f0f0', borderRadius: 8 }}>
        {pages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>文档内容为空</div>
        ) : pages.map((els, i) => (
          <div
            key={i}
            ref={(node) => {
              if (node && node.childElementCount === 0) {
                els.forEach((el) => node.appendChild(el.cloneNode(true)))
              }
            }}
            className="doc-preview"
            style={{
              width: PREVIEW_PAGE_W,
              minHeight: PREVIEW_PAGE_H,
              background: '#fff',
              boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
              margin: '0 auto 24px',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <span style={{ position: 'absolute', right: 10, bottom: 6, fontSize: 11, color: '#bbb' }}>{i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
