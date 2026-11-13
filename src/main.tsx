import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/overpass'
import '@fontsource-variable/overpass-mono'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
