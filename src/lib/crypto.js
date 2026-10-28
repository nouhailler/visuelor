// Chiffrement 100 % local — rien ne quitte l'appareil.
// Format : base64url( [version 1 octet] [sel 16] [IV 12] [ ciphertext AES-GCM-256 ] )
// Dérivation : PBKDF2-SHA256, 200 000 itérations. Le mot de passe n'est JAMAIS stocké.

const te = new TextEncoder()
const td = new TextDecoder()

export const SHARE_PREFIX = 'vis1.' // enveloppe lisible pour le partage par "code"

function toB64url(bytes) {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  while (str.length % 4) str += '='
  const bin = atob(str)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptToPayload(obj, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(password, salt)
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj))))
  const head = new Uint8Array(29) // 1 (version) + 16 (sel) + 12 (IV)
  head[0] = 1
  head.set(salt, 1)
  head.set(iv, 17)
  const all = new Uint8Array(head.length + ct.length)
  all.set(head, 0)
  all.set(ct, head.length)
  return toB64url(all)
}

export async function decryptFromPayload(payload, password) {
  try {
    const raw = fromB64url(payload)
    if (raw.length < 30 || raw[0] !== 1) return { ok: false, error: 'format' }
    const salt = raw.slice(1, 17)
    const iv = raw.slice(17, 29)
    const key = await deriveKey(password, salt)
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, raw.slice(29))
    const obj = JSON.parse(td.decode(plain))
    if (!obj || !Array.isArray(obj.slides)) return { ok: false, error: 'corrompu' }
    return { ok: true, presentation: obj }
  } catch {
    return { ok: false, error: 'mot_de_passe' }
  }
}

export function wrapCode(payload) {
  return SHARE_PREFIX + payload
}

// Accepte : un lien complet (#/v/…), un code "vis1.…" ou un payload brut.
export function extractPayload(text) {
  if (!text) return null
  const m = String(text).match(/#\/v\/([A-Za-z0-9\-_]+)/)
  if (m) return m[1]
  const t = String(text).trim().replace(new RegExp('^' + SHARE_PREFIX.replace('.', '\\.')), '')
  return /^[A-Za-z0-9\-_]{8,}$/.test(t) ? t : null
}

// Le lien n'a de sens que pour les protocoles http(s) — jamais en file:// (RAS : le
// payload vit dans le fragment #…, qui n'est de toute façon jamais transmis).
export function buildShareLink(payload) {
  if (location.protocol !== 'http:' && location.protocol !== 'https:') return null
  return `${location.origin}${location.pathname}#/v/${payload}`
}

export function generatePassword() {
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%*-+'
  const rnd = crypto.getRandomValues(new Uint32Array(16))
  let out = ''
  for (let i = 0; i < 14; i++) out += alphabet[rnd[i] % alphabet.length]
  return out
}
