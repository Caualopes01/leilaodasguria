export function obterPrecoFinal(preco: number, precoPromocional: number | null | undefined): number {
  if (precoPromocional != null && precoPromocional > 0 && precoPromocional < preco) {
    return Number(precoPromocional.toFixed(2))
  }
  return Number(preco.toFixed(2))
}

export function calcularPercentualDesconto(preco: number, precoPromocional: number | null | undefined): number | null {
  if (precoPromocional == null || precoPromocional >= preco || preco <= 0) {
    return null
  }
  const desconto = Math.round((1 - precoPromocional / preco) * 100)
  return desconto > 0 ? desconto : null
}
