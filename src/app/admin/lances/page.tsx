'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, Produto } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Search, Gavel, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  aguardando: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ativo: { label: 'Ativo', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  encerrado: { label: 'Encerrado', color: 'bg-gray-100 text-gray-600', icon: XCircle },
}

export default function LancesAdminPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  const supabase = createClient()

  useEffect(() => {
    loadProdutos()
  }, [])

  async function loadProdutos() {
    const { data } = await supabase
      .from('produtos')
      .select('*, lances(id)')
      .order('criado_em', { ascending: false })
      
    setProdutos(data || [])
    setLoading(false)
  }

  const filtered = produtos.filter(p => {
    // Filtro de busca
    if (search && !p.titulo.toLowerCase().includes(search.toLowerCase())) return false

    // Filtro de status
    const resolvedStatus = (p.ativo && p.status !== 'encerrado') ? 'ativo' : p.status
    const isAtivo = resolvedStatus === 'ativo'
    
    if (filtro === 'ativos' && !isAtivo) return false
    if (filtro === 'inativos' && isAtivo) return false

    return true
  })

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rosa-600 mb-1">
            <Gavel className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider uppercase">Gestão de Lances</span>
          </div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-800">Lances por Produto</h1>
          <p className="text-gray-500 text-sm mt-1">Selecione um produto para visualizar ou excluir lances</p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setFiltro('ativos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filtro === 'ativos' ? 'bg-white text-rosa-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Ativos
          </button>
          <button
            onClick={() => setFiltro('inativos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filtro === 'inativos' ? 'bg-white text-rosa-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Inativos
          </button>
          <button
            onClick={() => setFiltro('todos')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${filtro === 'todos' ? 'bg-white text-rosa-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Lista de Produtos */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Gavel className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">Nenhum produto encontrado neste filtro</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(produto => {
            const resolvedStatus = (produto.ativo && produto.status !== 'encerrado') ? 'ativo' : produto.status
            const status = STATUS_LABELS[resolvedStatus]
            const StatusIcon = status.icon
            const lancesCount = produto.lances?.length || 0

            return (
              <Link 
                key={produto.id} 
                href={`/admin/produtos/${produto.id}/lances`}
                className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 hover:shadow-md hover:border-rosa-100 transition-all group"
              >
                {/* Imagem */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {produto.imagens?.[0] ? (
                    <img
                      src={produto.imagens[0]}
                      alt={produto.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xl">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 truncate group-hover:text-rosa-700 transition-colors">
                      {produto.titulo}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                    <span className="flex items-center gap-1">
                      <strong className="text-gray-700">{formatCurrency(produto.valor_atual || produto.valor_inicial)}</strong> atual
                    </span>
                    <span className="flex items-center gap-1 text-rosa-600 bg-rosa-50 px-2 py-0.5 rounded-full font-bold">
                      <Gavel className="w-3 h-3" />
                      {lancesCount} lance{lancesCount !== 1 && 's'}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="p-2 text-gray-400 group-hover:text-rosa-600 transition-colors shrink-0">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
