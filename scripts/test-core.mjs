// Batterie de tests cœur : store, crypto, templates — 100 % Node, sans navigateur.
// Lancée par `npm test` avec les scripts test-standalone.mjs et test-pdf.mjs.
import assert from 'node:assert/strict'

// Stub de localStorage AVANT les imports dynamiques (les modules lisent le global).
const mem = new Map()
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
}

const store = await import('../src/lib/store.js')
const crypt = await import('../src/lib/crypto.js')
const T = await import('../src/lib/templates.js')

let pass = 0
let fail = 0
const t = (name, fn) => {
  try { fn(); pass++; console.log('✓ ' + name) }
  catch (e) { fail++; console.log('✗ ' + name + ' → ' + e.message) }
}
const ta = async (name, fn) => {
  try { await fn(); pass++; console.log('✓ ' + name) }
  catch (e) { fail++; console.log('✗ ' + name + ' → ' + e.message) }
}

// ── store.js ─────────────────────────────────────────────────────────────────
t('saveAll/loadAll aller-retour', () => {
  store.saveAll([{ id: 'a', title: 'A', slides: [] }])
  assert.equal(store.loadAll()[0].title, 'A')
})
t('saveOne insère puis met à jour', () => {
  store.saveOne({ id: 'b', title: 'B', slides: [] })
  store.saveOne({ id: 'b', title: 'B2', slides: [] })
  assert.equal(store.loadAll().length, 2)
  assert.equal(store.loadOne('b').title, 'B2')
})
t('duplicate : copie profonde + nouveaux ids + titre suffixé', () => {
  store.saveAll([{
    id: 'src', title: 'Source', slides: [
      { id: 's1', elements: [{ id: 'e1', type: 'text', text: 'x' }] },
    ],
  }])
  const c = store.duplicate('src')
  assert.notEqual(c.id, 'src')
  assert.equal(c.title, 'Source (copie)')
  assert.notEqual(c.slides[0].id, 's1')
  assert.notEqual(c.slides[0].elements[0].id, 'e1')
  assert.equal(c.slides[0].elements[0].text, 'x') // contenu copié
})
t('remove supprime la présentation', () => {
  store.remove('src')
  assert.equal(store.loadOne('src'), null)
})
t('saveAll : stockage saturé → false sans crash', () => {
  const real = globalThis.localStorage
  globalThis.localStorage = { setItem: () => { throw new Error('QuotaExceeded') } }
  let r = false
  try { r = store.saveAll([{ id: 'x', slides: [] }]) } finally { globalThis.localStorage = real }
  assert.equal(r, false)
})
t('loadAll : JSON corrompu → tableau vide sans crash', () => {
  const real = globalThis.localStorage
  globalThis.localStorage = { getItem: () => '{pas-du-json' }
  let r = null
  try { r = store.loadAll() } finally { globalThis.localStorage = real }
  assert.deepEqual(r, [])
})

// ── dossiers ─────────────────────────────────────────────────────────────────
t('dossiers : save/load', () => {
  store.saveFolders(['Clients', 'Formations'])
  assert.deepEqual(store.loadFolders(), ['Clients', 'Formations'])
})
t('dossiers : libellés vides filtrés', () => {
  store.saveFolders(['A', '   ', '', 'B'])
  assert.deepEqual(store.loadFolders(), ['A', 'B'])
})
t('renameFolder propage le nouveau nom aux projets', () => {
  store.saveAll([{ id: 'p1', folder: 'A', slides: [] }])
  store.renameFolder('A', 'A2')
  assert.deepEqual(store.loadFolders(), ['A2', 'B'])
  assert.equal(store.loadOne('p1').folder, 'A2')
})
t('deleteFolder ramène les projets à la racine', () => {
  store.deleteFolder('A2')
  assert.equal(store.loadFolders().includes('A2'), false)
  assert.equal(store.loadOne('p1').folder, '')
})

