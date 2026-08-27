'use client'

import { useEffect } from 'react'
import type { Tenant } from '@/lib/tenant'

export function TenantProvider({ 
  tenant, 
  children 
}: { 
  tenant: Tenant
  children: React.ReactNode 
}) {
  useEffect(() => {
    // Injetar cor personalizada como CSS custom property
    document.documentElement.style.setProperty('--tenant-primary', tenant.cor_primaria || '#e91e8c')
    document.documentElement.style.setProperty('--tenant-secondary', tenant.cor_secundaria || '#f97316')
  }, [tenant.cor_primaria, tenant.cor_secundaria])

  return <>{children}</>
}
