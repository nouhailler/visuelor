import { useState } from 'react'
import { loadAll, saveAll, remove, duplicate, formatDate, uid, loadFolders, saveFolders, renameFolder, deleteFolder } from '../lib/store.js'
import { TEMPLATES, createFromTemplate, blankSlide } from '../lib/templates.js'
import { ShareDialog } from './ShareDialog.jsx'

export function Dashboard({ onOpen, onImport, reloadKey = 0 }) {
  const [version, setVersion] = useState(0)
  const [shareTarget, setShareTarget] = useState(null)
  const [folders, setFolders] = useState(() => loadFolders())
  // 'all' | 'none' | nom de dossier
  const [active, setActive] = useState('all')
  const projects = loadAll().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  const refresh = () => setVersion((v) => v + 1)

  const filtered = active === 'all'
    ? projects
    : projects.filter((p) => (p.folder || '') === (active === 'none' ? '' : active))

  const create = (templateId) => {
    const p = createFromTemplate(templateId)
    // le nouveau projet se crée dans le dossier affiché (s'il ne s'agit pas de "Tous"/"Sans dossier")
    p.folder = active !== 'all' && active !== 'none' ? active : ''
    const list = loadAll()
    list.push(p)
    saveAll(list)
    onOpen(p.id)
  }

  const moveProject = (id, target) => {
    const list = loadAll()
    const x = list.find((x2) => x2.id === id)
    if (!x) return
    x.folder = target
    x.updatedAt = Date.now()
    saveAll(list)
    refresh()
  }

  const addFolder = (name) => {
    const name2 = (name || '').trim()
    if (!name2 || folders.includes(name2)) return
    const next = [...folders, name2]
    saveFolders(next)
    setFolders(next)
    return name2
  }

  const onRenameFolder = (name) => {
    const next = window.prompt('Nouveau nom du dossier', name)
    if (!next || next.trim() === name) return
    if (folders.includes(next.trim())) { alert('Un dossier porte déjà ce nom.'); return }
    renameFolder(name, next.trim())
    setFolders(loadFolders())
    if (active === name) setActive(next.trim())
    refresh()
  }

  const onDeleteFolder = (name) => {
    if (!confirm(`Supprimer le dossier « ${name} » ?\nLes présentations qu'il contient seront déplacées à la racine.`)) return
    deleteFolder(name)
    setFolders(loadFolders())
    if (active === name) setActive('all')
    refresh()
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

      <div className="folder-bar" role="tablist" aria-label="Dossiers">
        <button className={'folder-chip' + (active === 'all' ? ' on' : '')} onClick={() => setActive('all')}>
          🗂️ Tous ({projects.length})
        </button>
        <button className={'folder-chip' + (active === 'none' ? ' on' : '')} onClick={() => setActive('none')}>
          📄 Sans dossier ({projects.filter((p) => !p.folder).length})
        </button>
        {folders.map((f) => (
          <button key={f} className={'folder-chip' + (active === f ? ' on' : '')} onClick={() => setActive(f)}>
            📁 {f} ({projects.filter((p) => p.folder === f).length})
          </button>
        ))}
        <button
          className="folder-chip add"
          title="Nouveau dossier"
          onClick={() => { const n = addFolder(window.prompt('Nom du nouveau dossier')); if (n) setActive(n) }}
        >
          ➕
        </button>
        {active !== 'all' && active !== 'none' && (
          <span className="folder-tools">
            <button className="btn ghost small" title="Renommer ce dossier" onClick={() => onRenameFolder(active)}>✏️</button>
            <button className="btn ghost small" title="Supprimer ce dossier" onClick={() => onDeleteFolder(active)}>🗑</button>
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '18px 0 12px' }}>
        <h2 style={{ fontSize: 15, color: 'var(--text-dim)' }}>
          {active === 'all' ? `Mes présentations (${projects.length})`
            : active === 'none' ? `Sans dossier (${filtered.length})`
            : `📁 ${active} (${filtered.length})`}
        </h2>
        <button className="btn small" onClick={() => onImport?.()} title="Ouvrir une présentation chiffrée reçue">
          🔓 Importer un partage
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">
          {projects.length === 0
            ? "Aucune présentation pour l'instant — choisissez un modèle ci-dessus pour commencer."
            : active === 'none'
              ? 'Toutes vos présentations sont rangées dans des dossiers.'
              : "Ce dossier est vide — créez une présentation ici, ou déplacez-en une depuis « Tous » (menu ⋯ d'une carte)."}
        </div>
      ) : (
        <div className="proj-grid">
          {filtered.map((p) => (
            <ProjectCard key={p.id + version} p={p} folders={folders} onOpen={() => onOpen(p.id)}
              onDup={() => { duplicate(p.id); refresh() }}
              onDel={() => { remove(p.id); refresh() }}
              onMove={(target) => moveProject(p.id, target)}
              onNewFolder={(cb) => { const n = addFolder(window.prompt('Nom du nouveau dossier')); if (n) { cb(n) } }}
              onRename={(title) => {
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

function ProjectCard({ p, folders, onOpen, onDup, onDel, onRename, onMove, onNewFolder }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [view, setView] = useState('main') // main | move
  const [shareTarget, setShareTarget] = useState(null)
  const slides = p.slides?.length || 0
  const elements = (p.slides || []).reduce((n, s) => n + (s.elements?.length || 0), 0)

  const close = () => { setMenuOpen(false); setView('main') }

  return (
    <div className="proj-card">
      <div className="proj-actions">
        <button className="btn ghost small" onClick={() => { setMenuOpen((v) => !v); setView('main') }} title="Actions">⋯</button>
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: 28, background: 'var(--bg-3)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 10, minWidth: 190 }}>
            {view === 'main' ? (
              <>
                <MenuBtn onClick={() => { setShareTarget(p); close() }} label="🔗 Partager (chiffré)" />
                <MenuBtn onClick={() => { setView('move') }} label="📁 Déplacer vers…" />
                <MenuBtn onClick={() => { onRename(window.prompt('Nouveau titre', p.title) ?? p.title); close() }} label="✏️ Renommer" />
                <MenuBtn onClick={() => { onDup(); close() }} label="⧉ Dupliquer" />
                <MenuBtn danger onClick={() => { if (confirm(`Supprimer « ${p.title} » ?`)) { onDel(); close() } }} label="🗑 Supprimer" />
              </>
            ) : (
              <>
                <div style={{ padding: '7px 14px 5px', fontSize: 11.5, color: 'var(--text-dim)', letterSpacing: .4, textTransform: 'uppercase' }}>
                  Déplacer vers…
                </div>
                <MenuBtn onClick={() => { onMove(''); close() }} label={p.folder ? '⤴️ Racine (sans dossier)' : '• actuellement à la racine'} muted={p.folder === ''} />
                {folders.map((f) => (
                  <MenuBtn
                    key={f}
                    onClick={() => { onMove(f); close() }}
                    label={(p.folder === f ? '✓ ' : '📁 ') + f}
                    muted={p.folder === f}
                  />
                ))}
                <MenuBtn onClick={() => { onNewFolder((n) => { onMove(n); close() }) }} label="➕ Nouveau dossier…" />
                <MenuBtn onClick={() => setView('main')} label="← Retour" muted />
              </>
            )}
          </div>
        )}
      </div>
      <button className="proj-open" style={{ all: 'unset', display: 'block', cursor: 'pointer', width: '100%' }} onClick={onOpen}>
        <b>{p.title}</b>
        <div className="meta">{slides} diapo{slides > 1 ? 's' : ''} · {elements} élément{elements > 1 ? 's' : ''}</div>
        <div className="meta">Modifié le {formatDate(p.updatedAt)}{p.folder ? ` · 📁 ${p.folder}` : ''}</div>
      </button>
      {shareTarget && <ShareDialog presentation={shareTarget} onClose={() => setShareTarget(null)} />}
    </div>
  )
}

function MenuBtn({ label, onClick, danger, muted }) {
  return (
    <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 14px', color: danger ? 'var(--danger)' : muted ? 'var(--text-dim)' : 'var(--text)', fontSize: muted ? 12.5 : 13.5 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-2)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      onClick={onClick}>
      {label}
    </button>
  )
}

export { TEMPLATES }
