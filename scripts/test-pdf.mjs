// Vérifie la structure du PDF généré (xref cohérent, objets présents, EOF propre).
import { buildPdf } from '../src/lib/exporter.js'

// faux JPEG (le contenu binary est indifférent pour la structure)
const fake = (n) => new Uint8Array(n).fill(0xff)
const blob = buildPdf(
  Array.from({ length: 3 }, () => ({ bytes: fake(100), w: 2560, h: 1440 })),
  { title: 'Test (par) entoises' },
)
const bytes = new Uint8Array(await blob.arrayBuffer())
const text = new TextDecoder('latin1').decode(bytes)

const checks = []
const expect = (name, ok) => checks.push([name, ok])
expect('en-tête %PDF-1.4', text.startsWith('%PDF-1.4'))
expect('3 pages', /\[ 4 0 R 7 0 R 10 0 R \]/.test(text))
expect('catalogue & info', text.includes('/Root 1 0 R') && text.includes('/Info 3 0 R'))
expect('filtres JPEG', (text.match(/\/Filter \/DCTDecode/g) || []).length === 3)
expect('flux de contenu cm /Im Do', (text.match(/Im Do/g) || []).length === 3)
expect('%%EOF final', text.trimEnd().endsWith('%%EOF'))

// cross-check des offsets xref
const xrefStart = Number(text.match(/startxref\n(\d+)\n%%EOF/)[1])
expect('startxref pointe sur xref', text.slice(xrefStart, xrefStart + 4) === 'xref')
const xrefBlock = text.slice(xrefStart)
const entries = [...xrefBlock.matchAll(/(\d{10}) 00000 n/g)]
let allOk = true
entries.forEach((m, idx) => {
  const off = Number(m[1])
  if (!text.slice(off, off + 3).startsWith(String(idx + 1) + ' ')) allOk = false
})
expect('tous les offsets d objets corrects', allOk)

let pass = true
for (const [name, ok] of checks) {
  console.log((ok ? '✓ ' : '✗ ') + name)
  if (!ok) pass = false
}
process.exit(pass ? 0 : 1)
