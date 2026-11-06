import { Metadata } from 'next'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@supabase/supabase-js'
import { formatCurrency } from '@/lib/utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

type Props = {
  params: { tenant: string; id: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [tenant, pedRes] = await Promise.all([
    getTenantBySlug(params.tenant),
    supabase
      .from('pedidos')
      .select('numero, cliente_nome, total')
      .eq('id', params.id)
      .single(),
  ])

  const nomeLoja = tenant?.nome || 'Gurias Chiques'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://guriaschiques.vercel.app'
  const imagemUrl = tenant?.app_icone_url || tenant?.logo_url || `${siteUrl}/icon.png`

  const pedido = pedRes.data

  const titulo = pedido
    ? `Pedido #${pedido.numero} — ${nomeLoja} 🛍️`
    : `Pedido — ${nomeLoja}`

  const valorFormatado = pedido ? formatCurrency(pedido.total) : ''
  const descricao = pedido
    ? `Pedido de ${pedido.cliente_nome} no valor de ${valorFormatado}. Clique para ver os itens e acompanhar.`
    : `Acompanhe seu pedido na ${nomeLoja}`

  return {
    title: titulo,
    description: descricao,
    icons: tenant?.app_icone_url
      ? {
          icon: tenant.app_icone_url,
          apple: tenant.app_icone_url,
        }
      : {
          icon: '/icon.png',
          apple: '/icon.png',
        },
    openGraph: {
      title: titulo,
      description: descricao,
      type: 'website',
      url: `${siteUrl}/loja/${params.tenant}/shop/pedido/${params.id}`,
      siteName: nomeLoja,
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

export default function PedidoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
