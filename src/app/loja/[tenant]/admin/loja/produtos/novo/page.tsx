'use client'

import { useParams } from 'next/navigation'
import LojaProdutoForm from '@/components/LojaProdutoForm'

export default function AdminNovoLojaProdutoPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string

  return <LojaProdutoForm tenantSlug={tenantSlug} />
}
