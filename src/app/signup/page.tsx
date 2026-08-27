'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import { Heart, Store, Mail, Lock, User, Phone, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

function SignupContent() {
  const [step, setStep] = useState(1) // 1: dados, 2: conta, 3: sucesso
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const plano = searchParams.get('plano') || 'mensal'

  // Step 1: Dados da loja
  const [nomeLoja, setNomeLoja] = useState('')
  const [slugLoja, setSlugLoja] = useState('')
  const [slugManual, setSlugManual] = useState(false)
  const [whatsapp, setWhatsapp] = useState('')

  // Step 2: Conta
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Step 3: Resultado
  const [createdSlug, setCreatedSlug] = useState('')
  const [error, setError] = useState('')

  const supabase = createClient()

  // Auto-gerar slug a partir do nome
  useEffect(() => {
    if (!slugManual && nomeLoja) {
      setSlugLoja(slugify(nomeLoja))
    }
  }, [nomeLoja, slugManual])

  async function handleStep1() {
    if (!nomeLoja.trim()) { toast.error('Informe o nome da loja'); return }
    if (!slugLoja.trim()) { toast.error('Informe o endereço da loja'); return }
    
    // Verificar se slug já existe
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slugLoja)
      .single()

    if (existing) {
      toast.error('Este endereço já está em uso. Escolha outro.')
      return
    }

    setStep(2)
  }

  async function handleStep2() {
    if (!email.trim()) { toast.error('Informe seu email'); return }
    if (password.length < 6) { toast.error('A senha precisa ter pelo menos 6 caracteres'); return }
    if (password !== confirmPassword) { toast.error('As senhas não coincidem'); return }

    setLoading(true)
    setError('')

    try {
      // 1. Criar conta no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.error('Este email já está registrado. Tente fazer login.')
        } else {
          toast.error('Erro ao criar conta: ' + authError.message)
        }
        setLoading(false)
        return
      }

      const userId = authData.user?.id
      if (!userId) {
        toast.error('Erro ao criar conta. Tente novamente.')
        setLoading(false)
        return
      }

      // 2. Fazer login automático
      await supabase.auth.signInWithPassword({ email, password })

      // 3. Criar tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert({
          nome: nomeLoja.trim(),
          slug: slugLoja,
          email,
          whatsapp: whatsapp.replace(/\D/g, '') || null,
          user_id: userId,
        })
        .select()
        .single()

      if (tenantError) {
        toast.error('Erro ao criar loja: ' + tenantError.message)
        setLoading(false)
        return
      }

      // 4. Criar assinatura trial de 7 dias
      const fimTrial = new Date()
      fimTrial.setDate(fimTrial.getDate() + 7)

      await supabase.from('subscriptions').insert({
        tenant_id: tenant.id,
        plano: plano,
        status: 'trial',
        valor: plano === 'anual' ? 399.90 : 49.90,
        fim_em: fimTrial.toISOString(),
      })

      setCreatedSlug(slugLoja)
      setStep(3)
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rosa-50 via-white to-rosa-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-rosa-100 mb-4">
            <Heart className="w-8 h-8 text-rosa-600" fill="currentColor" />
          </div>
          <h1 className="font-display text-3xl font-bold text-rosa-700">Dêu Lance</h1>
          <p className="text-gray-500 text-sm mt-1 font-body">Crie sua loja de leilões</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step >= s ? 'bg-rosa-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && <div className={`w-8 h-0.5 ${step > s ? 'bg-rosa-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Dados da loja */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-lg shadow-rosa-100 border border-rosa-100 p-8 animate-fade-in">
            <h2 className="font-display text-xl font-semibold text-gray-800 mb-1">Dados da Loja</h2>
            <p className="text-sm text-gray-500 mb-6">Primeiro, vamos definir sua loja.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-gray-400" /> Nome da loja *
                </label>
                <input
                  type="text"
                  value={nomeLoja}
                  onChange={e => setNomeLoja(e.target.value)}
                  placeholder="Ex: Leilão da Maria"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all focus:ring-2 focus:ring-rosa-200 focus:border-rosa-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5">Endereço da loja *</label>
                <div className="flex items-center gap-0 border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-rosa-200 focus-within:border-rosa-400">
                  <span className="bg-gray-50 text-gray-400 text-sm px-3 py-3 border-r border-gray-200 whitespace-nowrap">
                    deulance.vercel.app/loja/
                  </span>
                  <input
                    type="text"
                    value={slugLoja}
                    onChange={e => {
                      setSlugManual(true)
                      setSlugLoja(slugify(e.target.value))
                    }}
                    placeholder="maria"
                    className="flex-1 px-3 py-3 text-sm border-none focus:outline-none font-medium text-rosa-700"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Seus clientes acessarão por: <span className="font-medium text-gray-600">deulance.vercel.app/loja/{slugLoja || '...'}</span>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-gray-400" /> WhatsApp (opcional)
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={e => setWhatsapp(e.target.value)}
                  placeholder="(51) 99999-9999"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all focus:ring-2 focus:ring-rosa-200 focus:border-rosa-400"
                />
              </div>

              <button
                onClick={handleStep1}
                disabled={!nomeLoja.trim() || !slugLoja.trim()}
                className="w-full bg-rosa-600 hover:bg-rosa-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Próximo
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Conta */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-lg shadow-rosa-100 border border-rosa-100 p-8 animate-fade-in">
            <h2 className="font-display text-xl font-semibold text-gray-800 mb-1">Criar Conta</h2>
            <p className="text-sm text-gray-500 mb-6">Defina seu email e senha para acessar o painel.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-gray-400" /> Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all focus:ring-2 focus:ring-rosa-200 focus:border-rosa-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-gray-400" /> Senha *
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all focus:ring-2 focus:ring-rosa-200 focus:border-rosa-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-gray-400" /> Confirmar senha *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all focus:ring-2 focus:ring-rosa-200 focus:border-rosa-400"
                />
              </div>

              <div className="bg-rosa-50 rounded-xl p-3 border border-rosa-100">
                <p className="text-xs text-rosa-700 font-medium">
                  🎁 Plano {plano === 'anual' ? 'Anual' : 'Mensal'} — 7 dias grátis para testar
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-3 text-sm font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
                >
                  Voltar
                </button>
                <button
                  onClick={handleStep2}
                  disabled={loading || !email || !password || !confirmPassword}
                  className="flex-1 bg-rosa-600 hover:bg-rosa-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      Criar loja
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Sucesso */}
        {step === 3 && (
          <div className="bg-white rounded-2xl shadow-lg shadow-rosa-100 border border-rosa-100 p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="font-display text-2xl font-bold text-gray-800 mb-2">
              Loja criada com sucesso! 🎉
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Sua loja <span className="font-semibold text-rosa-600">{nomeLoja}</span> está pronta. 
              Você tem <span className="font-semibold">7 dias grátis</span> para experimentar.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Endereço da sua loja:</p>
              <p className="text-sm font-bold text-rosa-600 break-all">
                deulance.vercel.app/loja/{createdSlug}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => window.location.href = `/loja/${createdSlug}/admin`}
                className="w-full bg-rosa-600 hover:bg-rosa-700 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Acessar meu painel admin
                <ArrowRight className="w-5 h-5" />
              </button>
              <a
                href={`/loja/${createdSlug}/leiloes`}
                target="_blank"
                className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all text-sm"
              >
                Ver minha loja pública
              </a>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 mt-6">
          Ao criar sua loja, você aceita os termos de uso.
        </p>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  )
}
