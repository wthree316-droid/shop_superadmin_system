import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// ✅ 1. Import ShopProvider
import { ShopProvider } from './contexts/ShopContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ShopProvider>
      <App />
    </ShopProvider>
  </StrictMode>,
)