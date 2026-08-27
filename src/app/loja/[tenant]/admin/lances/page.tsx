'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, Produto } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Search, Gavel, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  aguardando: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ativo: { label: 'Ativo', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  encerrado: { label: 'Encerrado', color: 'bg-gray-100 text-gray-600', icon: XCircle },
}

export default function TenantLancesPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'ativos' | 'inativos'>('ativos')
  const supabase = createClient()

  useEffect(() => {
    loadProdutos()
  }, [tenantSlug])

  async function loadProdutos() {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) return

    const { data } = await supabase
      .from('produtos')
      .select('*, lances(id)')
      .eq('tenant_id', tenant.id)
      .order('criado_em', { ascending: false })
      
    setProdutos(data || [])
    setLoading(false)
  }

  const filtered = produtos.filter(p => {
    if (search && !p.titulo.toLowerCase().includes(search.toLowerCase())) return false

    const resolvedStatus = (p.ativo && p.status !== 'encerrado') ? 'ativo' : p.status
    const isAtivo = resolvedStatus === 'ativo'
    
    if (filtro === 'ativos' && !isAtivo) return false
    if (filtro === 'inativos' && isAtivo) return false

    const qtdLances = (p as any).lances?.length || 0
    if (qtdLances === 0) return false

    return true
  })

  filtered.sort((a, b) => {
    const lancesA = (a as any).lances?.length || 0
    const lancesB = (b as any).lances?.length || 0
    return lancesB - lancesA
  })

  const basePath = `/loja/${tenantSlug}/admin`

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-800">Painel de Lances</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhe as disputas ativas e encerradas dos seus produtos.</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white p-4 rounded-2xl border border-gray-100">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {(['todos', 'ativos', 'inativos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${
                filtro === f ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gavel className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium">Nenhum produto com lances encontrado no momento.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map(produto => {
              const resolvedStatus = (produto.ativo && produto.status !== 'encerrado') ? 'ativo' : produto.status
              const status = STATUS_LABELS[resolvedStatus]
              const StatusIcon = status.icon
              const qtdLances = (produto as any).lances?.length || 0

              return (
                <Link
                  key={produto.id}
                  href={`${basePath}/produtos/${produto.id}/lances`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50/50 transition-colors group"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    {produto.imagens?.[0] ? (
                      <img
                        src={produto.imagens[0]}
                        alt={produto.titulo}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">📦</div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800 truncate group-hover:text-rosa-600 transition-colors">
                        {produto.titulo}
                      </h3>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1.5 font-medium text-rosa-600 bg-rosa-50 px-2 py-0.5 rounded-md">
                        <Gavel className="w-3.5 h-3.5" />
                        {qtdLances} {qtdLances === 1 ? 'lance' : 'lances'}
                      </span>
                      <span>Atual: <strong className="text-gray-700">{formatCurrency(produto.valor_atual)}</strong></span>
                    </div>
                  </div>

                  <div className="text-gray-300 group-hover:text-rosa-600 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
