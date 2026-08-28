'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient, Produto, Lance } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
  Package, TrendingUp, Clock, Trophy, Crown,
  ArrowRight, Plus, ExternalLink, X, Phone, User, ListOrdered, Gavel, Star, Check, DollarSign, Activity, Users
} from 'lucide-react'
import { formatWhatsApp, getWhatsAppLink } from '@/lib/utils'

export default function TenantDashboardPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [lancesRecentes, setLancesRecentes] = useState<(Lance & { produto: Produto })[]>([])
  const [loading, setLoading] = useState(true)
  const [onlineUsers, setOnlineUsers] = useState<any[]>([])
  const [selectedLance, setSelectedLance] = useState<any | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [tenantSlug])

  async function loadData() {
    // Resolver tenant_id
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) { setLoading(false); return }
    setTenantId(tenant.id)

    const [{ data: prods }, { data: lances }] = await Promise.all([
      supabase.from('produtos').select('*, lances(*)').eq('tenant_id', tenant.id).order('criado_em', { ascending: false }),
      supabase.from('lances').select('*, produto:produtos(*)').eq('tenant_id', tenant.id).order('criado_em', { ascending: false }).limit(10),
    ])
    
    const prodsComLanceValido = (prods || []).map(p => {
      const maxL = p.lances && p.lances.length > 0 ? Math.max(...p.lances.map((l: any) => l.valor)) : p.valor_atual
      return { ...p, valor_atual: Math.max(p.valor_atual || 0, maxL) }
    })
    
    setProdutos(prodsComLanceValido)
    setLancesRecentes((lances as any) || [])
    setLoading(false)
  }

  const ativos = produtos.filter(p => p.status === 'ativo')
  const encerrados = produtos.filter(p => p.status === 'encerrado' && p.ativo !== false)
  const aguardando = produtos.filter(p => p.status === 'aguardando')

  const totalLancesCount = produtos.reduce((acc, p) => acc + ((p as any).lances?.length || 0), 0)
  const produtosComLancesCount = produtos.filter(p => ((p as any).lances?.length || 0) > 0).length

  // Novas Métricas de Faturamento
  const faturamentoGeral = encerrados
    .filter(p => ((p as any).lances?.length || 0) > 0)
    .reduce((acc, p) => acc + (p.valor_atual || 0), 0)

  const leiloesAtivosComLance = ativos.filter(p => ((p as any).lances?.length || 0) > 0)
  const faturamentoAtivo = leiloesAtivosComLance.reduce((acc, p) => acc + (p.valor_atual || 0), 0)

  const [vencedores, setVencedores] = useState<any[]>([])

  useEffect(() => {
    if (encerrados.length > 0) {
      loadVencedores(encerrados.map(p => p.id))
    }
  }, [produtos])

  async function loadVencedores(ids: string[]) {
    const results = []
    for (const id of ids.slice(0, 20)) {
      const { data } = await supabase
        .from('lances')
        .select('*, produto:produtos(titulo, slug)')
        .eq('produto_id', id)
        .order('valor', { ascending: false })
        .limit(1)
        .single()
      if (data) results.push(data)
    }
    setVencedores(results)
  }

  async function marcarComoEntregue(e: React.MouseEvent, produtoId: string) {
    e.stopPropagation()
    if (!confirm('Deseja marcar como entregue e limpar da lista?')) return
    
    setProdutos(prev => prev.map(p => p.id === produtoId ? { ...p, ativo: false } : p))
    setVencedores(prev => prev.filter(v => v.produto_id !== produtoId))
    
    await supabase.from('produtos').update({ ativo: false }).eq('id', produtoId)
  }

  useEffect(() => {
    const channelLances = supabase
      .channel(`tenant-admin-lances-${tenantSlug}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lances',
      }, async (payload) => {
        const novoLance = payload.new as any
        
        const { data: pData } = await supabase.from('produtos').select('*').eq('id', novoLance.produto_id).single()
        
        // Só processar lances do nosso tenant
        if (pData && pData.tenant_id === tenantId) {
          setLancesRecentes(prev => {
            const nl = { ...novoLance, produto: pData }
            return [nl, ...prev].slice(0, 10)
          })

          setProdutos(prev =>
            prev.map(p => {
              if (p.id === novoLance.produto_id) {
                return { ...p, valor_atual: Math.max(p.valor_atual || 0, novoLance.valor) }
              }
              return p
            })
          )
        }
      })
      .subscribe()

    const presenceChannel = supabase.channel(`presence-room-${tenantSlug}`)
    presenceChannel.on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState()
      const users: any[] = []
      for (const id in state) {
        users.push(state[id][0])
      }
      setOnlineUsers(users)
    }).subscribe()

    return () => {
      supabase.removeChannel(channelLances)
      supabase.removeChannel(presenceChannel)
    }
  }, [tenantId])

  const basePath = `/loja/${tenantSlug}/admin`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 bg-gray-50/50 min-h-screen animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral e métricas de desempenho</p>
        </div>
        <Link
          href={`${basePath}/produtos/novo`}
          className="flex items-center justify-center gap-2 bg-rosa-600 hover:bg-rosa-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </Link>
      </div>

      {/* Efferd-style Top Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        
        {/* Card 1: Faturamento Geral */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between p-5 pb-2">
            <h3 className="font-medium text-sm text-gray-500">Faturamento Geral</h3>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </div>
          <div className="p-5 pt-0 flex flex-col gap-1">
            <p className="font-semibold text-2xl tabular-nums tracking-tight text-gray-900">
              {formatCurrency(faturamentoGeral)}
            </p>
            <div className="flex items-center gap-1 text-xs">
              <div className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md font-medium">
                <span>Vendas concretizadas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Leilões Ativos (A receber) */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between p-5 pb-2">
            <h3 className="font-medium text-sm text-gray-500">Leilões Ativos (A receber)</h3>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="p-5 pt-0 flex flex-col gap-1">
            <p className="font-semibold text-2xl tabular-nums tracking-tight text-rosa-600">
              {formatCurrency(faturamentoAtivo)}
            </p>
            <div className="flex items-center gap-1 text-xs">
              <span className="text-gray-500">
                Retido em <strong className="text-gray-700">{leiloesAtivosComLance.length} leilões</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Lances Recebidos */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between p-5 pb-2">
            <h3 className="font-medium text-sm text-gray-500">Lances Recebidos</h3>
            <Gavel className="h-4 w-4 text-gray-400" />
          </div>
          <div className="p-5 pt-0 flex flex-col gap-1">
            <p className="font-semibold text-2xl tabular-nums tracking-tight text-gray-900">
              {totalLancesCount}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              Total de interações
            </div>
          </div>
        </div>

        {/* Card 4: Pessoas Ao Vivo */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between p-5 pb-2">
            <h3 className="font-medium text-sm text-gray-500">Visitantes Ao Vivo</h3>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="p-5 pt-0 flex flex-col gap-1">
            <p className="font-semibold text-2xl tabular-nums tracking-tight text-gray-900 flex items-center gap-2">
              {onlineUsers.length}
              {onlineUsers.length > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
              )}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              Navegando na sua vitrine
            </div>
          </div>
        </div>

      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Coluna Principal (Tabelas) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Gráfico Placeholder */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
             <div className="p-5 border-b border-gray-100 flex items-center justify-between">
               <div>
                 <h3 className="font-bold text-gray-900">Evolução do Faturamento</h3>
                 <p className="text-sm text-gray-500">Receita nos últimos dias</p>
               </div>
             </div>
             <div className="p-5">
               <div className="h-[200px] w-full bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4"/> Área reservada para Gráfico (Recharts)
                  </span>
               </div>
             </div>
          </div>

          {/* Vencedores (Estilo Tabela Efferd) */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-rosa-600" />
                Últimos Ganhadores
              </h3>
              <p className="text-sm text-gray-500 mt-0.5">Leilões encerrados pendentes de entrega.</p>
            </div>
            <div className="p-0">
              {vencedores.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Nenhum leilão encerrado ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 font-medium">
                      <tr>
                        <th className="px-5 py-3 font-medium">Cliente</th>
                        <th className="px-5 py-3 font-medium hidden sm:table-cell">Produto</th>
                        <th className="px-5 py-3 font-medium text-right">Valor Final</th>
                        <th className="px-5 py-3 font-medium text-center">Status</th>
                        <th className="px-5 py-3 font-medium text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {vencedores.map(v => (
                        <tr key={v.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3">
                            <div 
                              className="flex items-center gap-3 cursor-pointer"
                              onClick={() => setSelectedLance(v)}
                            >
                              <div className="w-8 h-8 rounded-full bg-rosa-100 flex items-center justify-center text-rosa-700 font-bold shrink-0">
                                {v.nome.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900">{v.nome}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell text-gray-600 max-w-[150px] truncate">
                            {v.produto?.titulo}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-gray-900">
                            {formatCurrency(v.valor)}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-flex items-center justify-center bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-medium whitespace-nowrap">
                              Pendente
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              onClick={(e) => marcarComoEntregue(e, v.produto_id)}
                              className="inline-flex items-center justify-center p-1.5 bg-white border border-gray-200 rounded-md text-gray-400 hover:text-green-600 hover:border-green-300 hover:bg-green-50 transition-colors shadow-sm"
                              title="Marcar como entregue"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Produtos Ativos Simplificados */}
          {ativos.length > 0 && (
            <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Leilões em Andamento</h3>
                  <p className="text-sm text-gray-500">Monitorando lances ativos.</p>
                </div>
                <Link href={`${basePath}/produtos`} className="text-rosa-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  Ver todos <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-0">
                <ul className="divide-y divide-gray-100">
                  {ativos.slice(0, 5).map(p => (
                    <li key={p.id} className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{p.titulo}</p>
                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-0.5">
                          Lance atual: <strong className="text-emerald-600">{formatCurrency(p.valor_atual)}</strong>
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Link
                          href={`${basePath}/produtos/${p.id}/lances`}
                          className={`flex items-center justify-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            (p as any).lances?.length 
                              ? 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50' 
                              : 'border-transparent text-gray-400 bg-gray-50 cursor-not-allowed'
                          }`}
                          onClick={(e) => {
                            if (!(p as any).lances?.length) e.preventDefault()
                          }}
                        >
                          <ListOrdered className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Lances</span> ({(p as any).lances?.length || 0})
                        </Link>
                        <Link
                          href={`/loja/${tenantSlug}/leilao/${p.slug}`}
                          target="_blank"
                          className="flex items-center justify-center p-1.5 rounded-lg text-gray-400 hover:text-rosa-600 hover:bg-rosa-50 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Coluna Lateral (Feed) */}
        <div className="space-y-6">
          
          {/* Team / Users Analytics List */}
          {onlineUsers.length > 0 && (
            <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-sm">Páginas mais acessadas agora</h3>
              </div>
              <div className="p-0">
                <ul className="divide-y divide-gray-100">
                  {((Object.entries(
                    onlineUsers.reduce((acc, user) => {
                      const key = user.page === 'vitrine' ? 'Vitrine Principal' : (user.titulo || 'Página de Produto')
                      acc[key] = (acc[key] || 0) + 1
                      return acc
                    }, {} as Record<string, number>)
                  )) as [string, number][]).sort((a, b) => b[1] - a[1]).map(([pageName, count]) => (
                    <li key={pageName} className="flex items-center justify-between p-4">
                      <span className="text-sm text-gray-700 truncate pr-4">{pageName}</span>
                      <span className="inline-flex items-center justify-center bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-bold shrink-0">
                        {count} view{count > 1 ? 's' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Lances Recentes (Feed Estilo) */}
          <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Feed de Lances</h3>
            </div>
            <div className="p-0">
              {lancesRecentes.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nenhuma atividade recente.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {lancesRecentes.slice(0, 8).map(lance => {
                    const prod = (lance as any).produto
                    const realProd = produtos.find(p => p.id === lance.produto_id)
                    const isWinning = realProd && lance.valor >= realProd.valor_atual
                    const img = prod?.imagens?.[0]

                    return (
                      <li 
                        key={lance.id} 
                        onClick={() => setSelectedLance(lance)}
                        className="flex gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer group"
                      >
                        {img ? (
                          <img src={img} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0 mt-0.5">
                            {lance.nome.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-tight">
                            <span className="font-semibold text-gray-900">{lance.nome}</span> deu um lance de <strong className="text-emerald-600">{formatCurrency(lance.valor)}</strong>
                          </p>
                          <p className="text-xs text-gray-500 truncate mt-1">{prod?.titulo}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[10px] text-gray-400 font-medium">
                              {new Date(lance.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isWinning && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 rounded-sm flex items-center gap-0.5">
                                <Crown className="w-3 h-3" /> Ganhando
                              </span>
                            )}
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="p-3 border-t border-gray-100 flex justify-center">
                <Link href={`${basePath}/lances`} className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                  Ver histórico completo
                </Link>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Modal de Detalhes do Usuário */}
      {selectedLance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedLance(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-fade-in">
            <div className="flex items-start justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-gray-900">Detalhes do Lance</h3>
              <button onClick={() => setSelectedLance(null)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-700 font-bold shadow-sm border border-gray-200">
                  {selectedLance.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{selectedLance.nome}</p>
                  <p className="text-xs text-gray-500">Cliente via WhatsApp</p>
                </div>
              </div>

              <div className="space-y-3 px-1">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Produto do lance</p>
                  <p className="text-sm font-medium text-gray-800">{selectedLance.produto?.titulo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Valor ofertado</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrency(selectedLance.valor)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Contato WhatsApp</p>
                  <p className="flex items-center gap-2 text-sm font-bold text-gray-800">
                    <Phone className="w-4 h-4 text-green-600" />
                    {selectedLance.whatsapp ? formatWhatsApp(selectedLance.whatsapp) : 'Não informado'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Data / Hora</p>
                  <p className="text-sm text-gray-700">
                    {new Date(selectedLance.criado_em).toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>

              <a 
                href={getWhatsAppLink(selectedLance.whatsapp || '', `Olá ${selectedLance.nome.split(' ')[0]}, tudo bem? Falamos do portal de leilões sobre o produto "${selectedLance.produto?.titulo}".`)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5b] text-white font-bold py-3 rounded-xl transition-colors mt-2"
              >
                Chamar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
