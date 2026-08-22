'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, Produto } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Heart, Clock, TrendingUp, Gavel, Search } from 'lucide-react'
import FooterNav from '@/components/FooterNav'

function useCountdownShort(targetDate: string) {
  const [label, setLabel] = useState('')
  useEffect(() => {
    function calc() {
      const diff = new Date(targetDate).getTime() - Date.now()
      if (diff <= 0) { setLabel('Encerrado'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      if (h > 24) setLabel(`${Math.floor(h / 24)}d ${h % 24}h`)
      else if (h > 0) setLabel(`${h}h ${m}m`)
      else setLabel(`${m}m ${s}s`)
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [targetDate])
  return label
}

function ProdutoCardCompacto({ produto }: { produto: Produto }) {
  const timer = useCountdownShort(produto.fim_em)
  const isCritical = new Date(produto.fim_em).getTime() - Date.now() < 300000

  return (
    <Link href={`/leilao/${produto.slug}`} className="block">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-orange-200/60 shadow-sm overflow-hidden hover:shadow-md transition-all relative">
        {/* Imagem */}
        <div className="relative aspect-square bg-orange-50 overflow-hidden">
          {produto.imagens && produto.imagens.length > 0 ? (
            <img
              src={produto.imagens[0]}
              alt={produto.titulo}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
          )}
          {/* Timer badge */}
          <div className={`absolute bottom-1 right-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold flex items-center gap-0.5 ${isCritical ? 'bg-red-500 text-white' : 'bg-black/60 text-white'}`}>
            <Clock className="w-2.5 h-2.5" />
            {timer}
          </div>
        </div>
        {/* Info */}
        <div className="p-2 flex items-center justify-between gap-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-[10px] line-clamp-1 leading-tight">{produto.titulo}</h3>
            <p className="font-display font-bold text-orange-600 text-[11px] mt-0.5 leading-none">
              {formatCurrency(produto.valor_atual || produto.valor_inicial)}
            </p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-1.5 rounded-lg flex-shrink-0 shadow-sm flex items-center justify-center">
            <Gavel className="w-3 h-3" />
          </div>
        </div>
      </div>
    </Link>
  )
}

function ProdutoCard({ produto }: { produto: Produto }) {
  const timer = useCountdownShort(produto.fim_em)
  const isCritical = new Date(produto.fim_em).getTime() - Date.now() < 300000

  return (
    <Link href={`/leilao/${produto.slug}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-rosa-200 transition-all active:scale-[0.98]">
        {/* Imagem */}
        <div className="relative aspect-square bg-rosa-50 overflow-hidden">
          {produto.imagens && produto.imagens.length > 0 ? (
            <img
              src={produto.imagens[0]}
              alt={produto.titulo}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl">🛍️</div>
          )}
          {/* Status badge */}
          <div className="absolute top-2 left-2">
            <span className="bg-green-500/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              Ativo
            </span>
          </div>
          {/* Timer badge */}
          <div className={`absolute bottom-2 right-2 rounded-full px-2.5 py-1 text-xs font-semibold flex items-center gap-1 ${isCritical ? 'bg-red-500 text-white' : 'bg-black/50 text-white'}`}>
            <Clock className="w-3 h-3" />
            {timer}
          </div>
        </div>
        {/* Info */}
        <div className="p-3">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">{produto.titulo}</h3>
          <div className="flex items-end justify-between mt-2">
            <div>
              <p className="text-xs text-gray-400">Lance atual</p>
              <p className="font-display font-bold text-rosa-600 text-base leading-tight">
                {formatCurrency(produto.valor_atual || produto.valor_inicial)}
              </p>
            </div>
            <div className="flex items-center justify-center bg-rosa-600 text-white font-bold h-8 px-3 rounded-xl shadow-sm">
              <Gavel className="w-3.5 h-3.5 mr-1" />
              <span className="hidden sm:inline text-xs">Dar Lance</span>
              <span className="sm:hidden text-lg leading-none mb-0.5">+</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function MarketplacePage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadProdutos()
  }, [])

  async function loadProdutos() {
    const { data } = await supabase
      .from('produtos')
      .select('*, lances(valor)')
      .eq('status', 'ativo')
      
    let prodsComLanceValido = (data || []).map(p => {
      const lancesArray = p.lances || []
      const maxL = lancesArray.length > 0 ? Math.max(...lancesArray.map((l: any) => l.valor)) : p.valor_atual
      return { ...p, valor_atual: Math.max(p.valor_atual || 0, maxL), total_lances: lancesArray.length }
    })
    
    // Ordena do mais disputado (mais lances) ao menos disputado
    prodsComLanceValido.sort((a, b) => (b.total_lances || 0) - (a.total_lances || 0))
    
    setProdutos(prodsComLanceValido)
    setLoading(false)
  }

  // Realtime: atualiza valor_atual ao vivo escutando LANCES em vez de produtos (mais rápido e à prova de falhas do trigger)
  useEffect(() => {
    // Escuta updates nos produtos caso o admin edite info
    const channelProdutos = supabase
      .channel('marketplace-produtos')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'produtos',
      }, (payload) => {
        setProdutos(prev =>
          prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new as Produto } : p)
        )
      })
      .subscribe()

    // Escuta novos lances inseridos
    const channelLances = supabase
      .channel('marketplace-lances')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lances',
      }, (payload) => {
        const novoLance = payload.new as any
        setProdutos(prev =>
          prev.map(p => {
            if (p.id === novoLance.produto_id) {
              return { ...p, valor_atual: Math.max(p.valor_atual || 0, novoLance.valor) }
            }
            return p
          })
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channelProdutos)
      supabase.removeChannel(channelLances)
    }
  }, [])

  const filtered = produtos.filter(p =>
    p.titulo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-rosa-100 px-4 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Heart className="w-5 h-5 text-rosa-500" fill="currentColor" />
          <span className="font-display font-bold text-rosa-600">Leilão das Gurias</span>
        </div>
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar produtos..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm border-none focus:outline-none focus:ring-2 focus:ring-rosa-200"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Heart className="w-8 h-8 text-rosa-300 animate-pulse" fill="currentColor" />
            <p className="text-gray-400 text-sm">Carregando leilões...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <TrendingUp className="w-12 h-12 text-gray-200" />
            <p className="font-display text-gray-500 font-semibold">
              {search ? 'Nenhum produto encontrado' : 'Nenhum leilão ativo agora'}
            </p>
            <p className="text-gray-400 text-sm">
              {search ? 'Tente outra busca' : 'Volte em breve para novos leilões! 💕'}
            </p>
          </div>
        ) : (
          <>
            {filtered.length > 0 && (
              <div className="mb-6 relative rounded-2xl p-4 overflow-hidden shadow-sm border border-orange-200/50">
                {/* Background glow and sparks */}
                <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-red-50/50 to-orange-100 opacity-90" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-400/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-red-400/15 rounded-full blur-2xl" />
                
                <div className="relative z-10">
                  <h2 className="font-display font-bold text-orange-600 text-sm mb-3 flex items-center gap-1.5">
                    <span className="text-lg inline-block origin-bottom animate-[bounce_2s_infinite]">🔥</span>
                    Top {Math.min(3, filtered.length)} mais disputadas
                  </h2>
                  <div className="grid grid-cols-3 gap-2">
                    {filtered.slice(0, 3).map(p => <ProdutoCardCompacto key={p.id} produto={p} />)}
                  </div>
                </div>
              </div>
            )}
            
            {filtered.length > 3 && (
              <>
                <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">
                  Mais leilões ativos
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {filtered.slice(3).map(p => <ProdutoCard key={p.id} produto={p} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <FooterNav />
    </div>
  )
}
