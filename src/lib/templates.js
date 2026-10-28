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
    case 'quiz': // QCM interactif : une seule bonne réponse, feedback immédiat
      return {
        ...base,
        w: 560,
        h: 340,
        question: 'Question — éditez-moi dans le panneau de droite',
        choices: ['Réponse A', 'Réponse B', 'Réponse C'],
        correct: 0, // index de la bonne réponse
        ok: '✓ Exact !',
        ko: '✗ Raté — la bonne réponse est surlignée.',
        ...patch,
      }
    case 'audio': // fichier audio stocké localement (dataURL) ou URL
      return {
        ...base,
        w: 440,
        h: 76,
        src: '',
        title: 'Piste audio',
        ...patch,
      }
    case 'tag': // personne identifiée sur une photo : cercle sur le visage + nom
      return {
        ...base,
        w: 90,
        h: 90,
        name: '',
        info: '', // ex. « cousine de la mariée »
        color: '#F2B34C',
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

// ── Sommaire interactif : démonstration de la navigation non linéaire ─────────
// On construit D'ABORD les diapos chapitres pour récupérer leurs IDs,
// puis on câble les liens du sommaire et des boutons « ← Sommaire ».
function sommaireTemplate() {
  const labels = ['Chapitre 1 — Le projet', 'Chapitre 2 — La méthode', 'Chapitre 3 — La suite']
  const texts = [
    'Ce que nous construisons, pour qui, et pourquoi maintenant.',
    'Comment ce que nous faisons se distingue des autres approches.',
    'Le calendrier, les prochaines échéances, les points de décision.',
  ]
  const chapters = labels.map((title, i) => {
    const s = slide({ background: '#16161F' })
    s.elements.push(
      makeElement('text', {
        x: 90, y: 80, w: 1100, h: 80,
        text: title, fontSize: 52, bold: true, color: '#FFFFFF', fontFamily: 'Montserrat',
      }),
      makeElement('shape', { x: 90, y: 180, w: 90, h: 6, radius: 3, fill: '#6C6CE5' }),
      makeElement('text', {
        x: 90, y: 280, w: 900, h: 90,
        text: texts[i], fontSize: 30, color: '#9C9CB4', fontFamily: 'Inter',
      }),
      makeElement('text', {
        x: 950, y: 340, w: 260, h: 200,
        text: `0${i + 1}`, fontSize: 160, bold: true, color: '#262640', fontFamily: 'Montserrat', align: 'right',
      }),
    )
    return s
  })

  // Diapo sommaire : liens vers les 3 chapitres
  const menu = slide({ background: '#1E1E3A' })
  menu.elements.push(
    makeElement('text', {
      x: 90, y: 70, w: 900, h: 80,
      text: 'Sommaire', fontSize: 60, bold: true, color: '#FFFFFF', fontFamily: 'Montserrat',
    }),
    makeElement('shape', { x: 92, y: 165, w: 110, h: 6, radius: 3, fill: '#6C6CE5' }),
  )
  chapters.forEach((c, i) => {
    menu.elements.push(
      makeElement('text', {
        x: 90, y: 240 + i * 140, w: 1000, h: 80,
        text: `0${i + 1} — ${labels[i].split('— ')[1]}`, fontSize: 40, color: '#ECECF4', fontFamily: 'Inter',
        link: { type: 'slide', slideId: c.id, url: '' },
      }),
    )
  })
  menu.elements.push(
    makeElement('text', {
      x: 90, y: 660, w: 1000, h: 40,
      text: '👆 Cliquez un chapitre — à l\'inverse des slides classiques, le lecteur choisit son chemin.',
      fontSize: 20, color: '#6E6E90', fontFamily: 'Inter',
    }),
  )

  // Boutons « ← Sommaire » dans chaque chapitre
  chapters.forEach((c) => {
    c.elements.push(
      makeElement('text', {
        x: 90, y: 620, w: 300, h: 60,
        text: '← Sommaire', fontSize: 26, bold: true, color: '#6C6CE5', fontFamily: 'Inter',
        link: { type: 'slide', slideId: menu.id, url: '' },
      }),
    )
  })

  return {
    id: uid('pres'),
    title: 'Sommaire interactif — modèle',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    slides: [menu, ...chapters],
  }
}

// ── Fiche produit : cas d'usage entreprise (image, specs, prix, popup) ────────
const PRODUIT_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 480">
      <rect width="480" height="480" fill="#E3F2F1"/>
      <circle cx="240" cy="210" r="98" fill="#0E7C7B"/>
      <circle cx="240" cy="210" r="66" fill="#17918F"/>
      <rect x="180" y="330" width="120" height="14" rx="7" fill="#0E7C7B"/>
      <rect x="150" y="356" width="180" height="10" rx="5" fill="#B9DAD8"/>
      <text x="240" y="440" text-anchor="middle" font-family="Arial" font-size="22" fill="#0E7C7B">Image produit — remplacez-moi</text>
    </svg>`,
  )

function productTemplate() {
  const s = slide({ background: '#F7FAFA' })
  s.elements.push(
    makeElement('text', {
      x: 60, y: 40, w: 1170, h: 80,
      text: 'Baromètre connecté Aria-M', fontSize: 48, bold: true, color: '#0C3A39', fontFamily: 'Montserrat',
    }),
    makeElement('text', {
      x: 60, y: 115, w: 1170, h: 50,
      text: 'Suivi du climat intérieur — bureau, serre, cave', fontSize: 24, color: '#5C7A78', fontFamily: 'Inter',
    }),
    makeElement('image', { x: 60, y: 200, w: 470, h: 470, src: PRODUIT_PLACEHOLDER, fit: 'contain' }),
    makeElement('text', { x: 620, y: 220, w: 560, h: 70, text: 'Caractéristiques', fontSize: 34, bold: true, color: '#0C3A39', fontFamily: 'Montserrat' }),
    makeElement('text', {
      x: 620, y: 290, w: 560, h: 190,
      text: '• Précision  ±0,2 °C / ±1,5 % HR\n• autonomie 18 mois (1 pile AA)\n• historique 6 mois, export local\n• Bluetooth et Wi-Fi désactivés par défaut', fontSize: 26, color: '#22403E', fontFamily: 'Inter', lineHeight: 1.45,
    }),
    makeElement('shape', { x: 620, y: 520, w: 260, h: 120, shape: 'rect', radius: 14, fill: '#0E7C7B' }),
    makeElement('text', {
      x: 630, y: 540, w: 240, h: 45, text: '79 €', fontSize: 40, bold: true, color: '#FFFFFF', fontFamily: 'Montserrat',
    }),
    makeElement('text', {
      x: 630, y: 592, w: 240, h: 35, text: '2 piles incluses', fontSize: 20, color: '#CDEBEA', fontFamily: 'Inter',
    }),
    makeElement('hotspot', {
      x: 165, y: 300, w: 150, h: 130,
      popup: { enabled: true, trigger: 'hover', title: 'Capteur précis', text: 'Cellule de mesure certifiée : l\'écart de ±0,2 °C tient sur toute la plage de −10 à +50 °C.', image: '' },
    }),
  )
  return {
    id: uid('pres'),
    title: 'Fiche produit — modèle',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    slides: [s],
  }
}

// ── Citation : grande typo Playfair, slide intercalaire ───────────────────────
function citationTemplate() {
  const s = slide({ background: '#FDF6E3' })
  s.elements.push(
    makeElement('shape', { x: 80, y: 80, w: 1120, h: 560, shape: 'rect', radius: 2, fill: '#FDF6E3' }),
    makeElement('shape', { x: 80, y: 80, w: 1120, h: 560, shape: 'rect', radius: 2, fill: 'transparent', borderColor: '#D9CBAF', borderWidth: 2 }),
    makeElement('text', {
      x: 140, y: 150, w: 1000, h: 90,
      text: '«', fontSize: 120, color: '#DCD2BE', fontFamily: 'Playfair Display', italic: true,
    }),
    makeElement('text', {
      x: 160, y: 250, w: 960, h: 240,
      text: 'Une présentation n\'est pas une suite de pages,\nc\'est une promenade que l\'on invite à choisir.',
      fontSize: 52, color: '#2F2A20', fontFamily: 'Playfair Display', italic: true, align: 'center', lineHeight: 1.35,
    }),
    makeElement('text', {
      x: 160, y: 540, w: 960, h: 50,
      text: '— Principe de visuelor', fontSize: 24, color: '#8A7B5C', fontFamily: 'Playfair Display', align: 'center',
    }),
    makeElement('shape', { x: 600, y: 610, w: 80, h: 3, radius: 1.5, fill: '#D9CBAF' }),
  )
  return {
    id: uid('pres'),
    title: 'Citation — modèle',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    slides: [s],
  }
}

// ── Quiz : démonstration du QCM interactif ────────────────────────────────────
function quizTemplate() {
  const s = slide({ background: '#F6F6FA' })
  s.elements.push(
    makeElement('text', {
      x: 60, y: 40, w: 1170, h: 70,
      text: 'Quiz — à vous de jouer', fontSize: 46, bold: true, color: '#262640', fontFamily: 'Montserrat',
    }),
    makeElement('quiz', {
      x: 90, y: 150, w: 660, h: 380,
      question: 'Quel est le plus grand océan du monde ?',
      choices: ['Le Pacifique', 'L’Atlantique', 'L’Indien'],
      correct: 0,
    }),
    makeElement('text', {
      x: 90, y: 580, w: 660, h: 60,
      text: 'En lecture, le lecteur clique une réponse : feedback immédiat et bouton « Recommencer ».',
      fontSize: 18, color: '#6b6b85',
    }),
    makeElement('text', {
      x: 810, y: 150, w: 410, h: 380,
      text: '🧠 Créez vos propres quiz via le rail « 🧠 » de l’éditeur.\n\n• Question et réponses modifiables dans le panneau de droite\n• Cochez la bonne réponse\n• Le lecteur autonome chiffré gère aussi les quiz', fontSize: 20, color: '#4a4a66', lineHeight: 1.4,
    }),
  )
  return {
    id: uid('pres'),
    title: 'Quiz — modèle',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    slides: [s],
  }
}

// ── Photo de mariage : qui est qui ? ─────────────────────────────────────────
const MARIAGE_PLACEHOLDER =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600">
      <rect width="960" height="600" fill="#EDE6DA"/>
      <ellipse cx="480" cy="640" rx="560" ry="200" fill="#D9CDB8"/>
      <g fill="#B8A88C">
        <circle cx="250" cy="250" r="44"/><rect x="200" y="300" width="100" height="220" rx="40"/>
        <circle cx="710" cy="250" r="44"/><rect x="660" y="300" width="100" height="220" rx="40"/>
      </g>
      <g fill="#8C7B5E">
        <circle cx="420" cy="220" r="48"/><rect x="368" y="274" width="104" height="250" rx="40"/>
      </g>
      <g fill="#FFFFFF" stroke="#C9B996" stroke-width="3">
        <circle cx="540" cy="226" r="46"/><path d="M490 520 L510 280 Q540 266 570 280 L600 520 Z"/>
      </g>
      <text x="480" y="80" text-anchor="middle" font-family="Georgia" font-size="30" fill="#7A6A4E">Importez votre photo de mariage</text>
      <text x="480" y="116" text-anchor="middle" font-family="Georgia" font-size="20" fill="#9A8A6E">sélectionnez cette image → panneau de droite → « Importer »</text>
    </svg>`,
  )

