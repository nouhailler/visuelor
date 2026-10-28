import { useState, useRef, useEffect, useCallback } from 'react'
import { STAGE_W, STAGE_H } from '../lib/store.js'
import { ElementView } from './ElementView.jsx'
import { matchesEmbed } from './embeds.jsx'

// Scène fixe 1280×720 mise à l'échelle via transform: scale(k).
// mode = 'editor'  : sélection, déplacement, redimensionnement, édition de texte.
// mode = 'present' : rendu interactif (popups, liens, iframes).

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function Stage({ slide, mode, selectedId, onSelect, onUpdate, onGestureStart, onNavigate, placeTag = false, onPlaceTag, highlightId = null }) {
  const shellRef = useRef(null)
  const stageRef = useRef(null)
  const [scale, setScale] = useState(1)
  const [editingId, setEditingId] = useState(null)
  const editingRef = useRef(null)
  const drag = useRef(null)

  // Échelle pour remplir le conteneur parent
  useEffect(() => {
    const outer = shellRef.current?.parentElement
    if (!outer) return
    const fit = () => {
      const k = Math.min(outer.clientWidth / STAGE_W, outer.clientHeight / STAGE_H)
      setScale(Math.max(0.05, k))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(outer)
    return () => ro.disconnect()
  }, [])

  const toStage = useCallback((clientX, clientY) => {
    const r = stageRef.current.getBoundingClientRect()
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale }
  }, [scale])

  const startDrag = (e, el, kind, handle) => {
    if (mode !== 'editor' || editingRef.current === el.id) return
    if (el.locked) { // verrouillé : sélectionnable (pour éditer ses propriétés) mais immobile
      e.stopPropagation()
      onSelect(el.id)
      return
    }
    e.stopPropagation()
    onSelect(el.id)
    drag.current = {
      kind, handle,
      start: toStage(e.clientX, e.clientY),
      g: { x: el.x, y: el.y, w: el.w, h: el.h },
      el, started: false,
    }
    window.addEventListener('pointermove', onWindowMove)
    window.addEventListener('pointerup', onWindowUp, { once: true })
  }

  const onWindowMove = (e) => {
    const d = drag.current
    if (!d) return
    const p = toStage(e.clientX, e.clientY)
    const dx = p.x - d.start.x
    const dy = p.y - d.start.y
    if (!d.started) {
      if (Math.hypot(dx, dy) < 3) return
      d.started = true
      onGestureStart?.()
    }
    if (d.kind === 'move') {
      onUpdate(d.el.id, {
        x: Math.round(clamp(d.g.x + dx, -d.g.w * 0.5, STAGE_W - d.g.w * 0.5)),
        y: Math.round(clamp(d.g.y + dy, -d.g.h * 0.5, STAGE_H - d.g.h * 0.5)),
      })
    } else {
      const h = d.handle
      let { x, y, w, h: hh } = d.g
      if (h.includes('e')) w = d.g.w + dx
      if (h.includes('w')) { w = d.g.w - dx; x = d.g.x + dx }
      if (h.includes('s')) hh = d.g.h + dy
      if (h.includes('n')) { hh = d.g.h - dy; y = d.g.y + dy }
      onUpdate(d.el.id, {
        x: Math.round(x), y: Math.round(y),
        w: Math.max(24, Math.round(w)), h: Math.max(24, Math.round(hh)),
      })
    }
  }

  const onWindowUp = () => {
    window.removeEventListener('pointermove', onWindowMove)
    drag.current = null
  }

  // Mode « identifier des personnes » : un clic sur la photo pose une étiquette
  // centrée sur le point cliqué ; un clic sur une étiquette existante la sélectionne.
  const placePointerDown = (e) => {
    if (!placeTag || mode !== 'editor' || e.target.closest('.el.tag, .handles')) return
    e.stopPropagation()
    e.preventDefault()
    onPlaceTag?.(toStage(e.clientX, e.clientY))
  }

  const stagePointerDown = (e) => {
    if (e.target !== stageRef.current) return
    onSelect(null)
    if (editingId) setEditingId(null)
  }

  const onElementDoubleClick = (e, el) => {
    if (mode !== 'editor') return
    if (el.type === 'text' && !el.locked) {
      e.stopPropagation()
      setEditingId(el.id)
    }
  }

  const commitText = useCallback((el, text) => {
    onUpdate(el.id, { text })
    setEditingId(null)
  }, [onUpdate])

  useEffect(() => { editingRef.current = editingId }, [editingId])

  const isPresent = mode === 'present'
  const sel = slide.elements.find((el) => el.id === selectedId)

  return (
    <div ref={shellRef} className="stage-shell" style={{ width: STAGE_W * scale, height: STAGE_H * scale }}>
      <div
        ref={stageRef}
        className="stage"
        style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, background: slide.background, cursor: placeTag ? 'crosshair' : undefined }}
        onPointerDownCapture={placePointerDown}
        onPointerDown={stagePointerDown}
      >
        {slide.elements.map((el) => (
          <div
            key={el.id}
            style={{ position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h }}
            onPointerDown={(e) => {
              if (mode === 'editor') startDrag(e, el, 'move')
            }}
            onDoubleClick={(e) => onElementDoubleClick(e, el)}
          >
            <ElementView
              el={el}
              interactive={isPresent}
              showBadges={!isPresent}
              editingText={!isPresent && editingId === el.id}
              onTextCommit={commitText}
              onNavigate={onNavigate}
              highlighted={highlightId === el.id}
            />
            {!isPresent && editingId === el.id && <div className="sel-outline" />}
          </div>
        ))}

        {!isPresent && sel && editingId !== sel.id && (
          <div className="handles" style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}>
            <div className="sel-outline" />
            {HANDLES.map((h) => (
              <div key={h} className="h" data-h={h}
                onPointerDown={(e) => startDrag(e, sel, 'resize', h)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v))
}
