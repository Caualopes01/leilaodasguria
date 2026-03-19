'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient, Produto } from '@/lib/supabase'
import ProdutoForm from '@/components/ProdutoForm'

export default function EditarProdutoPage() {
  const { id } = useParams()
  const [produto, setProduto] = useState<Produto | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('produtos').select('*').eq('id', id).single()
      setProduto(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!produto) {
    return <p className="text-center text-gray-400 py-16">Produto não encontrado</p>
  }

  return <ProdutoForm produto={produto} />
}
