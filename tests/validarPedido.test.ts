import { describe, it, expect } from './test-utils'
import { validarPayloadPedido } from '@/lib/loja/validarPedido'
import { LojaProduto } from '@/lib/loja-types'

const mockProdutos: LojaProduto[] = [
  {
    id: 'prod-1',
    tenant_id: 'tenant-1',
    categoria_id: null,
    slug: 'vestido-floral',
    titulo: 'Vestido Floral',
    descricao: null,
    preco: 100,
    preco_promocional: 80,
    tamanhos: ['P', 'M'],
    imagens: ['https://exemplo.com/foto.jpg'],
    destaque: false,
    publicado: true,
    criado_em: '2026-01-01',
    atualizado_em: '2026-01-01',
  },
  {
    id: 'prod-2',
    tenant_id: 'tenant-1',
    categoria_id: null,
    slug: 'blusa',
    titulo: 'Blusa Básica',
    descricao: null,
    preco: 50,
    preco_promocional: null,
    tamanhos: [],
    imagens: [],
    destaque: false,
    publicado: true,
    criado_em: '2026-01-01',
    atualizado_em: '2026-01-01',
  },
]

describe('Validação do Pedido no Backend', () => {
  it('valida com sucesso e calcula preço pelo banco (usando promocional quando aplicável)', () => {
    const payload = {
      cliente_nome: 'Ana',
      cliente_whatsapp: '5551988887777',
      observacao: 'teste',
      itens: [
        { produtoId: 'prod-1', tamanho: 'M', quantidade: 2 },
        { produtoId: 'prod-2', tamanho: null, quantidade: 1 },
      ],
    }

    const res = validarPayloadPedido(payload, mockProdutos)
    expect(res.valido).toBe(true)
    // 2 * 80 + 1 * 50 = 210
    expect(res.totalCalculado).toBe(210)
    expect(res.itensProcessados?.length).toBe(2)
  })

  it('rejeita se nome for curto ou whatsapp inválido', () => {
    const payloadNomeInvalido = {
      cliente_nome: 'A',
      cliente_whatsapp: '5551988887777',
      itens: [{ produtoId: 'prod-1', tamanho: 'P', quantidade: 1 }],
    }
    expect(validarPayloadPedido(payloadNomeInvalido, mockProdutos).valido).toBe(false)

    const payloadWhatsInvalido = {
      cliente_nome: 'Ana',
      cliente_whatsapp: '123',
      itens: [{ produtoId: 'prod-1', tamanho: 'P', quantidade: 1 }],
    }
    expect(validarPayloadPedido(payloadWhatsInvalido, mockProdutos).valido).toBe(false)
  })

  it('rejeita se o tamanho escolhido não existir no produto', () => {
    const payloadTamanhoErrado = {
      cliente_nome: 'Ana',
      cliente_whatsapp: '5551988887777',
      itens: [{ produtoId: 'prod-1', tamanho: 'GG', quantidade: 1 }],
    }
    const res = validarPayloadPedido(payloadTamanhoErrado, mockProdutos)
    expect(res.valido).toBe(false)
    expect(res.erro).toContain('Tamanho GG inválido')
  })
})
