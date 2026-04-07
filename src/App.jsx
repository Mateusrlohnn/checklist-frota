import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import Login from './pages/Login'
import Register from './pages/Register'
import NovoChecklist from './pages/colaborador/NovoChecklist'
import Dashboard from './pages/gestor/Dashboard'
import DetalhesChecklist from './pages/gestor/DetalhesChecklist'
import { Loader2 } from 'lucide-react'

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-slate-800" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-t-cyan-500 animate-spin" />
        </div>
        <span className="text-sm text-slate-500 tracking-wide">Carregando...</span>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, allowedRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />
  if (!profile?.role) return <LoadingScreen />

  if (allowedRole && profile.role !== allowedRole) {
    const fallback = profile.role === 'gestor' ? '/dashboard' : '/checklist'
    return <Navigate to={fallback} replace />
  }

  return children
}

function HomeRedirect() {
  const { profile } = useAuth()

  if (profile?.role === 'gestor') {
    return <Navigate to="/dashboard" replace />
  }

  return <Navigate to="/checklist" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={
            <ProtectedRoute>
              <HomeRedirect />
            </ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute allowedRole="gestor">
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path="/dashboard/checklist/:id" element={
            <ProtectedRoute allowedRole="gestor">
              <DetalhesChecklist />
            </ProtectedRoute>
          } />

          <Route path="/checklist" element={
            <ProtectedRoute allowedRole="colaborador">
              <NovoChecklist />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
