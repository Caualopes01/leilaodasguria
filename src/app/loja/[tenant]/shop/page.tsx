'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { LojaProduto, LojaCategoria } from '@/lib/loja-types'
import { useCarrinho } from '@/lib/loja/useCarrinho'
import LojaProdutoCard from '@/components/LojaProdutoCard'
import TenantFooterNav from '@/components/TenantFooterNav'
import {
  ShoppingBag,
  Search,
  Sparkles,
  Gavel,
  Loader2,
  Heart,
  ChevronRight,
  X,
  Store,
} from 'lucide-react'
import { toast } from 'sonner'

export default function LojaVitrinePage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const supabase = createClient()
  const { totalItens } = useCarrinho()

  const [tenantNome, setTenantNome] = useState('')
  const [tenantLogo, setTenantLogo] = useState('')
  const [tenantSubtitulo, setTenantSubtitulo] = useState('Catálogo & Venda Direta')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<LojaProduto[]>([])
  const [categorias, setCategorias] = useState<LojaCategoria[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [categoriaAtiva, setCategoriaAtiva] = useState<string>('todas')

  useEffect(() => {
    if (tenantSlug) {
      carregarDados()
    }
  }, [tenantSlug])

  async function carregarDados() {
    setLoading(true)
    try {
      // 1. Tenant
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single()

      if (tenantErr || !tenant) {
        toast.error('Loja não encontrada')
        setLoading(false)
        return
      }

      setTenantId(tenant.id)
      setTenantNome(tenant.nome)
      if (tenant.logo_url) setTenantLogo(tenant.logo_url)
      if ((tenant as any).loja_subtitulo) setTenantSubtitulo((tenant as any).loja_subtitulo)

      // 2. Categorias
      const { data: cats } = await supabase
        .from('loja_categorias')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('ordem', { ascending: true })

      setCategorias(cats || [])

      // 3. Produtos publicados
      const { data: prods, error: prodsErr } = await supabase
        .from('loja_produtos')
        .select('*, categoria:loja_categorias(id, nome, slug)')
        .eq('tenant_id', tenant.id)
        .eq('publicado', true)
        .order('criado_em', { ascending: false })

      if (prodsErr) {
        toast.error('Erro ao listar catálogo')
      } else {
        setProdutos(prods || [])
      }
    } catch (err: any) {
      console.error('Erro ao carregar loja:', err)
      toast.error('Erro ao carregar loja')
    } finally {
      setLoading(false)
    }
  }

  // Filtragem
  const produtosFiltrados = produtos.filter(p => {
    if (categoriaAtiva !== 'todas' && p.categoria_id !== categoriaAtiva) {
      return false
    }

    if (busca.trim()) {
      const q = busca.toLowerCase().trim()
      const matchTitulo = p.titulo.toLowerCase().includes(q)
      const matchDesc = p.descricao?.toLowerCase().includes(q)
      if (!matchTitulo && !matchDesc) return false
    }

    return true
  })

  // Produtos em destaque
  const destaques = produtos.filter(p => p.destaque)

  return (
    <div className="min-h-screen bg-pink-50/20 pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-rosa-100 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          {/* Logo e Nome da Loja */}
          <Link
            href={`/loja/${tenantSlug}/shop`}
            className="flex items-center gap-2.5 min-w-0"
          >
            <div className="w-10 h-10 rounded-full bg-rosa-100 border border-rosa-200 flex items-center justify-center overflow-hidden shrink-0">
              {tenantLogo ? (
                <img src={tenantLogo} alt={tenantNome} className="w-full h-full object-cover" />
              ) : (
                <Heart className="w-5 h-5 text-rosa-600" fill="currentColor" />
              )}
            </div>
            <div className="min-w-0">
              <h1 className="font-display font-bold text-base text-gray-900 truncate leading-tight">
                {tenantNome || 'Leilão das Gurias'}
              </h1>
              <p className="text-[11px] font-semibold text-rosa-600 uppercase tracking-wider">
                {tenantSubtitulo || 'Catálogo & Venda Direta'}
              </p>
            </div>
          </Link>

          {/* Atalhos: Alternar para Leilões & Sacola */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/loja/${tenantSlug}/leiloes`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-rosa-50 hover:bg-rosa-100 text-rosa-700 text-xs font-bold rounded-xl border border-rosa-200/60 transition-colors"
            >
              <Gavel className="w-3.5 h-3.5" />
              <span>Ver Leilões</span>
            </Link>

            <Link
              href={`/loja/${tenantSlug}/shop/carrinho`}
              className="relative p-2.5 bg-rosa-600 hover:bg-rosa-700 text-white rounded-xl shadow-sm transition-transform active:scale-95 flex items-center justify-center"
              title="Ver sacola de compras"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItens > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-amber-400 text-gray-900 text-[10px] font-black rounded-full flex items-center justify-center shadow-md animate-bounce">
                  {totalItens}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Barra de Pesquisa */}
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar vestidos, blusas, calças..."
              className="w-full pl-10 pr-9 py-2 bg-gray-50/90 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all placeholder:text-gray-400"
            />
            {busca && (
              <button
                type="button"
                onClick={() => setBusca('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-6">
        {/* Banner Destaques (quando houver e não estiver buscando) */}
        {!busca && categoriaAtiva === 'todas' && destaques.length > 0 && (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-gray-900 text-sm sm:text-base flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Destaques da Semana
              </h2>
              <span className="text-xs text-rosa-600 font-semibold">Peças selecionadas</span>
            </div>

            {/* Carrossel Horizontal Deslizável */}
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
              {destaques.map(prod => (
                <div key={prod.id} className="w-44 sm:w-52 shrink-0 snap-start">
                  <LojaProdutoCard produto={prod} tenantSlug={tenantSlug} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Barra de Filtro de Categorias */}
        <section className="space-y-2">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setCategoriaAtiva('todas')}
              className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                categoriaAtiva === 'todas'
                  ? 'bg-rosa-600 text-white shadow-sm shadow-rosa-300'
                  : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50'
              }`}
            >
              Todas as Peças ({produtos.length})
            </button>

            {categorias.map(cat => {
              const count = produtos.filter(p => p.categoria_id === cat.id).length
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                    categoriaAtiva === cat.id
                      ? 'bg-rosa-600 text-white shadow-sm shadow-rosa-300'
                      : 'bg-white text-gray-600 border border-gray-200/80 hover:bg-gray-50'
                  }`}
                >
                  {cat.nome} {count > 0 && `(${count})`}
                </button>
              )
            })}
          </div>
        </section>

        {/* Vitrine de Produtos */}
        <section className="space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'peça encontrada' : 'peças encontradas'}
            </span>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border border-rosa-100 shadow-xs">
              <Loader2 className="w-8 h-8 text-rosa-500 animate-spin mb-3" />
              <p className="text-xs sm:text-sm font-medium text-gray-500">
                Carregando vitrine de roupas...
              </p>
            </div>
          ) : produtosFiltrados.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-rosa-100 p-8 shadow-xs space-y-3">
              <ShoppingBag className="w-12 h-12 text-rosa-200 mx-auto" />
              <h3 className="text-base font-bold text-gray-800">Nenhuma peça encontrada</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                {busca || categoriaAtiva !== 'todas'
                  ? 'Não encontramos produtos com os filtros selecionados.'
                  : 'Nossa loja está preparando novas coleções incríveis para você. Volte logo!'}
              </p>
              {(busca || categoriaAtiva !== 'todas') && (
                <button
                  type="button"
                  onClick={() => {
                    setBusca('')
                    setCategoriaAtiva('todas')
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-rosa-50 hover:bg-rosa-100 text-rosa-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {produtosFiltrados.map(produto => (
                <LojaProdutoCard
                  key={produto.id}
                  produto={produto}
                  tenantSlug={tenantSlug}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Barra de Navegação Inferior (Mobile/Desktop) */}
      <TenantFooterNav />
    </div>
  )
}
