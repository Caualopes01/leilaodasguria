'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { createClient, Produto, Lance } from '@/lib/supabase'
import { formatCurrency, formatWhatsApp } from '@/lib/utils'
import {
  Heart, Clock, ChevronLeft, ChevronRight,
  Gavel, TrendingUp, Share2, AlertCircle,
  CheckCircle, X, Phone, User
} from 'lucide-react'
import { toast } from 'sonner'

function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 })

  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 })
        return
      }
      setTimeLeft({
        total: diff,
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      })
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [targetDate])

  return timeLeft
}

function TimerBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-bold tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-xs mt-1 opacity-70">{label}</span>
    </div>
  )
}

export default function LeilaoPage() {
  const { slug } = useParams()
  const supabase = createClient()

  const [produto, setProduto] = useState<Produto | null>(null)
  const [lances, setLances] = useState<Lance[]>([])
  const [loading, setLoading] = useState(true)
  const [imgIndex, setImgIndex] = useState(0)
  const [showModal, setShowModal] = useState(false)

  // Form state
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [valorLance, setValorLance] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const timeLeft = useCountdown(produto?.fim_em || new Date().toISOString())
  const isCritical = timeLeft.total > 0 && timeLeft.total < 60000 // < 1 minuto
  const isEnded = produto ? new Date(produto.fim_em) <= new Date() || produto.status === 'encerrado' : false
  const isNotStarted = produto ? new Date(produto.inicio_em) > new Date() && produto.status === 'aguardando' : false

  useEffect(() => {
    loadProduto()
  }, [slug])

  async function loadProduto() {
    const { data: prod } = await supabase
      .from('produtos')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!prod) { setLoading(false); return }
    setProduto(prod)

    const { data: lancesData } = await supabase
      .from('lances')
      .select('*')
      .eq('produto_id', prod.id)
      .order('valor', { ascending: false })

    setLances(lancesData || [])
    setLoading(false)

    // Sugerir valor mínimo
    const minVal = (prod.valor_atual || prod.valor_inicial) + (prod.incremento_minimo || 1)
    setValorLance(minVal.toFixed(2))
  }

  // Realtime
  useEffect(() => {
    if (!produto) return

    const channel = supabase
      .channel(`lances-${produto.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lances',
        filter: `produto_id=eq.${produto.id}`
      }, (payload) => {
        const newLance = payload.new as Lance
        setLances(prev => [newLance, ...prev].sort((a, b) => b.valor - a.valor))
        setProduto(prev => prev ? { ...prev, valor_atual: newLance.valor } : prev)
        const minVal = newLance.valor + (produto.incremento_minimo || 1)
        setValorLance(minVal.toFixed(2))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [produto?.id])

  async function handleSubmitLance() {
    if (!produto) return
    if (!nome.trim()) { toast.error('Informe seu nome'); return }
    const cleanPhone = whatsapp.replace(/\D/g, '')
    if (cleanPhone.length < 10) { toast.error('WhatsApp inválido'); return }
    const val = Number(valorLance)
    const minVal = (produto.valor_atual || produto.valor_inicial) + produto.incremento_minimo
    if (isNaN(val) || val < minVal) {
      toast.error(`Lance mínimo: ${formatCurrency(minVal)}`)
      return
    }

    setSubmitting(true)
    const { error } = await supabase.from('lances').insert({
      produto_id: produto.id,
      nome: nome.trim(),
      whatsapp: cleanPhone,
      valor: val,
    })

    if (error) {
      toast.error('Erro ao registrar lance')
      setSubmitting(false)
      return
    }

    setSuccess(true)
    setSubmitting(false)
    setTimeout(() => {
      setShowModal(false)
      setSuccess(false)
    }, 2500)
  }

  function formatPhone(value: string) {
    const nums = value.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 2) return nums
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
    if (nums.length <= 11) return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
    return value
  }

  function openModal() {
    if (!produto) return
    const minVal = (produto.valor_atual || produto.valor_inicial) + produto.incremento_minimo
    setValorLance(minVal.toFixed(2))
    setSuccess(false)
    setShowModal(true)
  }

  async function shareProduct() {
    const url = window.location.href
    if (navigator.share) {
      await navigator.share({ title: produto?.titulo, url })
    } else {
      navigator.clipboard.writeText(url)
      toast.success('Link copiado!')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3">
        <Heart className="w-8 h-8 text-rosa-300 animate-pulse" fill="currentColor" />
        <p className="text-gray-400 text-sm">Carregando leilão...</p>
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 p-6">
        <AlertCircle className="w-12 h-12 text-gray-300" />
        <h1 className="font-display text-xl font-bold text-gray-600">Leilão não encontrado</h1>
        <p className="text-gray-400 text-sm text-center">Este link pode ter expirado ou estar incorreto.</p>
      </div>
    )
  }

  const valorAtual = produto.valor_atual || produto.valor_inicial
  const minProximoLance = valorAtual + produto.incremento_minimo
  const lanceAtual = lances[0]

  return (
    <div className="min-h-screen bg-white max-w-lg mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-rosa-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rosa-500" fill="currentColor" />
          <span className="font-display font-bold text-rosa-600 text-sm">Leilão das Gurias</span>
        </div>
        <button
          onClick={shareProduct}
          className="p-2 rounded-full hover:bg-rosa-50 text-gray-500"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Image carousel */}
      {produto.imagens && produto.imagens.length > 0 ? (
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <img
            src={produto.imagens[imgIndex]}
            alt={produto.titulo}
            className="w-full h-full object-contain transition-opacity duration-200"
          />
          {produto.imagens.length > 1 && (
            <>
              <button
                onClick={() => setImgIndex(i => Math.max(0, i - 1))}
                disabled={imgIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4 text-gray-700" />
              </button>
              <button
                onClick={() => setImgIndex(i => Math.min(produto.imagens.length - 1, i + 1))}
                disabled={imgIndex === produto.imagens.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow-sm disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4 text-gray-700" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {produto.imagens.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className={`transition-all rounded-full ${i === imgIndex ? 'w-5 h-1.5 bg-rosa-500' : 'w-1.5 h-1.5 bg-white/70'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Status badge */}
          <div className="absolute top-3 left-3">
            {isEnded ? (
              <span className="bg-gray-800/80 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Encerrado
              </span>
            ) : isNotStarted ? (
              <span className="bg-yellow-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full">
                Em breve
              </span>
            ) : (
              <span className="bg-green-500/90 text-white text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                Ao vivo
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="aspect-square bg-rosa-50 flex items-center justify-center">
          <span className="text-6xl">🛍️</span>
        </div>
      )}

      {/* CTA - logo abaixo da imagem */}
      {!isEnded && !isNotStarted && (
        <div className="px-4 pt-4">
          <button
            onClick={openModal}
            className="w-full bg-rosa-600 active:bg-rosa-700 text-white font-bold py-4 rounded-2xl text-lg flex items-center justify-center gap-2 shadow-lg shadow-rosa-200 transition-all active:scale-[0.98]"
          >
            <Gavel className="w-5 h-5" />
            Dar Lance
          </button>
        </div>
      )}

      <div className="px-4 py-5 space-y-5">
        {/* Produto info */}
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">{produto.titulo}</h1>
          {produto.descricao && (
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">{produto.descricao}</p>
          )}
        </div>

        {/* Valor atual */}
        <div className="bg-gradient-to-r from-rosa-50 to-white border border-rosa-100 rounded-2xl p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">
                {lanceAtual ? `Lance de ${lanceAtual.nome.split(' ')[0]}` : 'Valor inicial'}
              </p>
              <p className="font-display text-3xl font-bold text-rosa-600">
                {formatCurrency(valorAtual)}
              </p>
              {produto.incremento_minimo > 0 && !isEnded && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Próximo mínimo: {formatCurrency(minProximoLance)}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">{lances.length} lance{lances.length !== 1 ? 's' : ''}</p>
              <TrendingUp className="w-5 h-5 text-rosa-400 ml-auto" />
            </div>
          </div>
        </div>

        {/* Timer */}
        {!isEnded && !isNotStarted && (
          <div className={`rounded-2xl p-4 text-center ${isCritical ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
            <p className={`text-xs font-medium mb-3 ${isCritical ? 'text-red-500' : 'text-gray-500'}`}>
              {isCritical ? '⚡ Últimos segundos!' : 'Encerra em'}
            </p>
            <div className={`flex items-center justify-center gap-4 ${isCritical ? 'timer-critical' : 'text-gray-800'}`}>
              {timeLeft.days > 0 && <TimerBlock value={timeLeft.days} label="dias" />}
              {(timeLeft.days > 0 || timeLeft.hours > 0) && (
                <>
                  {timeLeft.days > 0 && <span className="text-2xl font-light text-gray-300">:</span>}
                  <TimerBlock value={timeLeft.hours} label="horas" />
                </>
              )}
              <span className="text-2xl font-light text-gray-300">:</span>
              <TimerBlock value={timeLeft.minutes} label="min" />
              <span className="text-2xl font-light text-gray-300">:</span>
              <TimerBlock value={timeLeft.seconds} label="seg" />
            </div>
          </div>
        )}

        {isNotStarted && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-2xl p-4 text-center">
            <p className="text-yellow-700 font-semibold text-sm">⏳ Leilão ainda não iniciou</p>
            <p className="text-yellow-600 text-xs mt-1">
              Começa em {new Date(produto.inicio_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        )}

        {isEnded && lanceAtual && (
          <div className="bg-rosa-50 border border-rosa-100 rounded-2xl p-4 text-center">
            <p className="text-rosa-600 font-display font-bold text-lg">🎉 Ganhador(a)!</p>
            <p className="font-bold text-gray-800 mt-1">{lanceAtual.nome}</p>
            <p className="text-rosa-600 font-bold text-xl">{formatCurrency(lanceAtual.valor)}</p>
          </div>
        )}


        {/* Histórico de lances */}
        {lances.length > 0 && (
          <div>
            <h2 className="font-display font-bold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rosa-500" />
              Lances
            </h2>
            <div className="space-y-2">
              {lances.map((lance, i) => (
                <div
                  key={lance.id}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all animate-slide-up ${i === 0 ? 'bg-rosa-50 border border-rosa-100' : 'bg-gray-50'}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${i === 0 ? 'bg-rosa-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {i === 0 ? '👑' : lance.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{lance.nome}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(lance.criado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className={`font-bold text-sm ${i === 0 ? 'text-rosa-600' : 'text-gray-700'}`}>
                    {formatCurrency(lance.valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pb-6 text-center">
          <p className="text-xs text-gray-300 flex items-center justify-center gap-1">
            <Heart className="w-3 h-3" fill="currentColor" />
            Leilão das Gurias
          </p>
        </div>
      </div>

      {/* Modal para dar lance */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-t-3xl w-full max-w-lg p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-xl font-bold text-gray-900">Fazer Lance</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-full hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                <p className="font-display text-xl font-bold text-gray-800">Lance registrado! 🎉</p>
                <p className="text-gray-500 text-sm mt-2">Boa sorte, {nome.split(' ')[0]}!</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-rosa-50 rounded-xl p-3 text-center mb-2">
                  <p className="text-xs text-gray-500">Lance atual</p>
                  <p className="font-display font-bold text-rosa-600 text-2xl">{formatCurrency(valorAtual)}</p>
                  <p className="text-xs text-gray-400">Mínimo: {formatCurrency(minProximoLance)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-gray-400" /> Seu nome *
                  </label>
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Nome completo"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-gray-400" /> WhatsApp *
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={whatsapp}
                    onChange={e => setWhatsapp(formatPhone(e.target.value))}
                    placeholder="(51) 99999-9999"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor do lance (R$) *</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={valorLance}
                    onChange={e => setValorLance(e.target.value)}
                    min={minProximoLance}
                    step="0.01"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-bold text-rosa-700"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Mínimo: {formatCurrency(minProximoLance)}
                  </p>
                </div>

                <button
                  onClick={handleSubmitLance}
                  disabled={submitting}
                  className="w-full bg-rosa-600 active:bg-rosa-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-base flex items-center justify-center gap-2 shadow-lg shadow-rosa-200 transition-all mt-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Gavel className="w-5 h-5" /> Confirmar Lance</>
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center">
                  Seu WhatsApp será usado apenas para contato caso ganhe o leilão.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
