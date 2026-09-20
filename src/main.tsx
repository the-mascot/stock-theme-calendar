import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 디버그 콘솔은 개발 빌드에서만 불러온다 — 출시 번들에는 eruda가 들어가지 않는다.
if (import.meta.env.DEV) {
  import('@apps-in-toss/debug-console/auto')
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
