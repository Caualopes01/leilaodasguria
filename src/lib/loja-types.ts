export const LOJA_TENANT_SLUG = 'leilaodasgurias'

export type LojaCategoria = {
  id: string
  tenant_id: string
  nome: string
  slug: string
  ordem: number
  criado_em: string
}

export type LojaProduto = {
  id: string
  tenant_id: string
  categoria_id: string | null
  slug: string
  titulo: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  tamanhos: string[]
  imagens: string[]
  destaque: boolean
  publicado: boolean
  criado_em: string
  atualizado_em: string
  categoria?: LojaCategoria | null
}

export type StatusPedido = 'novo' | 'pago' | 'enviado' | 'entregue' | 'cancelado'
export type MetodoEntrega = 'retirar_loja' | 'tele_entrega' | 'correios'
export type FormaPagamento = 'pix' | 'cartao_credito' | 'dinheiro'

export type Pedido = {
  id: string
  numero: number
  tenant_id: string
  cliente_nome: string
  cliente_whatsapp: string
  observacao: string | null
  metodo_entrega?: MetodoEntrega | string | null
  endereco?: string | null
  forma_pagamento?: FormaPagamento | string | null
  total: number
  status: StatusPedido
  criado_em: string
  atualizado_em: string
  itens?: PedidoItem[]
}

export type PedidoItem = {
  id: string
  pedido_id: string
  produto_id: string | null
  titulo: string
  tamanho: string | null
  quantidade: number
  preco_unitario: number
  imagem: string | null
  criado_em: string
}

export type CarrinhoItem = {
  produtoId: string
  slug: string
  titulo: string
  precoUnitario: number
  imagem: string | null
  tamanho: string | null
  quantidade: number
}
