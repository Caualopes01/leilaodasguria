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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<TenantRow | null>(null)
  const [formData, setFormData] = useState({ nome: '', slug: '', email: '', whatsapp: '' })
  const [saving, setSaving] = useState(false)
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

  async function handleSaveTenant() {
    if (!formData.nome.trim() || !formData.slug.trim()) {
      alert('Nome e Slug são obrigatórios');
      return;
    }
    setSaving(true)
    try {
      if (editingTenant) {
        // Edit
        const { error } = await supabase
          .from('tenants')
          .update({
            nome: formData.nome,
            slug: formData.slug,
            email: formData.email,
            whatsapp: formData.whatsapp || null,
          })
          .eq('id', editingTenant.id)
        
        if (error) throw error
      } else {
        // Create
        // Gerar user_id dummy ou usar auth signUp, para simplificar vamos tentar inserir sem user_id se for opcional,
        // ou gerar um uuid para user_id se for requerido.
        const fakeUserId = crypto.randomUUID()
        const { data: tenant, error } = await supabase
          .from('tenants')
          .insert({
            nome: formData.nome,
            slug: formData.slug,
            email: formData.email,
            whatsapp: formData.whatsapp || null,
            user_id: fakeUserId, // Se falhar, pode ser devido ao user_id não existir na tabela auth.users. 
          })
          .select()
          .single()
          
        if (error) {
          // Fallback caso fk auth.users falhe: criar pelo auth primeiro se precisar, mas como não temos como sem deslogar,
          // vamos apenas tentar. Se falhar por RLS ou FK, mostramos erro.
          throw error
        }

        // Criar assinatura trial
        const fimTrial = new Date()
        fimTrial.setDate(fimTrial.getDate() + 7)
        await supabase.from('subscriptions').insert({
          tenant_id: tenant.id,
          plano: 'mensal',
          status: 'trial',
          valor: 49.90,
          fim_em: fimTrial.toISOString(),
        })
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: any) {
      console.error(err)
      alert('Erro ao salvar loja: ' + err.message)
    }
    setSaving(false)
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
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-display text-lg font-bold text-gray-800">Todas as Lojas</h2>
          <button
            onClick={() => {
              setEditingTenant(null)
              setFormData({ nome: '', slug: '', email: '', whatsapp: '' })
              setIsModalOpen(true)
            }}
            className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition-colors"
          >
            Adicionar Loja
          </button>
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
                        <button
                          onClick={() => {
                            setEditingTenant(tenant)
                            setFormData({
                              nome: tenant.nome || '',
                              slug: tenant.slug || '',
                              email: tenant.email || '',
                              whatsapp: (tenant as any).whatsapp || '',
                            })
                            setIsModalOpen(true)
                          }}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Editar
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

      {/* Modal Criar/Editar Loja */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800">
                {editingTenant ? 'Editar Loja' : 'Nova Loja'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Nome da Loja"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={e => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="slug-da-loja"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp (Opcional)</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="51999999999"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTenant}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar Loja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
