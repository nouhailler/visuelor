import { useState } from 'react'
import { encryptToPayload, wrapCode, buildShareLink, generatePassword } from '../lib/crypto.js'
import { downloadStandalone } from '../lib/standalone.js'

export function ShareDialog({ presentation, onClose }) {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [payload, setPayload] = useState(null)
  const [copied, setCopied] = useState('')

  const generate = async () => {
    setErr('')
    if (password.length < 4) {
      setErr('Choisissez un mot de passe d\'au moins 4 caractères (recommandé : celui suggéré).')
      return
    }
    setBusy(true)
    try {
      const p = await encryptToPayload(presentation, password)
      setPayload(p)
    } catch (e) {
      setErr('Échec du chiffrement : ' + (e?.message || e))
    }
    setBusy(false)
  }

  const copy = async (text, what) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(what)
    setTimeout(() => setCopied(''), 1800)
  }

  const link = payload ? buildShareLink(payload) : null
  // Un lien vers cet ordinateur (localhost, réseau privé) ne s'ouvrira pas chez les
  // destinataires ; un lien de plusieurs centaines de Ko est coupé par les messageries.
  const localHost = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1)/.test(location.hostname)
  const linkTooLong = link && link.length > 60000
  const code = payload ? wrapCode(payload) : null
  const htmlName = (presentation.title || 'presentation').replace(/[^\w\-À-ÿ ]+/g, '').trim() + ' — protégée.html'

  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>🔗 Partager «&nbsp;{presentation.title}&nbsp;»</h2>
        <p style={{ color: 'var(--text-dim)', fontSize: 12.5, lineHeight: 1.55, marginTop: -6 }}>
          100 % local : la présentation est <b>chiffrée (AES-GCM)</b> sur cet appareil. Le destinataire
          devra saisir le mot de passe pour l'ouvrir — sans lui, le contenu est indéchiffrable.
        </p>

        <div className="field">
          <label>Mot de passe</label>
          <div className="row" style={{ alignItems: 'center' }}>
            <input
              type="text" value={password} placeholder="mot de passe"
              onChange={(e) => { setPassword(e.target.value); setPayload(null) }}
            />
            <button
              className="btn small" title="Générer un mot de passe solide"
              style={{ flex: '0 0 auto' }}
              onClick={() => { setPassword(generatePassword()); setPayload(null) }}
            >🎲</button>
          </div>
        </div>

        {!payload && (
          <>
            <button className="btn primary" onClick={generate} disabled={busy} style={{ width: '100%' }}>
              {busy ? 'Chiffrement…' : '🔒 Chiffrer et générer le partage'}
            </button>
            {err && <p style={{ color: 'var(--danger)', fontSize: 12.5 }}>{err}</p>}
          </>
        )}

        {payload && (
          <>
            <div className="sect" style={{ borderTop: 'none', marginTop: 12, paddingTop: 0 }}>
              <h3>Code chiffré (copier-coller)</h3>
              <div className="row" style={{ alignItems: 'stretch' }}>
                <input readOnly value={code} style={{
                  background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8,
                  padding: '7px 10px', fontSize: 11.5, fontFamily: 'Roboto Mono, monospace',
                }} onFocus={(e) => e.target.select()} />
                <button className="btn small" style={{ flex: '0 0 auto' }} onClick={() => copy(code, 'code')}>
                  {copied === 'code' ? '✓ copié' : '⧉'}
                </button>
              </div>
              <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                Le destinataire l'importe via «&nbsp;＋ Importer un partage&nbsp;» du tableau de bord.
              </p>
            </div>

            <div className="sect">
              <h3>Lien d'ouverture directe</h3>
              {link ? (
                <>
                {(localHost || linkTooLong) && (
                  <p style={{ color: '#f2b34c', fontSize: 12.5, lineHeight: 1.5, marginTop: 0 }}>
                    ⚠ {localHost
                      ? 'Ce lien pointe vers votre ordinateur : il ne s\'ouvrira pas chez vos destinataires. '
                      : `Ce lien est très long (${Math.round(link.length / 1024)} Ko, à cause de la photo) : les messageries risquent de le couper. `}
                    Envoyez plutôt le <b>fichier HTML</b> ci-dessous.
                  </p>
                )}
                <div className="row" style={{ alignItems: 'stretch' }}>
                  <input readOnly value={link} style={{
                    background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 8,
                    padding: '7px 10px', fontSize: 11.5, fontFamily: 'Roboto Mono, monospace',
                  }} onFocus={(e) => e.target.select()} />
                  <button className="btn small" style={{ flex: '0 0 auto' }} onClick={() => copy(link, 'link')}>
                    {copied === 'link' ? '✓ copié' : '⧉'}
                  </button>
                </div>
                </>
              ) : (
                <p style={{ color: 'var(--text-dim)', fontSize: 12.5, lineHeight: 1.5 }}>
                  Pas de lien en ouverture de fichier local — installez l'app (PWA) ou servez-la sur
                  votre réseau local (http) pour générer des liens. En attendant, utilisez le code 🔽
                </p>
              )}
            </div>

            <div className="sect">
              <h3>Fichier HTML protégé (hors ligne)</h3>
              <button
                className="btn" style={{ width: '100%', whiteSpace: 'normal', textAlign: 'left' }}
                onClick={() => downloadStandalone(payload, htmlName)}
              >
                ⬇ Télécharger « {htmlName} » ({Math.round(code.length / 1024)} Ko)
              </button>
              <p style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                Un fichier unique : lecteur + contenu chiffré. S'ouvre partout (ordinateur, téléphone),
                sans installation — envoyez-le par e-mail, WhatsApp… et communiquez le mot de passe à part.
              </p>
            </div>
          </>
        )}

        <div className="actions">
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
