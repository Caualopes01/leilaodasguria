'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient, Produto } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
  Plus, Edit, Trash2, ExternalLink, Search,
  Clock, CheckCircle, XCircle, Share2, Copy
} from 'lucide-react'
import { toast } from 'sonner'

const STATUS_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  aguardando: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  ativo: { label: 'Ativo', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  encerrado: { label: 'Encerrado', color: 'bg-gray-100 text-gray-600', icon: XCircle },
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadProdutos()
  }, [])

  async function loadProdutos() {
    const { data } = await supabase
      .from('produtos')
      .select('*, lances(valor)')
      .order('criado_em', { ascending: false })
      
    const prodsComLanceValido = (data || []).map(p => {
      const maxL = p.lances && p.lances.length > 0 ? Math.max(...p.lances.map((l: any) => l.valor)) : p.valor_atual
      return { ...p, valor_atual: Math.max(p.valor_atual || 0, maxL) }
    })
    
    setProdutos(prodsComLanceValido)
    setLoading(false)
  }

  async function deleteProduto(id: string, imagens: string[]) {
    if (!confirm('Tem certeza? Isso vai apagar o produto e todos os lances.')) return
    setDeleting(id)

    // Deletar imagens do storage
    for (const imgUrl of imagens) {
      const path = imgUrl.split('/storage/v1/object/public/produtos/')[1]
      if (path) await supabase.storage.from('produtos').remove([path])
    }

    await supabase.from('produtos').delete().eq('id', id)
    setProdutos(prev => prev.filter(p => p.id !== id))
    setDeleting(null)
    toast.success('Produto apagado!')
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/leilao/${slug}`
    navigator.clipboard.writeText(url)
    toast.success('Link copiado!')
  }

  const filtered = produtos.filter(p =>
    p.titulo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-800">Produtos</h1>
          <p className="text-gray-500 text-sm mt-1">{produtos.length} produto{produtos.length !== 1 ? 's' : ''} cadastrado{produtos.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/admin/produtos/novo"
          className="flex items-center gap-2 bg-rosa-600 hover:bg-rosa-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-rosa-200"
        >
          <Plus className="w-4 h-4" />
          Novo
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar produto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-white"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <p className="text-gray-400 mb-4">Nenhum produto encontrado</p>
          <Link
            href="/admin/produtos/novo"
            className="inline-flex items-center gap-2 bg-rosa-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold"
          >
            <Plus className="w-4 h-4" />
            Criar primeiro produto
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(produto => {
            const status = STATUS_LABELS[produto.status]
            const StatusIcon = status.icon
            return (
              <div key={produto.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4 hover:shadow-sm transition-all">
                {/* Imagem */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {produto.imagens?.[0] ? (
                    <img
                      src={produto.imagens[0]}
                      alt={produto.titulo}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">{produto.titulo}</h3>
                    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${status.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-2 line-clamp-1">{produto.descricao}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Inicial: <strong className="text-gray-700">{formatCurrency(produto.valor_inicial)}</strong></span>
                    <span>Atual: <strong className="text-rosa-600">{formatCurrency(produto.valor_atual)}</strong></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => copyLink(produto.slug)}
                    className="p-2 rounded-lg hover:bg-rosa-50 text-gray-500 hover:text-rosa-600 transition-colors"
                    title="Copiar link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <Link
                    href={`/leilao/${produto.slug}`}
                    target="_blank"
                    className="p-2 rounded-lg hover:bg-blue-50 text-gray-500 hover:text-blue-600 transition-colors"
                    title="Ver leilão"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                  <Link
                    href={`/admin/produtos/${produto.id}`}
                    className="p-2 rounded-lg hover:bg-yellow-50 text-gray-500 hover:text-yellow-600 transition-colors"
                    title="Editar"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => deleteProduto(produto.id, produto.imagens)}
                    disabled={deleting === produto.id}
                    className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Apagar"
                  >
                    {deleting === produto.id ? (
                      <div className="w-4 h-4 border border-red-300 border-t-red-600 rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
