import { Navigate, Route, Routes } from 'react-router-dom'
import CreatorBadge from './components/CreatorBadge'
import SpaceBackground from './components/SpaceBackground'
import SupportBot from './components/SupportBot'
import AuthPage from './pages/AuthPage'
import ChatsPage from './pages/ChatsPage'
import { useAuth } from './lib/auth'

/** Экран загрузки, пока восстанавливаем сессию из localStorage. */
function Splash() {
  return (
    <div className="splash">
      <SpaceBackground />
      <CreatorBadge size="lg" withLabel={false} />
      <p className="splash__text">Nebula</p>
    </div>
  )
}

export default function App() {
  const { me, loading } = useAuth()

  if (loading) return <Splash />

  return (
    <>
      <Routes>
        <Route path="/" element={me ? <Navigate to="/chats" replace /> : <AuthPage />} />
        <Route path="/chats" element={me ? <ChatsPage /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {/* кнопка поддержки видна на всех экранах */}
      <SupportBot />
    </>
  )
}
