// Test de bout en bout du partage hors ligne (Node side) :
// chiffrage → compte rendu du HTML généré → vérif syntaxe du lecteur embarqué.
import { buildStandaloneHtml } from '../src/lib/standalone.js'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

// WAV minimal (0,1 s de silence, 8 kHz mono 8 bits) pour tester l'élément audio
const SILENT_WAV = (() => {
  const n = 800
  const buf = Buffer.alloc(44 + n)
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n, 4); buf.write('WAVE', 8)
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20)
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(8000, 24); buf.writeUInt32LE(8000, 28)
  buf.writeUInt16LE(1, 32); buf.writeUInt8(8, 34)
  buf.write('data', 36); buf.writeUInt32LE(n, 40)
  return 'data:audio/wav;base64,' + buf.toString('base64')
})()

// Réplication de crypto.js en pur Node (WebCrypto est natif depuis Node 20)
async function encryptToPayload(obj, password) {
  const te = new TextEncoder()
  const toB64url = (bytes) => Buffer.from(bytes).toString('base64url')
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const base = await crypto.subtle.importKey('raw', te.encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt'])
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, te.encode(JSON.stringify(obj))))
  const head = new Uint8Array(29)
  head[0] = 1; head.set(salt, 1); head.set(iv, 17)
  const all = new Uint8Array(head.length + ct.length)
  all.set(head, 0); all.set(ct, head.length)
  return toB64url(all)
}

const pres = {
  title: 'Test protégo',
  slides: [
    {
      id: 's1', background: '#ffffff',
      elements: [
        { id: 'e1', type: 'text', x: 100, y: 100, w: 500, h: 80, text: 'Bonjour chiffré', fontSize: 40, bold: true, color: '#14142b', fontFamily: 'Inter' },
        { id: 'e2', type: 'shape', x: 700, y: 100, w: 200, h: 200, shape: 'ellipse', fill: '#6c6ce5', opacity: 1, borderWidth: 0 },
        {
          id: 'e3', type: 'hotspot', x: 100, y: 280, w: 150, h: 60,
          popup: { enabled: true, trigger: 'hover', title: 'Une popup', text: 'Contenu secret', image: '' },
          link: { type: 'none', slideId: null, url: '' },
        },
        {
          id: 'e4', type: 'text', x: 100, y: 380, w: 400, h: 60, text: 'Aller à la diapo 2', fontSize: 24, color: '#000',
          fontFamily: 'Inter', link: { type: 'slide', slideId: 's2', url: '' }, popup: { enabled: false },
        },
        {
          id: 'e5', type: 'quiz', x: 600, y: 300, w: 560, h: 300,
          question: 'Quel est le plus grand océan ?',
          choices: ['Le Pacifique', 'L’Atlantique', 'L’Indien'],
          correct: 0,
          popup: { enabled: false }, link: { type: 'none', slideId: null, url: '' },
        },
        {
          id: 'e6', type: 'audio', x: 600, y: 620, w: 440, h: 76,
          src: SILENT_WAV, title: 'Consigne',
          popup: { enabled: false }, link: { type: 'none', slideId: null, url: '' },
        },
      ],
    },
    { id: 's2', background: '#eef', elements: [{ id: 'f1', type: 'text', x: 200, y: 200, w: 600, h: 80, text: 'Diapositive 2', fontSize: 50, color: '#000', fontFamily: 'Inter' }] },
  ],
}

const payload = await encryptToPayload(pres, 'mot-de-passe-test')
console.log('payload :', payload.slice(0, 40) + '…', `(${payload.length} car.)`)

const html = buildStandaloneHtml(payload)
const dir = mkdtempSync(join(tmpdir(), 'visuelor-test-'))
const file = join(dir, 'test-protege.html')
writeFileSync(file, html)
console.log('écrit :', file, `(${html.length} octets)`)

// Extraction + contrôle syntaxe du script embarqué
const m = html.match(/<script>([\s\S]*)<\/script>/)
if (!m) throw new Error('script introuvable dans le HTML généré')
writeFileSync(join(dir, 'viewer.js'), m[1])
execFileSync(process.execPath, ['--check', join(dir, 'viewer.js')], { stdio: 'pipe' })
console.log('syntaxe du lecteur embarqué : OK')

// Le payload ne doit contenir aucune chaîne en clair du contenu
if (html.includes('Bonjour chiffré') || html.includes('Contenu secret') || html.includes('Quel est le plus grand océan')) throw new Error('FUITE : contenu en clair présent !')
console.log('aucun contenu en clair dans le fichier : OK')
