import { useState } from 'react'
import { extractPayload, decryptFromPayload } from '../lib/crypto.js'
import { saveOne } from '../lib/store.js'

// Côté destinataire : ouvrir un lien '...#/v/<payload>' ou coller le code
// chiffré, puis saisir le mot de passe pour déchiffrer localement.

export function ImportGate({ payload: initialPayload, onClose, onView, onSaved }) {
  const [input, setInput] = useState(initialPayload ? window.location.hash.replace('#/v/', '') || initialPayload : '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [stage, setStage] = useState('code') // code | password
  const [payload, setPayload] = useState(null)

  const parse = () => {
    const p = extractPayload(input)
    if (!p) {
      setErr('Code ou lien non reconnu. Collez le lien complet ou le code commençant par « vis1. ».')
      return
    }
    setPayload(p)
    setErr('')
    setStage('password')
  }

  const decrypt = async () => {
    setBusy(true); setErr('')
    const res = await decryptFromPayload(payload, password)
    setBusy(false)
    if (!res.ok) {
      setErr(res.error === 'mot_de_passe' ? 'Mot de passe incorrect.' : 'Contenu corrompu ou format inconnu.')
      return
    }
    onView(res.presentation)
  }

  return (
    <div className="modal-back">
      <div className="modal">
        <h2>🔓 Ouvrir un partage</h2>
        {stage === 'code' && (
          <>
            <div className="field">
              <label>Lien ou code chiffré</label>
              <textarea
                value={input}
                placeholder="Collez ici le lien visuelor ou le code « vis1.… »"
                onChange={(e) => setInput(e.target.value)}
                style={{ minHeight: 90, fontFamily: 'Roboto Mono, monospace', fontSize: 12 }}
              />
            </div>
            <button className="btn primary" style={{ width: '100%' }} onClick={parse}>Continuer</button>
          </>
        )}
        {stage === 'password' && (
          <>
            <div className="field">
              <label>Mot de passe de cette présentation</label>
              <input
                type="password" value={password} autoFocus
                onKeyDown={(e) => e.key === 'Enter' && decrypt()}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button className="btn primary" style={{ width: '100%' }} onClick={decrypt} disabled={busy}>
              {busy ? 'Déchiffrement…' : '🔓 Déchiffrer et ouvrir'}
            </button>
            <p style={{ color: 'var(--text-dim)', fontSize: 11.5, marginTop: 8 }}>
              Le déchiffrement se fait sur votre appareil. Rien n'est envoyé, rien n'est stocké sans votre accord.
            </p>
          </>
        )}
        {err && <p style={{ color: 'var(--danger)', fontSize: 12.5 }}>{err}</p>}
        <div className="actions">
          <button className="btn" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  )
}

// Barre d'actions au-dessus de la lecture d'une présentation partagée.
export function SharedBar({ presentation, onExit, onSaved }) {
  const [copied, setCopied] = useState(false)
  const save = () => {
    saveOne({ ...presentation, title: presentation.title || 'Présentation partagée' })
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="topnav" style={{ opacity: 1 }}>
      <span style={{ fontSize: 13, color: '#cfcfe6' }} title="Lecture d'une présentation chiffrée">
        🔒 partagée — mot de passe vérifié
      </span>
      <button className="btn small" onClick={save}>{copied ? '✓ copie enregistrée' : '⬇ Enregistrer une copie'}</button>
      <button className="btn small" onClick={onExit}>✕ Quitter</button>
      {onSaved}
    </div>
  )
}
