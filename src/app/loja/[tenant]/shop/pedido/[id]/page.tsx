'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Pedido, PedidoItem } from '@/lib/loja-types'
import { formatCurrency } from '@/lib/utils'
import {
  CheckCircle2,
  Clock,
  ShoppingBag,
  ArrowLeft,
  MessageCircle,
  Copy,
  Check,
  FileText,
  User,
  Heart,
  Loader2,
  Package,
  Calendar,
  Truck,
  Store,
  CreditCard,
  Banknote,
  QrCode,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'

export default function LojaPedidoDetalhePublicoPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenant as string
  const pedidoId = params.id as string
  const supabase = createClient()

  const [pedido, setPedido] = useState<(Pedido & { itens?: PedidoItem[] }) | null>(null)
  const [tenantNome, setTenantNome] = useState('')
  const [tenantLogo, setTenantLogo] = useState('')
  const [tenantWhats, setTenantWhats] = useState('')
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (tenantSlug && pedidoId) {
      carregarPedido()
    }
  }, [tenantSlug, pedidoId])

  async function carregarPedido() {
    setLoading(true)
    try {
      // 1. Carregar dados do tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, nome, logo_url, whatsapp')
        .eq('slug', tenantSlug)
        .single()

      if (tenant) {
        setTenantNome(tenant.nome)
        if (tenant.logo_url) setTenantLogo(tenant.logo_url)
        if (tenant.whatsapp) setTenantWhats(tenant.whatsapp)
      }

      // 2. Carregar pedido com itens
      const { data: ped, error: pedErr } = await supabase
        .from('pedidos')
        .select('*, itens:pedido_itens(*)')
        .eq('id', pedidoId)
        .single()

      if (pedErr || !ped) {
        toast.error('Pedido não encontrado')
        setLoading(false)
        return
      }

      setPedido(ped as any)
    } catch (err) {
      console.error('Erro ao carregar pedido:', err)
      toast.error('Erro ao buscar dados do pedido')
    } finally {
      setLoading(false)
    }
  }

  function handleCopiarLink() {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopiado(true)
      toast.success('Link do pedido copiado!')
      setTimeout(() => setCopiado(false), 2500)
    }
  }

  function formatarData(dataIso: string) {
    try {
      const d = new Date(dataIso)
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dataIso
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'novo':
        return {
          label: 'Pedido Recebido',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Clock,
        }
      case 'em_atendimento':
        return {
          label: 'Em Atendimento',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: Clock,
        }
      case 'concluido':
        return {
          label: 'Concluído',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          icon: CheckCircle2,
        }
      case 'cancelado':
        return {
          label: 'Cancelado',
          color: 'bg-gray-100 text-gray-700 border-gray-200',
          icon: Clock,
        }
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: Clock,
        }
    }
  }

  function getEntregaInfo(metodo?: string | null) {
    switch (metodo) {
      case 'tele_entrega':
        return { label: 'Tele-entrega', icon: Truck, desc: 'Entrega por motoboy' }
      case 'correios':
        return { label: 'Correios', icon: Package, desc: 'Envio via PAC / Sedex' }
      case 'retirar_loja':
      default:
        return { label: 'Retirar na Loja', icon: Store, desc: 'Retirada no balcão' }
    }
  }

  function getPagamentoInfo(forma?: string | null) {
    switch (forma) {
      case 'cartao_credito':
        return { label: 'Cartão de Crédito', icon: CreditCard }
      case 'dinheiro':
        return { label: 'Dinheiro', icon: Banknote }
      case 'pix':
      default:
        return { label: 'PIX', icon: QrCode }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-pink-50/20 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-rosa-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">Carregando detalhes do pedido...</p>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="min-h-screen bg-pink-50/20 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100 mb-4">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Pedido não encontrado</h1>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">
          O pedido que você tentou acessar não existe ou foi removido.
        </p>
        <Link
          href={`/loja/${tenantSlug}/shop`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rosa-600 hover:bg-rosa-700 text-white text-sm font-bold rounded-xl shadow-sm transition-transform active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ir para a Loja</span>
        </Link>
      </div>
    )
  }

  const badge = getStatusBadge(pedido.status)
  const BadgeIcon = badge.icon
  const itens = pedido.itens || []

  return (
    <div className="min-h-screen bg-pink-50/20 pb-20">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-rosa-100 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link
            href={`/loja/${tenantSlug}/shop`}
            className="flex items-center gap-2 text-xs font-bold text-gray-600 hover:text-rosa-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao Catálogo</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-rosa-100 border border-rosa-200 flex items-center justify-center overflow-hidden shrink-0">
              {tenantLogo ? (
                <img src={tenantLogo} alt={tenantNome} className="w-full h-full object-cover" />
              ) : (
                <Heart className="w-3.5 h-3.5 text-rosa-600" fill="currentColor" />
              )}
            </div>
            <span className="font-display font-bold text-xs text-gray-900 truncate">
              {tenantNome || 'Leilão das Gurias'}
            </span>
          </div>

          <button
            onClick={handleCopiarLink}
            className="p-2 text-gray-500 hover:text-rosa-600 bg-gray-50 hover:bg-rosa-50 border border-gray-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
            title="Copiar link deste pedido"
          >
            {copiado ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold hidden sm:inline">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Copiar Link</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        {/* Card Cabeçalho do Pedido */}
        <div className="bg-white rounded-2xl border border-rosa-100 p-5 shadow-xs">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs font-bold text-rosa-600 uppercase tracking-wider mb-0.5">
                Comprovante de Pedido
              </p>
              <h1 className="text-2xl font-black font-display text-gray-900">
                Pedido #{pedido.numero}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formatarData(pedido.criado_em)}</span>
              </div>
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${badge.color}`}>
              <BadgeIcon className="w-3.5 h-3.5" />
              <span>{badge.label}</span>
            </div>
          </div>
        </div>

        {/* Card Dados da Cliente */}
        <div className="bg-white rounded-2xl border border-rosa-100 p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-rosa-600" />
            <span>Dados da Cliente</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <span className="text-xs text-gray-400 block mb-0.5">Nome</span>
              <span className="font-bold text-gray-900">{pedido.cliente_nome}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <span className="text-xs text-gray-400 block mb-0.5">WhatsApp</span>
              <span className="font-bold text-gray-900">{pedido.cliente_whatsapp}</span>
            </div>
          </div>

          {pedido.observacao && (
            <div className="bg-rosa-50/50 border border-rosa-100 rounded-xl p-3.5">
              <span className="text-xs font-bold text-rosa-700 block mb-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                Observação
              </span>
              <p className="text-xs sm:text-sm text-gray-700 whitespace-pre-line">
                {pedido.observacao}
              </p>
            </div>
          )}
        </div>

        {/* Card Entrega e Pagamento */}
        <div className="bg-white rounded-2xl border border-rosa-100 p-5 shadow-xs space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-rosa-600" />
            <span>Entrega & Pagamento</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {/* Entrega */}
            <div className="bg-gray-50 rounded-xl p-3 space-y-1">
              <span className="text-xs text-gray-400 block mb-0.5">Forma de Recebimento</span>
              {(() => {
                const info = getEntregaInfo(pedido.metodo_entrega)
                const Icon = info.icon
                return (
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rosa-100 text-rosa-700 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block text-xs sm:text-sm">
                        {info.label}
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        {info.desc}
                      </span>
                    </div>
                  </div>
                )
              })()}

              {pedido.endereco && (
                <div className="pt-2 border-t border-gray-200/60 mt-2 flex items-start gap-1.5 text-xs text-gray-700">
                  <MapPin className="w-3.5 h-3.5 text-rosa-600 shrink-0 mt-0.5" />
                  <span className="font-medium">{pedido.endereco}</span>
                </div>
              )}
            </div>

            {/* Pagamento */}
            <div className="bg-gray-50 rounded-xl p-3 flex flex-col justify-between">
              <div>
                <span className="text-xs text-gray-400 block mb-0.5">Forma de Pagamento</span>
                {(() => {
                  const info = getPagamentoInfo(pedido.forma_pagamento)
                  const Icon = info.icon
                  return (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-gray-900 text-xs sm:text-sm">
                        {info.label}
                      </span>
                    </div>
                  )
                })()}
              </div>
              <p className="text-[11px] text-gray-400 mt-2">
                Valores e comprovantes alinhados via WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Card Itens Escolhidos */}
        <div className="bg-white rounded-2xl border border-rosa-100 p-5 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-rosa-600" />
            <span>Peças Escolhidas ({itens.length})</span>
          </h2>

          <div className="divide-y divide-gray-100">
            {itens.map(item => {
              const subtotal = item.preco_unitario * item.quantidade
              return (
                <div key={item.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imagem ? (
                      <img src={item.imagem} alt={item.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="w-5 h-5 text-gray-300" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900 truncate">
                      {item.titulo}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {item.tamanho && (
                        <span className="inline-block px-2 py-0.5 bg-rosa-100 text-rosa-700 font-bold text-[11px] rounded-md">
                          Tam: {item.tamanho}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 font-medium">
                        Qtd: {item.quantidade}x {formatCurrency(item.preco_unitario)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-gray-900 block">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Resumo Financeiro */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-700">Total do Pedido</span>
            <span className="text-xl font-black text-emerald-600">
              {formatCurrency(pedido.total)}
            </span>
          </div>
        </div>

        {/* Card de Ações Rápidas */}
        <div className="bg-white rounded-2xl border border-rosa-100 p-5 shadow-xs space-y-3">
          <Link
            href={`https://wa.me/${tenantWhats || '5555981519990'}?text=${encodeURIComponent(
              `Olá! Gostaria de falar sobre o pedido #${pedido.numero}.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Falar com a Loja no WhatsApp</span>
          </Link>

          <Link
            href={`/loja/${tenantSlug}/shop`}
            className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continuar Navegando no Catálogo</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
