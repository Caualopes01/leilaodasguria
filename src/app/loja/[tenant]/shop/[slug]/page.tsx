'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { LojaProduto } from '@/lib/loja-types'
import { useCarrinho } from '@/lib/loja/useCarrinho'
import { formatCurrency } from '@/lib/utils'
import { calcularPercentualDesconto, obterPrecoFinal } from '@/lib/loja/precos'
import {
  ArrowLeft,
  ShoppingBag,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Check,
  AlertCircle,
  Share2,
  Loader2,
  Heart,
} from 'lucide-react'
import { toast } from 'sonner'

export default function LojaProdutoDetalhePage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenant as string
  const produtoSlug = params.slug as string
  const supabase = createClient()
  const { adicionarItem, totalItens } = useCarrinho()

  const [produto, setProduto] = useState<LojaProduto | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Estados de seleção
  const [imagemAtiva, setImagemAtiva] = useState(0)
  const [tamanhoSelecionado, setTamanhoSelecionado] = useState<string | null>(null)
  const [quantidade, setQuantidade] = useState(1)
  const [adicionando, setAdicionando] = useState(false)

  useEffect(() => {
    if (tenantSlug && produtoSlug) {
      carregarProduto()
    }
  }, [tenantSlug, produtoSlug])

  async function carregarProduto() {
    setLoading(true)
    setErro(null)
    try {
      // 1. Obter tenant
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select('id, nome, slug')
        .eq('slug', tenantSlug)
        .single()

      if (tenantErr || !tenant) {
        setErro('Loja não encontrada.')
        setLoading(false)
        return
      }

      // 2. Obter produto pelo slug
      const { data: prod, error: prodErr } = await supabase
        .from('loja_produtos')
        .select('*, categoria:loja_categorias(id, nome, slug)')
        .eq('tenant_id', tenant.id)
        .eq('slug', produtoSlug)
        .eq('publicado', true)
        .single()

      if (prodErr || !prod) {
        setErro('Peça não encontrada ou indisponível no momento.')
      } else {
        setProduto(prod)
        // Se tiver apenas 1 tamanho (ex: Único), pré-selecionar
        if (prod.tamanhos && prod.tamanhos.length === 1) {
          setTamanhoSelecionado(prod.tamanhos[0])
        }
      }
    } catch (err: any) {
      setErro('Erro ao carregar produto.')
    } finally {
      setLoading(false)
    }
  }

  function handleCompartilhar() {
    if (navigator.share) {
      navigator.share({
        title: produto?.titulo || 'Olha essa peça!',
        url: window.location.href,
      }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success('Link copiado para a área de transferência!')
    }
  }

  function handleAdicionarSacola() {
    if (!produto) return

    // Se o produto tiver lista de tamanhos, exigir a escolha
    const temOpcoesTamanho = produto.tamanhos && produto.tamanhos.length > 0
    if (temOpcoesTamanho && !tamanhoSelecionado) {
      toast.error('Por favor, selecione um tamanho antes de adicionar à sacola!')
      return
    }

    setAdicionando(true)

    const precoFinal = obterPrecoFinal(produto.preco, produto.preco_promocional)

    adicionarItem({
      produtoId: produto.id,
      slug: produto.slug,
      titulo: produto.titulo,
      precoUnitario: precoFinal,
      imagem: produto.imagens?.[0] || null,
      tamanho: tamanhoSelecionado,
      quantidade,
    })

    toast.success(`${quantidade}x "${produto.titulo}" adicionado à sacola!`, {
      action: {
        label: 'Ver Sacola 🛍️',
        onClick: () => router.push(`/loja/${tenantSlug}/shop/carrinho`),
      },
    })

    setTimeout(() => setAdicionando(false), 500)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50/20 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-9 h-9 text-rosa-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">Carregando detalhes da peça...</p>
      </div>
    )
  }

  if (erro || !produto) {
    return (
      <div className="min-h-screen bg-pink-50/20 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-3" />
        <h2 className="text-lg font-bold text-gray-800">Peça não encontrada</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-sm mb-6">
          {erro || 'Este produto não está mais disponível no catálogo.'}
        </p>
        <Link
          href={`/loja/${tenantSlug}/shop`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rosa-600 hover:bg-rosa-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para a Loja</span>
        </Link>
      </div>
    )
  }

  const fotos = produto.imagens && produto.imagens.length > 0 ? produto.imagens : ['/placeholder.png']
  const temPromo =
    produto.preco_promocional != null &&
    produto.preco_promocional > 0 &&
    produto.preco_promocional < produto.preco
  const desconto = temPromo
    ? calcularPercentualDesconto(produto.preco, produto.preco_promocional)
    : null
  const precoFinal = obterPrecoFinal(produto.preco, produto.preco_promocional)

  return (
    <div className="min-h-screen bg-pink-50/20 pb-36">
      {/* Top Bar de Navegação */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-rosa-100 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/loja/${tenantSlug}/shop`}
            className="p-2 -ml-2 rounded-xl text-gray-600 hover:text-rosa-600 hover:bg-rosa-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider truncate max-w-[200px]">
            {produto.categoria?.nome || 'Loja de Roupas'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCompartilhar}
              className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Compartilhar"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <Link
              href={`/loja/${tenantSlug}/shop/carrinho`}
              className="relative p-2 rounded-xl text-rosa-600 hover:bg-rosa-50 transition-colors"
              title="Ver sacola"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItens > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-rosa-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {totalItens}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-3xl mx-auto px-4 pt-4 space-y-6">
        {/* Galeria de Fotos */}
        <div className="bg-white rounded-3xl border border-rosa-100/80 shadow-xs overflow-hidden">
          {/* Foto Principal */}
          <div className="relative aspect-[3/4] bg-rosa-50/30 overflow-hidden">
            <img
              src={fotos[imagemAtiva]}
              alt={produto.titulo}
              className="w-full h-full object-cover select-none transition-all duration-300"
            />

            {/* Badges Flutuantes */}
            {desconto && (
              <span className="absolute top-3.5 left-3.5 px-3 py-1 bg-emerald-600 text-white text-xs font-black rounded-xl shadow-md">
                -{desconto}% OFF
              </span>
            )}

            {produto.destaque && (
              <span className="absolute top-3.5 right-3.5 px-2.5 py-1 bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Destaque
              </span>
            )}

            {/* Controles de Navegação de Imagens */}
            {fotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setImagemAtiva(i => Math.max(0, i - 1))}
                  disabled={imagemAtiva === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-xs disabled:opacity-20 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setImagemAtiva(i => Math.min(fotos.length - 1, i + 1))}
                  disabled={imagemAtiva === fotos.length - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-xs disabled:opacity-20 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/60 text-white text-xs font-semibold rounded-full backdrop-blur-xs">
                  {imagemAtiva + 1} / {fotos.length}
                </div>
              </>
            )}
          </div>

          {/* Miniaturas de Fotos */}
          {fotos.length > 1 && (
            <div className="p-3 flex gap-2 overflow-x-auto border-t border-gray-100 scrollbar-none">
              {fotos.map((img, idx) => (
                <button
                  key={img + idx}
                  type="button"
                  onClick={() => setImagemAtiva(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                    imagemAtiva === idx ? 'border-rosa-600 ring-2 ring-rosa-200' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Informações da Peça */}
        <div className="bg-white rounded-3xl border border-rosa-100/80 p-5 sm:p-6 shadow-xs space-y-5">
          <div>
            {produto.categoria?.nome && (
              <span className="text-xs font-bold text-rosa-600 uppercase tracking-wider block mb-1">
                {produto.categoria.nome}
              </span>
            )}
            <h1 className="font-display font-bold text-xl sm:text-2xl text-gray-900 leading-snug">
              {produto.titulo}
            </h1>

            {/* Preços */}
            <div className="flex items-baseline gap-3 mt-3 flex-wrap">
              <span className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                {formatCurrency(precoFinal)}
              </span>

              {temPromo && (
                <>
                  <span className="text-base text-gray-400 line-through">
                    {formatCurrency(produto.preco)}
                  </span>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg border border-emerald-200">
                    Economia de {formatCurrency(produto.preco - produto.preco_promocional!)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Seletor de Tamanhos */}
          {produto.tamanhos && produto.tamanhos.length > 0 && (
            <div className="pt-4 border-t border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Tamanho {tamanhoSelecionado ? `(Selecionado: ${tamanhoSelecionado})` : '*'}
                </label>
                {!tamanhoSelecionado && (
                  <span className="text-[11px] text-rosa-600 font-semibold">
                    Escolha um tamanho
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {produto.tamanhos.map(tam => {
                  const selecionado = tamanhoSelecionado === tam
                  return (
                    <button
                      key={tam}
                      type="button"
                      onClick={() => setTamanhoSelecionado(tam)}
                      className={`min-w-12 h-11 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        selecionado
                          ? 'bg-rosa-600 text-white shadow-md shadow-rosa-300 ring-2 ring-rosa-400'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {selecionado && <Check className="w-3.5 h-3.5" />}
                      <span>{tam}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Seletor de Quantidade */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Quantidade
            </span>

            <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50/80 p-1">
              <button
                type="button"
                onClick={() => setQuantidade(q => Math.max(1, q - 1))}
                disabled={quantidade <= 1}
                className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-gray-600 hover:text-rosa-600 disabled:opacity-40 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-bold text-sm text-gray-900">
                {quantidade}
              </span>
              <button
                type="button"
                onClick={() => setQuantidade(q => Math.min(20, q + 1))}
                disabled={quantidade >= 20}
                className="w-8 h-8 rounded-lg bg-white shadow-xs flex items-center justify-center text-gray-600 hover:text-rosa-600 disabled:opacity-40 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Descrição Detalhada */}
          {produto.descricao && (
            <div className="pt-4 border-t border-gray-100 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Detalhes & Tecido
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {produto.descricao}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Barra Fixa Inferior: Subtotal & Botão Adicionar à Sacola */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-rosa-100 p-3.5 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              Subtotal ({quantidade}x)
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-gray-900">
              {formatCurrency(precoFinal * quantidade)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAdicionarSacola}
            disabled={adicionando}
            className="flex-1 sm:flex-initial sm:px-10 py-3.5 bg-rosa-600 hover:bg-rosa-700 active:scale-98 disabled:opacity-60 text-white rounded-2xl font-bold text-sm shadow-md shadow-rosa-300 transition-all flex items-center justify-center gap-2"
          >
            {adicionando ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ShoppingBag className="w-4 h-4" />
            )}
            <span>Adicionar à Sacola</span>
          </button>
        </div>
      </div>
    </div>
  )
}
