'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Sparkles, Plus, X, Tag, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase'
import { LojaProduto, LojaCategoria } from '@/lib/loja-types'
import { slugify, formatCurrency } from '@/lib/utils'
import { calcularPercentualDesconto } from '@/lib/loja/precos'
import ImageUploader from '@/components/ImageUploader'

interface LojaProdutoFormProps {
  produto?: LojaProduto
  tenantSlug: string
  tenantId?: string
  basePath?: string
}

const TAMANHOS_SUGERIDOS = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'Único', '34', '36', '38', '40', '42', '44', '46']

export default function LojaProdutoForm({
  produto,
  tenantSlug,
  tenantId: initialTenantId,
  basePath = `/loja/${tenantSlug}/admin/loja/produtos`,
}: LojaProdutoFormProps) {
  const isEditing = !!produto
  const router = useRouter()
  const supabase = createClient()

  const [tenantId, setTenantId] = useState<string | null>(initialTenantId || produto?.tenant_id || null)
  const [categorias, setCategorias] = useState<LojaCategoria[]>([])
  const [loadingCategorias, setLoadingCategorias] = useState(true)

  // Campos do formulário
  const [titulo, setTitulo] = useState(produto?.titulo || '')
  const [slug, setSlug] = useState(produto?.slug || '')
  const [slugManual, setSlugManual] = useState(false)
  const [descricao, setDescricao] = useState(produto?.descricao || '')
  const [categoriaId, setCategoriaId] = useState(produto?.categoria_id || '')
  const [preco, setPreco] = useState(produto?.preco ? String(produto.preco) : '')
  const [precoPromocional, setPrecoPromocional] = useState(
    produto?.preco_promocional ? String(produto.preco_promocional) : ''
  )
  const [tamanhos, setTamanhos] = useState<string[]>(produto?.tamanhos || [])
  const [novoTamanho, setNovoTamanho] = useState('')
  const [imagens, setImagens] = useState<string[]>(produto?.imagens || [])
  const [destaque, setDestaque] = useState(produto?.destaque ?? false)
  const [publicado, setPublicado] = useState(produto?.publicado ?? true)
  const [saving, setSaving] = useState(false)

  // Carregar Tenant ID se necessário e Categorias
  useEffect(() => {
    async function init() {
      setLoadingCategorias(true)
      let resolvedTenantId = tenantId

      if (!resolvedTenantId && tenantSlug) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', tenantSlug)
          .single()
        if (tenant) {
          resolvedTenantId = tenant.id
          setTenantId(tenant.id)
        }
      }

      if (resolvedTenantId) {
        const { data: cats } = await supabase
          .from('loja_categorias')
          .select('*')
          .eq('tenant_id', resolvedTenantId)
          .order('ordem', { ascending: true })
          .order('nome', { ascending: true })

        setCategorias(cats || [])
      }
      setLoadingCategorias(false)
    }

    init()
  }, [tenantSlug, tenantId])

  // Slug automático
  function handleTituloChange(value: string) {
    setTitulo(value)
    if (!slugManual && !isEditing) {
      setSlug(slugify(value))
    }
  }

  // Toggle de tamanho (adicionar/remover da lista)
  function toggleTamanho(tam: string) {
    if (tamanhos.includes(tam)) {
      setTamanhos(tamanhos.filter(t => t !== tam))
    } else {
      setTamanhos([...tamanhos, tam])
    }
  }

  // Adicionar tamanho customizado
  function handleAddCustomTamanho() {
    const limpo = novoTamanho.trim().toUpperCase()
    if (!limpo) return
    if (!tamanhos.includes(limpo)) {
      setTamanhos([...tamanhos, limpo])
    }
    setNovoTamanho('')
  }

  // Cálculos de desconto
  const numPreco = parseFloat(preco.replace(',', '.')) || 0
  const numPromo = precoPromocional.trim() ? parseFloat(precoPromocional.replace(',', '.')) : null
  const percentualDesconto = numPromo !== null ? calcularPercentualDesconto(numPreco, numPromo) : null
  const erroPromocional = numPromo !== null && numPromo >= numPreco && numPreco > 0

  async function handleSave() {
    if (!titulo.trim()) {
      toast.error('Informe o título do produto')
      return
    }

    if (!numPreco || numPreco <= 0) {
      toast.error('Informe um preço válido maior que zero')
      return
    }

    if (numPromo !== null) {
      if (numPromo <= 0) {
        toast.error('Preço promocional deve ser maior que zero')
        return
      }
      if (numPromo >= numPreco) {
        toast.error('O preço promocional deve ser menor que o preço original')
        return
      }
    }

    if (!imagens.length) {
      toast.error('Adicione ao menos uma imagem para o produto')
      return
    }

    if (!tenantId) {
      toast.error('Identificador da loja não localizado')
      return
    }

    setSaving(true)

    const finalSlug = slug.trim() || slugify(titulo) || `prod-${Date.now().toString(36)}`

    const payload: Partial<LojaProduto> = {
      tenant_id: tenantId,
      categoria_id: categoriaId || null,
      slug: finalSlug,
      titulo: titulo.trim(),
      descricao: descricao.trim() || null,
      preco: numPreco,
      preco_promocional: numPromo,
      tamanhos,
      imagens,
      destaque,
      publicado,
      atualizado_em: new Date().toISOString(),
    }

    try {
      let error: any = null

      if (isEditing) {
        const res = await supabase
          .from('loja_produtos')
          .update(payload)
          .eq('id', produto.id)
        error = res.error
      } else {
        const res = await supabase
          .from('loja_produtos')
          .insert({
            ...payload,
            criado_em: new Date().toISOString(),
          })
        error = res.error
      }

      if (error) {
        if (error.code === '23505') {
          toast.error('Já existe um produto com este slug. Altere o título ou o slug.')
        } else {
          toast.error('Erro ao salvar produto: ' + error.message)
        }
        setSaving(false)
        return
      }

      toast.success(isEditing ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!')
      router.refresh()
      router.push(basePath)
    } catch (err: any) {
      toast.error('Erro inesperado: ' + (err.message || 'Falha ao salvar'))
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl pb-16">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={basePath}
            className="p-2 rounded-xl hover:bg-rosa-50 text-gray-500 hover:text-rosa-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-800">
              {isEditing ? 'Editar Peça / Produto' : 'Cadastrar Nova Peça'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isEditing ? `Slug: /shop/${produto.slug}` : 'Adicione uma roupa ou produto ao catálogo da loja'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-rosa-600 hover:bg-rosa-700 disabled:opacity-50 text-white rounded-xl font-medium shadow-sm transition-all"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Salvar</span>
        </button>
      </div>

      {/* Imagens */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Fotos da Peça</h2>
            <p className="text-xs text-gray-500">Adicione até 10 fotos. A primeira será a foto principal.</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            {imagens.length}/10 fotos
          </span>
        </div>
        <ImageUploader imagens={imagens} setImagens={setImagens} bucket="produtos" maxFiles={10} />
      </div>

      {/* Informações Básicas */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-800">Informações Principais</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Título da Peça *
          </label>
          <input
            type="text"
            value={titulo}
            onChange={e => handleTituloChange(e.target.value)}
            placeholder="Ex: Vestido Midi Floral Farm"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Categoria
            </label>
            <select
              value={categoriaId}
              onChange={e => setCategoriaId(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all"
            >
              <option value="">Sem categoria definida</option>
              {categorias.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Slug da URL
            </label>
            <input
              type="text"
              value={slug}
              onChange={e => {
                setSlugManual(true)
                setSlug(slugify(e.target.value))
              }}
              placeholder="vestido-midi-floral"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-600 focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Descrição detalhada (tecido, caimento, detalhes)
          </label>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={4}
            placeholder="Ex: Vestido em viscose acetinada, com lastex nas costas e manga bufante. Não fica transparente..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all resize-none"
          />
        </div>
      </div>

      {/* Preços e Promoções */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-800">Preços & Promoções</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Preço Original (R$) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                placeholder="149.90"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Preço Promocional (R$) <span className="text-gray-400 font-normal">(Opcional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precoPromocional}
                onChange={e => setPrecoPromocional(e.target.value)}
                placeholder="99.90"
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-emerald-600 focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Feedback visual de desconto */}
        {percentualDesconto && numPromo && (
          <div className="p-3 bg-emerald-50 border border-emerald-200/60 rounded-xl flex items-center justify-between text-xs text-emerald-800">
            <span className="flex items-center gap-1.5 font-medium">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Selo promocional: {percentualDesconto}% OFF
            </span>
            <span className="font-semibold">
              Cliente economiza {formatCurrency(numPreco - numPromo)}
            </span>
          </div>
        )}

        {erroPromocional && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>O preço promocional deve ser menor que o preço original ({formatCurrency(numPreco)}).</span>
          </div>
        )}
      </div>

      {/* Tamanhos Disponíveis */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <div>
          <h2 className="font-semibold text-gray-800">Tamanhos Disponíveis</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Selecione os tamanhos em estoque para que a cliente possa escolher antes de comprar.
          </p>
        </div>

        {/* Chips sugeridos */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Sugestões Rápidas (clique para ativar/desativar)
          </label>
          <div className="flex flex-wrap gap-2">
            {TAMANHOS_SUGERIDOS.map(tam => {
              const ativo = tamanhos.includes(tam)
              return (
                <button
                  key={tam}
                  type="button"
                  onClick={() => toggleTamanho(tam)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    ativo
                      ? 'bg-rosa-600 text-white shadow-sm ring-2 ring-rosa-600/30'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tam}
                </button>
              )
            })}
          </div>
        </div>

        {/* Input para tamanho personalizado */}
        <div className="pt-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
            Outro Tamanho ou Numeração
          </label>
          <div className="flex gap-2 max-w-xs">
            <input
              type="text"
              value={novoTamanho}
              onChange={e => setNovoTamanho(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddCustomTamanho()
                }
              }}
              placeholder="Ex: 48, G1, Infantil..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs uppercase focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500"
            />
            <button
              type="button"
              onClick={handleAddCustomTamanho}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>
        </div>

        {/* Lista atual selecionada */}
        {tamanhos.length > 0 ? (
          <div className="pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 font-medium block mb-2">
              Tamanhos selecionados para este produto ({tamanhos.length}):
            </span>
            <div className="flex flex-wrap gap-1.5">
              {tamanhos.map(tam => (
                <span
                  key={tam}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-rosa-50 text-rosa-700 border border-rosa-200 text-xs font-bold rounded-lg"
                >
                  {tam}
                  <button
                    type="button"
                    onClick={() => toggleTamanho(tam)}
                    className="p-0.5 hover:text-rosa-900 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
            Nenhum tamanho selecionado. Se o produto não possuir variações de tamanho, pode deixar vazio.
          </div>
        )}
      </div>

      {/* Visibilidade e Destaque */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-gray-800">Visibilidade & Vitrine</h2>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-800">Publicado na Loja</p>
            <p className="text-xs text-gray-500">
              Quando desativado, o produto fica em modo rascunho e não aparece para as clientes.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPublicado(!publicado)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
              publicado ? 'bg-rosa-600' : 'bg-gray-200'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                publicado ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between py-2">
          <div>
            <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Produto em Destaque
            </p>
            <p className="text-xs text-gray-500">
              Aparece no topo da página inicial da loja no carrossel de destaques.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDestaque(!destaque)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out ${
              destaque ? 'bg-amber-500' : 'bg-gray-200'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                destaque ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Botão de Salvar Rodapé */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-rosa-600 hover:bg-rosa-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all text-sm"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isEditing ? 'Atualizar Peça' : 'Publicar Peça'}</span>
        </button>
      </div>
    </div>
  )
}
