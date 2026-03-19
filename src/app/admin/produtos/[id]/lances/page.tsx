'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, ExternalLink, Trophy, History, Package, Loader2 } from 'lucide-react'
import { formatCurrency, formatWhatsApp } from '@/lib/utils'

export default function HistoricoLancesPage({ params }: { params: { id: string } }) {
  const [produto, setProduto] = useState<any>(null)
  const [lances, setLances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProduto()
  }, [])

  async function loadProduto() {
    // Busca dados do produto
    const { data: p } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', params.id)
      .single()

    if (p) {
      setProduto(p)
      // Busca histórico de lances
      const { data: listLances } = await supabase
        .from('lances')
        .select('*')
        .eq('produto_id', p.id)
        .order('valor', { ascending: false })
      
      setLances(listLances || [])
    }
    setLoading(false)
  }

  // Realtime para ficar atualizado com novos lances
  useEffect(() => {
    const channel = supabase
      .channel(`lances-historico-${params.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lances',
        filter: `produto_id=eq.${params.id}`
      }, (payload) => {
        const newLance = payload.new
        setLances(prev => {
          const updated = [...prev, newLance]
          return updated.sort((a, b) => b.valor - a.valor)
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Loader2 className="w-8 h-8 text-rosa-500 animate-spin" />
        <p className="text-gray-400 font-medium">Carregando histórico...</p>
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-center">
        <Package className="w-12 h-12 text-gray-300" />
        <p className="text-gray-500 font-medium">Produto não encontrado.</p>
        <button onClick={() => router.back()} className="text-rosa-600 hover:underline mt-2">
          Voltar para Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.push('/admin')}
          className="p-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-rosa-600 mb-1">
            <History className="w-4 h-4" />
            <span className="text-xs font-bold tracking-wider uppercase">Histórico de Lances</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">
            {produto.titulo}
          </h1>
        </div>
        <Link
          href={`/leilao/${produto.slug}`}
          target="_blank"
          className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-rosa-50 text-rosa-600 rounded-xl hover:bg-rosa-100 font-semibold transition-colors text-sm"
        >
          <ExternalLink className="w-4 h-4" />
          Ver na Loja
        </Link>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        {/* Toolbar superior da tabela */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <p className="font-medium text-gray-700">
            Total registrado: <span className="font-bold text-gray-900">{lances.length} lance{lances.length !== 1 && 's'}</span>
          </p>
          <div className="text-sm text-gray-500">
            Maior lance: <span className="font-bold text-green-600">{lances[0] ? formatCurrency(lances[0].valor) : 'N/A'}</span>
          </div>
        </div>

        {/* Tabela de Histórico */}
        {lances.length === 0 ? (
          <div className="p-12 text-center">
            <History className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Este produto ainda não recebeu lances.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-16 text-center">Pos</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Cliente</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data / Hora</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {lances.map((lance, index) => {
                  const isWinner = index === 0
                  
                  return (
                    <tr 
                      key={lance.id} 
                      className={`group hover:bg-gray-50/80 transition-colors ${
                        isWinner ? 'bg-green-50/30' : 'bg-white'
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          {isWinner ? (
                            <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center shadow-sm border border-yellow-200">
                              <Trophy className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm">
                              {index + 1}º
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 min-w-[200px]">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${
                            isWinner ? 'bg-green-100 text-green-700' : 'bg-rosa-100 text-rosa-700'
                          }`}>
                            {lance.nome.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className={`font-bold ${isWinner ? 'text-gray-900' : 'text-gray-700'}`}>
                              {lance.nome}
                            </p>
                            <a 
                              href={`https://wa.me/${lance.whatsapp.replace(/\D/g, '')}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-sm text-rosa-600 hover:text-rosa-700 hover:underline font-medium"
                            >
                              {formatWhatsApp(lance.whatsapp)}
                            </a>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-gray-900 font-medium">
                          {new Date(lance.criado_em).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(lance.criado_em).toLocaleTimeString('pt-BR')}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-lg font-bold ${
                          isWinner ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {formatCurrency(lance.valor)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
