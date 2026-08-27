'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
  Shield, Store, Users, TrendingUp, Clock,
  CheckCircle, XCircle, AlertCircle, ExternalLink,
  Gavel, DollarSign, Eye
} from 'lucide-react'

type TenantRow = {
  id: string
  nome: string
  slug: string
  email: string
  ativo: boolean
  criado_em: string
  subscription?: {
    plano: string
    status: string
    fim_em: string | null
  } | null
  _totalProdutos?: number
  _totalLances?: number
}

export default function SuperAdminPage() {
  const [tenants, setTenants] = useState<TenantRow[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    // Buscar todos os tenants
    const { data: tenantsData } = await supabase
      .from('tenants')
      .select('*')
      .order('criado_em', { ascending: false })

    if (!tenantsData) { setLoading(false); return }

    // Buscar assinaturas
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*')
      .in('tenant_id', tenantsData.map(t => t.id))

    const subsMap = new Map<string, any>()
    if (subs) {
      for (const sub of subs) {
        if (!subsMap.has(sub.tenant_id) || new Date(sub.criado_em) > new Date(subsMap.get(sub.tenant_id).criado_em)) {
          subsMap.set(sub.tenant_id, sub)
        }
      }
    }

    // Buscar contagens de produtos e lances por tenant
    const enriched: TenantRow[] = []
    for (const t of tenantsData) {
      const { count: prodCount } = await supabase
        .from('produtos')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', t.id)

      const { count: lanceCount } = await supabase
        .from('lances')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', t.id)

      enriched.push({
        ...t,
        subscription: subsMap.get(t.id) || null,
        _totalProdutos: prodCount || 0,
        _totalLances: lanceCount || 0,
      })
    }

    setTenants(enriched)
    setLoading(false)
  }

  async function toggleTenant(id: string, ativo: boolean) {
    await supabase.from('tenants').update({ ativo: !ativo }).eq('id', id)
    setTenants(prev => prev.map(t => t.id === id ? { ...t, ativo: !ativo } : t))
  }

  const totalAtivos = tenants.filter(t => t.ativo).length
  const totalComAssinatura = tenants.filter(t => t.subscription?.status === 'ativa').length
  const totalTrial = tenants.filter(t => t.subscription?.status === 'trial').length
  const receitaMensal = tenants.filter(t => t.subscription?.status === 'ativa' && t.subscription?.plano === 'mensal').length * 49.90
  const receitaAnual = tenants.filter(t => t.subscription?.status === 'ativa' && t.subscription?.plano === 'anual').length * (399.90 / 12)
  const mrr = receitaMensal + receitaAnual

  const statusColor: Record<string, string> = {
    ativa: 'bg-green-100 text-green-700',
    trial: 'bg-blue-100 text-blue-700',
    expirada: 'bg-red-100 text-red-700',
    cancelada: 'bg-gray-100 text-gray-600',
    pendente: 'bg-yellow-100 text-yellow-700',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3">
          <Shield className="w-8 h-8 text-purple-600" />
          Super Admin
        </h1>
        <p className="text-gray-500 text-sm mt-1">Gestão de todos os tenants da plataforma Dêu Lance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total de Lojas', value: tenants.length, icon: Store, color: 'bg-blue-50 text-blue-600' },
          { label: 'Lojas Ativas', value: totalAtivos, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
          { label: 'Assinaturas Ativas', value: totalComAssinatura, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Em Trial', value: totalTrial, icon: Clock, color: 'bg-blue-50 text-blue-600' },
          { label: 'MRR Estimado', value: formatCurrency(mrr), icon: TrendingUp, color: 'bg-purple-50 text-purple-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Lista de Tenants */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-display text-lg font-bold text-gray-800">Todas as Lojas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-sm font-semibold text-gray-500 bg-gray-50/50">
                <th className="py-3 px-6">Loja</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assinatura</th>
                <th className="py-3 px-4 text-center">Produtos</th>
                <th className="py-3 px-4 text-center">Lances</th>
                <th className="py-3 px-4">Criada em</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    Nenhuma loja cadastrada ainda
                  </td>
                </tr>
              ) : (
                tenants.map(tenant => (
                  <tr key={tenant.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-6">
                      <div>
                        <p className="font-semibold text-gray-800">{tenant.nome}</p>
                        <p className="text-xs text-gray-400">{tenant.email}</p>
                        <p className="text-xs text-rosa-500 font-medium">/loja/{tenant.slug}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {tenant.ativo ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Ativa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                          <XCircle className="w-3 h-3" /> Inativa
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {tenant.subscription ? (
                        <div>
                          <span className={`inline-flex items-center text-xs font-semibold px-2 py-1 rounded-full ${statusColor[tenant.subscription.status] || 'bg-gray-100 text-gray-600'}`}>
                            {tenant.subscription.status}
                          </span>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {tenant.subscription.plano} {tenant.subscription.fim_em ? `até ${new Date(tenant.subscription.fim_em).toLocaleDateString('pt-BR')}` : ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Sem assinatura</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-700">
                        {tenant._totalProdutos}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-gray-700">
                        {tenant._totalLances}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      {new Date(tenant.criado_em).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/loja/${tenant.slug}/leiloes`}
                          target="_blank"
                          className="p-2 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Ver loja"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => toggleTenant(tenant.id, tenant.ativo)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                            tenant.ativo
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-green-50 text-green-600 hover:bg-green-100'
                          }`}
                        >
                          {tenant.ativo ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
