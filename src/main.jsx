import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClientPortal from './views/ClientPortal.jsx'
import { AuthProvider } from './AuthProvider.jsx'
import { initCapacitor } from './capacitorInit.js'

initCapacitor()

const path = window.location.pathname
const isPortal = path === '/portal' || path.startsWith('/portal/')

const root = createRoot(document.getElementById('root'))

if (isPortal) {
  root.render(
    <StrictMode>
      <ClientPortal />
    </StrictMode>,
  )
} else {
  root.render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>,
  )
}
