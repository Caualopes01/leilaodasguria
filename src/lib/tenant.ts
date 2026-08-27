import { createClient } from './supabase'

// ======================
// TIPOS
// ======================

export type Tenant = {
  id: string
  nome: string
  slug: string
  logo_url: string | null
  cor_primaria: string
  cor_secundaria: string
  email: string
  whatsapp: string | null
  user_id: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export type Subscription = {
  id: string
  tenant_id: string
  plano: 'mensal' | 'anual'
  status: 'ativa' | 'cancelada' | 'expirada' | 'trial' | 'pendente'
  valor: number
  inicio_em: string
  fim_em: string | null
  gateway: string | null
  gateway_customer_id: string | null
  gateway_subscription_id: string | null
  criado_em: string
  atualizado_em: string
}

export type TenantWithSubscription = Tenant & {
  subscription: Subscription | null
}

// ======================
// FUNÇÕES DO CLIENT
// ======================

/**
 * Busca um tenant pelo slug
 */
export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .eq('ativo', true)
    .single()

  if (error || !data) return null
  return data as Tenant
}

/**
 * Busca um tenant pelo user_id (para o admin saber qual tenant ele administra)
 */
export async function getTenantByUserId(userId: string): Promise<Tenant | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('user_id', userId)
    .eq('ativo', true)
    .single()

  if (error || !data) return null
  return data as Tenant
}

/**
 * Verifica se o tenant tem uma assinatura ativa
 */
export async function checkSubscription(tenantId: string): Promise<{
  active: boolean
  subscription: Subscription | null
  daysRemaining: number | null
}> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('status', ['ativa', 'trial'])
    .order('fim_em', { ascending: false, nullsFirst: false })
    .limit(1)
    .single()

  if (error || !data) {
    return { active: false, subscription: null, daysRemaining: null }
  }

  const sub = data as Subscription
  
  // Verificar se não expirou
  if (sub.fim_em) {
    const fimDate = new Date(sub.fim_em)
    if (fimDate <= new Date()) {
      return { active: false, subscription: sub, daysRemaining: 0 }
    }
    const daysRemaining = Math.ceil((fimDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return { active: true, subscription: sub, daysRemaining }
  }

  return { active: true, subscription: sub, daysRemaining: null }
}

/**
 * Busca o tenant completo com assinatura
 */
export async function getTenantWithSubscription(slug: string): Promise<TenantWithSubscription | null> {
  const tenant = await getTenantBySlug(slug)
  if (!tenant) return null

  const { subscription } = await checkSubscription(tenant.id)
  return { ...tenant, subscription }
}

/**
 * Lista todos os tenants (para super admin)
 */
export async function listAllTenants(): Promise<TenantWithSubscription[]> {
  const supabase = createClient()
  
  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .order('criado_em', { ascending: false })

  if (!tenants) return []

  // Buscar assinaturas de todos os tenants
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('*')
    .in('tenant_id', tenants.map(t => t.id))
    .in('status', ['ativa', 'trial', 'pendente'])

  const subsMap = new Map<string, Subscription>()
  if (subs) {
    for (const sub of subs) {
      // Manter a assinatura mais recente de cada tenant
      if (!subsMap.has(sub.tenant_id) || new Date(sub.criado_em) > new Date(subsMap.get(sub.tenant_id)!.criado_em)) {
        subsMap.set(sub.tenant_id, sub as Subscription)
      }
    }
  }

  return tenants.map(t => ({
    ...t as Tenant,
    subscription: subsMap.get(t.id) || null,
  }))
}

/**
 * Cria um novo tenant e assinatura trial
 */
export async function createTenant(params: {
  nome: string
  slug: string
  email: string
  whatsapp?: string
  userId: string
  trialDays?: number
}): Promise<{ tenant: Tenant | null; error: string | null }> {
  const supabase = createClient()
  
  // Verificar se slug já existe
  const { data: existing } = await supabase
    .from('tenants')
    .select('id')
    .eq('slug', params.slug)
    .single()

  if (existing) {
    return { tenant: null, error: 'Este slug já está em uso. Escolha outro nome para sua loja.' }
  }

  // Criar tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      nome: params.nome,
      slug: params.slug,
      email: params.email,
      whatsapp: params.whatsapp || null,
      user_id: params.userId,
    })
    .select()
    .single()

  if (tenantError || !tenant) {
    return { tenant: null, error: 'Erro ao criar a loja: ' + (tenantError?.message || 'desconhecido') }
  }

  // Criar assinatura trial
  const trialDays = params.trialDays || 7
  const fimTrial = new Date()
  fimTrial.setDate(fimTrial.getDate() + trialDays)

  await supabase.from('subscriptions').insert({
    tenant_id: tenant.id,
    plano: 'mensal',
    status: 'trial',
    valor: 0,
    fim_em: fimTrial.toISOString(),
  })

  return { tenant: tenant as Tenant, error: null }
}
