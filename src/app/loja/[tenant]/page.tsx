import { redirect } from 'next/navigation'

export default function LojaTenantIndexPage({ params }: { params: { tenant: string } }) {
  redirect(`/loja/${params.tenant}/shop`)
}
