import { uid } from './store.js'

// Usine à éléments — tout est surchargeable via patch.
export function makeElement(type, patch = {}) {
  const base = {
    id: uid(type),
    type,
    x: 300,
    y: 240,
    w: 400,
    h: 160,
    locked: false,
    link: { type: 'none', slideId: null, url: '' },
    popup: { enabled: false, trigger: 'hover', title: '', text: '', image: '' },
    ...patch,
  }
  switch (type) {
    case 'text':
      return {
        ...base,
        w: 420,
        h: 90,
        text: 'Double-cliquez pour éditer',
        fontSize: 40,
        fontFamily: 'Inter',
        color: '#1c1c28',
        bold: false,
        italic: false,
        align: 'left',
        lineHeight: 1.25,
        bg: 'transparent',
        ...patch,
      }
    case 'shape':
      return {
        ...base,
        shape: 'rect', // rect | ellipse | triangle
        fill: '#5B5BD6',
        radius: 12,
        borderColor: 'transparent',
        borderWidth: 0,
        opacity: 1,
        ...patch,
      }
    case 'image':
      return {
        ...base,
        w: 480,
        h: 320,
        src: '',
        fit: 'cover', // cover | contain
        ...patch,
      }
    case 'embed':
      return {
        ...base,
        w: 640,
        h: 360,
        url: '',
        ...patch,
      }
    case 'hotspot': // zone interactive invisible à la lecture (poignée 👆)
      return {
        ...base,
        w: 140,
        h: 60,
        ...patch,
      }
    default:
      return base
  }
}

function slide(patch = {}) {
  return { id: uid('slide'), background: '#ffffff', elements: [], ...patch }
}

// ── Templates de départ (petite bibliothèque intégrée) ────────────────────────
// Démo : photo annotée avec zone interactive → popup (cas d'usage enseignant).

const DEMO_PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 430">
      <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#B4C8E8"/><stop offset="1" stop-color="#E8D9C5"/></linearGradient></defs>
      <rect width="640" height="270" fill="url(#sky)"/>
      <circle cx="520" cy="70" r="38" fill="#F6D876"/>
      <polygon points="0,270 200,90 340,270" fill="#6C7A64"/>
      <polygon points="180,270 380,60 640,270" fill="#55604F"/>
      <rect y="268" width="640" height="162" fill="#8A9B77"/>
      <ellipse cx="320" cy="392" rx="330" ry="60" fill="#A7B78F"/>
      <text x="320" y="42" text-anchor="middle" font-family="Georgia" font-size="24" fill="#3d4a3a">Paysage — sainte-victoire.svg</text>
    </svg>`,
  )

function lessonTemplate() {
  const s = slide({ background: '#F6F6FA' })
  s.elements.push(
    makeElement('text', {
      x: 60, y: 40, w: 1160, h: 70,
      text: 'La photo annotée : cliquez sur les zones 👆',
      fontSize: 44, fontFamily: 'Montserrat', bold: true, color: '#262640',
    }),
    makeElement('image', { x: 180, y: 140, w: 920, h: 540, src: DEMO_PHOTO, fit: 'contain' }),
    makeElement('hotspot', {
      x: 330, y: 300, w: 120, h: 90,
      popup: { enabled: true, trigger: 'click', title: 'Le sommet', text: 'Point culminant, environ 1 011 m. Classé monument historique en 1810.', image: '' },
    }),
    makeElement('hotspot', {
      x: 810, y: 460, w: 110, h: 80,
      popup: { enabled: true, trigger: 'hover', title: 'La forêt', text: 'Forêt mixte de chênes verts et de pins sylvestres.', image: '' },
    }),
  )
  return { id: uid('pres'), title: 'Leçon — photo annotée', createdAt: Date.now(), updatedAt: Date.now(), slides: [s] }
}

function pitchTemplate() {
  const s1 = slide({ background: '#14142B' })
  s1.elements.push(
    makeElement('text', { x: 90, y: 210, w: 900, h: 110, text: 'Visuelor — Pitch', fontSize: 76, color: '#FFFFFF', bold: true, fontFamily: 'Montserrat' }),
    makeElement('text', { x: 94, y: 340, w: 900, h: 60, text: 'Des présentations qui se visitent, pas juste qui défilent.', fontSize: 30, color: '#9C9CC4', fontFamily: 'Inter' }),
  )
  const s2 = slide({ background: '#FFFFFF' })
  s2.elements.push(
    makeElement('text', { x: 80, y: 60, w: 1100, h: 70, text: 'Le problème', fontSize: 46, bold: true, color: '#14142B', fontFamily: 'Montserrat' }),
    makeElement('shape', { x: 80, y: 180, w: 340, h: 340, shape: 'ellipse', fill: '#EFEEFF' }),
    makeElement('shape', { x: 470, y: 180, w: 340, h: 340, shape: 'rect', fill: '#DFF3E9', radius: 24 }),
    makeElement('shape', { x: 860, y: 180, w: 340, h: 340, shape: 'triangle', fill: '#FFEDD9' }),
    makeElement('shape', { x: 80, y: 560, w: 1120, h: 2, radius: 0, fill: '#E6E6F0' }),
    makeElement('hotspot', {
      x: 80, y: 180, w: 340, h: 340,
      popup: { enabled: true, trigger: 'hover', title: 'Cercle', text: 'Exemple de forme interactive — survolez-moi !', image: '' },
    }),
    makeElement('text', { x: 80, y: 600, w: 1100, h: 60, text: 'Astuce : chaque élément peut ouvrir une popup ou sauter vers une autre diapositive.', fontSize: 24, color: '#5b5b7a' }),
  )
  return { id: uid('pres'), title: 'Pitch deck — modèle', createdAt: Date.now(), updatedAt: Date.now(), slides: [s1, s2] }
}

function blankTemplate() {
  return {
    id: uid('pres'),
    title: 'Présentation sans titre',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    slides: [slide()],
  }
}

export const TEMPLATES = [
  { id: 'blank', name: 'Vierge', desc: 'Une diapositive toute neuve.', swatch: '#ffffff', build: blankTemplate },
  { id: 'lesson', name: 'Photo annotée', desc: 'Zones cliquables + popups, parfait pour l’enseignement.', swatch: '#8A9B77', build: lessonTemplate },
  { id: 'pitch', name: 'Pitch deck', desc: 'Couverture sombre + slide de démonstration interactive.', swatch: '#14142B', build: pitchTemplate },
]

export function createFromTemplate(templateId) {
  const t = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0]
  return t.build()
}

export function blankSlide() {
  return slide()
}
