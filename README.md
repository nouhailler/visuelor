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
npm test         # batterie de tests cœur + export chiffré + structure PDF
node scripts/gen-icons.js            # régénère les icônes PWA
node scripts/test-standalone.mjs     # vérifie l'export HTML chiffré
node scripts/test-pdf.mjs            # vérifie la structure PDF
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
| Tableau de bord | Création depuis **8 modèles**, renommer, dupliquer, supprimer, **dossiers filtrants + déplacement** |
| Éditeur | Drag & drop, 8 poignées de redimensionnement, calques (avancer/reculer), verrouillage, multi-diapositives (ajout, duplication, réordonnancement, fond) |
| Éléments | Texte (Google Fonts, gras/italique/alignement/couleur/fond), formes (rectangle arrondi, ellipse, triangle), images (import local ou URL, cover/contain), vidéos YouTube/Vimeo, **quiz QCM interactifs**, **audio** (fichier local ou URL), zones interactives invisibles, **personnes identifiées 🏷️** |
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
- Les **quiz** s'impriment en statique avec la bonne réponse surlignée.

Tests : `scripts/test-pdf.mjs` valide la structure du PDF (xref, objets, offsets),
et `scripts/test-standalone.mjs` celui de l'export HTML chiffré.

## Quiz + audio (100 % local)

- **🧠 Quiz** (rail de l'éditeur) : question, réponses illimitées (2 minimum),
  bonne réponse cochée dans le panneau, messages personnalisables.
  En lecture : clic sur une réponse → surlignage ✓/✗ immédiat, message, bouton
  « ↺ Recommencer ». Le lecteur autonome chiffré rejoue les quiz en vanilla JS.
- **🔊 Audio** : fichier importé depuis l'appareil (stocké en dataURL dans le
  localStorage) ou URL. Titre affiché ; non imprimable (carte réservée à l'export).

## Dossiers au tableau de bord

- Barre de **dossiers filtrants** : « Tous », « Sans dossier » et chaque dossier
  (des comptes sont affichés sur chaque puce).
- `➕` crée un dossier ; quand un dossier est affiché, `✏️` le renomme (le nom est
  propagé sur toutes les présentations), `🗑` le supprime (les retournent à la
  racine).
- Menu `⋯` d'une carte → **📁 Déplacer vers…** : racine, dossiers existants, ou
  création d'un nouveau dossier. L'emplacement 📁 s'affiche sur la carte.
- Une présentation créée alors qu'un dossier est affiché s'y range d'office.

Le rangement vit dans `localStorage` (clé `visuelor.folders`), ajouté aux
présentations via le champ `folder` — rien ne quitte l'appareil.

## Photo de mariage — qui est qui ? (identifier des personnes)

1. Tableau de bord → modèle **Photo de mariage**.
2. Cliquez sur la photo d'exemple → panneau de droite → **Importer** votre photo.
   Elle est réduite localement (1920 px, JPEG) pour tenir dans le stockage et le partage.
3. Rail de l'éditeur → **🏷️** : chaque clic sur un visage pose un cercle ; tapez le nom
   (et une précision facultative, ex. « sœur de la mariée ») dans le panneau de droite.
   Ajustez le cercle avec les poignées ; `Échap` ou **Terminé** quitte le mode.
4. **🔗 Partager** (barre du haut) → mot de passe → **Télécharger le fichier HTML protégé**,
   à envoyer par e-mail / messagerie ; communiquez le mot de passe à part.

En lecture (app ou fichier partagé) : noms affichés sous les visages, panneau
**👥 Qui est sur la photo ?** (de gauche à droite, survol/clic = mise en évidence),
bouton **🏷️** pour masquer les noms (visibles alors au survol ou au toucher).
Les étiquettes apparaissent aussi dans les exports PNG/PDF.

> Le « lien d'ouverture directe » n'est utilisable par d'autres que si l'app est
> hébergée en ligne (ex. GitHub Pages) ; depuis `localhost`, la boîte de partage le
> signale et recommande le fichier HTML. Avec une photo, le lien pèse plusieurs
> centaines de Ko : le fichier reste le moyen le plus fiable.

## Bibliothèque de modèles (8)

| Modèle | Contenu |
|---|---|
| **Vierge** | Une diapositive toute neuve |
| **Photo annotée** | Demo hotspots + popups (enseignement) |
| **Pitch deck** | Couverture sombre + diapo de formes interactives |
| **Sommaire interactif** | Sommaire cliquable + 3 chapitres, chaque diapo propose « ← Sommaire » — la navigation non linéaire prête à l'emploi |
| **Fiche produit** | Image annotée, caractéristiques, prix, hotspot popup — cas d'usage entreprise |
| **Citation** | Grande typo Playfair sur fond crème, pour ponctuer une présentation |
| **Photo de mariage** | Photo + personnes identifiées (cercle + nom), liste « Qui est sur la photo ? » |
| **Quiz** | QCM interactif de démonstration (correction immédiate, recommencer) |

## Durcissement (Phase 4)

- **`npm test`** : batterie automatisée sans navigateur —
  - `scripts/test-core.mjs` : persistance (aller-retour, duplication profonde,
    stockage saturé, JSON corrompu), dossiers (renommage propagé, suppression),
    chiffrement (aller-retour, mauvais mot de passe, payload corrompu, extraction
    de lien/code, générateur de mot de passe), modèles (7 construits, éléments
    dans la scène 1280×720, liens non cassés, IDs uniques, quiz cohérents).
  - `scripts/test-standalone.mjs` : syntaxe du lecteur embarqué + absence de
    contenu en clair dans l'export chiffré.
  - `scripts/test-pdf.mjs` : structure du PDF (objets, offsets xref, EOF).
- **Performance** : `ElementView` et les vignettes du bandeau sont mémoïsés —
  pendant un déplacement, seul l'élément bougé (et sa vignette) est re-rendu.
- **Robustesse** : les raccourcis clavier de l'éditeur sont désactivés tant
  qu'une boîte de dialogue est ouverte ; le plein écran n'est demandé qu'après
  un vrai geste utilisateur ; les warnings React de style sont corrigés.
- **Accessibilité** : focus visible au clavier (`:focus-visible`), respect de
  `prefers-reduced-motion`, libellés ARIA sur le rail, la navigation de lecture,
  les boutons de quiz, le lecteur audio ; compteur de diapositives annoncé
  (`aria-live`).

## Prochaines étapes

- Collaboration temps réel hors ligne (piste : CRDT type Yjs + share local)
