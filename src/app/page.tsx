import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default function Home() {
  const headersList = headers()
  const host = headersList.get('host') || ''

  // Se acessar pelo domínio da DeuLance, o rewrite do next.config.js já deverá
  // ter resolvido. Mas por garantia (fallback), redirecionamos para /vendas/index.html
  if (host.includes('deulance')) {
    redirect('/vendas/index.html')
  }

  // Comportamento original
  redirect('/leiloes')
}
