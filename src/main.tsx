import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// ✅ 1. Import ShopProvider
import { ShopProvider } from './contexts/ShopContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* ✅ 2. หุ้ม ShopProvider ไว้ชั้นนอกสุด เพื่อให้ App.tsx เรียกใช้ useShop ได้ */}
    <ShopProvider>
      <App />
    </ShopProvider>
  </StrictMode>,
)