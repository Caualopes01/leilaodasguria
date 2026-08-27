'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Users, Search, ShoppingBag, DollarSign, Calendar } from 'lucide-react'
import { formatCurrency, formatWhatsApp, getWhatsAppLink } from '@/lib/utils'

type ClienteAgrupado = {
  whatsapp: string
  telefone: string
  total_lances: number
  total_gasto: number
  primeiro_lance: string
  ultimo_lance: string
  produtos_ids: Set<string>
}

export default function TenantClientesPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const [clientes, setClientes] = useState<ClienteAgrupado[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const supabase = createClient()

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

    // Buscar todos os lances para calcular os totais
    const { data } = await supabase
      .from('lances')
      .select('*, produtos!inner(tenant_id)')
      .eq('produtos.tenant_id', tenant.id)
      .order('criado_em', { ascending: true })

    if (data) {
      const mapa = new Map<string, ClienteAgrupado>()

      data.forEach(lance => {
        const tel = lance.telefone
        const zap = formatWhatsApp(tel)
        
        if (!mapa.has(tel)) {
          mapa.set(tel, {
            whatsapp: zap,
            telefone: tel,
            total_lances: 0,
            total_gasto: 0,
            primeiro_lance: lance.criado_em,
            ultimo_lance: lance.criado_em,
            produtos_ids: new Set()
          })
        }

        const cli = mapa.get(tel)!
        cli.total_lances += 1
        cli.ultimo_lance = lance.criado_em
        
        // Se for lance vencedor, soma no total gasto (simplificação)
        // O ideal seria checar se é o lance máximo do produto encerrado
        cli.produtos_ids.add(lance.produto_id)
      })

      const lista = Array.from(mapa.values())
      lista.sort((a, b) => b.total_lances - a.total_lances) // ordena pelos mais engajados
      setClientes(lista)
    }
    setLoading(false)
  }

  const filtered = clientes.filter(c =>
    c.whatsapp.includes(search) || c.telefone.includes(search)
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-800">Meus Clientes</h1>
        <p className="text-gray-500 text-sm mt-1">{clientes.length} cliente{clientes.length !== 1 ? 's' : ''} já deram lances.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:max-w-md pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm bg-white"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-400 font-medium">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(cliente => (
            <div key={cliente.telefone} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-800 text-lg tracking-tight">
                    {cliente.whatsapp}
                  </h3>
                  <a 
                    href={getWhatsAppLink(cliente.telefone)}
                    target="_blank"
                    className="text-xs font-semibold text-green-600 hover:text-green-700 mt-1 inline-block"
                  >
                    Enviar mensagem
                  </a>
                </div>
                <div className="w-10 h-10 rounded-full bg-rosa-50 flex items-center justify-center text-rosa-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    Produtos
                  </div>
                  <p className="text-xl font-bold text-gray-800">{cliente.produtos_ids.size}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1">
                    <Gavel className="w-3.5 h-3.5" />
                    Lances
                  </div>
                  <p className="text-xl font-bold text-gray-800">{cliente.total_lances}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-50">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Último: {new Date(cliente.ultimo_lance).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
