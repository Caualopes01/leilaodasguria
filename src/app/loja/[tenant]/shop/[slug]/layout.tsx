import { Metadata } from 'next'
import { getTenantBySlug } from '@/lib/tenant'
import { createClient } from '@supabase/supabase-js'
import { formatCurrency } from '@/lib/utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

type Props = {
  params: { tenant: string; slug: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [tenant, prodRes] = await Promise.all([
    getTenantBySlug(params.tenant),
    supabase
      .from('loja_produtos')
      .select('titulo, descricao, preco, preco_promocional, imagens')
      .eq('slug', params.slug)
      .single(),
  ])

  const nomeLoja = tenant?.nome || 'Gurias Chiques'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://guriaschiques.vercel.app'
  const produto = prodRes.data

  const imagemUrl =
    produto?.imagens?.[0] || tenant?.app_icone_url || tenant?.logo_url || `${siteUrl}/icon.png`
  const titulo = produto
    ? `${produto.titulo} — ${nomeLoja}`
    : tenant?.app_titulo || nomeLoja
  const precoFinal = produto ? (produto.preco_promocional ?? produto.preco) : 0
  const descricao = produto
    ? `${produto.descricao || produto.titulo} • ${formatCurrency(precoFinal)} na ${nomeLoja}`
    : `Veja detalhes e compre online na ${nomeLoja}`

  return {
    title: titulo,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      type: 'website',
      url: `${siteUrl}/loja/${params.tenant}/shop/${params.slug}`,
      siteName: nomeLoja,
      images: [
        {
          url: imagemUrl,
          width: 800,
          height: 800,
          alt: titulo,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: titulo,
      description: descricao,
      images: [imagemUrl],
    },
  }
}

export default function ProdutoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