function mariageTemplate() {
  const s = slide({ background: '#1A1714' })
  // photo : 1040×650 centrée sous le titre (ratio 16/10, cadrage « contenir »)
  s.elements.push(
    makeElement('text', {
      x: 60, y: 14, w: 1160, h: 50,
      text: 'Notre mariage — qui est sur la photo ?', fontSize: 34, color: '#F3E9D8',
      fontFamily: 'Playfair Display', italic: true, align: 'center',
    }),
    makeElement('image', { x: 120, y: 66, w: 1040, h: 650, src: MARIAGE_PLACEHOLDER, fit: 'contain', locked: true }),
    makeElement('tag', { x: 520, y: 249, w: 110, h: 110, name: 'Le marié', info: 'Remplacez par son prénom' }),
    makeElement('tag', { x: 653, y: 259, w: 104, h: 104, name: 'La mariée', info: 'Remplacez par son prénom' }),
  )
  return {
    id: uid('pres'),
    title: 'Photo de mariage — qui est qui ?',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    slides: [s],
  }
}

export const TEMPLATES = [
  { id: 'blank', name: 'Vierge', desc: 'Une diapositive toute neuve.', swatch: '#ffffff', build: blankTemplate },
  { id: 'lesson', name: 'Photo annotée', desc: 'Zones cliquables + popups, parfait pour l’enseignement.', swatch: '#8A9B77', build: lessonTemplate },
  { id: 'pitch', name: 'Pitch deck', desc: 'Couverture sombre + slide de démonstration interactive.', swatch: '#14142B', build: pitchTemplate },
  { id: 'sommaire', name: 'Sommaire interactif', desc: 'Sommaire cliquable + 3 chapitres liés (navigation non linéaire prête à l’emploi).', swatch: '#1E1E3A', build: sommaireTemplate },
  { id: 'produit', name: 'Fiche produit', desc: 'Image annotée, caractéristiques, prix — exemple entreprise.', swatch: '#0E7C7B', build: productTemplate },
  { id: 'citation', name: 'Citation', desc: 'Grande typographie Playfair pour ponctuer une présentation.', swatch: '#FDF6E3', build: citationTemplate },
  { id: 'mariage', name: 'Photo de mariage', desc: 'Identifiez chaque invité sur la photo, puis partagez-la : on survole un visage, son nom s’affiche.', swatch: '#C9A96E', build: mariageTemplate },
  { id: 'quiz', name: 'Quiz', desc: 'QCM interactif avec correction immédiate — idéalement joué en lecture.', swatch: '#4FC98A', build: quizTemplate },
]

export function createFromTemplate(templateId) {
  const t = TEMPLATES.find((t) => t.id === templateId) || TEMPLATES[0]
  return t.build()
}

export function blankSlide() {
  return slide()
}
