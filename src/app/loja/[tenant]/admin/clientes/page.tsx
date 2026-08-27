'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Users, Search, Edit2, MessageCircle, X } from 'lucide-react'
import { formatWhatsApp, getWhatsAppLink } from '@/lib/utils'
import PhoneInput from '@/components/PhoneInput'
import { toast } from 'sonner'

type Cliente = {
  nome: string
  whatsapp: string
  totalLances: number
  ultimoLance: string
}

export default function TenantClientesPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [editPhone, setEditPhone] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadClientes()
  }, [tenantSlug])

  async function loadClientes() {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) return
    setTenantId(tenant.id)

    const { data } = await supabase
      .from('lances')
      .select('*, produtos!inner(tenant_id)')
      .eq('produtos.tenant_id', tenant.id)
      .order('criado_em', { ascending: false })

    if (data) {
      const clientesMap = new Map<string, Cliente>()

      for (const lance of data) {
        // Clean whatsapp to ensure uniqueness
        if (!lance.whatsapp) continue
        const wp = String(lance.whatsapp).replace(/\D/g, '')
        if (!wp) continue

        const existing = clientesMap.get(wp)
        if (existing) {
          existing.totalLances += 1
          // Since it's ordered by descending created_at, the first one seen is the most recent
          if (new Date(lance.criado_em) > new Date(existing.ultimoLance)) {
            existing.ultimoLance = lance.criado_em
          }
        } else {
          clientesMap.set(wp, {
            nome: lance.nome || 'Sem Nome',
            whatsapp: lance.whatsapp,
            totalLances: 1,
            ultimoLance: lance.criado_em,
          })
        }
      }

      setClientes(Array.from(clientesMap.values()))
    }
    setLoading(false)
  }

  async function handleSavePhone() {
    if (!editingCliente || !tenantId) return
    setIsUpdating(true)
    
    const cleanOld = editingCliente.whatsapp.replace(/\D/g, '')
    
    // Precisamos achar os lances deste tenant que tem o whatsapp antigo
    const { data: lancesParaAtualizar } = await supabase
      .from('lances')
      .select('id, whatsapp, produtos!inner(tenant_id)')
      .eq('produtos.tenant_id', tenantId)
      
    let updated = false
    
    if (lancesParaAtualizar) {
      const idsToUpdate = lancesParaAtualizar
        .filter(l => l.whatsapp && String(l.whatsapp).replace(/\D/g, '') === cleanOld)
        .map(l => l.id)
        
      if (idsToUpdate.length > 0) {
        const { error } = await supabase
          .from('lances')
          .update({ whatsapp: editPhone })
          .in('id', idsToUpdate)

        if (error) {
          toast.error('Erro ao atualizar telefone.')
          console.error(error)
        } else {
          toast.success('Telefone atualizado com sucesso!')
          updated = true
        }
      } else {
         toast.info('Nenhum lance encontrado para este número.')
      }
    }
    
    setIsUpdating(false)
    setEditingCliente(null)
    
    if (updated) {
      loadClientes()
      router.refresh()
    }
  }

  const filtered = clientes.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) || 
    c.whatsapp.includes(search)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-800 flex items-center gap-3">
            <Users className="w-8 h-8 text-rosa-600" />
            Clientes
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {clientes.length} pessoas já participaram dos leilões desta loja.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6 shadow-sm">
        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou whatsapp..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-sm font-semibold text-gray-500">
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">WhatsApp</th>
                <th className="py-3 px-4 text-center">Total de Lances</th>
                <th className="py-3 px-4 text-right">Última Atividade</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    Nenhuma cliente encontrada
                  </td>
                </tr>
              ) : (
                filtered.map((cliente, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-800">{cliente.nome}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-gray-600 text-sm">{formatWhatsApp(cliente.whatsapp)}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center justify-center bg-rosa-50 text-rosa-600 font-bold px-2 py-1 rounded-lg text-xs">
                        {cliente.totalLances}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500 text-sm">
                      {new Date(cliente.ultimoLance).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditingCliente(cliente)
                            setEditPhone(cliente.whatsapp)
                          }}
                          className="inline-flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 w-8 h-8 rounded-lg transition-all"
                          title="Editar Telefone"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <a
                          href={getWhatsAppLink(cliente.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-green-200"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          Chamar
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição */}
      {editingCliente && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-display font-bold text-gray-800 text-lg">Editar WhatsApp</h2>
              <button onClick={() => setEditingCliente(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5">
              <p className="text-sm text-gray-600 mb-4">
                Atualizando contato de: <span className="font-semibold text-gray-900">{editingCliente.nome}</span>
              </p>
              
              <PhoneInput 
                value={editPhone}
                onChange={setEditPhone}
              />
              
              <p className="text-xs text-gray-500 mt-3">
                Isso atualizará o número em todos os {editingCliente.totalLances} lance(s) vinculados a esta pessoa.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button 
                onClick={() => setEditingCliente(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-600 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
                disabled={isUpdating}
              >
                Cancelar
              </button>
              <button 
                onClick={handleSavePhone}
                disabled={isUpdating || !editPhone}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white bg-rosa-600 hover:bg-rosa-700 shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {isUpdating ? 'Salvando...' : 'Salvar Alteração'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
