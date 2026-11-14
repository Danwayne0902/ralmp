import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            border: '1px solid rgba(6,37,26,.08)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13px'
          }
        }}
      />
    </BrowserRouter>
  </StrictMode>
)
