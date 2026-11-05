import { Metadata } from 'next'
import { getTenantBySlug } from '@/lib/tenant'
import AdminLayoutClient from '@/components/AdminLayoutClient'

type Props = {
  params: { tenant: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tenant = await getTenantBySlug(params.tenant)

  const title = tenant ? `Admin - ${tenant.nome}` : 'Painel Administrativo'

  return {
    title,
    manifest: `/api/manifest/${params.tenant}?admin=true`,
    appleWebApp: {
      capable: true,
      title: tenant ? `Admin ${tenant.nome}` : 'Admin',
      statusBarStyle: 'default',
    },
    icons: tenant?.app_icone_url
      ? {
          icon: tenant.app_icone_url,
          apple: tenant.app_icone_url,
        }
      : undefined,
  }
}

export default function TenantAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>
}
