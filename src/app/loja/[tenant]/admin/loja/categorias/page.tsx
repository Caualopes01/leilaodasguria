'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { LojaCategoria } from '@/lib/loja-types'
import { slugify } from '@/lib/utils'
import {
  FolderTree,
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  Tag,
  ArrowLeft,
  RefreshCw,
  Layers,
} from 'lucide-react'
import { toast } from 'sonner'

export default function AdminLojaCategoriasPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const supabase = createClient()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [categorias, setCategorias] = useState<LojaCategoria[]>([])
  const [loading, setLoading] = useState(true)

  // Novo item
  const [novoNome, setNovoNome] = useState('')
  const [novoSlug, setNovoSlug] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [creating, setCreating] = useState(false)

  // Edição inline
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingNome, setEditingNome] = useState('')
  const [editingSlug, setEditingSlug] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Ações de ordenação / exclusão
  const [reordering, setReordering] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (tenantSlug) {
      loadInitialData()
    }
  }, [tenantSlug])

  async function loadInitialData() {
    setLoading(true)
    try {
      // 1. Obter tenant_id pelo slug
      const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .select('id, nome, slug')
        .eq('slug', tenantSlug)
        .single()

      if (tenantErr || !tenant) {
        toast.error('Loja não encontrada.')
        setLoading(false)
        return
      }

      setTenantId(tenant.id)
      await fetchCategorias(tenant.id)
    } catch (err: any) {
      toast.error('Erro ao carregar dados da loja: ' + (err.message || 'Erro inesperado'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchCategorias(tId: string) {
    const { data, error } = await supabase
      .from('loja_categorias')
      .select('*')
      .eq('tenant_id', tId)
      .order('ordem', { ascending: true })
      .order('criado_em', { ascending: true })

    if (error) {
      toast.error('Erro ao carregar categorias: ' + error.message)
      return
    }

    setCategorias(data || [])
  }

  // Atualizar slug automaticamente conforme digita o nome
  function handleNomeChange(value: string) {
    setNovoNome(value)
    if (!slugManual) {
      setNovoSlug(slugify(value))
    }
  }

  function handleSlugChange(value: string) {
    setSlugManual(true)
    setNovoSlug(slugify(value))
  }

  function handleResetSlugAuto() {
    setSlugManual(false)
    setNovoSlug(slugify(novoNome))
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId) {
      toast.error('Identificador da loja não disponível.')
      return
    }

    const nome = novoNome.trim()
    const slug = (novoSlug.trim() || slugify(nome)).trim()

    if (!nome) {
      toast.error('Informe o nome da categoria.')
      return
    }

    if (!slug) {
      toast.error('Informe um slug válido para a categoria.')
      return
    }

    // Validação local de duplicidade de slug
    if (categorias.some(c => c.slug.toLowerCase() === slug.toLowerCase())) {
      toast.error(`Já existe uma categoria com o slug "${slug}".`)
      return
    }

    // Calcula a próxima ordem
    const maxOrdem = categorias.length > 0 ? Math.max(...categorias.map(c => c.ordem ?? 0)) : -1
    const nextOrdem = maxOrdem + 1

    setCreating(true)

    try {
      const { data, error } = await supabase
        .from('loja_categorias')
        .insert({
          tenant_id: tenantId,
          nome,
          slug,
          ordem: nextOrdem,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          toast.error(`O slug "${slug}" já está em uso nesta loja.`)
        } else {
          toast.error('Erro ao criar categoria: ' + error.message)
        }
        return
      }

      if (data) {
        setCategorias(prev => [...prev, data as LojaCategoria])
        setNovoNome('')
        setNovoSlug('')
        setSlugManual(false)
        toast.success(`Categoria "${nome}" adicionada com sucesso!`)
      }
    } catch (err: any) {
      toast.error('Erro inesperado ao criar categoria.')
    } finally {
      setCreating(false)
    }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    if (!tenantId) return
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= categorias.length) return

    const currentItem = categorias[index]
    const targetItem = categorias[targetIndex]

    setReordering(currentItem.id)

    // Reordenação otimista na memória com índices normalizados
    const updated = [...categorias]
    updated[index] = targetItem
    updated[targetIndex] = currentItem

    const normalized = updated.map((cat, idx) => ({ ...cat, ordem: idx }))
    const previousState = [...categorias]
    setCategorias(normalized)

    try {
      // Salva no banco as ordens trocadas
      const [resA, resB] = await Promise.all([
        supabase
          .from('loja_categorias')
          .update({ ordem: targetIndex })
          .eq('id', currentItem.id),
        supabase
          .from('loja_categorias')
          .update({ ordem: index })
          .eq('id', targetItem.id),
      ])

      if (resA.error || resB.error) {
        throw new Error(resA.error?.message || resB.error?.message)
      }

      toast.success('Ordem das categorias atualizada!')
    } catch (err: any) {
      // Reverte em caso de erro
      setCategorias(previousState)
      toast.error('Erro ao atualizar ordem: ' + (err.message || 'Erro inesperado'))
    } finally {
      setReordering(null)
    }
  }

  function handleStartEdit(cat: LojaCategoria) {
    setEditingId(cat.id)
    setEditingNome(cat.nome)
    setEditingSlug(cat.slug)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditingNome('')
    setEditingSlug('')
  }

  async function handleSaveEdit(id: string) {
    const nome = editingNome.trim()
    const slug = (editingSlug.trim() || slugify(nome)).trim()

    if (!nome) {
      toast.error('O nome da categoria não pode ficar vazio.')
      return
    }

    if (!slug) {
      toast.error('O slug da categoria não pode ficar vazio.')
      return
    }

    // Verifica se outro item já possui o mesmo slug
    if (categorias.some(c => c.id !== id && c.slug.toLowerCase() === slug.toLowerCase())) {
      toast.error(`Outra categoria já utiliza o slug "${slug}".`)
      return
    }

    setSavingEdit(true)

    try {
      const { error } = await supabase
        .from('loja_categorias')
        .update({ nome, slug })
        .eq('id', id)

      if (error) {
        if (error.code === '23505') {
          toast.error(`O slug "${slug}" já está em uso nesta loja.`)
        } else {
          toast.error('Erro ao atualizar categoria: ' + error.message)
        }
        return
      }

      setCategorias(prev =>
        prev.map(c => (c.id === id ? { ...c, nome, slug } : c))
      )
      toast.success('Categoria atualizada com sucesso!')
      handleCancelEdit()
    } catch (err: any) {
      toast.error('Erro ao salvar edição da categoria.')
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleDelete(id: string, nome: string) {
    const confirmed = window.confirm(
      `Tem certeza que deseja apagar a categoria "${nome}"?\n\nProdutos vinculados a ela não serão excluídos, mas ficarão sem categoria na loja.`
    )
    if (!confirmed) return

    setDeletingId(id)

    try {
      const { error } = await supabase
        .from('loja_categorias')
        .delete()
        .eq('id', id)

      if (error) {
        toast.error('Erro ao apagar categoria: ' + error.message)
        return
      }

      setCategorias(prev => prev.filter(c => c.id !== id))
      toast.success(`Categoria "${nome}" removida com sucesso!`)
    } catch (err: any) {
      toast.error('Erro inesperado ao excluir categoria.')
    } finally {
      setDeletingId(null)
    }
  }

  const basePath = `/loja/${tenantSlug}/admin`

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Carregando categorias...</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header com Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={basePath}
              className="text-xs font-medium text-gray-500 hover:text-rosa-600 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar ao painel
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-800">
              Categorias da Loja
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rosa-50 text-rosa-700 border border-rosa-100">
              <Layers className="w-3.5 h-3.5" />
              {categorias.length} {categorias.length === 1 ? 'categoria' : 'categorias'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Defina as categorias para organizar os produtos à pronta-entrega na sua vitrine.
          </p>
        </div>

        <button
          onClick={() => tenantId && fetchCategorias(tenantId)}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          title="Recarregar categorias"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Formulário: Nova Categoria (1 Coluna) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <div className="w-8 h-8 rounded-xl bg-rosa-50 flex items-center justify-center text-rosa-600">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800 text-base">Nova Categoria</h2>
              <p className="text-xs text-gray-400">Adicione uma nova divisão para a loja</p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label htmlFor="cat-nome" className="block text-xs font-semibold text-gray-700 mb-1.5">
                Nome da Categoria *
              </label>
              <input
                id="cat-nome"
                type="text"
                placeholder="Ex: Vestidos, Blusas, Acessórios..."
                value={novoNome}
                onChange={e => handleNomeChange(e.target.value)}
                disabled={creating}
                className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-rosa-600 focus:border-transparent outline-none transition-all placeholder:text-gray-400 disabled:opacity-60"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="cat-slug" className="block text-xs font-semibold text-gray-700">
                  Slug (URL amigável) *
                </label>
                {slugManual && (
                  <button
                    type="button"
                    onClick={handleResetSlugAuto}
                    className="text-[11px] text-rosa-600 hover:underline"
                  >
                    Resetar auto
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono">
                  /
                </span>
                <input
                  id="cat-slug"
                  type="text"
                  placeholder="vestidos"
                  value={novoSlug}
                  onChange={e => handleSlugChange(e.target.value)}
                  disabled={creating}
                  className="w-full pl-6 pr-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-mono bg-gray-50 focus:bg-white focus:ring-2 focus:ring-rosa-600 focus:border-transparent outline-none transition-all placeholder:text-gray-400 disabled:opacity-60 text-gray-700"
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Usado na URL de filtro da vitrine: <span className="font-mono text-gray-500">?categoria={novoSlug || 'slug'}</span>
              </p>
            </div>

            <button
              type="submit"
              disabled={creating || !novoNome.trim()}
              className="w-full flex items-center justify-center gap-2 bg-rosa-600 hover:bg-rosa-700 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-rosa-200 mt-2"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Criar Categoria
                </>
              )}
            </button>
          </form>
        </div>

        {/* Listagem de Categorias (2 Colunas) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500">
                  <FolderTree className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-800 text-base">Categorias Cadastradas</h2>
                  <p className="text-xs text-gray-400">
                    Use as setas para definir a ordem de exibição na vitrine
                  </p>
                </div>
              </div>
            </div>

            {categorias.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <div className="w-12 h-12 rounded-2xl bg-rosa-50 text-rosa-600 flex items-center justify-center mx-auto mb-3">
                  <Tag className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-gray-700 mb-1">Nenhuma categoria cadastrada</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Crie sua primeira categoria no formulário ao lado para começar a classificar os produtos da sua loja.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {categorias.map((categoria, index) => {
                  const isEditing = editingId === categoria.id
                  const isDeleting = deletingId === categoria.id
                  const isMoving = reordering === categoria.id
                  const isFirst = index === 0
                  const isLast = index === categorias.length - 1

                  if (isEditing) {
                    return (
                      <div
                        key={categoria.id}
                        className="bg-rosa-50/50 border border-rosa-200 rounded-xl p-3.5 space-y-3 transition-all"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Nome da Categoria
                            </label>
                            <input
                              type="text"
                              value={editingNome}
                              onChange={e => {
                                setEditingNome(e.target.value)
                                setEditingSlug(slugify(e.target.value))
                              }}
                              className="w-full px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-rosa-600"
                              disabled={savingEdit}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                              Slug
                            </label>
                            <input
                              type="text"
                              value={editingSlug}
                              onChange={e => setEditingSlug(slugify(e.target.value))}
                              className="w-full px-3 py-1.5 text-sm font-mono bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-rosa-600"
                              disabled={savingEdit}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1 border-t border-rosa-100">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={savingEdit}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(categoria.id)}
                            disabled={savingEdit}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-rosa-600 hover:bg-rosa-700 rounded-lg transition-colors shadow-sm"
                          >
                            {savingEdit ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Salvar
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={categoria.id}
                      className={`
                        group flex items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 bg-white
                        hover:border-rosa-100 hover:shadow-sm transition-all
                        ${isMoving ? 'opacity-50 pointer-events-none' : ''}
                      `}
                    >
                      {/* Lado Esquerdo: Índice e Identificação */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Posição / Ordem */}
                        <div
                          className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-rosa-50 group-hover:text-rosa-700 text-gray-500 font-bold text-xs flex items-center justify-center shrink-0 transition-colors"
                          title={`Ordem de exibição: ${index + 1}`}
                        >
                          {index + 1}
                        </div>

                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">
                            {categoria.nome}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                              /{categoria.slug}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Lado Direito: Ações de Ordenação, Edição e Exclusão */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Subir */}
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={isFirst || reordering !== null}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rosa-600 hover:bg-rosa-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                          title={isFirst ? 'Já é a primeira' : 'Subir ordem'}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        {/* Descer */}
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={isLast || reordering !== null}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-rosa-600 hover:bg-rosa-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400 transition-colors"
                          title={isLast ? 'Já é a última' : 'Descer ordem'}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>

                        <div className="w-[1px] h-4 bg-gray-200 mx-1" />

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(categoria)}
                          disabled={deletingId === categoria.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                          title="Editar nome ou slug"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Excluir */}
                        <button
                          type="button"
                          onClick={() => handleDelete(categoria.id, categoria.nome)}
                          disabled={isDeleting}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir categoria"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
