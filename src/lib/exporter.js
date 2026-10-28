// Export d'images et PDF — 100 % local, zéro dépendance.
// Les diapositives (1280×720) sont rasterisées en canvas ; le PDF assemble
// directement les JPEG générés dans un fichier PDF valide.

import { STAGE_W, STAGE_H } from './store.js'

function loadImage(src) {
  return new Promise((res) => {
    if (!src || typeof src !== 'string') return res(null)
    const img = new Image()
    if (/^https?:/i.test(src)) img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

// ── Rasterisation d'une diapositive ──────────────────────────────────────
export async function renderSlideCanvas(slide, scale = 2) {
  const canvas = document.createElement('canvas')
  canvas.width = STAGE_W * scale
  canvas.height = STAGE_H * scale
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = slide.background || '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.save()
  ctx.scale(scale, scale)
  const imgs = new Map()
  await Promise.all(
    slide.elements
      .filter((el) => el.type === 'image' && el.src)
      .map(async (el) => imgs.set(el.id, await loadImage(el.src))),
  )
  for (const el of slide.elements) {
    if (el.type === 'hotspot') continue // zones interactives invisibles à l'export
    ctx.save()
    try { drawElement(ctx, el, imgs.get(el.id)) } catch { /* élément ignoré */ }
    ctx.restore()
  }
  ctx.restore()
  return canvas
}

function wrapLines(ctx, text, maxWidth) {
  const out = []
  for (const raw of String(text ?? '').split('\n')) {
    if (raw === '') { out.push(''); continue }
    let line = ''
    for (const word of raw.split(/(\s+)/)) {
      const test = line + word
      if (ctx.measureText(test).width > maxWidth && line.trim()) {
        out.push(line.trimEnd())
        line = word.trimStart()
      } else line = test
    }
    out.push(line.trimEnd())
  }
  return out
}

function drawElement(ctx, el, img) {
  if (el.type === 'text') {
    if (el.bg && el.bg !== 'transparent') {
      ctx.fillStyle = el.bg
      ctx.beginPath()
      ctx.roundRect(el.x, el.y, el.w, el.h, 6)
      ctx.fill()
    }
    ctx.font = `${el.italic ? 'italic ' : ''}${el.bold ? 700 : 400} ${el.fontSize}px '${el.fontFamily || 'Inter'}', sans-serif`
    ctx.fillStyle = el.color || '#000'
    ctx.textBaseline = 'top'
    const lh = el.fontSize * (el.lineHeight || 1.25)
    const lines = wrapLines(ctx, el.text, el.w)
    let y = el.y
    for (const line of lines) {
      ctx.textAlign = 'left'
      let x = el.x
      if (el.align === 'center') { ctx.textAlign = 'center'; x = el.x + el.w / 2 }
      else if (el.align === 'right') { ctx.textAlign = 'right'; x = el.x + el.w }
      ctx.fillText(line, x, y)
      y += lh
      if (y > el.y + el.h + lh) break
    }
    return
  }

  if (el.type === 'shape') {
    ctx.globalAlpha = el.opacity ?? 1
    ctx.fillStyle = el.fill || '#000'
    ctx.beginPath()
    if (el.shape === 'ellipse') ctx.ellipse(el.x + el.w / 2, el.y + el.h / 2, el.w / 2, el.h / 2, 0, 0, Math.PI * 2)
    else if (el.shape === 'triangle') {
      ctx.moveTo(el.x + el.w / 2, el.y)
      ctx.lineTo(el.x + el.w, el.y + el.h)
      ctx.lineTo(el.x, el.y + el.h)
      ctx.closePath()
    } else ctx.roundRect(el.x, el.y, el.w, el.h, el.radius || 0)
    ctx.fill()
    if ((el.borderWidth || 0) > 0) {
      ctx.strokeStyle = el.borderColor || '#000'
      ctx.lineWidth = el.borderWidth
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    return
  }

  if (el.type === 'image' && img) {
    const iw = img.naturalWidth || img.width
    const ih = img.naturalHeight || img.height
    const vw = el.w, vh = el.h
    let dw, dh
    if (el.fit === 'contain') { const k = Math.min(vw / iw, vh / ih); dw = iw * k; dh = ih * k }
    else { const k = Math.max(vw / iw, vh / ih); dw = iw * k; dh = ih * k }
    const offX = el.x + (vw - dw) / 2
    const offY = el.y + (vh - dh) / 2
    if (el.fit === 'cover') {
      ctx.save()
      ctx.beginPath(); ctx.rect(el.x, el.y, vw, vh); ctx.clip()
      ctx.drawImage(img, offX, offY, dw, dh)
      ctx.restore()
    } else ctx.drawImage(img, offX, offY, dw, dh)
    return
  }

  if (el.type === 'embed') {
    // les vidéos ne peuvent être rasterisées : espace réservé explicite
    ctx.save()
    ctx.fillStyle = '#f0f0f4'
    ctx.beginPath()
    ctx.roundRect(el.x, el.y, el.w, el.h, 8)
    ctx.fill()
    ctx.strokeStyle = '#c9c9d6'
    ctx.lineWidth = 1
    ctx.stroke()
    ctx.fillStyle = '#6b6b80'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.font = "28px 'Inter', sans-serif"
    ctx.fillText('📺 Vidéo intégrée (non exportée)', el.x + el.w / 2, el.y + el.h / 2)
    ctx.restore()
    return
  }

  // Quiz : rendu statique avec la bonne réponse surlignée (utile pour imprimer)
  if (el.type === 'quiz') {
    const pad = 18
    ctx.save()
    ctx.fillStyle = 'rgba(127,127,160,0.10)'
    ctx.beginPath()
    ctx.roundRect(el.x, el.y, el.w, el.h, 14)
    ctx.fill()
    ctx.strokeStyle = 'rgba(127,127,160,0.35)'
    ctx.lineWidth = 1
    ctx.stroke()
    // question
    ctx.font = "700 20px 'Inter', sans-serif"
    ctx.fillStyle = '#1c1c28'
    ctx.textBaseline = 'top'
    const qLines = wrapLines(ctx, el.question || '', el.w - pad * 2)
    let y = el.y + pad
    for (const line of qLines) { ctx.fillText(line, el.x + pad, y); y += 26 }
    // réponses réparties sur la place restante
    const choices = Array.isArray(el.choices) ? el.choices : []
    const zoneTop = y + 8
    const zoneH = Math.max(0, el.y + el.h - pad - zoneTop)
    const rowH = Math.min(44, Math.floor(zoneH / Math.max(1, choices.length)) - 7)
    choices.forEach((c, i) => {
      const cy = zoneTop + i * (rowH + 7)
      const okOne = i === el.correct
      ctx.beginPath()
      ctx.roundRect(el.x + pad, cy, el.w - pad * 2, rowH, 10)
      ctx.fillStyle = okOne ? 'rgba(79,201,138,0.18)' : 'rgba(127,127,160,0.08)'
      ctx.fill()
      ctx.strokeStyle = okOne ? '#4fc98a' : 'rgba(127,127,160,0.45)'
      ctx.stroke()
      ctx.font = "15px 'Inter', sans-serif"
      ctx.fillStyle = okOne ? '#1e7a52' : '#1c1c28'
      ctx.textBaseline = 'middle'
      ctx.fillText((okOne ? '✓ ' : '') + c, el.x + pad + 12, cy + rowH / 2)
    })
    ctx.restore()
    return
  }

  // Audio : carte avec titre (le son n'est pas imprimable)
  if (el.type === 'audio') {
    ctx.save()
    ctx.fillStyle = 'rgba(127,127,160,0.10)'
    ctx.beginPath()
    ctx.roundRect(el.x, el.y, el.w, el.h, 12)
    ctx.fill()
    ctx.strokeStyle = 'rgba(127,127,160,0.35)'
    ctx.stroke()
    ctx.fillStyle = '#8a8aa8'
    ctx.font = "13px 'Inter', sans-serif"
    ctx.textBaseline = 'top'
    ctx.fillText('🔊 ' + (el.title || 'Piste audio'), el.x + 12, el.y + 8)
    // fausse barre de lecture
    const by = el.y + el.h - 22
    ctx.beginPath()
    ctx.roundRect(el.x + 12, by, el.w - 24, 8, 4)
    ctx.fillStyle = 'rgba(127,127,160,0.25)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(el.x + 20, by + 4, 8, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(127,127,160,0.55)'
    ctx.fill()
    ctx.restore()
    return
  }
}

// ── PNG ──────────────────────────────────────────────────────────────────
export function canvasToBlob(canvas, type = 'image/png', quality = 0.95) {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob échoué'))), type, quality))
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(a.href), 4000)
}

export async function exportSlidePNG(slide, filename) {
  const canvas = await renderSlideCanvas(slide, 2)
  const blob = await canvasToBlob(canvas, 'image/png')
  downloadBlob(blob, filename)
}

function delay(ms) { return new Promise((r) => setTimeout(r, ms)) }

export async function exportAllPNG(presentation, onProgress) {
  const base = (presentation.title || 'presentation').replace(/[^\w\-À-ÿ ]+/g, '').trim()
  for (let i = 0; i < presentation.slides.length; i++) {
    onProgress?.(i, presentation.slides.length)
    await exportSlidePNG(presentation.slides[i], `${base} — ${String(i + 1).padStart(2, '0')}.png`)
    await delay(350) // laisser le navigateur enchaîner les téléchargements
  }
}

// ── PDF (générateur minimal : JPEG × pages 1280×720 pt) ──────────────────
export function buildPdf(jpegs, { title = 'visuelor' } = {}) {
  const escs = (s) => s.replace(/[\\()]/g, (c) => '\\' + c)
  const parts = []
  let offset = 0
  const offsets = []
  const push = (data) => {
    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    parts.push(bytes)
    offset += bytes.length
  }
  const beginObj = (n) => { offsets[n] = offset; push(n + ' 0 obj\n') }

  push('%PDF-1.4\n')
  // timbre binaire de conformité (octets supérieurs à 127, en BINAIRE réel)
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]))

  const n = jpegs.length
  // Numérotation : 1=catalogue, 2=pages, 3=info, page i → 4+3i, contenu → 5+3i, image → 6+3i
  const kids = jpegs.map((_, i) => `${4 + 3 * i} 0 R`).join(' ')

  beginObj(1)
  push(`<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`)
  beginObj(2)
  push(`<< /Type /Pages /Kids [ ${kids} ] /Count ${n} /MediaBox [ 0 0 ${STAGE_W} ${STAGE_H} ] >>\nendobj\n`)
  beginObj(3)
  push(`<< /Title (${escs(title)}) /Creator (visuelor) /Producer (visuelor local) >>\nendobj\n`)

  jpegs.forEach((j, i) => {
    const pageNo = 4 + 3 * i, contNo = 5 + 3 * i, imgNo = 6 + 3 * i
    const stream = `q\n${STAGE_W} 0 0 ${STAGE_H} 0 0 cm\n/Im Do\nQ\n`
    const streamBytes = new TextEncoder().encode(stream)
    beginObj(pageNo)
    push(`<< /Type /Page /Parent 2 0 R /MediaBox [ 0 0 ${STAGE_W} ${STAGE_H} ] /Resources << /XObject << /Im ${imgNo} 0 R >> >> /Contents ${contNo} 0 R >>\nendobj\n`)
    beginObj(contNo)
    push(`<< /Length ${streamBytes.length} >>\nstream\n`)
    push(streamBytes)
    push('\nendstream\nendobj\n')
    beginObj(imgNo)
    push(`<< /Type /XObject /Subtype /Image /Width ${j.w} /Height ${j.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.bytes.length} >>\nstream\n`)
    push(j.bytes)
    push('\nendstream\nendobj\n')
  })

  const count = 3 + 3 * n
  const xrefStart = offset
  let xref = `xref\n0 ${count + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= count; i++) xref += String(offsets[i]).padStart(10, '0') + ' 00000 n \n'
  xref += `trailer\n<< /Size ${count + 1} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  push(xref)

  return new Blob(parts, { type: 'application/pdf' })
}

export async function exportPdf(presentation, onProgress) {
  const jpegs = []
  for (let i = 0; i < presentation.slides.length; i++) {
    onProgress?.(i, presentation.slides.length)
    const canvas = await renderSlideCanvas(presentation.slides[i], 2)
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92)
    const b64 = new Uint8Array(await blob.arrayBuffer())
    jpegs.push({ bytes: b64, w: canvas.width, h: canvas.height })
  }
  const base = (presentation.title || 'presentation').replace(/[^\w\-À-ÿ ]+/g, '').trim()
  const pdf = buildPdf(jpegs, { title: presentation.title || 'visuelor' })
  downloadBlob(pdf, `${base || 'visuelor'} — export.pdf`)
}
