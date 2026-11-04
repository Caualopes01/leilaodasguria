'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Pedido, PedidoItem, StatusPedido } from '@/lib/loja-types'
import { formatCurrency, getWhatsAppLink } from '@/lib/utils'
import {
  ClipboardList,
  Search,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Package,
  Truck,
  XCircle,
  Loader2,
  ArrowLeft,
  User,
  Phone,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

const STATUS_CONFIG: Record<
  StatusPedido,
  { label: string; bg: string; text: string; border: string; icon: any }
> = {
  novo: {
    label: 'Novo Pedido',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Clock,
  },
  pago: {
    label: 'Pago',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    icon: CheckCircle2,
  },
  enviado: {
    label: 'Enviado',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
    icon: Truck,
  },
  entregue: {
    label: 'Entregue',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: Package,
  },
  cancelado: {
    label: 'Cancelado',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: XCircle,
  },
}

export default function AdminLojaPedidosPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const supabase = createClient()

  const [tenantId, setTenantId] = useState<string | null>(null)
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<string>('todos')

  // Estado de detalhes expandidos
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)

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
        .select('id')
        .eq('slug', tenantSlug)
        .single()

      if (tenantErr || !tenant) {
        toast.error('Loja não encontrada')
        setLoading(false)
        return
      }

      setTenantId(tenant.id)
      await fetchPedidos(tenant.id)
    } catch (err: any) {
      toast.error('Erro ao carregar pedidos: ' + (err.message || 'Erro'))
    } finally {
      setLoading(false)
    }
  }

  async function fetchPedidos(tId: string) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('*, itens:pedido_itens(*)')
      .eq('tenant_id', tId)
      .order('criado_em', { ascending: false })

    if (error) {
      toast.error('Erro ao listar pedidos: ' + error.message)
      return
    }

    setPedidos(data || [])
  }

  async function handleStatusChange(pedidoId: string, novoStatus: StatusPedido) {
    setUpdatingStatusId(pedidoId)
    const { error } = await supabase
      .from('pedidos')
      .update({ status: novoStatus, atualizado_em: new Date().toISOString() })
      .eq('id', pedidoId)

    if (error) {
      toast.error('Erro ao atualizar status: ' + error.message)
    } else {
      setPedidos(prev =>
        prev.map(p => (p.id === pedidoId ? { ...p, status: novoStatus } : p))
      )
      toast.success(`Pedido #${pedidos.find(p => p.id === pedidoId)?.numero} atualizado para ${STATUS_CONFIG[novoStatus].label}`)
    }
    setUpdatingStatusId(null)
  }

  // Filtragem
  const pedidosFiltrados = pedidos.filter(p => {
    if (statusFiltro !== 'todos' && p.status !== statusFiltro) {
      return false
    }

    if (busca.trim()) {
      const q = busca.toLowerCase().trim()
      const matchNum = String(p.numero).includes(q)
      const matchNome = p.cliente_nome.toLowerCase().includes(q)
      const matchWhats = p.cliente_whatsapp.includes(q)
      if (!matchNum && !matchNome && !matchWhats) return false
    }

    return true
  })

  // Métricas
  const totalGeral = pedidos.reduce((acc, p) => (p.status !== 'cancelado' ? acc + Number(p.total) : acc), 0)
  const totalNovos = pedidos.filter(p => p.status === 'novo').length
  const totalConcluidos = pedidos.filter(p => p.status === 'entregue' || p.status === 'pago').length

  function formatDate(iso: string) {
    try {
      const d = new Date(iso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

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
              <ClipboardList className="w-6 h-6 text-rosa-600" />
              Gestão de Pedidos da Loja
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              Acompanhe vendas, clientes, itens selecionados e atualize status
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => tenantId && fetchPedidos(tenantId)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold shadow-sm transition-all self-start sm:self-auto"
        >
          <span>Atualizar Lista</span>
        </button>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 bg-rosa-50 text-rosa-600 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Total de Pedidos</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{pedidos.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Novos / Pendentes</p>
            <p className="text-xl font-bold text-blue-600 mt-0.5">{totalNovos}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3.5">
          <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Faturamento Estimado</p>
            <p className="text-xl font-bold text-emerald-600 mt-0.5">{formatCurrency(totalGeral)}</p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Pesquisa */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
        {/* Campo de Busca */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por número do pedido (#1001), nome do cliente ou WhatsApp..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500"
          />
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
            Todos ({pedidos.length})
          </button>

          {(['novo', 'pago', 'enviado', 'entregue', 'cancelado'] as StatusPedido[]).map(st => {
            const cfg = STATUS_CONFIG[st]
            const qtd = pedidos.filter(p => p.status === st).length
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFiltro(st)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  statusFiltro === st
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cfg.label} ({qtd})
              </button>
            )
          })}
        </div>
      </div>

      {/* Lista de Pedidos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2 className="w-8 h-8 text-rosa-500 animate-spin mb-3" />
          <p className="text-sm text-gray-500">Carregando pedidos...</p>
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-800">Nenhum pedido encontrado</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {busca || statusFiltro !== 'todos'
              ? 'Nenhum resultado corresponde aos filtros selecionados.'
              : 'Nenhum pedido foi realizado ainda na loja.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pedidosFiltrados.map(pedido => {
            const isExpanded = expandedId === pedido.id
            const cfg = STATUS_CONFIG[pedido.status] || STATUS_CONFIG.novo
            const StatusIcon = cfg.icon
            const totalItens = (pedido.itens || []).reduce((acc, it) => acc + it.quantidade, 0)

            // Link WhatsApp para falar com a cliente
            const whatsLink = getWhatsAppLink(
              pedido.cliente_whatsapp,
              `Olá, ${pedido.cliente_nome}! Aqui é da ${tenantSlug}. Estou entrando em contato sobre o seu pedido #${pedido.numero} 🛍️`
            )

            return (
              <div
                key={pedido.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all"
              >
                {/* Linha Principal do Pedido */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Informações Resumidas */}
                  <div className="flex items-start sm:items-center gap-3.5">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : pedido.id)}
                      className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl transition-colors shrink-0 mt-0.5 sm:mt-0"
                      title={isExpanded ? 'Recolher detalhes' : 'Ver itens do pedido'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-rosa-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-base">
                          #{pedido.numero}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(pedido.criado_em)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-gray-800">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          {pedido.cliente_nome}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          {pedido.cliente_whatsapp}
                        </span>
                        <span className="text-gray-400">•</span>
                        <span>{totalItens} {totalItens === 1 ? 'peça' : 'peças'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Preço Total & Ações Rápidas */}
                  <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                    <div className="text-left md:text-right">
                      <span className="text-[11px] text-gray-400 block font-medium">Total</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatCurrency(pedido.total)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão Conversar no WhatsApp */}
                      <a
                        href={whatsLink}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                        title="Abrir conversa no WhatsApp com a cliente"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span className="hidden sm:inline">WhatsApp</span>
                      </a>

                      {/* Dropdown de Status */}
                      <select
                        value={pedido.status}
                        onChange={e => handleStatusChange(pedido.id, e.target.value as StatusPedido)}
                        disabled={updatingStatusId === pedido.id}
                        className="px-2.5 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all cursor-pointer"
                      >
                        <option value="novo">Novo Pedido</option>
                        <option value="pago">Pago</option>
                        <option value="enviado">Enviado</option>
                        <option value="entregue">Entregue</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bloco Expandido: Detalhes dos Itens e Observação */}
                {isExpanded && (
                  <div className="bg-gray-50/80 border-t border-gray-100 p-4 sm:p-5 space-y-4 animate-fade-in">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">
                        Itens Selecionados ({totalItens})
                      </h4>
                      <div className="space-y-2">
                        {(pedido.itens || []).map((item: PedidoItem) => (
                          <div
                            key={item.id}
                            className="bg-white rounded-xl border border-gray-200/60 p-3 flex items-center justify-between gap-3 shadow-xs"
                          >
                            <div className="flex items-center gap-3">
                              {item.imagem ? (
                                <img
                                  src={item.imagem}
                                  alt={item.titulo}
                                  className="w-12 h-12 object-cover rounded-lg bg-gray-100 shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <p className="text-xs font-bold text-gray-800 line-clamp-1">
                                  {item.titulo}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                  {item.tamanho && (
                                    <span className="px-1.5 py-0.2 bg-rosa-50 text-rosa-700 font-bold rounded">
                                      Tam. {item.tamanho}
                                    </span>
                                  )}
                                  <span>Qtd: {item.quantidade}x</span>
                                  <span>Unitário: {formatCurrency(item.preco_unitario)}</span>
                                </div>
                              </div>
                            </div>

                            <span className="text-xs font-bold text-gray-900 shrink-0">
                              {formatCurrency(item.preco_unitario * item.quantidade)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Observação do Cliente */}
                    {pedido.observacao && (
                      <div className="p-3 bg-amber-50/80 border border-amber-200/70 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Observação da cliente:</span>
                          <p className="mt-0.5 text-amber-800">{pedido.observacao}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
