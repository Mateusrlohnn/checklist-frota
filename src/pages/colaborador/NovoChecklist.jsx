import { useState, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import Header from '../../components/Header'
import { Search, Upload, CheckCircle, Camera, Loader2, Gauge, MapPin, ClipboardCheck, ImagePlus } from 'lucide-react'

const FOTO_TIPOS = [
  { key: 'frente', label: 'Frente' },
  { key: 'lateral', label: 'Lateral' },
  { key: 'pneu', label: 'Pneu' },
  { key: 'parte_interna', label: 'Parte Interna' },
  { key: 'painel', label: 'Painel' },
]

const PERGUNTAS = [
  { key: 'documentacao_em_dia', label: 'Documentação em dia?' },
  { key: 'equipamentos_obrigatorios', label: 'Equipamentos obrigatórios presentes?' },
  { key: 'avarias_visiveis', label: 'Existem avarias visíveis?' },
  { key: 'veiculo_apto', label: 'O veículo está apto para uso?' },
  { key: 'pneus_adequados', label: 'Os pneus aparentam condição adequada?' },
]

export default function NovoChecklist() {
  const { user } = useAuth()
  const [busca, setBusca] = useState('')
  const [veiculo, setVeiculo] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [erroBusca, setErroBusca] = useState('')

  const [kmAtual, setKmAtual] = useState('')
  const [fotos, setFotos] = useState({})
  const [respostas, setRespostas] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState(false)
  const [tentouEnviar, setTentouEnviar] = useState(false)

  const cameraInputRefs = useRef({})
  const galleryInputRefs = useRef({})

  async function buscarVeiculo(e) {
    e.preventDefault()
    if (!busca.trim()) return

    setErroBusca('')
    setVeiculo(null)
    setBuscando(true)

    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('situacao', 'Ativo')
        .ilike('placa', busca.trim())
        .single()

      if (error || !data) {
        setErroBusca('Veículo não encontrado ou inativo.')
        return
      }

      setVeiculo(data)
    } catch {
      setErroBusca('Erro ao buscar veículo. Verifique sua conexão.')
    } finally {
      setBuscando(false)
    }
  }

  function handleFoto(key, file) {
    if (!file) return
    setFotos((prev) => ({ ...prev, [key]: file }))
  }

  function handleResposta(key, valor) {
    setRespostas((prev) => ({ ...prev, [key]: valor }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErro('')

    const fotosFaltando = FOTO_TIPOS.filter((f) => !fotos[f.key])
    if (fotosFaltando.length > 0) {
      setTentouEnviar(true)
      setErro(`Fotos obrigatórias faltando: ${fotosFaltando.map((f) => f.label).join(', ')}`)
      return
    }

    const respostasFaltando = PERGUNTAS.filter((p) => respostas[p.key] === undefined)
    if (respostasFaltando.length > 0) {
      setTentouEnviar(true)
      setErro(`Perguntas não respondidas: ${respostasFaltando.map((p) => p.label).join(', ')}`)
      return
    }

    if (!kmAtual || Number(kmAtual) <= 0) {
      setErro('Informe o KM atual.')
      return
    }

    setEnviando(true)

    try {
      const { data: checklist, error: errChecklist } = await supabase
        .from('checklists')
        .insert({
          vehicle_id: veiculo.id,
          user_id: user.id,
          km_atual: Number(kmAtual),
          status: 'pendente',
        })
        .select()
        .single()

      if (errChecklist) throw errChecklist

      for (const { key } of FOTO_TIPOS) {
        const file = fotos[key]
        const ext = file.name.split('.').pop()
        const path = `${checklist.id}/${key}.${ext}`

        const { error: errUpload } = await supabase.storage
          .from('checklist-photos')
          .upload(path, file)

        if (errUpload) throw errUpload

        const { data: urlData } = supabase.storage
          .from('checklist-photos')
          .getPublicUrl(path)

        const { error: errFoto } = await supabase
          .from('checklist_photos')
          .insert({
            checklist_id: checklist.id,
            tipo: key,
            url: urlData.publicUrl,
          })

        if (errFoto) throw errFoto
      }

      const items = PERGUNTAS.map((p) => ({
        checklist_id: checklist.id,
        pergunta: p.key,
        resposta: respostas[p.key],
      }))

      const { error: errItems } = await supabase
        .from('checklist_items')
        .insert(items)

      if (errItems) throw errItems

      setSucesso(true)
    } catch (err) {
      console.error('Erro ao enviar checklist:', err)
      if (err.message?.includes('storage')) {
        setErro('Erro ao enviar fotos. Verifique o tamanho dos arquivos e tente novamente.')
      } else if (err.code === '42501' || err.message?.includes('policy')) {
        setErro('Sem permissão para enviar. Verifique se as políticas RLS foram aplicadas no Supabase.')
      } else {
        setErro(`Erro ao enviar checklist: ${err.message || 'Tente novamente.'}`)
      }
    } finally {
      setEnviando(false)
    }
  }

  function resetForm() {
    setSucesso(false)
    setVeiculo(null)
    setBusca('')
    setKmAtual('')
    setFotos({})
    setRespostas({})
    setErro('')
    setTentouEnviar(false)
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-slate-950">
        <Header />
        <div className="flex items-center justify-center p-4 mt-12">
          <div className="glass-card p-8 text-center max-w-md w-full animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/20">
              <CheckCircle size={40} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Checklist enviado!</h2>
            <p className="text-slate-400 mb-6">
              O checklist foi registrado e está pendente de aprovação pelo gestor.
            </p>
            <button onClick={resetForm} className="btn-primary">
              Novo Checklist
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6 animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Novo Checklist</h2>
          <p className="text-sm text-slate-500 mt-1">Busque o veículo pela placa para iniciar</p>
        </div>

        {/* Busca por placa */}
        <form onSubmit={buscarVeiculo} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Digite a placa..."
              value={busca}
              onChange={(e) => setBusca(e.target.value.toUpperCase())}
              className="input-dark pl-11 uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={buscando}
            className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 transition-all flex items-center gap-2 font-medium text-sm shrink-0"
          >
            {buscando ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            <span className="hidden sm:inline">{buscando ? 'Buscando...' : 'Buscar'}</span>
          </button>
        </form>

        {erroBusca && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{erroBusca}</p>
          </div>
        )}

        {/* Dados do veículo */}
        {veiculo && (
          <div className="glass-card p-5 sm:p-6">
            <h3 className="section-title flex items-center gap-2">
              <Gauge size={14} /> Veículo encontrado
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-1">Placa</p>
                <p className="text-slate-100 font-bold text-lg">{veiculo.placa}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-1">Modelo</p>
                <p className="text-slate-300">{veiculo.modelo}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-1">Motorista</p>
                <p className="text-slate-300">{veiculo.motorista}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 mb-1">KM Atual</p>
                <p className="text-slate-300">{veiculo.km_atual?.toLocaleString('pt-BR')}</p>
              </div>
              <div className="col-span-2 flex items-center gap-1.5">
                <MapPin size={14} className="text-slate-500" />
                <span className="text-slate-400">{veiculo.cidade}</span>
              </div>
            </div>
          </div>
        )}

        {/* Formulário do checklist */}
        {veiculo && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* KM Atual */}
            <div className="glass-card p-5 sm:p-6">
              <label htmlFor="km" className="section-title block flex items-center gap-2">
                <Gauge size={14} /> KM Atual
              </label>
              <input
                id="km"
                type="number"
                min="1"
                required
                value={kmAtual}
                onChange={(e) => setKmAtual(e.target.value)}
                className="input-dark"
                placeholder="Ex: 45000"
              />
            </div>

            {/* Upload de fotos */}
            <div className="glass-card p-5 sm:p-6">
              <h3 className="section-title flex items-center gap-2 mb-4">
                <Camera size={14} /> Fotos do veículo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {FOTO_TIPOS.map(({ key, label }) => (
                  <div key={key} className={`rounded-xl border-2 transition-all duration-300 p-4 ${
                    fotos[key]
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-slate-700/40 bg-slate-800/20'
                  }`}>
                    {/* Inputs hidden — câmera e galeria separados */}
                    <input
                      ref={(el) => (cameraInputRefs.current[key] = el)}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => { handleFoto(key, e.target.files[0]); e.target.value = '' }}
                    />
                    <input
                      ref={(el) => (galleryInputRefs.current[key] = el)}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => { handleFoto(key, e.target.files[0]); e.target.value = '' }}
                    />

                    {/* Label + Status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className={`font-semibold text-xs uppercase tracking-wider ${
                        fotos[key] ? 'text-emerald-400' : 'text-slate-400'
                      }`}>
                        {label}
                      </span>
                      {fotos[key] && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-500/80">
                          <CheckCircle size={12} /> Anexado
                        </span>
                      )}
                    </div>

                    {/* Preview ou placeholder */}
                    {fotos[key] ? (
                      <div className="mb-3">
                        <img
                          src={URL.createObjectURL(fotos[key])}
                          alt={label}
                          className="w-full h-28 object-cover rounded-lg border border-slate-700/40"
                        />
                        <p className="text-[10px] text-slate-500 truncate mt-1.5">{fotos[key].name}</p>
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-lg border border-dashed border-slate-700/40 flex items-center justify-center mb-3">
                        <Camera size={28} className="text-slate-700" />
                      </div>
                    )}

                    {/* Dois botões: Câmera e Galeria */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRefs.current[key]?.click()}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400"
                      >
                        <Camera size={14} />
                        Tirar foto
                      </button>
                      <button
                        type="button"
                        onClick={() => galleryInputRefs.current[key]?.click()}
                        className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold transition-all bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:border-cyan-500/30 hover:text-cyan-400"
                      >
                        <ImagePlus size={14} />
                        Galeria
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Perguntas Sim/Não */}
            <div className="glass-card p-5 sm:p-6">
              <h3 className="section-title flex items-center gap-2 mb-4">
                <ClipboardCheck size={14} /> Inspeção
              </h3>
              <div className="space-y-1">
                {PERGUNTAS.map(({ key, label }) => {
                  const naoRespondida = tentouEnviar && respostas[key] === undefined
                  return (
                  <div key={key} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 py-3 px-3 -mx-3 rounded-lg border-b border-slate-800/40 last:border-0 transition-all ${
                    naoRespondida ? 'bg-red-500/5 border border-red-500/20 rounded-lg' : ''
                  }`}>
                    <div className="flex items-center gap-2">
                      {naoRespondida && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 animate-pulse" />
                      )}
                      <span className={`text-sm ${naoRespondida ? 'text-red-300' : 'text-slate-300'}`}>{label}</span>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResposta(key, true)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                          respostas[key] === true
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10'
                            : naoRespondida
                              ? 'bg-slate-800/40 text-slate-500 border border-red-500/30 hover:border-emerald-500/40'
                              : 'bg-slate-800/40 text-slate-500 border border-slate-700/40 hover:border-slate-600/60'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResposta(key, false)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                          respostas[key] === false
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-500/10'
                            : naoRespondida
                              ? 'bg-slate-800/40 text-slate-500 border border-red-500/30 hover:border-red-500/40'
                              : 'bg-slate-800/40 text-slate-500 border border-slate-700/40 hover:border-slate-600/60'
                        }`}
                      >
                        Não
                      </button>
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>

            {erro && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{erro}</p>
              </div>
            )}

            <button type="submit" disabled={enviando} className="btn-primary py-4 text-base">
              {enviando && <Loader2 className="animate-spin" size={20} />}
              {enviando ? 'Enviando...' : 'Enviar Checklist'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
