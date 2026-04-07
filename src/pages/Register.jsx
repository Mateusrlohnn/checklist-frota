import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Navigate, Link } from 'react-router-dom'
import { Shield, Loader2, Mail, Lock, User, Users, CheckCircle } from 'lucide-react'

export default function Register() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('colaborador')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const { user, profile, loading: authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-cyan-500 animate-spin" />
      </div>
    )
  }

  if (user && profile?.role) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setLoading(true)

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { nome: nome, role: role },
        },
      })

      if (signUpError) {
        if (signUpError.message?.includes('already registered')) {
          setError('Este email já está cadastrado.')
        } else if (signUpError.status === 429 || signUpError.message?.includes('rate limit')) {
          setError('Muitas tentativas. Aguarde 1-2 minutos e tente novamente.')
        } else {
          setError('Erro ao criar conta. Tente novamente.')
        }
        return
      }

      setSucesso(true)
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>
        <div className="w-full max-w-sm relative animate-fade-in">
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/20">
              <CheckCircle size={32} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">Conta criada!</h2>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Verifique seu email para confirmar o cadastro antes de fazer login.
            </p>
            <Link to="/login" className="btn-primary inline-flex">
              Ir para Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative animate-fade-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-xl shadow-cyan-500/20">
            <Shield size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Criar conta</h1>
          <p className="text-slate-500 text-sm mt-1">Preencha os dados para começar</p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="nome" className="section-title block">Nome completo</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="nome" type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                  className="input-dark pl-11" placeholder="Seu nome" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="section-title block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-dark pl-11" placeholder="seu@email.com" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="section-title block">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="input-dark pl-11" placeholder="Mínimo 6 caracteres" />
              </div>
            </div>

            <div>
              <label className="section-title block mb-3">Perfil de acesso</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('colaborador')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                    role === 'colaborador'
                      ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/60'
                  }`}
                >
                  <User size={20} className={`mx-auto mb-2 ${role === 'colaborador' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className={`text-sm font-semibold block ${role === 'colaborador' ? 'text-cyan-300' : 'text-slate-400'}`}>
                    Colaborador
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Operacional</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('gestor')}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                    role === 'gestor'
                      ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                      : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600/60'
                  }`}
                >
                  <Users size={20} className={`mx-auto mb-2 ${role === 'gestor' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  <span className={`text-sm font-semibold block ${role === 'gestor' ? 'text-cyan-300' : 'text-slate-400'}`}>
                    Gestor
                  </span>
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Gerencial</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary">
              {loading && <Loader2 className="animate-spin" size={18} />}
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <div className="glow-line mt-6 mb-4" />

          <p className="text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
