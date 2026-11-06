import { formatCurrency, getWhatsAppLink } from '@/lib/utils'

export interface ItemParaMensagem {
  titulo: string
  tamanho?: string | null
  quantidade: number
  preco_unitario: number
}

export interface PedidoParaMensagem {
  numero: number
  cliente_nome: string
  metodo_entrega?: string | null
  endereco?: string | null
  forma_pagamento?: string | null
  observacao?: string | null
  itens: ItemParaMensagem[]
  total: number
  linkPedido?: string | null
}

export function formatarMetodoEntrega(metodo?: string | null, endereco?: string | null): string {
  switch (metodo) {
    case 'tele_entrega':
      return `📦 Entrega: Tele-entrega${endereco ? ` — ${endereco}` : ''}`
    case 'correios':
      return `📦 Entrega: Correios${endereco ? ` — ${endereco}` : ''}`
    case 'retirar_loja':
    default:
      return '📦 Entrega: Retirar na Loja'
  }
}

export function formatarFormaPagamento(forma?: string | null): string {
  switch (forma) {
    case 'cartao_credito':
      return '💳 Pagamento: Cartão de Crédito'
    case 'dinheiro':
      return '💵 Pagamento: Dinheiro'
    case 'pix':
    default:
      return '🔑 Pagamento: PIX'
  }
}

function formatarMoeda(valor: number): string {
  return formatCurrency(valor).replace(/\u00a0/g, ' ')
}

export function gerarMensagemPedido(pedido: PedidoParaMensagem): string {
  const linhas: string[] = []

  linhas.push(`Olá! Quero finalizar meu pedido #${pedido.numero} 🛍️\n`)

  pedido.itens.forEach(item => {
    const tamStr = item.tamanho ? ` (Tam. ${item.tamanho})` : ''
    const subtotal = item.preco_unitario * item.quantidade
    linhas.push(`${item.quantidade}x ${item.titulo}${tamStr} — ${formatarMoeda(subtotal)}`)
  })

  linhas.push(`\nTotal: ${formatarMoeda(pedido.total)}`)
  linhas.push(`Nome: ${pedido.cliente_nome}`)

  if (pedido.metodo_entrega) {
    linhas.push(formatarMetodoEntrega(pedido.metodo_entrega, pedido.endereco))
  }
  if (pedido.forma_pagamento) {
    linhas.push(formatarFormaPagamento(pedido.forma_pagamento))
  }

  if (pedido.observacao && pedido.observacao.trim()) {
    linhas.push(`Obs: ${pedido.observacao.trim()}`)
  }

  if (pedido.linkPedido && pedido.linkPedido.trim()) {
    linhas.push(`\n🔗 Ver detalhes do pedido:\n${pedido.linkPedido.trim()}`)
  }

  return linhas.join('\n')
}

export function gerarLinkWhatsAppPedido(telefoneLoja: string, mensagem: string): string {
  return getWhatsAppLink(telefoneLoja, mensagem)
}
