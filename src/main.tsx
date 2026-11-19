import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/outfit/400.css'
import '@fontsource/outfit/500.css'
import '@fontsource/outfit/700.css'
import '@fontsource/outfit/800.css'
import '@fontsource/fraunces/600.css'
import '@fontsource/fraunces/700.css'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
