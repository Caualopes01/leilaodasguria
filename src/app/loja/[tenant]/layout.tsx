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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://guriaschiques.vercel.app'
  const imagemUrl = tenant.app_icone_url || tenant.logo_url || `${siteUrl}/icon.png`
  const titulo = tenant.app_titulo || tenant.nome
  const descricao = tenant.loja_subtitulo || `Catálogo e compras online da ${tenant.nome}`

  return {
    title: titulo,
    description: descricao,
    icons: tenant.app_icone_url ? {
      icon: tenant.app_icone_url,
      apple: tenant.app_icone_url,
    } : {
      icon: '/icon.png',
      apple: '/icon.png',
    },
    manifest: `/api/manifest/${tenant.slug}`,
    openGraph: {
      title: titulo,
      description: descricao,
      type: 'website',
      url: `${siteUrl}/loja/${tenant.slug}/shop`,
      siteName: tenant.nome,
      images: [
        {
          url: imagemUrl,
          width: 1200,
          height: 1200,
          alt: titulo,
        },
      ],
    },
    twitter: {
      card: 'summary',
      title: titulo,
      description: descricao,
      images: [imagemUrl],
    },
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
