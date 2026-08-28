import { getTenantBySlug } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import ConfiguracoesForm from '@/components/ConfiguracoesForm'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export default async function ConfiguracoesPage({ params }: { params: { tenant: string } }) {
  const tenant = await getTenantBySlug(params.tenant)
  
  if (!tenant) {
    redirect('/')
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-bold font-display text-gray-800 mb-6">Configurações da Loja</h1>
      <ConfiguracoesForm tenant={tenant} />
    </div>
  )
}
