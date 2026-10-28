// Réduction locale des photos importées (canvas, rien n'est envoyé).
// Une photo de téléphone (4000 px, 5–10 Mo) saturerait le localStorage (~5 Mo)
// et rendrait le partage chiffré énorme : on la ramène à MAX_DIM px en JPEG.

const MAX_DIM = 1920
const QUALITY = 0.85

function readAsDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(r.result)
    r.onerror = () => rej(r.error)
    r.readAsDataURL(file)
  })
}

export async function fileToImageSrc(file, maxDim = MAX_DIM) {
  const raw = await readAsDataURL(file)
  // SVG et GIF animés : on garde l'original (vectoriel / animation)
  if (/image\/(svg|gif)/.test(file.type)) return raw
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = raw
    })
    const k = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * k)
    canvas.height = Math.round(img.naturalHeight * k)
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff' // fond pour les PNG transparents passés en JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const out = canvas.toDataURL('image/jpeg', QUALITY)
    return out.length < raw.length ? out : raw
  } catch {
    return raw
  }
}
