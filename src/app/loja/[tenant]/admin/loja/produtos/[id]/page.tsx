'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { LojaProduto } from '@/lib/loja-types'
import LojaProdutoForm from '@/components/LojaProdutoForm'
import { Loader2, ArrowLeft, AlertCircle } from 'lucide-react'

export default function AdminEditarLojaProdutoPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenant as string
  const produtoId = params.id as string
  const supabase = createClient()

  const [produto, setProduto] = useState<LojaProduto | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    async function carregarProduto() {
      if (!produtoId) return
      setLoading(true)

      const { data, error } = await supabase
        .from('loja_produtos')
        .select('*')
        .eq('id', produtoId)
        .single()

      if (error || !data) {
        setErro('Produto não encontrado ou removido.')
      } else {
        setProduto(data)
      }
      setLoading(false)
    }

    carregarProduto()
  }, [produtoId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm max-w-2xl">
        <Loader2 className="w-8 h-8 text-rosa-500 animate-spin mb-3" />
        <p className="text-sm text-gray-500">Carregando produto...</p>
      </div>
    )
  }

  if (erro || !produto) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm max-w-2xl text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-gray-800">Produto não localizado</h2>
        <p className="text-sm text-gray-500">{erro || 'Não foi possível carregar os dados desta peça.'}</p>
        <Link
          href={`/loja/${tenantSlug}/admin/loja/produtos`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao catálogo</span>
        </Link>
      </div>
    )
  }

  return <LojaProdutoForm produto={produto} tenantSlug={tenantSlug} />
}
