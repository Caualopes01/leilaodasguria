import { describe, it, expect } from './test-utils'
import { gerarMensagemPedido, gerarLinkWhatsAppPedido } from '@/lib/loja/whatsapp'

describe('Formatação de Mensagem de Pedido para WhatsApp', () => {
  it('gera mensagem com múltiplos itens e observação', () => {
    const pedido = {
      numero: 1042,
      cliente_nome: 'Amanda Silva',
      observacao: 'Deixar na portaria',
      total: 189,
      itens: [
        { titulo: 'Vestido Floral', tamanho: 'M', quantidade: 1, preco_unitario: 89 },
        { titulo: 'Blusa Básica', tamanho: null, quantidade: 2, preco_unitario: 50 },
      ],
    }

    const msg = gerarMensagemPedido(pedido)
    expect(msg).toContain('Olá! Quero finalizar meu pedido #1042 🛍️')
    expect(msg).toContain('1x Vestido Floral (Tam. M) — R$ 89,00')
    expect(msg).toContain('2x Blusa Básica — R$ 100,00')
    expect(msg).toContain('Total: R$ 189,00')
    expect(msg).toContain('Nome: Amanda Silva')
    expect(msg).toContain('Obs: Deixar na portaria')
  })

  it('omite linha de observação quando vazia', () => {
    const pedido = {
      numero: 1043,
      cliente_nome: 'Bruna',
      observacao: '',
      total: 89,
      itens: [{ titulo: 'Vestido', tamanho: 'P', quantidade: 1, preco_unitario: 89 }],
    }
    const msg = gerarMensagemPedido(pedido)
    expect(msg).not.toContain('Obs:')
  })

  it('gera link wa.me válido com o telefone do tenant', () => {
    const link = gerarLinkWhatsAppPedido('5551999998888', 'Olá!')
    expect(link).toContain('https://wa.me/5551999998888?text=Ol%C3%A1!')
  })
})
