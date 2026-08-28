import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ConfiguracoesForm from '@/components/ConfiguracoesForm'

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
export const revalidate = 0
export default async function ConfiguracoesPage({ params }: { params: { tenant: string } }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', params.tenant)
    .single()
  
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
