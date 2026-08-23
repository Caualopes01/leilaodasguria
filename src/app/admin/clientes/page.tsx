'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { formatWhatsApp, getWhatsAppLink } from '@/lib/utils'
import { Users, MessageCircle, ArrowUpRight, Search } from 'lucide-react'

type Cliente = {
  nome: string
  whatsapp: string
  totalLances: number
  ultimoLance: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadClientes()
  }, [])

  async function loadClientes() {
    const { data: lances, error } = await supabase
      .from('lances')
      .select('nome, whatsapp, criado_em')
      .order('criado_em', { ascending: false })

    if (error || !lances) {
      console.error(error)
      setLoading(false)
      return
    }

    const clientesMap = new Map<string, Cliente>()

    for (const lance of lances) {
      // Clean whatsapp to ensure uniqueness
      const wp = lance.whatsapp.replace(/\D/g, '')
      if (!wp) continue

      const existing = clientesMap.get(wp)
      if (existing) {
        existing.totalLances += 1
      } else {
        clientesMap.set(wp, {
          nome: lance.nome,
          whatsapp: lance.whatsapp,
          totalLances: 1,
          ultimoLance: lance.criado_em,
        })
      }
    }

    // Convert map to array and sort by most recent activity
    const arr = Array.from(clientesMap.values())
    setClientes(arr)
    setLoading(false)
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
            {clientes.length} pessoas já participaram dos leilões.
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
                      <a
                        href={getWhatsAppLink(cliente.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm shadow-green-200"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chamar
                      </a>
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
