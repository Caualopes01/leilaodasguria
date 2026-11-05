import { NextResponse } from 'next/server'
import { getTenantBySlug } from '@/lib/tenant'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: { tenant: string } }
) {
  const tenant = await getTenantBySlug(params.tenant)

  if (!tenant) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const { searchParams } = new URL(request.url)
  const isAdmin = searchParams.get('admin') === 'true'

  const icons = tenant.app_icone_url ? [
    {
      src: tenant.app_icone_url,
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: tenant.app_icone_url,
      sizes: '512x512',
      type: 'image/png',
    }
  ] : [
    {
      src: '/favicon.jpg',
      sizes: '192x192',
      type: 'image/jpeg',
    },
    {
      src: '/favicon.jpg',
      sizes: '512x512',
      type: 'image/jpeg',
    }
  ]

  const manifest = {
    name: isAdmin ? `${tenant.nome} - Admin` : (tenant.app_titulo || tenant.nome),
    short_name: isAdmin ? `Admin ${tenant.nome}` : (tenant.app_titulo || tenant.nome),
    description: isAdmin
      ? `Painel de Gestão - ${tenant.nome}`
      : `Catálogo e Leilões da ${tenant.nome}`,
    display: 'standalone',
    start_url: isAdmin ? `/loja/${tenant.slug}/admin` : `/loja/${tenant.slug}/shop`,
    scope: isAdmin ? `/loja/${tenant.slug}/admin` : `/loja/${tenant.slug}`,
    background_color: '#ffffff',
    theme_color: tenant.cor_primaria || '#ffffff',
    icons,
  }

  return NextResponse.json(manifest, {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}
