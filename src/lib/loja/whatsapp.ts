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
  observacao?: string | null
  itens: ItemParaMensagem[]
  total: number
  linkPedido?: string | null
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
