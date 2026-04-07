import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Header from '../../components/Header'
import { Bell, X, Loader2, Search, ChevronRight, ClipboardList, MapPin, User } from 'lucide-react'

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', cls: 'badge-pending' },
  aprovado: { label: 'Aprovado', cls: 'badge-approved' },
  reprovado: { label: 'Reprovado', cls: 'badge-rejected' },
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [checklists, setChecklists] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [buscaPlaca, setBuscaPlaca] = useState('')
  const [buscaMotorista, setBuscaMotorista] = useState('')
  const [filtroCidade, setFiltroCidade] = useState('todas')

  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const panelRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    fetchChecklists()
    fetchNotifications()

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchChecklists() {
    setLoading(true)
    setErro('')

    try {
      const { data, error } = await supabase
        .from('checklists')
        .select('*, vehicles(placa, modelo, motorista, cidade), profiles!user_id(nome, email)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setChecklists(data || [])
    } catch (err) {
      console.error('Erro fetchChecklists:', err)
      setErro('Erro ao carregar checklists. Tente recarregar a página.')
    } finally {
      setLoading(false)
    }
  }

  async function fetchNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('lida', false)
      .order('created_at', { ascending: false })

    // Se a tabela não existe (404) ou outro erro, ignora silenciosamente
    if (error) {
      console.warn('Notificações indisponíveis:', error.message)
      return
    }

    setNotifications(data || [])
  }

  async function marcarComoLida(id) {
    const { error } = await supabase.from('notifications').update({ lida: true }).eq('id', id)
    if (!error) setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  async function marcarTodasComoLidas() {
    const ids = notifications.map((n) => n.id)
    if (ids.length === 0) return
    const { error } = await supabase.from('notifications').update({ lida: true }).in('id', ids)
    if (!error) setNotifications([])
  }

  const filtrados = checklists.filter((c) => {
    if (filtroStatus !== 'todos' && c.status !== filtroStatus) return false
    if (buscaPlaca.trim() && !c.vehicles?.placa?.toLowerCase().includes(buscaPlaca.trim().toLowerCase())) return false
    if (buscaMotorista.trim() && !c.vehicles?.motorista?.toLowerCase().includes(buscaMotorista.trim().toLowerCase())) return false
    if (filtroCidade !== 'todas' && c.vehicles?.cidade !== filtroCidade) return false
    return true
  })

  const naoLidas = notifications.length

  const counts = {
    todos: checklists.length,
    pendente: checklists.filter(c => c.status === 'pendente').length,
    aprovado: checklists.filter(c => c.status === 'aprovado').length,
    reprovado: checklists.filter(c => c.status === 'reprovado').length,
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header>
        {/* Notificações */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all"
          >
            <Bell size={20} />
            {naoLidas > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg shadow-red-500/30">
                {naoLidas > 99 ? '99+' : naoLidas}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-[calc(100vw-2rem)] sm:w-96 max-w-sm glass-card overflow-hidden z-50 animate-fade-in">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/60">
                <span className="font-semibold text-sm text-slate-200">Notificações</span>
                {naoLidas > 0 && (
                  <button onClick={marcarTodasComoLidas} className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                    Limpar todas
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-10">
                    <Bell size={24} className="mx-auto text-slate-700 mb-2" />
                    <p className="text-sm text-slate-600">Nenhuma notificação</p>
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="px-5 py-4 border-b border-slate-800/40 hover:bg-slate-800/30 transition-colors flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0 animate-pulse-slow" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-300 leading-relaxed">{n.mensagem}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          {new Date(n.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      <button onClick={() => marcarComoLida(n.id)} className="text-slate-600 hover:text-slate-400 shrink-0 p-1">
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </Header>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'todos', label: 'Total', color: 'text-slate-300', bg: 'from-slate-800 to-slate-800/50' },
            { key: 'pendente', label: 'Pendentes', color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-500/5' },
            { key: 'aprovado', label: 'Aprovados', color: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5' },
            { key: 'reprovado', label: 'Reprovados', color: 'text-red-400', bg: 'from-red-500/10 to-red-500/5' },
          ].map(({ key, label, color, bg }) => (
            <button
              key={key}
              onClick={() => setFiltroStatus(key)}
              className={`glass-card p-4 text-left transition-all duration-200 bg-gradient-to-br ${bg} ${
                filtroStatus === key ? 'ring-1 ring-cyan-500/30 border-cyan-500/20' : ''
              }`}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{counts[key]}</p>
            </button>
          ))}
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Placa..."
              value={buscaPlaca}
              onChange={(e) => setBuscaPlaca(e.target.value.toUpperCase())}
              className="input-dark pl-10 uppercase text-sm"
            />
          </div>
          <div className="relative">
            <User size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Motorista..."
              value={buscaMotorista}
              onChange={(e) => setBuscaMotorista(e.target.value)}
              className="input-dark pl-10 text-sm"
            />
          </div>
          <div className="relative">
            <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <select
              value={filtroCidade}
              onChange={(e) => setFiltroCidade(e.target.value)}
              className="input-dark pl-10 text-sm appearance-none cursor-pointer"
            >
              <option value="todas">Todas as cidades</option>
              <option value="Florianópolis">Florianópolis</option>
              <option value="São José">São José</option>
              <option value="Palhoça">Palhoça</option>
              <option value="Biguaçu">Biguaçu</option>
            </select>
          </div>
          {(buscaPlaca || buscaMotorista || filtroCidade !== 'todas') && (
            <button
              onClick={() => { setBuscaPlaca(''); setBuscaMotorista(''); setFiltroCidade('todas') }}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-all"
            >
              <X size={14} />
              Limpar filtros
            </button>
          )}
        </div>

        {/* Erro */}
        {erro && (
          <div className="text-center py-8">
            <div className="inline-block p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{erro}</p>
            </div>
            <button onClick={fetchChecklists} className="block mx-auto mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
              Tentar novamente
            </button>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-cyan-500 animate-spin" />
              <span className="text-sm text-slate-600">Carregando checklists...</span>
            </div>
          </div>
        ) : !erro && filtrados.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList size={40} className="mx-auto text-slate-800 mb-3" />
            <p className="text-slate-500">Nenhum checklist encontrado.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtrados.map((checklist) => {
              const cfg = STATUS_CONFIG[checklist.status] || STATUS_CONFIG.pendente
              return (
                <button
                  key={checklist.id}
                  onClick={() => navigate(`/dashboard/checklist/${checklist.id}`)}
                  className="w-full glass-card-hover p-4 sm:p-5 flex items-center gap-4 text-left group"
                >
                  <div className="w-11 h-11 rounded-xl bg-slate-800/80 flex items-center justify-center shrink-0 border border-slate-700/40 group-hover:border-slate-600/60 transition-colors">
                    <ClipboardList size={18} className="text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-slate-200 text-sm">
                        {checklist.vehicles?.placa || '—'}
                      </span>
                      <span className="text-slate-500 text-sm">
                        {checklist.vehicles?.modelo}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {checklist.profiles?.nome || checklist.vehicles?.motorista || '—'}
                      <span className="mx-1.5 text-slate-700">|</span>
                      {new Date(checklist.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className={cfg.cls}>{cfg.label}</span>
                  <ChevronRight size={16} className="text-slate-700 group-hover:text-slate-500 transition-colors shrink-0" />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
