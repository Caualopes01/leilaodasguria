'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient, Produto } from '@/lib/supabase'
import ProdutoForm from '@/components/ProdutoForm'

export default function TenantEditarProdutoPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const id = params.id as string
  const [produto, setProduto] = useState<Produto | null>(null)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      // Carregar tenant
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single()
      
      if (!tenant) return

      setTenantId(tenant.id)

      // Carregar produto
      const { data } = await supabase
        .from('produtos')
        .select('*, lances(valor)')
        .eq('id', id)
        .eq('tenant_id', tenant.id)
        .single()
      
      if (data) {
        setProduto(data)
      }
      setLoading(false)
    }
    loadData()
  }, [id, tenantSlug])

  if (loading || !tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!produto) {
    return <div className="text-gray-500">Produto não encontrado.</div>
  }

  return (
    <ProdutoForm 
      produto={produto} 
      tenantId={tenantId} 
      basePath={`/loja/${tenantSlug}/admin/produtos`} 
    />
  )
}
