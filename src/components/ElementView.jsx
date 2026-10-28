import { useState, useEffect, useCallback, memo } from 'react'
import { matchesEmbed, embedSrc } from './embeds.jsx'

// Rendu d'un élément + interactivité (popup, lien), partagé entre :
//  - l'éditeur (interactive=false : badges d'aide, pas de déclenchement),
//  - le mode lecture (interactive=true : popups actives, liens actifs).
// Mémoïsé : pendant un drag, seul l'élément déplacé est re-rendu.

export const ElementView = memo(function ElementView({ el, interactive, editingText, onTextCommit, onNavigate, showBadges = false }) {
  const [popupOpen, setPopupOpen] = useState(false)

  useEffect(() => {
    setPopupOpen(false)
  }, [el.id, interactive])

  const style = { left: el.x, top: el.y, width: el.w, height: el.h }
  const cls = `el ${el.type}`

  let inner
  switch (el.type) {
    case 'text': {
      const txtStyle = {
        fontSize: el.fontSize,
        fontFamily: `'${el.fontFamily}', sans-serif`,
        color: el.color,
        fontWeight: el.bold ? 700 : 400,
        fontStyle: el.italic ? 'italic' : 'normal',
        textAlign: el.align,
        lineHeight: el.lineHeight,
        background: el.bg === 'transparent' ? 'transparent' : el.bg,
        borderRadius: 6,
        width: '100%', height: '100%',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflow: 'hidden',
        cursor: interactive ? 'default' : 'text',
      }
      inner = editingText ? (
        <div
          className="inner" contentEditable suppressContentEditableWarning
          style={{ ...txtStyle, outline: '2px solid #6c6ce5', cursor: 'text' }}
          onBlur={(e) => onTextCommit(el, e.currentTarget.innerText)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {el.text}
        </div>
      ) : (
        <div className="inner" style={{ ...txtStyle, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
          {el.text}
        </div>
      )
      break
    }
    case 'shape': {
      const common = {
        width: '100%', height: '100%', background: el.fill,
        border: el.borderWidth > 0 ? `${el.borderWidth}px solid ${el.borderColor}` : 'none',
        opacity: el.opacity,
      }
      if (el.shape === 'ellipse')
        inner = <div className="inner" style={{ ...common, borderRadius: '50%' }} />
      else if (el.shape === 'triangle')
        inner = (
          <svg className="inner" style={{ width: '100%', height: '100%', display: 'block' }} viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="50,0 100,100 0,100" fill={el.fill} opacity={el.opacity} />
          </svg>
        )
      else
        inner = <div className="inner" style={{ ...common, borderRadius: el.radius }} />
      break
    }
    case 'image':
      inner = el.src ? (
        <img className="inner" src={el.src} alt="" draggable={false}
          style={{ objectFit: el.fit, width: '100%', height: '100%' }} />
      ) : (
        <div className="ph">🖼️ Choisissez une image dans le panneau de droite</div>
      )
      break
    case 'embed':
      inner = interactive && el.url && matchesEmbed(el.url) ? (
        <iframe className="inner" src={embedSrc(el.url)} title="média intégré"
          style={{ width: '100%', height: '100%', borderRadius: 8, border: 'none' }}
          allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
      ) : (
        <div className="ph">📺 {el.url || 'Collez une URL YouTube/Vimeo dans le panneau de droite'}</div>
      )
      break
    case 'hotspot':
      inner = (
        <div className="inner">
          {interactive !== false && <span className="pin" style={{ opacity: 0.35, color: '#6c6ce5' }}>👆</span>}
        </div>
      )
      break
    case 'quiz':
      inner = <QuizView el={el} interactive={interactive} />
      break
    case 'audio':
      inner = interactive && el.src ? (
        <div className="inner" style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: 6, justifyContent: 'center', background: 'rgba(127,127,160,0.10)', border: '1px solid rgba(127,127,160,0.35)', borderRadius: 12, padding: '8px 12px', boxSizing: 'border-box', overflow: 'hidden' }}>
          <div style={{ fontSize: 13, color: '#8a8aa8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🔊 {el.title || 'Piste audio'}</div>
          <audio controls src={el.src} style={{ width: '100%', height: 34 }} title={el.title || 'Lecture audio'} aria-label={el.title || 'Lecture audio'} />
        </div>
      ) : (
        <div className="ph">🔊 {el.title || 'Piste audio — importez un fichier dans le panneau de droite'}</div>
      )
      break
    default:
      inner = null
  }

  // ── Interactivité lecture ────────────────────────────────────────────────
  const hasPopup = interactive && el.popup?.enabled
  const hasLink = interactive && el.link && el.link.type !== 'none'
  const ev = {}
  if (hasPopup && !hasLink) {
    if (el.popup.trigger === 'hover') {
      ev.onMouseEnter = () => setPopupOpen(true)
      ev.onMouseLeave = () => setPopupOpen(false)
    } else {
      ev.onClick = (e) => { e.stopPropagation(); setPopupOpen((v) => !v) }
    }
  } else if (hasLink) {
    ev.onClick = (e) => { e.stopPropagation(); onNavigate?.(el) }
  }

  return (
    <div className={cls} style={style} data-element-id={el.id} {...ev}>
      {inner}
      {showBadges && !interactive && <Badges el={el} />}
      {hasPopup && popupOpen && <PopupBubble el={el} onClose={() => setPopupOpen(false)} />}
    </div>
  )
})

function Badges({ el }) {
  const has = []
  if (el.popup?.enabled)
    has.push(<span key="p" style={{ background: '#3aa76d' }}>💬 {el.popup.trigger === 'hover' ? 'survol' : 'clic'}</span>)
  if (el.link && el.link.type !== 'none')
    has.push(<span key="l">🔗 {el.link.type === 'url' ? 'URL' : 'diapo'}</span>)
  if (!has.length) return null
  return <div className="el-badge">{has}</div>
}

// ── Quiz interactif (mode lecture) ────────────────────────────────────────────
function QuizView({ el, interactive }) {
  const [picked, setPicked] = useState(null)
  useEffect(() => setPicked(null), [el.id])
  const choices = Array.isArray(el.choices) ? el.choices : []
  const answered = picked !== null

  const answer = (i, e) => {
    e.stopPropagation()
    if (answered) return
    setPicked(i)
  }

  const boxStyle = {
    width: '100%', height: '100%',
    display: 'flex', flexDirection: 'column', gap: 8,
    background: 'rgba(127,127,160,0.10)',
    border: '1px solid rgba(127,127,160,0.35)',
    borderRadius: 14, padding: 16, boxSizing: 'border-box', overflow: 'hidden',
    pointerEvents: interactive ? 'auto' : 'none',
  }

  return (
    <div className="inner" style={boxStyle}>
      <div style={{ fontWeight: 700, fontSize: 20, lineHeight: 1.3, color: 'inherit' }}>{el.question}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, flex: 1, minHeight: 0 }}>
        {choices.map((c, i) => {
          const isCorrect = i === el.correct
          const chosen = picked === i
          const style = {
            textAlign: 'left', padding: '9px 12px', borderRadius: 10,
            border: '1px solid rgba(127,127,160,0.45)', background: 'rgba(127,127,160,0.08)',
            color: 'inherit', fontSize: 15, cursor: interactive && !answered ? 'pointer' : 'default',
            margin: 0,
          }
          if (answered && isCorrect) { style.borderColor = '#4fc98a'; style.background = 'rgba(79,201,138,0.18)' }
          if (answered && chosen && !isCorrect) { style.borderColor = '#e5646c'; style.background = 'rgba(229,100,108,0.15)' }
          return (
            <button
              key={i} style={style} onClick={(e) => answer(i, e)}
              aria-label={`Réponse ${i + 1} : ${c}`}
              title={interactive && !answered ? 'Choisir cette réponse' : undefined}
            >
              {answered && (isCorrect ? '✓ ' : chosen ? '✗ ' : '')}{c}
            </button>
          )
        })}
      </div>
      <div style={{ fontSize: 14, minHeight: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        {answered && (
          <>
            <span style={{ color: picked === el.correct ? '#4fc98a' : '#e5646c' }}>
              {picked === el.correct ? (el.ok || '✓ Exact !') : (el.ko || '✗ Raté — la bonne réponse est surlignée.')}
            </span>
            <button
              style={{ width: 'auto', margin: 0, padding: '3px 10px', fontSize: 12.5, background: 'rgba(127,127,160,0.18)', borderRadius: 8, cursor: 'pointer' }}
              aria-label="Recommencer le quiz"
              onClick={(e) => { e.stopPropagation(); setPicked(null) }}
            >
              ↺ Recommencer
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export function PopupBubble({ el, onClose }) {
  return (
    <div
      className="popup"
      style={{
        left: 'calc(50% - 150px)',
        top: el.popup.below ? 'calc(100% + 10px)' : 'auto',
        bottom: el.popup.below ? 'auto' : 'calc(100% + 10px)',
      }}
    >
      {el.popup.image ? <img className="pop-img" src={el.popup.image} alt="" /> : null}
      <div className="pop-body">
        {el.popup.title && <div className="pop-title">{el.popup.title}</div>}
        {el.popup.text && <div className="pop-text" style={{ whiteSpace: 'pre-wrap' }}>{el.popup.text}</div>}
      </div>
      <button className="pop-close" onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Fermer">✕</button>
    </div>
  )
}
