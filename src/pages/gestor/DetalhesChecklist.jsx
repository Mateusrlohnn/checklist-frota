import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Header from '../../components/Header'
import { CheckCircle, XCircle, Loader2, MapPin, Gauge, Calendar, User, Image, ClipboardCheck, MessageSquare, ShieldCheck } from 'lucide-react'

const FOTO_LABELS = {
  frente: 'Frente',
  lateral: 'Lateral',
  pneu: 'Pneu',
  parte_interna: 'Parte Interna',
  painel: 'Painel',
}

const PERGUNTA_LABELS = {
  documentacao_em_dia: 'Documentacao em dia?',
  equipamentos_obrigatorios: 'Equipamentos obrigatórios presentes?',
  avarias_visiveis: 'Existem avarias visíveis?',
  veiculo_apto: 'O veículo está apto para uso?',
  pneus_adequados: 'Os pneus aparentam condição adequada?',
}

const STATUS_CONFIG = {
  pendente: { label: 'Pendente', cls: 'badge-pending' },
  aprovado: { label: 'Aprovado', cls: 'badge-approved' },
  reprovado: { label: 'Reprovado', cls: 'badge-rejected' },
}

export default function DetalhesChecklist() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [checklist, setChecklist] = useState(null)
  const [fotos, setFotos] = useState([])
  const [items, setItems] = useState([])
  const [reviewer, setReviewer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const [acao, setAcao] = useState(null)
  const [observacao, setObservacao] = useState('')
  const [erroObs, setErroObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erroAcao, setErroAcao] = useState('')

  useEffect(() => {
    fetchDados()
  }, [id])

  async function fetchDados() {
    setLoading(true)
    setErro('')

    try {
      const [resChecklist, resFotos, resItems] = await Promise.all([
        supabase
          .from('checklists')
          .select('*, vehicles(placa, modelo, motorista, km_atual, cidade), profiles!user_id(nome, email)')
          .eq('id', id)
          .single(),
        supabase
          .from('checklist_photos')
          .select('*')
          .eq('checklist_id', id),
        supabase
          .from('checklist_items')
          .select('*')
          .eq('checklist_id', id),
      ])

      if (resChecklist.error) throw resChecklist.error

      setChecklist(resChecklist.data)
      setFotos(resFotos.data || [])
      setItems(resItems.data || [])

      if (resChecklist.data?.reviewed_by) {
        const { data: reviewerData } = await supabase
          .from('profiles')
          .select('nome, email')
          .eq('id', resChecklist.data.reviewed_by)
          .single()
        setReviewer(reviewerData)
      }
    } catch {
      setErro('Erro ao carregar os dados do checklist.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAprovar() {
    setSalvando(true)
    setErroAcao('')

    try {
      const { error } = await supabase
        .from('checklists')
        .update({ status: 'aprovado', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      navigate('/dashboard', { replace: true })
    } catch {
      setErroAcao('Erro ao aprovar checklist. Tente novamente.')
      setSalvando(false)
    }
  }

  async function handleReprovar() {
    setErroObs('')
    setErroAcao('')

    if (!observacao.trim()) {
      setErroObs('Informe o motivo da reprovação.')
      return
    }

    setSalvando(true)

    try {
      const { error } = await supabase
        .from('checklists')
        .update({ status: 'reprovado', observacao: observacao.trim(), reviewed_by: user.id, reviewed_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
      navigate('/dashboard', { replace: true })
    } catch {
      setErroAcao('Erro ao reprovar checklist. Tente novamente.')
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header voltar="/dashboard" />
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 rounded-full border-2 border-transparent border-t-cyan-500 animate-spin" />
        </div>
      </div>
    )
  }

  if (erro || !checklist) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header voltar="/dashboard" />
        <div className="text-center py-20">
          <p className="text-slate-500">{erro || 'Checklist não encontrado.'}</p>
          <button onClick={() => navigate('/dashboard')} className="mt-4 text-sm text-cyan-400 hover:text-cyan-300 transition-colors">
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    )
  }

  const veiculo = checklist.vehicles
  const responsavel = checklist.profiles
  const cfg = STATUS_CONFIG[checklist.status] || STATUS_CONFIG.pendente
  const isPendente = checklist.status === 'pendente'

  return (
    <div className="min-h-screen bg-slate-950">
      <Header voltar="/dashboard" />

      <div className="max-w-3xl mx-auto p-4 sm:p-6 space-y-4 animate-fade-in">
        {/* Header do checklist */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-100">{veiculo?.placa || '—'}</h1>
            <p className="text-sm text-slate-500">{veiculo?.modelo}</p>
          </div>
          <span className={cfg.cls}>{cfg.label}</span>
        </div>

        <div className="glow-line" />

        {/* Dados do veículo */}
        <div className="glass-card p-5 sm:p-6">
          <h2 className="section-title flex items-center gap-2">
            <Gauge size={14} /> Dados do veículo
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <InfoItem label="Placa" value={veiculo?.placa} bold />
            <InfoItem label="Modelo" value={veiculo?.modelo} />
            <InfoItem label="Motorista" value={veiculo?.motorista} />
            <InfoItem label="KM Registrado" value={checklist.km_atual?.toLocaleString('pt-BR')} />
            <InfoItem label="Cidade" value={veiculo?.cidade} icon={<MapPin size={12} />} />
            <InfoItem label="Data" value={new Date(checklist.created_at).toLocaleString('pt-BR')} icon={<Calendar size={12} />} />
          </div>
          {responsavel && (
            <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center gap-2">
              <User size={14} className="text-slate-500" />
              <span className="text-xs text-slate-500">Preenchido por</span>
              <span className="text-sm text-slate-300 font-medium">
                {responsavel.nome || responsavel.email || '—'}
              </span>
            </div>
          )}
        </div>

        {/* Fotos */}
        <div className="glass-card p-5 sm:p-6">
          <h2 className="section-title flex items-center gap-2">
            <Image size={14} /> Fotos do veículo
          </h2>
          {fotos.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma foto registrada.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {fotos.map((foto) => (
                <div key={foto.id} className="group">
                  <div className="aspect-square rounded-xl overflow-hidden border border-slate-800/60 bg-slate-800/30">
                    <img
                      src={foto.url}
                      alt={FOTO_LABELS[foto.tipo] || foto.tipo}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <p className="text-[11px] text-center text-slate-500 font-medium mt-2 uppercase tracking-wider">
                    {FOTO_LABELS[foto.tipo] || foto.tipo}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Respostas */}
        <div className="glass-card p-5 sm:p-6">
          <h2 className="section-title flex items-center gap-2">
            <ClipboardCheck size={14} /> Inspeção
          </h2>
          {items.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma resposta registrada.</p>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 py-3 border-b border-slate-800/40 last:border-0">
                  <span className="text-sm text-slate-300">
                    {PERGUNTA_LABELS[item.pergunta] || item.pergunta}
                  </span>
                  {item.resposta ? (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400 shrink-0">
                      <CheckCircle size={16} /> Sim
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm font-semibold text-red-400 shrink-0">
                      <XCircle size={16} /> Não
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observação de reprovação */}
        {checklist.status === 'reprovado' && checklist.observacao && (
          <div className="glass-card p-5 border-red-500/20 bg-red-500/5">
            <h2 className="section-title flex items-center gap-2 text-red-400">
              <MessageSquare size={14} /> Motivo da reprovação
            </h2>
            <p className="text-sm text-red-300/80 leading-relaxed">{checklist.observacao}</p>
          </div>
        )}

        {/* Auditoria */}
        {checklist.reviewed_at && (
          <div className="glass-card p-5 bg-slate-800/20">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-slate-500" />
              <span className="text-xs text-slate-500">
                Revisado por <span className="text-slate-400 font-medium">{reviewer?.nome || reviewer?.email || '—'}</span> em{' '}
                {new Date(checklist.reviewed_at).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        )}

        {/* Ações do gestor */}
        {isPendente && (
          <div className="glass-card p-5 sm:p-6 space-y-4">
            <h2 className="section-title">Ação do gestor</h2>

            {erroAcao && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{erroAcao}</p>
              </div>
            )}

            {acao === 'reprovar' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Motivo da reprovação *
                  </label>
                  <textarea
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    rows={3}
                    className="input-dark resize-none"
                    placeholder="Descreva o motivo..."
                  />
                  {erroObs && <p className="text-sm text-red-400 mt-2">{erroObs}</p>}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button onClick={handleReprovar} disabled={salvando} className="btn-danger flex-1">
                    {salvando && <Loader2 className="animate-spin" size={18} />}
                    {salvando ? 'Salvando...' : 'Confirmar Reprovação'}
                  </button>
                  <button
                    onClick={() => { setAcao(null); setObservacao(''); setErroObs(''); setErroAcao('') }}
                    className="px-6 py-3 rounded-xl bg-slate-800/60 text-slate-400 hover:text-slate-300 hover:bg-slate-800 transition-all text-sm font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleAprovar} disabled={salvando} className="btn-success flex-1">
                  {salvando ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                  {salvando ? 'Salvando...' : 'Aprovar'}
                </button>
                <button onClick={() => setAcao('reprovar')} className="btn-danger flex-1">
                  <XCircle size={18} />
                  Reprovar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function InfoItem({ label, value, bold, icon }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className={`text-sm ${bold ? 'text-slate-100 font-bold' : 'text-slate-300'}`}>
        {value || '—'}
      </p>
    </div>
  )
}
