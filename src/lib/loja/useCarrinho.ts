'use client'

import { useState, useEffect } from 'react'
import { CarrinhoItem, LOJA_TENANT_SLUG } from '@/lib/loja-types'

const STORAGE_KEY = `loja_carrinho_${LOJA_TENANT_SLUG}`
const SYNC_EVENT = `loja_carrinho_sync_${LOJA_TENANT_SLUG}`

export function useCarrinho() {
  const [itens, setItens] = useState<CarrinhoItem[]>([])
  const [carregado, setCarregado] = useState(false)

  function carregarDoStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      setItens(data ? JSON.parse(data) : [])
    } catch {
      setItens([])
    }
  }

  useEffect(() => {
    carregarDoStorage()
    setCarregado(true)

    function handleSync() {
      carregarDoStorage()
    }

    window.addEventListener(SYNC_EVENT, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  function salvar(novosItens: CarrinhoItem[]) {
    setItens(novosItens)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novosItens))
      window.dispatchEvent(new Event(SYNC_EVENT))
    } catch (e) {
      console.error('Erro ao salvar carrinho no localStorage:', e)
    }
  }

  function adicionarItem(item: {
    produtoId: string
    slug: string
    titulo: string
    precoUnitario: number
    imagem: string | null
    tamanho: string | null
    quantidade?: number
  }) {
    const qtdAdicionar = item.quantidade || 1
    const idx = itens.findIndex(
      it => it.produtoId === item.produtoId && it.tamanho === (item.tamanho || null)
    )

    if (idx >= 0) {
      const clone = [...itens]
      clone[idx].quantidade = Math.min(20, clone[idx].quantidade + qtdAdicionar)
      salvar(clone)
    } else {
      const novo: CarrinhoItem = {
        produtoId: item.produtoId,
        slug: item.slug,
        titulo: item.titulo,
        precoUnitario: item.precoUnitario,
        imagem: item.imagem,
        tamanho: item.tamanho || null,
        quantidade: Math.min(20, qtdAdicionar),
      }
      salvar([...itens, novo])
    }
  }

  function removerItem(produtoId: string, tamanho: string | null) {
    const filtrados = itens.filter(
      it => !(it.produtoId === produtoId && it.tamanho === tamanho)
    )
    salvar(filtrados)
  }

  function atualizarQuantidade(produtoId: string, tamanho: string | null, novaQuantidade: number) {
    if (novaQuantidade <= 0) {
      removerItem(produtoId, tamanho)
      return
    }
    const clone = itens.map(it => {
      if (it.produtoId === produtoId && it.tamanho === tamanho) {
        return { ...it, quantidade: Math.min(20, novaQuantidade) }
      }
      return it
    })
    salvar(clone)
  }

  function limparCarrinho() {
    salvar([])
  }

  const totalItens = itens.reduce((acc, it) => acc + it.quantidade, 0)
  const totalValor = itens.reduce((acc, it) => acc + it.precoUnitario * it.quantidade, 0)

  return {
    itens,
    carregado,
    adicionarItem,
    removerItem,
    atualizarQuantidade,
    limparCarrinho,
    totalItens,
    totalValor: Number(totalValor.toFixed(2)),
  }
}
