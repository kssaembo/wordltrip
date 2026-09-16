import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { PwaControls } from './components/PwaControls'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <PwaControls />
  </StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .catch((error) => console.warn('앱 설치 준비 실패:', error))
  })
}
