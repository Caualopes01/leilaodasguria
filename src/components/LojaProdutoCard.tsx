'use client'

import Link from 'next/link'
import { LojaProduto } from '@/lib/loja-types'
import { formatCurrency } from '@/lib/utils'
import { calcularPercentualDesconto } from '@/lib/loja/precos'
import { Sparkles, ShoppingBag, Eye } from 'lucide-react'

interface LojaProdutoCardProps {
  produto: LojaProduto
  tenantSlug: string
}

export default function LojaProdutoCard({ produto, tenantSlug }: LojaProdutoCardProps) {
  const fotoPrincipal = produto.imagens?.[0] || '/placeholder.png'
  const temPromo =
    produto.preco_promocional != null &&
    produto.preco_promocional > 0 &&
    produto.preco_promocional < produto.preco
  const desconto = temPromo
    ? calcularPercentualDesconto(produto.preco, produto.preco_promocional)
    : null

  const linkDetalhe = `/loja/${tenantSlug}/shop/${produto.slug}`

  return (
    <Link
      href={linkDetalhe}
      className="group bg-white rounded-2xl border border-rosa-100/80 shadow-xs hover:shadow-md hover:border-rosa-300 transition-all duration-300 overflow-hidden flex flex-col"
    >
      {/* Imagem do Produto */}
      <div className="relative aspect-[3/4] bg-rosa-50/40 overflow-hidden">
        <img
          src={fotoPrincipal}
          alt={produto.titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Badge de Desconto */}
        {desconto && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-emerald-600 text-white text-[11px] font-black rounded-lg shadow-sm tracking-tight animate-fade-in">
            -{desconto}% OFF
          </span>
        )}

        {/* Badge de Destaque */}
        {produto.destaque && (
          <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Destaque
          </span>
        )}

        {/* Overlay hover em desktop */}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
          <span className="px-3.5 py-1.5 bg-white/90 backdrop-blur-xs text-gray-800 text-xs font-bold rounded-full shadow-md flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-rosa-600" /> Ver Detalhes
          </span>
        </div>
      </div>

      {/* Dados do Produto */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
        <div>
          {/* Categoria */}
          {produto.categoria?.nome && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-rosa-600 block mb-0.5">
              {produto.categoria.nome}
            </span>
          )}

          {/* Título */}
          <h3 className="font-semibold text-gray-900 text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-rosa-700 transition-colors">
            {produto.titulo}
          </h3>

          {/* Preços */}
          <div className="flex items-baseline gap-1.5 mt-2 flex-wrap">
            {temPromo ? (
              <>
                <span className="text-sm sm:text-base font-extrabold text-emerald-600">
                  {formatCurrency(produto.preco_promocional!)}
                </span>
                <span className="text-xs text-gray-400 line-through">
                  {formatCurrency(produto.preco)}
                </span>
              </>
            ) : (
              <span className="text-sm sm:text-base font-extrabold text-gray-900">
                {formatCurrency(produto.preco)}
              </span>
            )}
          </div>
        </div>

        {/* Tamanhos disponíveis */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="flex flex-wrap gap-1">
            {produto.tamanhos && produto.tamanhos.length > 0 ? (
              produto.tamanhos.slice(0, 4).map(tam => (
                <span
                  key={tam}
                  className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded"
                >
                  {tam}
                </span>
              ))
            ) : (
              <span className="text-[10px] text-gray-400 font-medium">Tamanho livre</span>
            )}
            {produto.tamanhos && produto.tamanhos.length > 4 && (
              <span className="text-[10px] text-gray-400 font-bold">
                +{produto.tamanhos.length - 4}
              </span>
            )}
          </div>

          <span className="w-7 h-7 rounded-lg bg-rosa-50 text-rosa-600 group-hover:bg-rosa-600 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
            <ShoppingBag className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </Link>
  )
}

