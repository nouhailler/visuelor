import { useState } from 'react'
import { loadAll, saveAll, remove, duplicate, formatDate, uid } from '../lib/store.js'
import { TEMPLATES, createFromTemplate, blankSlide } from '../lib/templates.js'
import { ShareDialog } from './ShareDialog.jsx'

export function Dashboard({ onOpen, onImport, reloadKey = 0 }) {
  const [version, setVersion] = useState(0)
  const [shareTarget, setShareTarget] = useState(null)
  const projects = loadAll().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  const refresh = () => setVersion((v) => v + 1)

  const create = (templateId) => {
    const p = createFromTemplate(templateId)
    // sauvegarde directe du nouveau projet
    const list = loadAll()
    list.push(p)
    saveAll(list)
    onOpen(p.id)
  }

  return (
    <div className="dash" key={reloadKey + '-' + version}>
      <div className="dash-head">
        <div className="logo">
          <div className="logo-mark">🎯</div>
          <div>
            <h1>visuelor</h1>
            <div className="sub">Créez des présentations qui se visitent — popups, hotspots, navigation libre.</div>
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: 15, color: 'var(--text-dim)', marginBottom: 10 }}>Nouvelle présentation</h2>
      <div className="tpl-grid">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="tpl-card" onClick={() => create(t.id)}>
            <div className="tpl-chip" style={{ background: t.swatch }} />
            <b>{t.name}</b>
            <span>{t.desc}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '26px 0 12px' }}>
        <h2 style={{ fontSize: 15, color: 'var(--text-dim)' }}>Mes présentations ({projects.length})</h2>
        <button className="btn small" onClick={() => onImport?.()} title="Ouvrir une présentation chiffrée reçue">
          🔓 Importer un partage
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty">Aucune présentation pour l'instant — choisissez un modèle ci-dessus pour commencer.</div>
      ) : (
        <div className="proj-grid">
          {projects.map((p) => (
            <ProjectCard key={p.id + version} p={p} onOpen={() => onOpen(p.id)} onDup={() => { duplicate(p.id); refresh() }} onDel={() => { remove(p.id); refresh() }} onRename={(title) => {
              const list = loadAll()
              const x = list.find((x2) => x2.id === p.id)
              if (x) { x.title = title; x.updatedAt = Date.now(); saveAll(list) }
              refresh()
            }} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ p, onOpen, onDup, onDel, onRename }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [shareTarget, setShareTarget] = useState(null)
  const slides = p.slides?.length || 0
  const elements = (p.slides || []).reduce((n, s) => n + (s.elements?.length || 0), 0)
  return (
    <div className="proj-card">
      <div className="proj-actions">
        <button className="btn ghost small" onClick={() => setMenuOpen((v) => !v)} title="Actions">⋯</button>
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: 28, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 10, minWidth: 150 }}>
            <MenuBtn onClick={() => { setShareTarget(p); setMenuOpen(false) }} label="🔗 Partager (chiffré)" />
            <MenuBtn onClick={() => { onRename(window.prompt('Nouveau titre', p.title) ?? p.title); setMenuOpen(false) }} label="✏️ Renommer" />
            <MenuBtn onClick={() => { onDup(); setMenuOpen(false) }} label="⧉ Dupliquer" />
            <MenuBtn danger onClick={() => { if (confirm(`Supprimer « ${p.title} » ?`)) { onDel(); setMenuOpen(false) } }} label="🗑 Supprimer" />
          </div>
        )}
      </div>
      <button className="proj-open" style={{ all: 'unset', display: 'block', cursor: 'pointer', width: '100%' }} onClick={onOpen}>
        <b>{p.title}</b>
        <div className="meta">{slides} diapo{slides > 1 ? 's' : ''} · {elements} élément{elements > 1 ? 's' : ''}</div>
        <div className="meta">Modifié le {formatDate(p.updatedAt)}</div>
      </button>
      {shareTarget && <ShareDialog presentation={shareTarget} onClose={() => setShareTarget(null)} />}
    </div>
  )
}

function MenuBtn({ label, onClick, danger }) {
  return (
    <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', color: danger ? 'var(--danger)' : 'var(--text)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      onClick={onClick}>
      {label}
    </button>
  )
}

export { TEMPLATES }
