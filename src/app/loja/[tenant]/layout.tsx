import { Metadata } from 'next'
import { getTenantBySlug } from '@/lib/tenant'
import { TenantProvider } from '@/components/TenantProvider'

type Props = {
  params: { tenant: string }
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.tenant)

  if (!tenant) {
    return {
      title: 'Loja não encontrada',
    }
  }

  return {
    title: tenant.app_titulo || tenant.nome,
    description: `Leilões online da ${tenant.nome}`,
    icons: tenant.app_icone_url ? {
      icon: tenant.app_icone_url,
      apple: tenant.app_icone_url,
    } : undefined,
    manifest: `/api/manifest/${tenant.slug}`,
  }
}

export default async function TenantLayout({ 
  children,
  params
}: { 
  children: React.ReactNode
  params: { tenant: string }
}) {
  const tenant = await getTenantBySlug(params.tenant)

  if (!tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="font-display text-2xl font-bold text-gray-700 mb-2">Loja não encontrada</h1>
        <p className="text-gray-500 text-sm">Verifique se o endereço está correto.</p>
      </div>
    )
  }

  return (
    <TenantProvider tenant={tenant}>
      {children}
    </TenantProvider>
  )
}
