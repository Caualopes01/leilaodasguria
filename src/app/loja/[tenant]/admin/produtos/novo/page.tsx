'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ProdutoForm from '@/components/ProdutoForm'

export default function TenantNovoProdutoPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const [tenantId, setTenantId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadTenant() {
      const { data } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', tenantSlug)
        .single()
      
      if (data) setTenantId(data.id)
    }
    loadTenant()
  }, [tenantSlug])

  if (!tenantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    )
  }

  return <ProdutoForm tenantId={tenantId} basePath={`/loja/${tenantSlug}/admin/produtos`} />
}
