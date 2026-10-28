import { useState, useCallback, useEffect } from 'react'
import { Dashboard } from './components/Dashboard.jsx'
import { Editor } from './components/Editor.jsx'
import { PresentMode } from './components/PresentMode.jsx'
import { ImportGate } from './components/ImportGate.jsx'
import { extractPayload } from './lib/crypto.js'

// Navigation interne. Le lien de partage est un fragment #/v/<payload> :
// il n'est jamais transmis sur le réseau et n'expose que du chiffré.

function parseHash() {
  const m = window.location.hash.match(/#\/v\/([A-Za-z0-9\-_]+)/)
  return m ? m[1] : null
}

function clearHash() {
  history.replaceState(null, '', location.pathname + location.search)
}

export default function App() {
  // route : { name: 'dash' | 'edit' | 'present' | 'import' | 'viewer' }
  const [route, setRoute] = useState(() => {
    const p = parseHash()
    return p ? { name: 'import', payload: p } : { name: 'dash' }
  })
  const [editKey, setEditKey] = useState(0)

  // Un lien de partage ouvert pendant l'utilisation (hashchange, onglet réutilisé)
  useEffect(() => {
    const onHash = () => {
      const p = parseHash()
      if (p && route.name !== 'import') setRoute({ name: 'import', payload: p })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [route.name])

  const open = useCallback((id) => {
    setEditKey((k) => k + 1)
    setRoute({ name: 'edit', id })
  }, [])

  const goDash = useCallback(() => setRoute({ name: 'dash' }), [])
  const closeImport = useCallback(() => {
    clearHash()
    setRoute({ name: 'dash' })
  }, [])

  switch (route.name) {
    case 'edit':
      return (
        <Editor
          key={editKey}
          presentationId={route.id}
          onBack={goDash}
          onPresent={(id) => setRoute({ name: 'present', id, from: 'edit' })}
        />
      )
    case 'present':
      return (
        <PresentMode
          presentationId={route.id}
          onExit={() =>
            route.from === 'edit'
              ? setRoute({ name: 'edit', id: route.id })
              : setRoute({ name: 'dash' })
          }
        />
      )
    case 'import':
      return (
        <>
          <Dashboard />
          <ImportGate
            payload={route.payload}
            onClose={closeImport}
            onView={(pres) => {
              clearHash()
              setRoute({ name: 'viewer', pres })
            }}
          />
        </>
      )
    case 'viewer':
      return (
        <PresentMode presentation={route.pres} shared onExit={goDash} />
      )
    case 'dash':
    default:
      return (
        <Dashboard
          onOpen={open}
          onImport={(payload) => setRoute({ name: 'import', payload: payload || null })}
        />
      )
  }
}
