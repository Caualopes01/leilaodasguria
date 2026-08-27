'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Heart, AlertCircle, ArrowRight, CreditCard } from 'lucide-react'

function AssinaturaContent() {
  const searchParams = useSearchParams()
  const tenantSlug = searchParams.get('tenant') || ''
  const expired = searchParams.get('expired') === 'true'

  return (
    <div className="min-h-screen bg-gradient-to-br from-rosa-50 via-white to-rosa-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-6">
          <AlertCircle className="w-10 h-10 text-orange-500" />
        </div>
        
        <h1 className="font-display text-2xl font-bold text-gray-800 mb-2">
          {expired ? 'Assinatura Expirada' : 'Assinatura Necessária'}
        </h1>
        
        <p className="text-gray-500 text-sm mb-8">
          {expired 
            ? 'Sua assinatura expirou. Renove para continuar usando o painel administrativo da sua loja.'
            : 'Você precisa de uma assinatura ativa para acessar o painel da sua loja.'
          }
        </p>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <div className="space-y-4">
            <div className="bg-rosa-50 rounded-xl p-4 border border-rosa-100">
              <p className="text-xs text-gray-500 mb-1">Plano Mensal</p>
              <p className="font-display text-2xl font-bold text-rosa-600">R$ 49,90<span className="text-sm text-gray-400">/mês</span></p>
            </div>
            <div className="bg-rosa-50 rounded-xl p-4 border border-rosa-100">
              <p className="text-xs text-gray-500 mb-1">Plano Anual</p>
              <p className="font-display text-2xl font-bold text-rosa-600">R$ 399,90<span className="text-sm text-gray-400">/ano</span></p>
              <p className="text-xs text-green-600 font-semibold mt-1">Economia de R$ 199,90!</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            O pagamento será habilitado em breve. Entre em contato para renovar manualmente.
          </p>
        </div>

        <div className="space-y-3">
          {tenantSlug && (
            <Link 
              href={`/loja/${tenantSlug}/leiloes`}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all text-sm"
            >
              Ver minha loja pública
            </Link>
          )}
          <Link 
            href="/pricing"
            className="w-full flex items-center justify-center gap-2 bg-rosa-600 hover:bg-rosa-700 text-white font-bold py-3 rounded-xl transition-all"
          >
            <CreditCard className="w-4 h-4" />
            Ver planos
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AssinaturaPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    }>
      <AssinaturaContent />
    </Suspense>
  )
}

