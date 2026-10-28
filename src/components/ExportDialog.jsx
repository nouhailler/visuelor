import { useState } from 'react'
import { exportSlidePNG, exportAllPNG, exportPdf } from '../lib/exporter.js'

export function ExportDialog({ presentation, slideIndex, onClose }) {
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')
  const slide = presentation.slides[slideIndex]

  const run = async (label, fn) => {
    setBusy(label)
    setMsg('')
    try {
      await fn((i, n) => setMsg(`… ${i + 1}/${n}`))
      setMsg('✓ terminé — vérifiez vos téléchargements')
    } catch (e) {
      setMsg('Échec : ' + (e?.message || e))
    }
    setBusy('')
  }

  const clean = (presentation.title || 'presentation').replace(/[^\w\-À-ÿ ]+/g, '').trim()
  const disabled = !!busy

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>⬇ Exporter «&nbsp;{presentation.title}&nbsp;»</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 12.5, lineHeight: 1.55, marginTop: -6 }}>
          100 % local : le rendu est rasterisé dans votre navigateur, rien n'est envoyé.
          Les vidéos intégrées apparaissent comme espaces réservés.
        </p>

        <button className="btn" style={{ width: '100%', marginBottom: 8 }} disabled={disabled}
          onClick={() => run('png1', () => exportSlidePNG(slide, `${clean} — ${String(slideIndex + 1).padStart(2, '0')}.png`))}>
          🖼️ PNG — diapositive {slideIndex + 1} uniquement
        </button>

        <button className="btn" style={{ width: '100%', marginBottom: 8 }} disabled={disabled}
          onClick={() => run('pngAll', (p) => exportAllPNG(presentation, p))}>
          🖼️ PNG — toutes les diapositives ({presentation.slides.length} fichiers)
        </button>

        <button className="btn primary" style={{ width: '100%' }} disabled={disabled}
          onClick={() => run('pdf', (p) => exportPdf(presentation, p))}>
          📄 PDF — présentation complète
        </button>

        {(busy || msg) && (
          <p style={{ color: msg.startsWith('✓') ? 'var(--green)' : 'var(--text-dim)', fontSize: 12.5 }}>{busy ? busy + '…' : msg}</p>
        )}

        <div className="actions">
          <button className="btn" onClick={onClose} disabled={disabled}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