// ── crypto.js ────────────────────────────────────────────────────────────────
await ta('chiffrement/déchiffrement aller-retour', async () => {
  const obj = { title: 'T', slides: [{ id: 's', elements: [] }] }
  const payload = await crypt.encryptToPayload(obj, 'secret-pass')
  assert.equal(payload.includes('.'), false) // payload brut : base64url uniquement
  const r = await crypt.decryptFromPayload(payload, 'secret-pass')
  assert.equal(r.ok, true)
  assert.equal(r.presentation.title, 'T')
})
await ta('mauvais mot de passe refusé (GCM authentifie)', async () => {
  const payload = await crypt.encryptToPayload({ slides: [] }, 'bon')
  const r = await crypt.decryptFromPayload(payload, 'mauvais')
  assert.equal(r.ok, false)
  assert.equal(r.error, 'mot_de_passe')
})
await ta('payload tronqué/corrompu → erreur propre', async () => {
  const payload = await crypt.encryptToPayload({ slides: [] }, 'bon')
  const r = await crypt.decryptFromPayload(payload.slice(0, 40), 'bon')
  assert.equal(r.ok, false)
})
t('extractPayload accepte lien, code et payload brut', () => {
  assert.equal(crypt.extractPayload('http://x.app/#/v/ABCdef123-_'), 'ABCdef123-_')
  assert.equal(crypt.extractPayload('vis1.ABCdef123-_'), 'ABCdef123-_')
  assert.equal(crypt.extractPayload('ABCdef123-_'), 'ABCdef123-_')
  assert.equal(crypt.extractPayload('pas un payload !'), null)
  assert.equal(crypt.extractPayload(''), null)
})
t('wrapCode : préfixe vis1.', () => assert.equal(crypt.wrapCode('XX'), 'vis1.XX'))
t('generatePassword : 14 caractères dans l\'alphabet', () => {
  const pw = crypt.generatePassword()
  assert.equal(pw.length, 14)
  assert.equal(/^[\w!@#$%*+-]+$/.test(pw), true)
  assert.notEqual(crypt.generatePassword(), pw) // aléatoire
})

// ── templates.js ─────────────────────────────────────────────────────────────
t('la bibliothèque contient 7 modèles construisibles', () => {
  assert.equal(T.TEMPLATES.length, 7)
  T.TEMPLATES.forEach((tpl) => {
    const p = tpl.build()
    assert.ok(p.id && p.title && Array.isArray(p.slides) && p.slides.length >= 1, tpl.id)
  })
})
t('tous les éléments tiennent dans la scène 1280×720', () => {
  for (const tpl of T.TEMPLATES) {
    const p = tpl.build()
    p.slides.forEach((s) => s.elements.forEach((el) => {
      if (el.x < -1 || el.y < -1 || el.x + el.w > 1281 || el.y + el.h > 721)
        throw new Error(`${tpl.id} : ${el.type} hors champ (${el.x},${el.y} ${el.w}×${el.h})`)
    }))
  }
})
t('les liens pointent vers des diapositives existantes', () => {
  for (const tpl of T.TEMPLATES) {
    const p = tpl.build()
    const ids = new Set(p.slides.map((s) => s.id))
    p.slides.forEach((s) => s.elements.forEach((el) => {
      if (el.link?.type === 'slide' && !ids.has(el.link.slideId))
        throw new Error(`${tpl.id} : lien cassé depuis « ${el.text || el.type} »`)
    }))
  }
})
t('les ids sont uniques au sein de chaque modèle', () => {
  for (const tpl of T.TEMPLATES) {
    const p = tpl.build()
    const ids = new Set()
    p.slides.forEach((s) => {
      assert.equal(ids.has(s.id), false, tpl.id + ' : diapo dupliquée')
      ids.add(s.id)
      s.elements.forEach((el) => {
        assert.equal(ids.has(el.id), false, tpl.id + ' : élément dupliqué')
        ids.add(el.id)
      })
    })
  }
})
t('quiz du modèle : ≥2 réponses, index correct valide', () => {
  const p = T.createFromTemplate('quiz')
  const quiz = p.slides[0].elements.find((e) => e.type === 'quiz')
  assert.ok(quiz.choices.length >= 2)
  assert.ok(quiz.correct >= 0 && quiz.correct < quiz.choices.length)
})
t('makeElement : quiz et audio ont des valeurs par défaut saines', () => {
  const q = T.makeElement('quiz')
  const a = T.makeElement('audio')
  assert.ok(Array.isArray(q.choices) && q.choices.length >= 2)
  assert.ok(q.correct >= 0 && q.correct < q.choices.length)
  assert.equal(typeof a.title, 'string')
  assert.equal(a.type, 'audio')
})

console.log(`\n${pass} réussis, ${fail} échoués`)
process.exit(fail ? 1 : 0)
