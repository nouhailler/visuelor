// Génère les icônes PWA (192/512) sans dépendance externe.
// Rendu avec sur-échantillonnage 4×4, encodage PNG (zlib + CRC manuels).
import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Distance signée aux outils de dessin
function roundedRectDist(x, y, s, r) {
  const cx = s / 2, cy = s / 2, h = s / 2
  const dx = Math.max(Math.abs(x - cx) - (h - r), 0)
  const dy = Math.max(Math.abs(y - cy) - (h - r), 0)
  return Math.hypot(dx, dy) - r
}
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}
function coverage(fn, x, y, s) {
  const N = 4, sub = 1 / N
  let hit = 0
  for (let i = 0; i < N; i++)
    for (let j = 0; j < N; j++) {
      if (fn(x + (i + 0.5) * sub, y + (j + 0.5) * sub, s) <= 0) hit++
    }
  return hit / (N * N)
}

function drawIcon(size) {
  const data = Buffer.alloc(size * size * 3)
  const bg = [108, 108, 229]
  const white = [255, 255, 255]
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const cx = px + 0.5, cy = py + 0.5
      const aBg = coverage((x, y, s) => roundedRectDist(x, y, s, s * 0.235), cx, cy, size)
      // fond
      let r = bg[0] * aBg, g = bg[1] * aBg, b = bg[2] * aBg
      // logo : loupe stylisée (cercle + manche + base) en blanc
      const cxL = size / 2, cyL = size * 0.44, rad = size * 0.17, lw = size * 0.055
      const inCircle = (x, y) => Math.abs(Math.hypot(x - cxL, y - cyL) - rad) - lw / 2
      const handle = (x, y, s) => segDist(x, y, cxL + rad * 0.7, cyL + rad * 0.7, cxL + s * 0.135, cyL + s * 0.135) - lw / 2
      const base = (x, y, s) => segDist(x, y, cxL - s * 0.115, cyL + s * 0.175, cxL + s * 0.115, cyL + s * 0.175) - lw / 2
      for (const fn of [inCircle, handle, base]) {
        const a = coverage(fn, cx, cy, size)
        if (a > 0) {
          r = r * (1 - a) + white[0] * a
          g = g * (1 - a) + white[1] * a
          b = b * (1 - a) + white[2] * a
        }
      }
      const o = (py * size + px) * 3
      data[o] = Math.round(r); data[o + 1] = Math.round(g); data[o + 2] = Math.round(b)
    }
  }
  return data
}

// ── Encodage PNG minimal ──────────────────────────────────────────────────────
function crc32(buf) {
  let c, table = crc32.t
  if (!table) {
    table = crc32.t = new Int32Array(256)
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c
    }
  }
  c = -1
  for (const b of buf) c = table[(c ^ b) & 255] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}
function encodePNG(size, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 2 // 8 bits, RGB
  const raw = Buffer.alloc(size * (size * 3 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0 // filtre none
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3)
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const png = encodePNG(size, drawIcon(size))
  writeFileSync(join(__dirname, '..', 'public', `icon-${size}.png`), png)
  console.log(`icon-${size}.png : ${png.length} octets`)
}
