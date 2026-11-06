import { LojaProduto } from '@/lib/loja-types'
import { obterPrecoFinal } from './precos'

export interface ItemPayload {
  produtoId: string
  tamanho?: string | null
  quantidade: number
}

export interface PedidoPayload {
  cliente_nome: string
  cliente_whatsapp: string
  observacao?: string | null
  metodo_entrega?: 'retirar_loja' | 'tele_entrega' | 'correios' | string
  endereco?: string | null
  forma_pagamento?: 'pix' | 'cartao_credito' | 'dinheiro' | string
  itens: ItemPayload[]
}

export interface ResultadoValidacao {
  valido: boolean
  erro?: string
  totalCalculado?: number
  metodo_entrega?: string
  endereco?: string | null
  forma_pagamento?: string
  itensProcessados?: Array<{
    produto_id: string
    titulo: string
    tamanho: string | null
    quantidade: number
    preco_unitario: number
    imagem: string | null
  }>
}

export function validarPayloadPedido(
  payload: any,
  produtosDoBanco: LojaProduto[]
): ResultadoValidacao {
  if (!payload || typeof payload !== 'object') {
    return { valido: false, erro: 'Dados do pedido inválidos' }
  }

  const nome = (payload.cliente_nome || '').trim()
  if (nome.length < 2) {
    return { valido: false, erro: 'Informe seu nome completo (mínimo 2 caracteres)' }
  }

  const cleanWhats = String(payload.cliente_whatsapp || '').replace(/\D/g, '')
  if (cleanWhats.length < 10 || cleanWhats.length > 13) {
    return { valido: false, erro: 'Informe um número de WhatsApp válido com DDD' }
  }

  const metodo_entrega = payload.metodo_entrega === 'tele_entrega' || payload.metodo_entrega === 'correios'
    ? payload.metodo_entrega
    : 'retirar_loja'

  const endereco = payload.endereco ? String(payload.endereco).trim() : ''
  if ((metodo_entrega === 'tele_entrega' || metodo_entrega === 'correios') && endereco.length < 5) {
    return {
      valido: false,
      erro: 'Informe o endereço completo para entrega (rua, número, bairro, cidade)',
    }
  }

  const forma_pagamento = payload.forma_pagamento === 'cartao_credito' || payload.forma_pagamento === 'dinheiro'
    ? payload.forma_pagamento
    : 'pix'

  if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
    return { valido: false, erro: 'Sua sacola está vazia' }
  }

  if (payload.itens.length > 50) {
    return { valido: false, erro: 'Número de itens excede o limite permitido' }
  }

  const mapaProdutos = new Map(produtosDoBanco.map(p => [p.id, p]))
  let total = 0
  const itensProcessados: Array<{
    produto_id: string
    titulo: string
    tamanho: string | null
    quantidade: number
    preco_unitario: number
    imagem: string | null
  }> = []

  for (const item of payload.itens) {
    const qtd = Number(item.quantidade)
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 20) {
      return { valido: false, erro: 'Quantidade de item inválida (deve ser entre 1 e 20)' }
    }

    const prod = mapaProdutos.get(item.produtoId)
    if (!prod || !prod.publicado) {
      return { valido: false, erro: `Produto "${item.produtoId}" não está mais disponível` }
    }

    const temTamanhos = Array.isArray(prod.tamanhos) && prod.tamanhos.length > 0
    let tamanhoFinal: string | null = null

    if (temTamanhos) {
      if (!item.tamanho || !prod.tamanhos.includes(item.tamanho)) {
        return {
          valido: false,
          erro: `Tamanho ${item.tamanho || 'não informado'} inválido para o produto "${prod.titulo}"`,
        }
      }
      tamanhoFinal = String(item.tamanho)
    }

    const precoUnitario = obterPrecoFinal(prod.preco, prod.preco_promocional)
    total += precoUnitario * qtd

    itensProcessados.push({
      produto_id: prod.id,
      titulo: prod.titulo,
      tamanho: tamanhoFinal,
      quantidade: qtd,
      preco_unitario: precoUnitario,
      imagem: prod.imagens && prod.imagens.length > 0 ? prod.imagens[0] : null,
    })
  }

  return {
    valido: true,
    totalCalculado: Number(total.toFixed(2)),
    metodo_entrega,
    endereco: endereco || null,
    forma_pagamento,
    itensProcessados,
  }
}
