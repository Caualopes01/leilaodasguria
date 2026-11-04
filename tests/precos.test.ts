import { describe, it, expect } from './test-utils'
import { obterPrecoFinal, calcularPercentualDesconto } from '@/lib/loja/precos'

describe('Regras de Preços da Loja', () => {
  it('retorna preco_promocional quando for menor que o preco regular', () => {
    expect(obterPrecoFinal(100, 79.9)).toBe(79.9)
  })

  it('retorna preco regular quando preco_promocional for nulo ou indefinido', () => {
    expect(obterPrecoFinal(100, null)).toBe(100)
    expect(obterPrecoFinal(100, undefined as any)).toBe(100)
  })

  it('ignora promocional se for maior ou igual ao preco regular', () => {
    expect(obterPrecoFinal(100, 120)).toBe(100)
    expect(obterPrecoFinal(100, 100)).toBe(100)
  })

  it('calcula o percentual de desconto arredondado', () => {
    expect(calcularPercentualDesconto(100, 75)).toBe(25)
    expect(calcularPercentualDesconto(199.9, 99.9)).toBe(50)
  })

  it('retorna null se não houver desconto válido', () => {
    expect(calcularPercentualDesconto(100, null)).toBeNull()
    expect(calcularPercentualDesconto(100, 100)).toBeNull()
    expect(calcularPercentualDesconto(100, 110)).toBeNull()
  })
})
