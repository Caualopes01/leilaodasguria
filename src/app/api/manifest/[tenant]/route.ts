import { NextResponse } from 'next/server'
import { getTenantBySlug } from '@/lib/tenant'

export async function GET(
  request: Request,
  { params }: { params: { tenant: string } }
) {
  const tenant = await getTenantBySlug(params.tenant)

  if (!tenant) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const manifest = {
    name: tenant.app_titulo || tenant.nome,
    short_name: tenant.app_titulo || tenant.nome,
    description: `Leilões online da ${tenant.nome}`,
    display: 'standalone',
    start_url: `/loja/${tenant.slug}`,
    background_color: tenant.cor_secundaria || '#ffffff',
    theme_color: tenant.cor_primaria || '#ffffff',
    icons: tenant.app_icone_url ? [
      {
        src: tenant.app_icone_url,
        sizes: '192x192',
        type: 'image/png', // Assumindo imagem padrão gerada no Supabase
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
    ],
  }

  return NextResponse.json(manifest)
}
