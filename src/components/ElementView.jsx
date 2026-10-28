import { useState, useEffect } from 'react'
import { matchesEmbed, embedSrc } from './embeds.jsx'

// Rendu d'un élément + interactivité (popup, lien), partagé entre :
//  - l'éditeur (interactive=false : badges d'aide, pas de déclenchement),
//  - le mode lecture (interactive=true : popups actives, liens actifs).

export function ElementView({ el, interactive, editingText, onTextCommit, onNavigate, showBadges = false }) {
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
}

function Badges({ el }) {
  const has = []
  if (el.popup?.enabled)
    has.push(<span key="p" style={{ background: '#3aa76d' }}>💬 {el.popup.trigger === 'hover' ? 'survol' : 'clic'}</span>)
  if (el.link && el.link.type !== 'none')
    has.push(<span key="l">🔗 {el.link.type === 'url' ? 'URL' : 'diapo'}</span>)
  if (!has.length) return null
  return <div className="el-badge">{has}</div>
}

export function PopupBubble({ el, onClose }) {
  return (
    <div className="popup" style={{ left: 'calc(50% - 150px)', [el.popup.below ? 'top' : 'bottom']: 'calc(100% + 10px)' }}>
      {el.popup.image ? <img className="pop-img" src={el.popup.image} alt="" /> : null}
      <div className="pop-body">
        {el.popup.title && <div className="pop-title">{el.popup.title}</div>}
        {el.popup.text && <div className="pop-text" style={{ whiteSpace: 'pre-wrap' }}>{el.popup.text}</div>}
      </div>
      <button className="pop-close" onClick={(e) => { e.stopPropagation(); onClose() }} aria-label="Fermer">✕</button>
    </div>
  )
}
