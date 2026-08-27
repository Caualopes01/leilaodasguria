'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Heart, Check, Star, Zap, Shield, Users, 
  BarChart3, Smartphone, Clock, ArrowRight,
  Crown, Sparkles
} from 'lucide-react'

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(false)

  const mensal = 49.90
  const anual = 399.90
  const mensalDoAnual = anual / 12
  const desconto = Math.round((1 - mensalDoAnual / mensal) * 100)

  const features = [
    { icon: Smartphone, text: 'Loja online própria com seu nome' },
    { icon: Zap, text: 'Leilões em tempo real com contagem regressiva' },
    { icon: Users, text: 'Gestão de clientes e lances' },
    { icon: BarChart3, text: 'Dashboard com métricas ao vivo' },
    { icon: Shield, text: 'Painel admin protegido por login' },
    { icon: Clock, text: 'Notificações de novos lances e produtos' },
    { icon: Star, text: 'Personalização de marca e cores' },
    { icon: Crown, text: 'Suporte prioritário via WhatsApp' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-rosa-50">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-rosa-600" fill="currentColor" />
            <span className="font-display text-xl font-bold text-rosa-700">Dêu Lance</span>
          </div>
          <Link 
            href="/signup"
            className="text-sm font-semibold text-rosa-600 hover:text-rosa-700 transition-colors"
          >
            Já tenho conta →
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-rosa-100 text-rosa-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
          <Sparkles className="w-4 h-4" />
          Plataforma de Leilões Online
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
          Sua loja de leilões<br />
          <span className="text-rosa-600">pronta em minutos</span>
        </h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto">
          Crie leilões online, receba lances em tempo real e gerencie tudo pelo celular. 
          Sem complicação, sem código.
        </p>
      </div>

      {/* Toggle Mensal/Anual */}
      <div className="flex justify-center mb-8">
        <div className="bg-white rounded-full p-1.5 border border-gray-200 shadow-sm flex items-center gap-1">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${
              !isAnnual ? 'bg-rosa-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
              isAnnual ? 'bg-rosa-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Anual
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              isAnnual ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
            }`}>
              -{desconto}%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Card */}
      <div className="max-w-md mx-auto px-4 pb-20">
        <div className="bg-white rounded-3xl border-2 border-rosa-200 shadow-xl shadow-rosa-100/50 overflow-hidden relative">
          {/* Badge */}
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-rosa-600 to-rosa-500 text-white text-center text-xs font-bold py-2 uppercase tracking-wider">
            {isAnnual ? '🎉 Melhor valor!' : '✨ Comece agora'}
          </div>

          <div className="p-8 pt-14 text-center">
            <h2 className="font-display text-xl font-bold text-gray-800 mb-2">
              Plano {isAnnual ? 'Anual' : 'Mensal'}
            </h2>

            <div className="mb-6">
              {isAnnual ? (
                <>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-display font-bold text-rosa-600">
                      R$ {mensalDoAnual.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-gray-400 text-sm">/mês</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Cobrado <span className="font-semibold text-gray-700">R$ {anual.toFixed(2).replace('.', ',')}</span> por ano
                  </p>
                  <p className="text-xs text-green-600 font-semibold mt-1">
                    Economia de R$ {((mensal * 12) - anual).toFixed(2).replace('.', ',')} por ano!
                  </p>
                </>
              ) : (
                <>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-display font-bold text-rosa-600">
                      R$ {mensal.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-gray-400 text-sm">/mês</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Cancele quando quiser</p>
                </>
              )}
            </div>

            <Link
              href={`/signup?plano=${isAnnual ? 'anual' : 'mensal'}`}
              className="w-full flex items-center justify-center gap-2 bg-rosa-600 hover:bg-rosa-700 text-white font-bold py-4 rounded-2xl text-lg transition-all shadow-lg shadow-rosa-200 active:scale-[0.98]"
            >
              Criar minha loja
              <ArrowRight className="w-5 h-5" />
            </Link>

            <p className="text-xs text-gray-400 mt-3">7 dias grátis para experimentar</p>
          </div>

          {/* Features */}
          <div className="border-t border-gray-100 p-8">
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-4">
              Tudo incluso:
            </p>
            <div className="space-y-3.5">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rosa-50 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-rosa-600" />
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ rápido */}
        <div className="mt-12 space-y-6">
          <h3 className="font-display text-xl font-bold text-gray-800 text-center">Perguntas frequentes</h3>
          
          {[
            { q: 'Preciso saber programar?', a: 'Não! A plataforma é toda visual. Você cria leilões, sobe fotos e gerencia tudo pelo celular.' },
            { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem multa. No plano mensal, basta não renovar.' },
            { q: 'Como meus clientes dão lances?', a: 'Pelo link da sua loja. Eles acessam pelo celular, escolhem o produto e dão o lance informando nome e WhatsApp.' },
            { q: 'Recebo notificação de novos lances?', a: 'Sim! Você é notificado em tempo real no painel admin e seus clientes recebem alertas quando são superados.' },
          ].map((faq, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4">
              <p className="font-semibold text-gray-800 text-sm">{faq.q}</p>
              <p className="text-gray-500 text-sm mt-1">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
