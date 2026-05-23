import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import ProtectedRoute from './ProtectedRoute'
import { useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function App() {
  const navigate = useNavigate()

  useEffect(() => {
    // Forzar a que si ya hay sesión, /dashboard sea accesible.
    // (ProtectedRoute hace el redirect; esto es solo para alinear con el flujo.)
  }, [])

  return (
    <Routes>
      <Route
        path="/"
        element={
          <LandingPage
            onAuthSuccess={() => {
              // En cuanto se autentica, redirigir.
              navigate('/dashboard', { replace: true })
            }}
          />
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

