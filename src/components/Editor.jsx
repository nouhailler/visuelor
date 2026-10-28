import { useState, useRef, useEffect, useCallback } from 'react'
import { STAGE_W, STAGE_H, uid, loadOne, saveOne } from '../lib/store.js'
import { makeElement, blankSlide } from '../lib/templates.js'
import { Stage } from './Stage.jsx'
import { ElementView } from './ElementView.jsx'
import { PropertiesPanel, ColorField } from './PropertiesPanel.jsx'
import { ExportDialog } from './ExportDialog.jsx'

const BG_COLORS = ['#ffffff', '#f6f6fa', '#14142B', '#F2F7F0', '#FFF7EC', '#EFEEFF']

export function Editor({ presentationId, onBack, onPresent }) {
  const [pres, setPres] = useState(() => loadOne(presentationId))
  const [slideIdx, setSlideIdx] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [saveState, setSaveState] = useState('saved')
  const [histVer, bumpHist] = useState(0)
  const [exportOpen, setExportOpen] = useState(false)
  const past = useRef([])
  const future = useRef([])
  const presRef = useRef(pres)
  const imageInput = useRef(null)

  useEffect(() => { presRef.current = pres }, [pres])

  const slide = pres?.slides[Math.min(slideIdx, pres.slides.length - 1)]
  const selectedEl = slide?.elements.find((e) => e.id === selectedId) || null

  // ── Historique ────────────────────────────────────────────────────────────
  const pushHistory = useCallback(() => {
    past.current.push(JSON.stringify(presRef.current))
    if (past.current.length > 60) past.current.shift()
    future.current = []
    bumpHist((v) => v + 1)
  }, [])

  const undo = useCallback(() => {
    if (!past.current.length) return
    const prev = past.current.pop()
    future.current.push(JSON.stringify(presRef.current))
    presRef.current = JSON.parse(prev)
    setPres(JSON.parse(prev))
    setSelectedId(null)
    bumpHist((v) => v + 1)
  }, [])

  const redo = useCallback(() => {
    if (!future.current.length) return
    const next = future.current.pop()
    past.current.push(JSON.stringify(presRef.current))
    presRef.current = JSON.parse(next)
    setPres(JSON.parse(next))
    setSelectedId(null)
    bumpHist((v) => v + 1)
  }, [])

  // ── Mutations ─────────────────────────────────────────────────────────────
  const setSlideElements = (slideId, fn) => {
    setPres((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === slideId ? { ...s, elements: fn(s.elements) } : s,
      ),
    }))
  }

  const updateEl = useCallback((id, patch) => {
    setSlideElements(slide.id, (els) => els.map((el) => (el.id === id ? { ...el, ...patch } : el)))
  }, [slide])

  const setSlideBg = (color) => {
    setPres((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === slide.id ? { ...s, background: color } : s)),
    }))
  }

  const addElement = (type, extras = {}) => {
    pushHistory()
    const el = makeElement(type, extras)
    setSelectedId(el.id)
    setSlideElements(slide.id, (els) => [...els, el])
  }

  const deleteSelected = () => {
    if (!selectedEl) return
    pushHistory()
    setSlideElements(slide.id, (els) => els.filter((e) => e.id !== selectedEl.id))
    setSelectedId(null)
  }

  const duplicateSelected = () => {
    if (!selectedEl) return
    pushHistory()
    const copy = JSON.parse(JSON.stringify(selectedEl))
    copy.id = uid(selectedEl.type)
    copy.x += 30
    copy.y += 30
    setSelectedId(copy.id)
    setSlideElements(slide.id, (els) => [...els, copy])
  }

  const changeLayer = (dir) => {
    if (!selectedEl) return
    pushHistory()
    setSlideElements(slide.id, (els) => {
      const els2 = [...els]
      const i = els2.findIndex((e) => e.id === selectedEl.id)
      const j = dir === 'up' ? Math.min(els2.length - 1, i + 1) : Math.max(0, i - 1)
      ;[els2[i], els2[j]] = [els2[j], els2[i]]
      return els2
    })
  }

  // ── Diapositives ──────────────────────────────────────────────────────────
  const addSlide = () => {
    pushHistory()
    const s = blankSlide()
    setPres((prev) => ({ ...prev, slides: [...prev.slides, s] }))
    setSlideIdx(pres.slides.length)
    setSelectedId(null)
  }

  const duplicateSlide = () => {
    pushHistory()
    const copy = JSON.parse(JSON.stringify(slide))
    copy.id = uid('slide')
    copy.elements.forEach((el) => (el.id = uid(el.type)))
    setPres((prev) => {
      const arr = [...prev.slides]
      arr.splice(slideIdx + 1, 0, copy)
      return { ...prev, slides: arr }
    })
    setSlideIdx(slideIdx + 1)
    setSelectedId(null)
  }

  const deleteSlide = () => {
    if (pres.slides.length <= 1) return
    pushHistory()
    setPres((prev) => ({ ...prev, slides: prev.slides.filter((s) => s.id !== slide.id) }))
    setSlideIdx(Math.max(0, slideIdx - 1))
    setSelectedId(null)
  }

  const moveSlide = (dir) => {
    const j = slideIdx + dir
    if (j < 0 || j >= pres.slides.length) return
    pushHistory()
    setPres((prev) => {
      const arr = [...prev.slides]
      ;[arr[slideIdx], arr[j]] = [arr[j], arr[slideIdx]]
      return { ...prev, slides: arr }
    })
    setSlideIdx(j)
  }

  // ── Sauvegarde auto (debounce) ────────────────────────────────────────────
  useEffect(() => {
    if (!pres) return
    setSaveState('dirty')
    const t = setTimeout(() => {
      const ok = saveOne(pres)
      setSaveState(ok ? 'saved' : 'error')
    }, 400)
    return () => clearTimeout(t)
  }, [pres])

  // ── Raccourcis clavier ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return
      const mod = e.ctrlKey || e.metaKey
      if (mod && e.key.toLowerCase() === 'z') { e.shiftKey ? redo() : undo(); e.preventDefault() }
      else if (mod && e.key.toLowerCase() === 'y') { redo(); e.preventDefault() }
      else if (mod && e.key.toLowerCase() === 'd') { duplicateSelected(); e.preventDefault() }
      else if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); e.preventDefault() }
      else if (e.key === 'Escape') setSelectedId(null)
      else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedEl) {
        e.preventDefault()
        const d = e.shiftKey ? 10 : 1
        const patch = {
          ArrowLeft: { x: selectedEl.x - d },
          ArrowRight: { x: selectedEl.x + d },
          ArrowUp: { y: selectedEl.y - d },
          ArrowDown: { y: selectedEl.y + d },
        }[e.key]
        updateEl(selectedEl.id, patch)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedEl, undo, redo, updateEl, pushHistory])

  if (!pres) {
    return (
      <div className="dash">
        <div className="empty">Présentation introuvable.<br /><br />
          <button className="btn primary" onClick={onBack}>← Tableau de bord</button>
        </div>
      </div>
    )
  }

  return (
    <div className="editor">
      {/* Barre supérieure */}
      <header className="topbar">
        <button className="btn ghost" onClick={onBack} title="Tableau de bord">◀</button>
        <div className="logo-mark" style={{ width: 30, height: 30, fontSize: 15 }}>🎯</div>
        <input
          className="title" value={pres.title} spellCheck={false}
          onChange={(e) => setPres((p) => ({ ...p, title: e.target.value }))}
          placeholder="Titre de la présentation"
        />
        <span className="save-state">
          {saveState === 'saved' ? '✓ enregistré' : saveState === 'error' ? '⚠ erreur de stockage' : '…'}
        </span>
        <div className="spacer" />
        <button className="btn ghost" onClick={undo} disabled={!past.current.length} title="Annuler (Ctrl+Z)">↺</button>
        <button className="btn ghost" onClick={redo} disabled={!future.current.length} title="Rétablir (Ctrl+Y)">↻</button>
        <button className="btn ghost" onClick={() => setExportOpen(true)} title="Exporter (PNG, PDF)">⬇</button>
        <button className="btn primary" onClick={() => onPresent(pres.id)}>▶ Lecture</button>
      </header>

      <div className="editor-body">
        {/* Rail latéral : ajout d'éléments */}
        <nav className="rail">
          <button onClick={() => addElement('text', { text: 'Votre texte', x: 420, y: 300, w: 440, h: 90 })} title="Texte">🔤</button>
          <button onClick={() => addElement('shape', { shape: 'rect', x: 520, y: 280, w: 240, h: 160 })} title="Forme">◼️</button>
          <button onClick={() => imageInput.current?.click()} title="Image">🖼️</button>
          <button onClick={() => addElement('embed', { x: 320, y: 180, w: 640, h: 360 })} title="Vidéo (YouTube, Vimeo)">📺</button>
          <button onClick={() => addElement('hotspot', { x: 570, y: 330, w: 140, h: 60 })} title="Zone interactive (popup / lien)">👆</button>
          <input
            ref={imageInput} type="file" accept="image/*" hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (!file) return
              const r = new FileReader()
              r.onload = () => addElement('image', { src: r.result, w: 520, h: 350, x: 380, y: 190 })
              r.readAsDataURL(file)
              e.target.value = ''
            }}
          />
        </nav>

        {/* Scène */}
        <div className="canvas-wrap">
          <div className="stage-outer">
            <Stage
              slide={slide}
              mode="editor"
              selectedId={selectedId}
              onSelect={setSelectedId}
              onUpdate={updateEl}
              onGestureStart={pushHistory}
            />
          </div>
          {/* Barre des diapositives */}
          <div className="slidebar">
            {pres.slides.map((s, i) => (
              <div key={s.id} className={'thumb' + (i === slideIdx ? ' on' : '')} onClick={() => { setSlideIdx(i); setSelectedId(null) }}>
                <span className="num">{i + 1}</span>
                <MiniStage slide={s} />
              </div>
            ))}
            <button className="thumb-add" onClick={addSlide}>＋<br />Diapo</button>
            <div className="thumb-tools">
              <button className="btn ghost small" onClick={() => moveSlide(-1)} title="Déplacer la diapo vers la gauche">⬅</button>
              <button className="btn ghost small" onClick={() => moveSlide(1)} title="Déplacer vers la droite">➡</button>
              <button className="btn ghost small" onClick={duplicateSlide} title="Dupliquer la diapo">⧉</button>
              <button className="btn ghost small" onClick={deleteSlide} disabled={pres.slides.length <= 1} title="Supprimer la diapo">🗑</button>
            </div>
            <div style={{ width: 150, flex: '0 0 auto', marginLeft: 'auto' }}>
              <ColorField label="Fond de la diapo" value={slide.background} onChange={setSlideBg} swatches={BG_COLORS} />
            </div>
          </div>
        </div>

        {/* Panneau de propriétés */}
        <PropertiesPanel
          el={selectedEl}
          slideIndex={slideIdx}
          slides={pres.slides}
          update={updateEl}
          onDelete={deleteSelected}
          onDuplicate={duplicateSelected}
          onLayer={changeLayer}
        />
      </div>

      {exportOpen && (
        <ExportDialog
          presentation={pres}
          slideIndex={slideIdx}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  )
}

// Miniature non interactive d'une diapositive
function MiniStage({ slide }) {
  const k = 128 / STAGE_W
  return (
    <div className="stage" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${k})`, transformOrigin: '0 0', background: slide.background, pointerEvents: 'none' }}>
      {slide.elements.map((el) => (
        <div key={el.id} style={{ position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h }}>
          <ElementView el={el} interactive={false} />
        </div>
      ))}
    </div>
  )
}
