'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Tenant } from '@/lib/tenant'

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTenant()
  }, [tenantSlug])

  async function loadTenant() {
    const supabase = createClient()
    const { data } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', tenantSlug)
      .eq('ativo', true)
      .single()

    if (data) {
      setTenant(data as Tenant)
      // Injetar cor personalizada como CSS custom property
      document.documentElement.style.setProperty('--tenant-primary', data.cor_primaria || '#e91e8c')
      document.documentElement.style.setProperty('--tenant-secondary', data.cor_secundaria || '#f97316')
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="font-display text-2xl font-bold text-gray-700 mb-2">Loja não encontrada</h1>
        <p className="text-gray-500 text-sm">Verifique se o endereço está correto.</p>
      </div>
    )
  }

  return <>{children}</>
}
