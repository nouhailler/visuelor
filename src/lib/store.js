// Persistance locale (localStorage) — le back-end remplacera cette couche plus tard,
// sans changer le reste de l'application.

const KEY = 'visuelor.v1'

export function uid(prefix = 'el') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36).slice(-4)}`
}

export function loadAll() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

export function saveAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch (e) {
    console.error('Stockage saturé (images trop lourdes ?)', e)
    return false
  }
}

export function loadOne(id) {
  const list = loadAll()
  return list.find((p) => p.id === id) || null
}

export function saveOne(presentation) {
  const list = loadAll()
  const i = list.findIndex((p) => p.id === presentation.id)
  presentation.updatedAt = Date.now()
  if (i === -1) list.push(presentation)
  else list[i] = presentation
  return saveAll(list)
}

export function remove(id) {
  saveAll(loadAll().filter((p) => p.id !== id))
}

export function duplicate(id) {
  const list = loadAll()
  const src = list.find((p) => p.id === id)
  if (!src) return null
  const copy = JSON.parse(JSON.stringify(src))
  copy.id = uid('pres')
  copy.title = `${src.title} (copie)`
  copy.createdAt = Date.now()
  copy.updatedAt = Date.now()
  copy.slides.forEach((s) => {
    s.id = uid('slide')
    s.elements.forEach((el) => (el.id = uid(el.type)))
  })
  list.push(copy)
  saveAll(list)
  return copy
}

export function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format de "scène" fixe : toutes les coordonnées sont en px dans un repère 1280×720.
export const STAGE_W = 1280
export const STAGE_H = 720
