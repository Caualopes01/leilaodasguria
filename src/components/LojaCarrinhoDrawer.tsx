'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCarrinho } from '@/lib/loja/useCarrinho'
import { formatCurrency } from '@/lib/utils'
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Sparkles,
  Check,
  ShieldCheck,
} from 'lucide-react'

interface LojaCarrinhoDrawerProps {
  aberto: boolean
  onFechar: () => void
  tenantSlug: string
  ultimoItemAdicionado?: {
    titulo: string
    tamanho?: string | null
    preco: number
    imagem?: string | null
    quantidade: number
  } | null
}

export default function LojaCarrinhoDrawer({
  aberto,
  onFechar,
  tenantSlug,
  ultimoItemAdicionado,
}: LojaCarrinhoDrawerProps) {
  const router = useRouter()
  const {
    itens,
    totalItens,
    totalValor,
    atualizarQuantidade,
    removerItem,
  } = useCarrinho()

  // Bloquear scroll do body quando o drawer estiver aberto
  useEffect(() => {
    if (aberto) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [aberto])

  // Fechar no ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && aberto) {
        onFechar()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [aberto, onFechar])

  if (!aberto) return null

  function handleIrParaCarrinho() {
    onFechar()
    router.push(`/loja/${tenantSlug}/shop/carrinho`)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop escuro com blur */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onFechar}
      />

      {/* Painel Lateral estilo E-commerce */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300">
        {/* Top Header do Drawer */}
        <div className="p-4 sm:p-5 border-b border-rosa-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-rosa-100 flex items-center justify-center text-rosa-600">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-gray-900">
                  Sua Sacola
                </h2>
                <span className="px-2 py-0.5 bg-rosa-100 text-rosa-700 text-xs font-bold rounded-full">
                  {totalItens} {totalItens === 1 ? 'peça' : 'peças'}
                </span>
              </div>
              <p className="text-[11px] text-gray-500">Pronta para finalizar</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFechar}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Fechar sacola"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notificação de Peça Adicionada Recentemente */}
        {ultimoItemAdicionado && (
          <div className="mx-4 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 stroke-[3]" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                Adicionada à sacola!
              </span>
              <p className="text-xs font-medium text-emerald-950 truncate">
                {ultimoItemAdicionado.quantidade}x {ultimoItemAdicionado.titulo}
                {ultimoItemAdicionado.tamanho ? ` (Tam. ${ultimoItemAdicionado.tamanho})` : ''}
              </p>
            </div>
          </div>
        )}

        {/* Lista de Itens da Sacola */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 divide-y divide-gray-100">
          {itens.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-rosa-50 text-rosa-400 flex items-center justify-center">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-gray-800 text-base">Sua sacola está vazia</h3>
              <p className="text-xs text-gray-500 max-w-xs">
                Explore as peças lindas disponíveis no catálogo e adicione suas favoritas aqui!
              </p>
              <button
                type="button"
                onClick={onFechar}
                className="mt-2 px-5 py-2.5 bg-rosa-600 hover:bg-rosa-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
              >
                Ver Catálogo de Roupas
              </button>
            </div>
          ) : (
            itens.map(item => {
              const subtotal = item.precoUnitario * item.quantidade
              return (
                <div key={item.produtoId + (item.tamanho || '')} className="pt-3.5 first:pt-0 flex gap-3">
                  {/* Foto miniatura */}
                  <div className="w-16 h-16 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imagem ? (
                      <img src={item.imagem} alt={item.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-6 h-6 text-gray-300" />
                    )}
                  </div>

                  {/* Informações */}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                      {item.titulo}
                    </h4>

                    <div className="flex items-center gap-2 mt-1">
                      {item.tamanho && (
                        <span className="px-2 py-0.5 bg-rosa-100 text-rosa-700 text-[10px] font-bold rounded-md">
                          Tam: {item.tamanho}
                        </span>
                      )}
                      <span className="text-xs font-black text-rosa-600">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>

                    {/* Controles de Quantidade */}
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50">
                        <button
                          type="button"
                          onClick={() => atualizarQuantidade(item.produtoId, item.tamanho, item.quantidade - 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-rosa-600 transition-colors"
                          title="Diminuir"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-bold text-gray-900">
                          {item.quantidade}
                        </span>
                        <button
                          type="button"
                          onClick={() => atualizarQuantidade(item.produtoId, item.tamanho, item.quantidade + 1)}
                          className="w-7 h-7 flex items-center justify-center text-gray-600 hover:text-rosa-600 transition-colors"
                          title="Aumentar"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removerItem(item.produtoId, item.tamanho)}
                        className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                        title="Remover peça"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Rodapé do Drawer com Total e Ação */}
        {itens.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-rosa-100 bg-gray-50/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Subtotal
              </span>
              <span className="text-xl font-black text-gray-900 font-display">
                {formatCurrency(totalValor)}
              </span>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleIrParaCarrinho}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-700/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Finalizar Pedido</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onFechar}
                className="w-full py-2.5 bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-colors"
              >
                Continuar Comprando
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 text-center pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Pedido enviado diretamente para o WhatsApp da loja</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

