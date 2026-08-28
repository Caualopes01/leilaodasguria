'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient, Produto, Lance } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
  TrendingUp, Plus, ExternalLink, X, Phone, ListOrdered, Crown, DollarSign, Activity, Users, Gavel, PieChart as PieChartIcon
} from 'lucide-react'
import { formatWhatsApp, getWhatsAppLink } from '@/lib/utils'
import { format, subDays, isAfter } from 'date-fns'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const PIE_COLORS = ['#db2777', '#f472b6', '#fbcfe8', '#fdf2f8', '#e5e7eb'] // Tons de rosa da paleta

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

  // --- LÓGICA DE MÉTRICAS ---
  const ativos = produtos.filter(p => p.status === 'ativo')
  const encerrados = produtos.filter(p => p.status === 'encerrado') // Agora conta TODOS os encerrados (inclusive entregues)

  const todosLances = produtos.flatMap((p: any) => p.lances || [])
  const totalLancesCount = todosLances.length

  const faturamentoGeral = encerrados
    .filter(p => ((p as any).lances?.length || 0) > 0)
    .reduce((acc, p) => acc + (p.valor_atual || 0), 0)

  const leiloesAtivosComLance = ativos.filter(p => ((p as any).lances?.length || 0) > 0)
  const faturamentoAtivo = leiloesAtivosComLance.reduce((acc, p) => acc + (p.valor_atual || 0), 0)

  // --- DADOS PARA O GRÁFICO DE LINHA (Últimos 7 dias) ---
  const hoje = new Date()
  const chartDataLineMap = new Map()
  for(let i = 6; i >= 0; i--) {
    chartDataLineMap.set(format(subDays(hoje, i), 'dd/MM'), 0)
  }
  todosLances.forEach((l: any) => {
    const d = new Date(l.criado_em)
    if (isAfter(d, subDays(hoje, 7))) {
      const k = format(d, 'dd/MM')
      if(chartDataLineMap.has(k)) {
        chartDataLineMap.set(k, chartDataLineMap.get(k) + 1)
      }
    }
  })
  const chartDataLine = Array.from(chartDataLineMap.entries()).map(([date, lances]) => ({ date, lances }))

  // --- DADOS PARA O GRÁFICO DE PIZZA (Top Produtos Ativos) ---
  const topProdutos = ativos
    .map(p => ({ titulo: p.titulo, lancesCount: (p as any).lances?.length || 0 }))
    .filter(p => p.lancesCount > 0)
    .sort((a, b) => b.lancesCount - a.lancesCount)
  
  const chartDataPie = topProdutos.slice(0, 4)
  if (topProdutos.length > 4) {
    const outrosCount = topProdutos.slice(4).reduce((acc, p) => acc + p.lancesCount, 0)
    chartDataPie.push({ titulo: 'Outros', lancesCount: outrosCount })
  }

  // --- REALTIME (Ao Vivo e Lances) ---
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

  const paginasAcessadas = ((Object.entries(
    onlineUsers.reduce((acc, user) => {
      const key = user.page === 'vitrine' ? 'Vitrine Principal' : (user.titulo || 'Página de Produto')
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  )) as [string, number][]).sort((a, b) => b[1] - a[1])

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

      {/* Top Cards */}
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
                <span>Total de vendas concluídas</span>
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
                Retido em <strong className="text-gray-700">{leiloesAtivosComLance.length} leilões ativos</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Lances Recebidos */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-row items-center justify-between p-5 pb-2">
            <h3 className="font-medium text-sm text-gray-500">Total de Lances</h3>
            <Gavel className="h-4 w-4 text-gray-400" />
          </div>
          <div className="p-5 pt-0 flex flex-col gap-1">
            <p className="font-semibold text-2xl tabular-nums tracking-tight text-gray-900">
              {totalLancesCount}
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500">
              Engajamento acumulado
            </div>
          </div>
        </div>

        {/* Card 4: Pessoas Ao Vivo */}
        <div className="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm relative group overflow-hidden">
          <div className="flex flex-row items-center justify-between p-5 pb-2 relative z-10">
            <h3 className="font-medium text-sm text-gray-500">Visitantes Ao Vivo</h3>
            <Users className="h-4 w-4 text-gray-400" />
          </div>
          <div className="p-5 pt-0 flex flex-col gap-1 relative z-10">
            <p className="font-semibold text-2xl tabular-nums tracking-tight text-gray-900 flex items-center gap-2">
              {onlineUsers.length}
              {onlineUsers.length > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              )}
            </p>
            {onlineUsers.length > 0 && (
              <div className="mt-2 space-y-1">
                {paginasAcessadas.slice(0, 2).map(([pageName, count]) => (
                  <div key={pageName} className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 truncate pr-2" title={pageName}>{pageName}</span>
                    <span className="font-medium text-gray-700 bg-gray-100 px-1 rounded">{count}</span>
                  </div>
                ))}
                {paginasAcessadas.length > 2 && (
                  <div className="text-xs text-gray-400">e mais {paginasAcessadas.length - 2} locais...</div>
                )}
              </div>
            )}
            {onlineUsers.length === 0 && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                Navegando na sua vitrine
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Lances (Linha) - Desktop: Col 1-2 / Mobile: 1º */}
        <div className="lg:col-span-2 order-1 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm">
             <div className="p-5 border-b border-gray-100 flex items-center justify-between">
               <div>
                 <h3 className="font-bold text-gray-900 flex items-center gap-2">
                   <TrendingUp className="w-4 h-4 text-rosa-600" />
                   Evolução de Lances
                 </h3>
                 <p className="text-sm text-gray-500 mt-0.5">Total de lances recebidos nos últimos 7 dias</p>
               </div>
             </div>
             <div className="p-5">
               <div className="h-[250px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataLine} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                      <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#db2777', fontWeight: 'bold' }}
                        formatter={(value) => [`${value} lances`, 'Total']}
                        labelStyle={{ color: '#6b7280', marginBottom: '4px' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="lances" 
                        stroke="#db2777" 
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                        activeDot={{ r: 6, fill: '#db2777', stroke: '#fff' }}
                      />
                    </LineChart>
                 </ResponsiveContainer>
               </div>
             </div>
          </div>

          {/* Produtos Ativos - Desktop: Col 1-2 (Row 2) / Mobile: 4º */}
          {ativos.length > 0 && (
            <div className="lg:col-span-2 order-4 lg:order-3 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm h-fit">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">Leilões em Andamento</h3>
                  <p className="text-sm text-gray-500">Monitorando lances ativos.</p>
                </div>
                <Link href={`${basePath}/produtos`} className="text-rosa-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
                  Ver todos <ExternalLink className="w-4 h-4" />
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

        {/* Gráfico de Pizza - Desktop: Col 3 (Row 1) / Mobile: 3º */}
        {chartDataPie.length > 0 && (
          <div className="lg:col-span-1 order-3 lg:order-2 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm h-fit">
              <div className="p-5 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <PieChartIcon className="w-4 h-4 text-rosa-600" />
                  Engajamento Ativo
                </h3>
                <p className="text-xs text-gray-500 mt-1">Leilões ativos com mais lances</p>
              </div>
              <div className="p-5 flex flex-col items-center">
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartDataPie}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="lancesCount"
                        stroke="none"
                      >
                        {chartDataPie.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [`${value} lances`, 'Volume']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Legenda Customizada */}
                <div className="w-full mt-4 space-y-2">
                  {chartDataPie.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                        <span className="text-gray-600 truncate" title={entry.titulo}>{entry.titulo}</span>
                      </div>
                      <span className="font-bold text-gray-900 shrink-0">{entry.lancesCount}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        )}

        {/* Feed de Lances - Desktop: Col 3 (Row 2) / Mobile: 2º */}
        <div className="lg:col-span-1 order-2 lg:order-4 flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm h-fit">
          <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-sm">Feed de Lances</h3>
            </div>
            <div className="p-0">
              {lancesRecentes.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">Nenhuma atividade recente.</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {lancesRecentes.slice(0, 6).map(lance => {
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

      {/* Modal de Detalhes do Lance */}
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
