# visuelor — MVP (Phase 2 + partage local)

Application de présentations interactives : éditeur glisser-déposer, hotspots, popups
au survol/clic, navigation non linéaire entre diapositives, mode lecture plein écran.

> **100 % local, aucun cloud.** Les données vivent dans le `localStorage` du
> navigateur ; le partage est **chiffré de bout en bout** (AES-GCM) via lien ou
> fichier autonome. L'app est une **PWA installable hors ligne**.

## Lancer

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de production dans dist/
npm run preview  # sert la build (nécessaire pour le service worker PWA)
node scripts/gen-icons.js            # régénère les icônes PWA
node scripts/test-standalone.mjs     # vérifie l'export HTML chiffré
```

## Partage protégé, 100 % sans serveur

- **Lien chiffré `…/#/v/<payload>`** — la présentation est chiffrée (AES-GCM-256,
  clé dérivée PBKDF2-SHA256 / 200 000 itérations, sel aléatoire). Le contenu ne vit
  que dans le **fragment** de l'URL, qui n'est jamais transmis sur le réseau.
  Sans le mot de passe, un intercepteur ne peut rien lire.
- **Code de partage `vis1.…`** — la même enveloppe chiffrée en copier-coller,
  fonctionnant même quand l'app est ouverte en fichier local.
- **Fichier HTML protégé autonome** — un seul fichier avec lecteur minimal embarqué
  + contenu chiffré. Le destinataire l'ouvre hors ligne, saisit le mot de passe et
  lit (popups, hotspots, navigation cliquables inclus).
- **Vérifié :** mauvais mot de passe refusé, aucun contenu en clair dans le fichier
  (`scripts/test-standalone.mjs` le contrôle automatiquement).

Deux voies d'ouverture côté destinataire : le tableau de bord → *« 🔓 Importer un
partage »* (coller lien ou code) — ou un lien `#/v/…` qui s'ouvre automatiquement.

## PWA (mobile, hors ligne)

`manifest.webmanifest` + service worker (`public/sw.js`, cache offline-first pour
les ressources locales) + icônes générées (`public/icon-192.png` / `icon-512.png`).
En builder de production, l'app s'installe sur l'écran d'accueil (Chrome/Android
et iOS via « sur l'écran d'accueil »). Tout — éditeur, présentations, partage —
fonctionne alors sans aucune connexion.

## Ce que couvre le MVP

| Zone | Fonctionnalités |
|---|---|
| Tableau de bord | Création depuis modèles (vierge, photo annotée, pitch), renommer, dupliquer, supprimer |
| Éditeur | Drag & drop, 8 poignées de redimensionnement, calques (avancer/reculer), verrouillage, multi-diapositives (ajout, duplication, réordonnancement, fond) |
| Éléments | Texte (Google Fonts, gras/italique/alignement/couleur/fond), formes (rectangle arrondi, ellipse, triangle), images (import local ou URL, cover/contain), vidéos YouTube/Vimeo, zones interactives invisibles |
| Interactivité | Popup au survol ou au clic sur **n'importe quel élément** (titre, texte, image), lien vers une diapositive ou un site externe |
| Lecture | Plein écran, navigation ←/→/Espace/Échap, responsive, impression PDF via le navigateur |
| Éditeur UX | Panneau contextuel, historique annuler/rétablir (Ctrl+Z/Ctrl+Y, 60 niveaux), raccourcis (Suppr, Ctrl+D, flèches), ouverture du texte par double-clic, sauvegarde automatique |

## Architecture

```
src/
  App.jsx                     # routage : dashboard → éditeur → lecture / import / lecture partagée
  lib/store.js                # persistance localStorage + format de donnée
  lib/crypto.js               # AES-GCM + PBKDF2, enveloppe vis1., liens #/v/…
  lib/standalone.js           # générateur de fichier HTML protégé autonome
  lib/templates.js            # modèle de données des éléments + 3 modèles de départ
  components/
    Dashboard.jsx             # liste des projets, modèles, partage, import
    ShareDialog.jsx           # chiffrage, lien/code, téléchargement HTML protégé
    ImportGate.jsx            # ouverture d'un lien/code chiffré (mot de passe)
    Editor.jsx                # atelier : topbar, rail d'ajout, historique, barre de diapos
    Stage.jsx                 # scène 1280×720, sélection/drag/resize, échelle responsive
    ElementView.jsx           # rendu d'un élément + interactivité (popup, lien)
    PropertiesPanel.jsx       # panneau de propriétés contextuel
    PresentMode.jsx           # lecture plein écran (locale ou partagée)
    embeds.jsx                # parsing d'URL YouTube/Vimeo → iframes
public/
  manifest.webmanifest        # manifeste PWA
  sw.js                       # service worker offline-first
  icon-192.png / icon-512.png
scripts/
  gen-icons.js                # génère les icônes PWA (sans dépendance)
  test-standalone.mjs         # test automatique de l'export chiffré
```

Repère de scène fixe : **1280 × 720**, mis à l'échelle en CSS — les positions
et tailles des éléments sont donc identiques sur tous les écrans.

## Raccourcis éditeur

- `Ctrl+Z` / `Ctrl+Shift+Z` ou `Ctrl+Y` : annuler / rétablir
- `Ctrl+D` : dupliquer l'élément · `Suppr` : supprimer
- `↑↓←→` (+Maj : ×10) : nudge · `Échap` : désélectionner
- Double-clic sur un texte : édition in situ

## Export PNG + PDF (100 % local)

Bouton **⬇** dans l'éditeur :
- **PNG** (2560×1440, échelle ×2) : diapositive courante ou toutes les diapos
- **PDF** : assemblage natif — les diapos sont rasterisées en JPEG (qualité 92) puis
  écrites dans un PDF 1.4 valide par un générateur écrit sur mesure, **sans aucune
  dépendance** ; les vidéos intégrées apparaissent comme espaces réservés.
- Rasterisation fidèle : polices chargées, `object-fit` cover/contain répliqué,
  opacité, bordures, textWrap manuel aligné left/center/right.

Tests : `scripts/test-pdf.mjs` valide la structure du PDF (xref, objets, offsets),
et `scripts/test-standalone.mjs` celui de l'export HTML chiffré.

## Prochaines étapes

- Rôles et dossiers (tableau de bord), bibliothèque de modèles enrichie
- Export PDF outillé (aujourd'hui : impression du navigateur) et images PNG
- Collaboration temps réel hors ligne (piste : CRDT type Yjs + share local)
