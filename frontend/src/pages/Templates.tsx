import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import UploadTemplateModal from '../components/UploadTemplateModal'

interface Template {
  id: string
  name: string
  category: string
  status: string
  version: string
  updated_at: string
}

// A4 page ratio: render doc at 800px wide, scale down to card width (proportional)
const PAGE_W = 800
const PAGE_H = Math.round((PAGE_W * 297) / 210)

function PreviewThumb({ html }: { html: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.25)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / PAGE_W)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return (
    <div
      ref={ref}
      style={{ position: 'relative', width: '100%', aspectRatio: '210 / 297', overflow: 'hidden', background: '#fff' }}
    >
      <div
        style={{ width: PAGE_W, height: PAGE_H, transform: `scale(${scale})`, transformOrigin: 'top left', pointerEvents: 'none' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}

export default function Templates() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  const loadTemplates = () => {
    setLoading(true)
    api.getTemplates()
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? [])
        setTemplates(list)
        // Lazy-load first-page preview for each template
        list.forEach((t: Template) => {
          api.previewTemplate(t.id)
            .then((r) => {
              const html = r?.html ?? r?.data?.html
              if (html) setPreviews((prev) => ({ ...prev, [t.id]: html }))
            })
            .catch(() => { /* keep placeholder */ })
        })
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const handleUploadComplete = () => {
    setShowUpload(false)
    loadTemplates()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600 }}>模板中心</h1>
        <button onClick={() => setShowUpload(true)}
          style={{ background: 'var(--primary)', color: '#fff', padding: '8px 20px', borderRadius: 6, fontSize: 14 }}>
          + 上传模板
        </button>
      </div>

      {showUpload && <UploadTemplateModal onClose={handleUploadComplete} />}

      {loading ? (
        <div style={{ color: 'var(--text-secondary)' }}>加载中...</div>
      ) : templates.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 8, padding: 40, textAlign: 'center', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
          <h3 style={{ marginBottom: 8 }}>暂无模板</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>上传您的第一个 Word 模板开始使用</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {templates.map((t) => (
            <Link key={t.id} to={`/templates/${t.id}`}
              style={{ display: 'block', background: '#fff', borderRadius: 10, border: '1px solid var(--border)', color: 'inherit', overflow: 'hidden', transition: 'box-shadow 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              {/* First-page preview: proportional scale of the A4 first page */}
              <div style={{ position: 'relative', background: '#e8e8e8', borderBottom: '1px solid var(--border)' }}>
                {previews[t.id] ? (
                  <PreviewThumb html={previews[t.id]} />
                ) : (
                  <div style={{ aspectRatio: '210 / 297', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: 40 }}>📄</div>
                )}
              </div>
              {/* Info */}
              <div style={{ padding: 14 }}>
                <div style={{ fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {t.category} · v{t.version} · {t.updated_at}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
