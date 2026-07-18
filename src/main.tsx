import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Tajawal is self-hosted rather than pulled from a font CDN: no third-party
// request on first paint, and the app still renders correctly offline.
import '@fontsource/tajawal/400.css'
import '@fontsource/tajawal/500.css'
import '@fontsource/tajawal/700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
