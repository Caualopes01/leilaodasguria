'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { LojaProduto, LojaCategoria } from '@/lib/loja-types'
import { formatCurrency } from '@/lib/utils'
import { calcularPercentualDesconto } from '@/lib/loja/precos'
import {
  ShoppingBag,
  Plus,
  Search,
  Filter,
  ExternalLink,
  Edit,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Tag,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminLojaProdutosPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenant as string
  const supabase = createClient()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<LojaProduto[]>([])
  const [categorias, setCategorias] = useState<LojaCategoria[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas')
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'publicado' | 'rascunho' | 'destaque'>('todos')

  // Ações
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (tenantSlug) {
      loadInitialData()
    }
  }, [tenantSlug])

  async function loadInitialData() {
    setLoading(true)
    try {
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select('id, slug, nome')
        .eq('slug', tenantSlug)
        .single()

      if (tenantErr || !tenant) {
        toast.error('Loja não encontrada')
        setLoading(false)
        return
      }

      setTenantId(tenant.id)

      // Buscar categorias
      const { data: cats } = await supabase
        .from('loja_categorias')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('ordem', { ascending: true })

      setCategorias(cats || [])

      // Buscar produtos
      await fetchProdutos(tenant.id)
    } catch (err: any) {
      toast.error('Erro ao carregar catálogo: ' + (err.message || 'Erro inesperado'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchProdutos(tId: string) {
    const { data, error } = await supabase
      .from('loja_produtos')
      .select('*, categoria:loja_categorias(id, nome, slug)')
      .eq('tenant_id', tId)
      .order('criado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao listar produtos: ' + error.message)
      return
    }

    setProdutos(data || [])
  }

  // Toggle Publicado direto na listagem
  async function togglePublicado(produto: LojaProduto) {
    setUpdatingId(produto.id)
    const novoStatus = !produto.publicado
    const { error } = await supabase
      .from('loja_produtos')
      .update({ publicado: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', produto.id)

    if (error) {
      toast.error('Erro ao alterar status: ' + error.message)
    } else {
      setProdutos(prev =>
        prev.map(p => (p.id === produto.id ? { ...p, publicado: novoStatus } : p))
      )
      toast.success(novoStatus ? 'Produto publicado na loja!' : 'Produto salvo como rascunho.')
    }
    setUpdatingId(null)
  }

  // Toggle Destaque direto na listagem
  async function toggleDestaque(produto: LojaProduto) {
    setUpdatingId(produto.id)
    const novoDestaque = !produto.destaque
    const { error } = await supabase
      .from('loja_produtos')
      .update({ destaque: novoDestaque, atualizado_em: new Date().toISOString() })
      .eq('id', produto.id)

    if (error) {
      toast.error('Erro ao alterar destaque: ' + error.message)
    } else {
      setProdutos(prev =>
        prev.map(p => (p.id === produto.id ? { ...p, destaque: novoDestaque } : p))
      )
      toast.success(novoDestaque ? 'Produto colocado em destaque!' : 'Destaque removido.')
    }
    setUpdatingId(null)
  }

  // Excluir produto
  async function handleDelete(id: string, titulo: string) {
    if (!confirm(`Tem certeza que deseja apagar permanentemente "${titulo}"?`)) {
      return
    }

    setDeletingId(id)
    const { error } = await supabase
      .from('loja_produtos')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Erro ao excluir: ' + error.message)
    } else {
      setProdutos(prev => prev.filter(p => p.id !== id))
      toast.success('Produto excluído com sucesso!')
    }
    setDeletingId(null)
  }

  // Copiar link público da peça
  function copyProductLink(slug: string, id: string) {
    const url = `${window.location.origin}/loja/${tenantSlug}/shop/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    toast.success('Link do produto copiado!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  // Filtros aplicados
  const produtosFiltrados = produtos.filter(p => {
    // Busca textual
    if (busca.trim()) {
      const q = busca.toLowerCase().trim()
      const matchTitulo = p.titulo.toLowerCase().includes(q)
      const matchSlug = p.slug.toLowerCase().includes(q)
      if (!matchTitulo && !matchSlug) return false
    }

    // Filtro por Categoria
    if (categoriaFiltro !== 'todas') {
      if (p.categoria_id !== categoriaFiltro) return false
    }

    // Filtro por Status
    if (statusFiltro === 'publicado' && !p.publicado) return false
    if (statusFiltro === 'rascunho' && p.publicado) return false
    if (statusFiltro === 'destaque' && !p.destaque) return false

    return true
  })

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/loja/${tenantSlug}/admin`}
            className="p-2 rounded-xl hover:bg-rosa-50 text-gray-500 hover:text-rosa-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingBag className="w-6 h-6 text-rosa-600" />
              Catálogo de Roupas & Produtos
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Gerencie as peças à venda, fotos, tamanhos e preços promocionais
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href={`/loja/${tenantSlug}/shop`}
            target="_blank"
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Ver Vitrine</span>
          </Link>

          <Link
            href={`/loja/${tenantSlug}/admin/loja/produtos/novo`}
            className="flex items-center gap-2 px-4 py-2.5 bg-rosa-600 hover:bg-rosa-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Peça</span>
          </Link>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por título ou slug..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500"
            />
          </div>

          {/* Filtro por Categoria */}
          <div className="w-full md:w-56">
            <select
              value={categoriaFiltro}
              onChange={e => setCategoriaFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500"
            >
              <option value="todas">Todas as Categorias</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabs de Status */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setStatusFiltro('todos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFiltro === 'todos'
                ? 'bg-rosa-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todos ({produtos.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFiltro('publicado')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFiltro === 'publicado'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Publicados ({produtos.filter(p => p.publicado).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFiltro('rascunho')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFiltro === 'rascunho'
                ? 'bg-gray-800 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Rascunhos ({produtos.filter(p => !p.publicado).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFiltro('destaque')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1 ${
              statusFiltro === 'destaque'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Em Destaque ({produtos.filter(p => p.destaque).length})
          </button>
        </div>
      </div>

      {/* Listagem de Produtos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-8 h-8 text-rosa-500 animate-spin mb-3" />
          <p className="text-sm text-gray-500">Carregando catálogo de produtos...</p>
        </div>
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">Nenhum produto encontrado</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {busca || categoriaFiltro !== 'todas' || statusFiltro !== 'todos'
              ? 'Nenhum resultado corresponde aos filtros selecionados.'
              : 'Você ainda não cadastrou nenhuma peça na sua loja.'}
          </p>
          <Link
            href={`/loja/${tenantSlug}/admin/loja/produtos/novo`}
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-rosa-600 hover:bg-rosa-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Primeira Peça</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {produtosFiltrados.map(produto => {
            const foto = produto.imagens?.[0] || '/placeholder.png'
            const temPromo =
              produto.preco_promocional != null &&
              produto.preco_promocional > 0 &&
              produto.preco_promocional < produto.preco
            const desconto = temPromo
              ? calcularPercentualDesconto(produto.preco, produto.preco_promocional)
              : null

            return (
              <div
                key={produto.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
              >
                {/* Imagem & Badges */}
                <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden group">
                  <img
                    src={foto}
                    alt={produto.titulo}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badge de desconto */}
                  {desconto && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-emerald-600 text-white text-[11px] font-bold rounded-md shadow-sm">
                      -{desconto}% OFF
                    </span>
                  )}

                  {/* Badge de destaque */}
                  {produto.destaque && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-amber-500 text-white text-[11px] font-bold rounded-md shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Destaque
                    </span>
                  )}

                  {/* Quantidade de fotos */}
                  {produto.imagens?.length > 1 && (
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-medium rounded-full backdrop-blur-xs">
                      {produto.imagens.length} fotos
                    </span>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    {/* Categoria */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] font-semibold text-rosa-600 uppercase tracking-wider">
                        {produto.categoria?.nome || 'Geral'}
                      </span>
                    </div>

                    {/* Título */}
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                      {produto.titulo}
                    </h3>

                    {/* Preços */}
                    <div className="flex items-baseline gap-2 mt-2">
                      {temPromo ? (
                        <>
                          <span className="text-base font-bold text-emerald-600">
                            {formatCurrency(produto.preco_promocional!)}
                          </span>
                          <span className="text-xs text-gray-400 line-through">
                            {formatCurrency(produto.preco)}
                          </span>
                        </>
                      ) : (
                        <span className="text-base font-bold text-gray-900">
                          {formatCurrency(produto.preco)}
                        </span>
                      )}
                    </div>

                    {/* Tamanhos */}
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {produto.tamanhos && produto.tamanhos.length > 0 ? (
                        produto.tamanhos.map(t => (
                          <span
                            key={t}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded"
                          >
                            {t}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Tam. único / livre</span>
                      )}
                    </div>
                  </div>

                  {/* Rodapé do Card com Ações */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    {/* Toggle Publicado */}
                    <button
                      type="button"
                      onClick={() => togglePublicado(produto)}
                      disabled={updatingId === produto.id}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                        produto.publicado
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                      title={produto.publicado ? 'Clique para desativar' : 'Clique para publicar'}
                    >
                      {updatingId === produto.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : produto.publicado ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                      )}
                      <span>{produto.publicado ? 'Ativo' : 'Rascunho'}</span>
                    </button>

                    {/* Ações: Copiar Link, Editar, Excluir */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => copyProductLink(produto.slug, produto.id)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Copiar link público"
                      >
                        {copiedId === produto.id ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleDestaque(produto)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          produto.destaque
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-gray-400 hover:text-amber-500 hover:bg-gray-100'
                        }`}
                        title={produto.destaque ? 'Remover dos destaques' : 'Destacar no topo'}
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>

                      <Link
                        href={`/loja/${tenantSlug}/admin/loja/produtos/${produto.id}`}
                        className="p-1.5 text-gray-500 hover:text-rosa-600 hover:bg-rosa-50 rounded-lg transition-colors"
                        title="Editar peça"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDelete(produto.id, produto.titulo)}
                        disabled={deletingId === produto.id}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir peça"
                      >
                        {deletingId === produto.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
