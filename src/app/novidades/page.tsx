'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, Produto } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Heart, Sparkles, Gavel } from 'lucide-react'
import FooterNav from '@/components/FooterNav'

function ProdutoCard({ produto }: { produto: Produto }) {
  // Simple view
  return (
    <Link href={`/leilao/${produto.slug}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-rosa-200 transition-all active:scale-[0.98] flex gap-4 p-4">
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
          <div className="absolute bottom-1 left-1 bg-green-500/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase shadow-sm">Novo</div>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 leading-snug">{produto.titulo}</h3>
          <div className="mt-2">
            <p className="text-xs text-gray-400">Valor inicial</p>
            <p className="font-display font-bold text-rosa-600 text-base leading-tight">
              {formatCurrency(produto.valor_inicial)}
            </p>
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
      .limit(15)
      
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
            <p className="text-xs text-gray-400 mb-4">Últimos {produtos.length} produtos adicionados</p>
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
