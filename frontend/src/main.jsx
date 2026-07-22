import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WalletProvider } from './context/WalletContext'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <WalletProvider>
        <App />
      </WalletProvider>
    </AuthProvider>
  </StrictMode>,
)
