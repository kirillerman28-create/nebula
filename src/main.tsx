import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/auth'
import { SettingsProvider } from './lib/settings'
import { ThemesProvider } from './lib/themes'
import './styles/global.css'

const container = document.getElementById('root')
if (!container) throw new Error('В index.html нет элемента #root')

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <ThemesProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemesProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
