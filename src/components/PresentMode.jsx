import { useState, useEffect, useCallback } from 'react'
import { loadOne, saveOne, uid } from '../lib/store.js'
import { Stage } from './Stage.jsx'

// Mode présentation plein écran : popups/hotspots actifs, navigation non linéaire,
// réactif (le Stage se met à l'échelle), touches ← → / Espace / Échap.
// Accepte un id local (presentationId) ou un objet reçu d'un partage chiffré.

export function PresentMode({ presentationId, presentation, shared = false, onExit }) {
  const [pres] = useState(() => presentation || loadOne(presentationId))
  const [idx, setIdx] = useState(0)
  const [tagsQuiet, setTagsQuiet] = useState(false) // noms visibles seulement au survol
  const [listOpen, setListOpen] = useState(true)
  const [hlId, setHlId] = useState(null)

  const slide = pres?.slides[idx]
  // personnes identifiées de la diapo, de gauche à droite (comme on les décrit sur une photo)
  const people = (slide?.elements || [])
    .filter((e) => e.type === 'tag')
    .sort((a, b) => a.x + a.w / 2 - (b.x + b.w / 2))

  useEffect(() => setHlId(null), [idx])

  const go = useCallback((n) => {
    setIdx((i) => Math.min(Math.max(0, (pres?.slides.length || 1) - 1), i + n))
  }, [pres])

  const navigateFromElement = useCallback((el) => {
    if (el.link?.type === 'url' && el.link.url) {
      window.open(el.link.url, '_blank', 'noopener')
    } else if (el.link?.type === 'slide' && el.link.slideId) {
      const i = pres?.slides.findIndex((s) => s.id === el.link.slideId) ?? -1
      if (i >= 0) setIdx(i)
    }
  }, [pres])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1) }
      else if (e.key === 'Escape') onExit()
      else if (e.key === 'Home') setIdx(0)
      else if (e.key === 'End') setIdx((pres?.slides.length || 1) - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onExit, pres])

  useEffect(() => {
    const onFs = () => {
      if (document.fullscreenElement) { document.exitFullscreen?.().catch(() => {}) }
    }
    const el = document.documentElement
    // le plein écran exige un geste utilisateur : on l'essaie seulement si l'entrée
    // en lecture est « activée » (clic réel) — sinon on reste dans l'onglet, très bien aussi.
    if (document.userActivation && !document.userActivation.isActive) return
    el.requestFullscreen?.()
      .then(() => document.addEventListener('fullscreenchange', onFs))
      .catch(() => {})
    return () => { document.removeEventListener('fullscreenchange', onFs) }
  }, [])

  if (!pres || !slide) {
    return (
      <div className="present" onClick={onExit}>
        <div className="empty">Présentation introuvable — cliquez pour revenir.</div>
      </div>
    )
  }

  return (
    <div className={'present' + (tagsQuiet ? ' tags-quiet' : '')}>
      <div className="stage-outer">
        <Stage
          slide={slide}
          mode="present"
          onNavigate={navigateFromElement}
          highlightId={hlId}
        />
      </div>

      {people.length > 0 && listOpen && (
        <aside className="people" aria-label="Personnes sur la photo">
          <h3>👥 Qui est sur la photo ? ({people.length})</h3>
          <ol>
            {people.map((t, i) => (
              <li key={t.id}>
                <button
                  className={hlId === t.id ? 'on' : ''}
                  onMouseEnter={() => setHlId(t.id)}
                  onMouseLeave={() => setHlId(null)}
                  onClick={() => setHlId((v) => (v === t.id ? null : t.id))}
                >
                  <span className="dot" style={{ borderColor: t.color || '#F2B34C' }}>{i + 1}</span>
                  <span>
                    <div className="nm">{t.name || 'Inconnu(e)'}</div>
                    {t.info && <div className="inf">{t.info}</div>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <div className="hint">De gauche à droite · survolez un nom pour voir la personne</div>
        </aside>
      )}

      {pres.slides.length > 0 && (
        <nav className="topnav" style={shared ? { opacity: 1 } : undefined}>
          {shared && (
            <span style={{ fontSize: 13, color: '#cfcfe6' }} title="Lecture d'une présentation chiffrée, vérifiée localement">
              🔒 partagée
            </span>
          )}
          <button className="btn small" onClick={() => go(-1)} disabled={idx === 0} title="Précédent (←)" aria-label="Diapositive précédente">←</button>
          <span className="counter" aria-live="polite">{idx + 1} / {pres.slides.length}</span>
          <button className="btn small" onClick={() => go(1)} disabled={idx === pres.slides.length - 1} title="Suivant (→)" aria-label="Diapositive suivante">→</button>
          <span style={{ width: 1, height: 22, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
          {people.length > 0 && (
            <>
              <button className="btn small" onClick={() => setTagsQuiet((v) => !v)} aria-pressed={!tagsQuiet}
                title={tagsQuiet ? 'Afficher tous les noms sur la photo' : 'Masquer les noms (visibles au survol)'}>
                🏷️ {tagsQuiet ? 'Afficher les noms' : 'Masquer les noms'}
              </button>
              <button className="btn small" onClick={() => setListOpen((v) => !v)} aria-pressed={listOpen} title="Liste des personnes">
                👥 Liste
              </button>
            </>
          )}
          <button className="btn small" onClick={() => window.print()} title="Imprimer / PDF" aria-label="Imprimer ou exporter en PDF">🖨</button>
          {shared && (
            <button
              className="btn small"
              title="Enregistrer cette présentation dans mes présentations locales"
              onClick={() => {
                const once = { ...pres, id: uid('pres'), title: (pres.title || 'Présentation partagée') + ' (copie)', createdAt: Date.now(), updatedAt: Date.now() }
                saveOne(once)
                alert('Copie enregistrée dans « Mes présentations ».')
              }}
            >
              ⬇ Enregistrer
            </button>
          )}
          <button className="btn small" onClick={onExit} title="Quitter (Échap)">✕ Quitter</button>
        </nav>
      )}
    </div>
  )
}
