'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient, Produto, Lance } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Bell, Heart, TrendingUp, Trophy, Clock, AlertCircle, CheckCircle, Phone } from 'lucide-react'
import FooterNav from '@/components/FooterNav'

type LanceWithProduto = Lance & { produto: Produto }

type StatusLance = 'ganhando' | 'superado' | 'encerrado'

function getStatus(lances: LanceWithProduto[], userWhats: string): StatusLance {
  if (!lances || lances.length === 0) return 'superado'
  const produto = lances[0].produto
  if (!produto) return 'superado'
  if (produto.status === 'encerrado' || new Date(produto.fim_em) <= new Date()) return 'encerrado'
  // Verifica se o lance mais alto é do usuário
  const sorted = [...lances].sort((a, b) => b.valor - a.valor)
  const top = sorted[0]
  return top.whatsapp === userWhats ? 'ganhando' : 'superado'
}

function StatusBadge({ status }: { status: StatusLance }) {
  if (status === 'ganhando') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
      <Trophy className="w-3 h-3" /> Ganhando
    </span>
  )
  if (status === 'superado') return (
    <span className="flex items-center gap-1 text-xs font-semibold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full">
      <AlertCircle className="w-3 h-3" /> Superado
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
      <CheckCircle className="w-3 h-3" /> Encerrado
    </span>
  )
}

export default function MeusLancesPage() {
  const [userWhats, setUserWhats] = useState<string | null>(null)
  const [inputWhats, setInputWhats] = useState('')
  const [grupos, setGrupos] = useState<{ produto: Produto; lances: LanceWithProduto[]; meuLance: LanceWithProduto | null }[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  // Zera notificações ao abrir
  useEffect(() => {
    localStorage.setItem('leilao_notif_count', '0')
    window.dispatchEvent(new Event('leilao_notif_update'))
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('leilao_user_whats')
    if (saved) {
      setUserWhats(saved)
      loadMeusLances(saved)
    }
  }, [])

  async function loadMeusLances(whats: string) {
    setLoading(true)
    const cleanWhats = whats.replace(/\D/g, '')

    // Busca todos os lances desse whatsapp
    const { data: meusLances } = await supabase
      .from('lances')
      .select('*, produto:produtos(*)')
      .eq('whatsapp', cleanWhats)
      .order('criado_em', { ascending: false })

    if (!meusLances || meusLances.length === 0) {
      setGrupos([])
      setLoading(false)
      return
    }

    // Agrupa por produto
    const produtosMap = new Map<string, { produto: Produto; lances: LanceWithProduto[]; meuLance: LanceWithProduto | null }>()

    for (const lance of meusLances as LanceWithProduto[]) {
      const prod = lance.produto
      if (!prod) continue
      if (!produtosMap.has(prod.id)) {
        // Busca todos os lances desse produto para saber quem está ganhando
        const { data: allLances } = await supabase
          .from('lances')
          .select('*, produto:produtos(*)')
          .eq('produto_id', prod.id)
          .order('valor', { ascending: false })

        produtosMap.set(prod.id, {
          produto: prod,
          lances: (allLances as LanceWithProduto[]) || [],
          meuLance: lance,
        })
      }
    }

    setGrupos(Array.from(produtosMap.values()))
    setLoading(false)
  }

  function handleConfirmWhats() {
    const clean = inputWhats.replace(/\D/g, '')
    if (clean.length < 10) return
    localStorage.setItem('leilao_user_whats', clean)
    setUserWhats(clean)
    loadMeusLances(clean)
  }

  function formatPhone(value: string) {
    const nums = value.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 2) return nums
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-rosa-100 px-4 py-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rosa-500" fill="currentColor" />
          <span className="font-display font-bold text-rosa-600">Leilão das Gurias</span>
        </div>
        <h1 className="font-display text-xl font-bold text-gray-900 mt-1">Meus Lances</h1>
      </div>

      <div className="px-4 pt-5">
        {!userWhats ? (
          /* Tela de identificação */
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="w-14 h-14 bg-rosa-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-7 h-7 text-rosa-600" />
            </div>
            <h2 className="font-display text-lg font-bold text-gray-900 text-center mb-1">Identificação</h2>
            <p className="text-sm text-gray-500 text-center mb-5">
              Digite seu WhatsApp para ver seus lances e acompanhar os resultados
            </p>
            <div className="relative mb-4">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="tel"
                inputMode="numeric"
                value={inputWhats}
                onChange={e => setInputWhats(formatPhone(e.target.value))}
                placeholder="(51) 99999-9999"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <button
              onClick={handleConfirmWhats}
              disabled={inputWhats.replace(/\D/g, '').length < 10}
              className="w-full bg-rosa-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all"
            >
              Ver meus lances
            </button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Heart className="w-8 h-8 text-rosa-300 animate-pulse" fill="currentColor" />
            <p className="text-gray-400 text-sm">Buscando seus lances...</p>
          </div>
        ) : grupos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <TrendingUp className="w-12 h-12 text-gray-200" />
            <p className="font-display text-gray-500 font-semibold">Nenhum lance ainda</p>
            <p className="text-gray-400 text-sm">Participe de um leilão e seus lances aparecerão aqui!</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-400">{grupos.length} leilão{grupos.length !== 1 ? 'ões' : ''} participado{grupos.length !== 1 ? 's' : ''}</p>
            {grupos.map(({ produto, lances, meuLance }) => {
              const status = getStatus(lances, userWhats)
              const topLance = [...lances].sort((a, b) => b.valor - a.valor)[0]
              const isUserTop = topLance?.whatsapp === userWhats

              return (
                <div
                  key={produto.id}
                  className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                    status === 'ganhando' ? 'border-green-200' :
                    status === 'superado' ? 'border-orange-200' : 'border-gray-100'
                  }`}
                >
                  <div className="flex gap-3 p-4">
                    {/* Imagem */}
                    <div className="w-16 h-16 rounded-xl bg-rosa-50 flex-shrink-0 overflow-hidden">
                      {produto.imagens?.length > 0 ? (
                        <img src={produto.imagens[0]} alt={produto.titulo} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1">{produto.titulo}</h3>
                        <StatusBadge status={status} />
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Meu lance</span>
                          <span className="font-semibold text-gray-700">{meuLance ? formatCurrency(meuLance.valor) : '-'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Lance atual</span>
                          <span className={`font-bold ${isUserTop ? 'text-green-600' : 'text-orange-600'}`}>
                            {formatCurrency(topLance?.valor || 0)}
                          </span>
                        </div>
                        {status === 'superado' && topLance && topLance.whatsapp !== userWhats && (
                          <p className="text-xs text-orange-500 mt-1">
                            ⚠️ {topLance.nome.split(' ')[0]} está na frente!
                          </p>
                        )}
                        {status === 'encerrado' && isUserTop && (
                          <p className="text-xs text-green-600 font-semibold mt-1">
                            🎉 Você ganhou!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Footer card */}
                  {status !== 'encerrado' && (
                    <a
                      href={`/leilao/${produto.slug}`}
                      className={`block text-center text-xs font-semibold py-2.5 transition-colors ${
                        status === 'superado'
                          ? 'bg-orange-500 text-white hover:bg-orange-600'
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {status === 'superado' ? '⚡ Dar novo lance agora!' : '👀 Acompanhar leilão'}
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <FooterNav />
    </div>
  )
}
