'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, Produto, Lance } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
  Package, TrendingUp, Clock, Trophy,
  ArrowRight, Plus, ExternalLink
} from 'lucide-react'

export default function DashboardPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [lancesRecentes, setLancesRecentes] = useState<(Lance & { produto: Produto })[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [{ data: prods }, { data: lances }] = await Promise.all([
      supabase.from('produtos').select('*').order('criado_em', { ascending: false }),
      supabase.from('lances').select('*, produto:produtos(*)').order('criado_em', { ascending: false }).limit(10),
    ])
    setProdutos(prods || [])
    setLancesRecentes((lances as any) || [])
    setLoading(false)
  }

  const ativos = produtos.filter(p => p.status === 'ativo').length
  const encerrados = produtos.filter(p => p.status === 'encerrado')
  const aguardando = produtos.filter(p => p.status === 'aguardando').length

  // Ganhadores (maior lance de cada produto encerrado)
  const [vencedores, setVencedores] = useState<any[]>([])

  useEffect(() => {
    if (encerrados.length > 0) {
      loadVencedores(encerrados.map(p => p.id))
    }
  }, [produtos])

  async function loadVencedores(ids: string[]) {
    const results = []
    for (const id of ids.slice(0, 5)) {
      const { data } = await supabase
        .from('lances')
        .select('*, produto:produtos(titulo, slug)')
        .eq('produto_id', id)
        .order('valor', { ascending: false })
        .limit(1)
        .single()
      if (data) results.push(data)
    }
    setVencedores(results)
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral dos seus leilões</p>
        </div>
        <Link
          href="/admin/produtos/novo"
          className="flex items-center gap-2 bg-rosa-600 hover:bg-rosa-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-rosa-200"
        >
          <Plus className="w-4 h-4" />
          Novo Produto
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: produtos.length, icon: Package, color: 'bg-blue-50 text-blue-600' },
          { label: 'Ativos', value: ativos, icon: TrendingUp, color: 'bg-green-50 text-green-600' },
          { label: 'Aguardando', value: aguardando, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
          { label: 'Encerrados', value: encerrados.length, icon: Trophy, color: 'bg-rosa-50 text-rosa-600' },
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Vencedores */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-gray-800 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-rosa-600" />
              Ganhadores
            </h2>
          </div>
          {vencedores.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nenhum leilão encerrado ainda</p>
          ) : (
            <div className="space-y-3">
              {vencedores.map(v => (
                <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl bg-rosa-50">
                  <div className="w-8 h-8 rounded-full bg-rosa-100 flex items-center justify-center text-rosa-600 text-sm font-bold">
                    {v.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{v.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{v.produto?.titulo}</p>
                  </div>
                  <span className="text-sm font-bold text-rosa-600">{formatCurrency(v.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lances recentes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-rosa-600" />
              Lances Recentes
            </h2>
          </div>
          {lancesRecentes.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">Nenhum lance ainda</p>
          ) : (
            <div className="space-y-3">
              {lancesRecentes.slice(0, 6).map(lance => (
                <div key={lance.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-bold">
                    {lance.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{lance.nome}</p>
                    <p className="text-xs text-gray-500 truncate">{(lance as any).produto?.titulo}</p>
                  </div>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(lance.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Produtos ativos */}
      {produtos.filter(p => p.status === 'ativo').length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-bold text-gray-800">Leilões Ativos</h2>
            <Link href="/admin/produtos" className="text-rosa-600 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="space-y-3">
            {produtos.filter(p => p.status === 'ativo').map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl border border-green-100 bg-green-50">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{p.titulo}</p>
                  <p className="text-sm text-gray-500">Lance atual: <span className="text-green-600 font-bold">{formatCurrency(p.valor_atual)}</span></p>
                </div>
                <Link
                  href={`/leilao/${p.slug}`}
                  target="_blank"
                  className="flex items-center gap-1 text-xs text-rosa-600 hover:text-rosa-700 font-medium"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
