import { useRef } from 'react'

const FONTS = ['Inter', 'Montserrat', 'Playfair Display', 'Lora', 'Caveat', 'Roboto Mono']
const COLORS = ['#1c1c28', '#5b5b7a', '#6c6ce5', '#e5646c', '#4fc98a', '#f2b34c', '#FFFFFF', '#EFEEF6', 'transparent']
const FILLS = ['#6c6ce5', '#4fc98a', '#e5646c', '#f2b34c', '#14142B', '#EFEEF6', '#DFF3E9', '#FFEDD9', 'transparent']

export function PropertiesPanel({ el, slideIndex, slides, update, onDelete, onDuplicate, onLayer }) {
  if (!el) {
    return (
      <aside className="props">
        <div className="placeholder">
          <div style={{ fontSize: 30, marginBottom: 8 }}>🎛️</div>
          Sélectionnez un élément sur la scène pour éditer ses propriétés.<br /><br />
          💬 <b>Interactif&nbsp;:</b> tout élément peut afficher une <b>popup</b> au survol ou au clic, ou sauter vers une autre diapositive.
        </div>
      </aside>
    )
  }

  const p = (patch) => update(el.id, patch)

  const setPopup = (patch) => p({ popup: { ...el.popup, ...patch } })
  const setLink = (patch) => p({ link: { ...el.link, ...patch } })

  const uploadImage = (setter) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setter(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <aside className="props">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 18 }}>{ICON[el.type] || '◻️'}</span>
        <b style={{ flex: 1 }}>{LABEL[el.type] || el.type}</b>
        <label className="check" style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          <input type="checkbox" checked={!!el.locked} onChange={(e) => p({ locked: e.target.checked })} /> verrouillé
        </label>
      </div>

      {/* Calque + actions */}
      <div className="row" style={{ marginBottom: 4 }}>
        <button className="btn small" onClick={() => onLayer('up')} title="Avancer">⬆ Avancer</button>
        <button className="btn small" onClick={() => onLayer('down')} title="Reculer">⬇ Reculer</button>
      </div>
      <div className="row">
        <button className="btn small" onClick={onDuplicate}>⧉ Dupliquer</button>
        <button className="btn small danger" onClick={onDelete}>🗑 Supprimer</button>
      </div>

      {/* Position & taille */}
      <div className="sect">
        <h3>Position et taille</h3>
        <div className="row">
          <NumField label="X" value={el.x} onChange={(v) => p({ x: v })} />
          <NumField label="Y" value={el.y} onChange={(v) => p({ y: v })} />
        </div>
        <div className="row">
          <NumField label="Largeur" value={el.w} onChange={(v) => p({ w: v })} />
          <NumField label="Hauteur" value={el.h} onChange={(v) => p({ h: v })} />
        </div>
      </div>

      {/* Texte */}
      {el.type === 'text' && (
        <div className="sect">
          <h3>Texte</h3>
          <div className="field">
            <label>Contenu (modifiable aussi par double-clic sur la scène)</label>
            <textarea value={el.text} onChange={(e) => p({ text: e.target.value })} />
          </div>
          <div className="field">
            <label>Police (Google Fonts)</label>
            <select value={el.fontFamily} onChange={(e) => p({ fontFamily: e.target.value })}>
              {FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
            </select>
          </div>
          <div className="row">
            <NumField label="Taille px" value={el.fontSize} onChange={(v) => p({ fontSize: v })} step={2} />
            <div className="field">
              <label>Aligner</label>
              <div className="row">
                {['left', 'center', 'right'].map((a) => (
                  <button key={a} className={'btn small' + (el.align === a ? ' primary' : '')} onClick={() => p({ align: a })}>
                    {a === 'left' ? '◀' : a === 'center' ? '◆' : '▶'} {''}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <button className={'btn small' + (el.bold ? ' primary' : '')} onClick={() => p({ bold: !el.bold })}><b>B</b></button>
            <button className={'btn small' + (el.italic ? ' primary' : '')} onClick={() => p({ italic: !el.italic })}><i>I</i></button>
            <ColorField label="Couleur" value={el.color} onChange={(v) => p({ color: v })} swatches={COLORS} />
          </div>
          <ColorField label="Fond" value={el.bg} onChange={(v) => p({ bg: v })} swatches={COLORS} />
        </div>
      )}

      {/* Forme */}
      {el.type === 'shape' && (
        <div className="sect">
          <h3>Forme</h3>
          <div className="field">
            <label>Type</label>
            <select value={el.shape} onChange={(e) => p({ shape: e.target.value })}>
              <option value="rect">Rectangle</option>
              <option value="ellipse">Ellipse</option>
              <option value="triangle">Triangle</option>
            </select>
          </div>
          <ColorField label="Remplissage" value={el.fill} onChange={(v) => p({ fill: v })} swatches={FILLS} />
          {el.shape === 'rect' && <NumField label="Arrondi" value={el.radius} onChange={(v) => p({ radius: v })} />}
          <div className="row" style={{ alignItems: 'flex-end' }}>
            <NumField label="Bordure px" value={el.borderWidth} onChange={(v) => p({ borderWidth: v })} />
            <ColorField label="Couleur bordure" value={el.borderColor} onChange={(v) => p({ borderColor: v })} swatches={COLORS} />
          </div>
          <NumField label="Opacité (0–1)" value={el.opacity} min={0} max={1} step={0.1} onChange={(v) => p({ opacity: v })} />
        </div>
      )}

      {/* Image */}
      {el.type === 'image' && (
        <div className="sect">
          <h3>Image</h3>
          <div className="field">
            <label>Importer depuis l'ordinateur</label>
            <input type="file" accept="image/*" onChange={uploadImage((src) => p({ src }))} />
          </div>
          <div className="field">
            <label>…ou URL</label>
            <input type="text" value={el.src?.startsWith('data:') ? '' : el.src || ''} placeholder="https://…"
              onChange={(e) => p({ src: e.target.value })} />
          </div>
          <div className="field">
            <label>Recadrage</label>
            <select value={el.fit} onChange={(e) => p({ fit: e.target.value })}>
              <option value="cover">Remplir (cover)</option>
              <option value="contain">Contenir (contain)</option>
            </select>
          </div>
        </div>
      )}

      {/* Vidéo / embed */}
      {el.type === 'embed' && (
        <div className="sect">
          <h3>Vidéo intégrée</h3>
          <div className="field">
            <label>URL YouTube ou Vimeo</label>
            <input type="text" value={el.url || ''} placeholder="https://www.youtube.com/watch?v=…"
              onChange={(e) => p({ url: e.target.value })} />
          </div>
          <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>La vidéo n'apparaît <b>qu'en mode lecture</b>.</p>
        </div>
      )}

      {/* Interactivité : popup */}
      <div className="sect">
        <h3>💬 Popup au survol / clic</h3>
        <label className="check">
          <input type="checkbox" checked={el.popup?.enabled || false} onChange={(e) => setPopup({ enabled: e.target.checked })} />
          Cet élément déclenche une popup
        </label>
        {el.popup?.enabled && (
          <>
            <div className="field">
              <label>Déclencheur</label>
              <select value={el.popup.trigger} onChange={(e) => setPopup({ trigger: e.target.value })}>
                <option value="hover">Au survol de la souris</option>
                <option value="click">Au clic</option>
              </select>
            </div>
            <div className="field">
              <label>Titre de la popup</label>
              <input type="text" value={el.popup.title} onChange={(e) => setPopup({ title: e.target.value })} />
            </div>
            <div className="field">
              <label>Texte</label>
              <textarea value={el.popup.text} onChange={(e) => setPopup({ text: e.target.value })} />
            </div>
            <div className="field">
              <label>Image (facultatif)</label>
              <input type="file" accept="image/*" onChange={uploadImage((img) => setPopup({ image: img }))} />
            </div>
            <label className="check">
              <input type="checkbox" checked={!!el.popup.below} onChange={(e) => setPopup({ below: e.target.checked })} />
              Afficher sous l'élément
            </label>
          </>
        )}
      </div>

      {/* Interactivité : lien */}
      <div className="sect">
        <h3>🔗 Lien (navigation non linéaire)</h3>
        <div className="field">
          <label>Destinataire</label>
          <select value={el.link?.type || 'none'} onChange={(e) => setLink({ type: e.target.value })}>
            <option value="none">Aucun</option>
            <option value="slide">Diapositive de cette présentation</option>
            <option value="url">Site externe (nouvel onglet)</option>
          </select>
        </div>
        {el.link?.type === 'slide' && (
          <div className="field">
            <label>Aller à la diapositive</label>
            <select value={el.link.slideId || ''} onChange={(e) => setLink({ slideId: e.target.value })}>
              <option value="—">—</option>
              {slides.map((s, i) => (
                <option key={s.id} value={s.id}>Diapositive {i + 1}{i === slideIndex ? ' (actuelle)' : ''}</option>
              ))}
            </select>
          </div>
        )}
        {el.link?.type === 'url' && (
          <div className="field">
            <label>URL</label>
            <input type="text" value={el.link.url || ''} placeholder="https://…"
              onChange={(e) => setLink({ url: e.target.value })} />
          </div>
        )}
      </div>
    </aside>
  )
}

function NumField({ label, value, onChange, step = 1, min, max }) {
  const ref = useRef(null)
  return (
    <div className="field">
      <label>{label}</label>
      <input
        ref={ref} type="number" step={step} min={min} max={max} value={value ?? 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  )
}

export function ColorField({ label, value, onChange, swatches }) {
  const ref0 = useRef(null)
  return (
    <div className="field">
      <label>{label}</label>
      <div className="swatches">
        {swatches.map((c) => (
          <button key={c} className={value === c ? 'on' : ''} style={{ background: c === 'transparent' ? 'repeating-linear-gradient(45deg,#ddd 0 4px,#fff 4px 8px)' : c, border: '1px solid #555' }}
            title={c} onClick={() => onChange(c)} />
        ))}
        <input ref={ref0} type="color" value={/#[0-9a-f]{6}/i.test(value || '') ? value : '#6c6ce5'}
          style={{ width: 24, height: 24, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
          onChange={(e) => onChange(e.target.value)} title="Couleur personnalisée" />
      </div>
    </div>
  )
}

const ICON = { text: '🔤', shape: '◼️', image: '🖼️', embed: '📺', hotspot: '👆' }
const LABEL = { text: 'Texte', shape: 'Forme', image: 'Image', embed: 'Vidéo intégrée', hotspot: 'Zone interactive' }
