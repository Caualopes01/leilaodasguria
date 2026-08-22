'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, Produto } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Heart, Sparkles, Gavel, Clock, ChevronRight } from 'lucide-react'
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

function ProdutoCard({ produto }: { produto: Produto }) {
  const timer = useCountdownShort(produto.fim_em)
  
  return (
    <Link href={`/leilao/${produto.slug}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-rosa-200 transition-all active:scale-[0.98] p-4 flex flex-col gap-3">
        <div className="flex gap-4">
          {/* Imagem */}
          <div className="w-24 h-24 rounded-xl bg-rosa-50 overflow-hidden flex-shrink-0 relative">
            {produto.imagens && produto.imagens.length > 0 ? (
              <img
                src={produto.imagens[0]}
                alt={produto.titulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🛍️</div>
            )}
            <div className="absolute top-1 left-1 bg-green-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-sm">Novo</div>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 leading-snug">{produto.titulo}</h3>
              {produto.descricao && (
                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">{produto.descricao}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <Clock className="w-3.5 h-3.5 text-rosa-500" />
              <span className="text-xs font-semibold text-gray-600">{timer}</span>
            </div>
          </div>
        </div>
        
        {/* Footer Card */}
        <div className="flex items-center justify-between border-t border-gray-50 pt-3">
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Valor Inicial</p>
            <p className="font-display font-bold text-rosa-600 text-lg leading-tight">
              {formatCurrency(produto.valor_inicial)}
            </p>
          </div>
          <div className="flex items-center justify-center bg-rosa-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm gap-1 hover:bg-rosa-700 transition-colors">
            Ver Mais <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function NovidadesPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Zera notificações ao abrir a tela de novidades
  useEffect(() => {
    localStorage.setItem('leilao_notif_count', '0')
    window.dispatchEvent(new Event('leilao_notif_update'))
    loadProdutos()
  }, [])

  async function loadProdutos() {
    // Busca os produtos mais recentes que estão ativos ou aguardando
    const { data } = await supabase
      .from('produtos')
      .select('*')
      .in('status', ['ativo', 'aguardando'])
      .order('criado_em', { ascending: false })
      .limit(5)
      
    setProdutos(data || [])
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-rosa-100 px-4 py-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rosa-500" fill="currentColor" />
          <span className="font-display font-bold text-rosa-600">Leilão das Gurias</span>
        </div>
        <h1 className="font-display text-xl font-bold text-gray-900 mt-1 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          Novidades
        </h1>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Heart className="w-8 h-8 text-rosa-300 animate-pulse" fill="currentColor" />
            <p className="text-gray-400 text-sm">Buscando novidades...</p>
          </div>
        ) : produtos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
            <Gavel className="w-12 h-12 text-gray-200" />
            <p className="font-display text-gray-500 font-semibold">Nenhuma novidade por enquanto</p>
            <p className="text-gray-400 text-sm">Fique de olho que logo teremos novos leilões!</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 mb-4">Últimas {produtos.length} novidades adicionadas</p>
            {produtos.map(produto => (
              <ProdutoCard key={produto.id} produto={produto} />
            ))}
          </div>
        )}
      </div>

      <FooterNav />
    </div>
  )
}
