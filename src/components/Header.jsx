import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, ArrowLeft, Shield, User } from 'lucide-react'

export default function Header({ children, voltar }) {
  const { logout, profile } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">
        {voltar && (
          <button
            onClick={() => navigate(voltar)}
            className="p-2 -ml-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
            <Shield size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <span className="font-bold text-slate-100 text-sm tracking-wide truncate block">
              FROTA CHECK
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {children}
          {profile?.role && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/40">
              <User size={12} className="text-slate-500" />
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                {profile.role}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline text-xs font-medium">Sair</span>
          </button>
        </div>
      </div>
    </header>
  )
}
