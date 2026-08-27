'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, ExternalLink, Trophy, History, Package, Loader2, Trash2 } from 'lucide-react'
import { formatCurrency, formatWhatsApp, getWhatsAppLink } from '@/lib/utils'
import { toast } from 'sonner'

export default function TenantHistoricoLancesPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const id = params.id as string
  const [produto, setProduto] = useState<any>(null)
  const [lances, setLances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadProduto()
  }, [id, tenantSlug])

  async function loadProduto() {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) return

    const { data: p } = await supabase
      .from('produtos')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenant.id)
      .single()

    if (p) {
      setProduto(p)
      const { data: listLances } = await supabase
        .from('lances')
        .select('*')
        .eq('produto_id', p.id)
        .order('valor', { ascending: false })
      
      setLances(listLances || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    const channel = supabase
      .channel(`lances-historico-${id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'lances',
        filter: `produto_id=eq.${id}`
      }, (payload) => {
        const newLance = payload.new
        setLances(prev => {
          if (prev.some(l => l.id === newLance.id)) return prev;
          const updated = [...prev, newLance]
          return updated.sort((a, b) => b.valor - a.valor)
        })
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'lances',
        filter: `produto_id=eq.${id}`
      }, (payload) => {
        const deletedId = payload.old.id
        setLances(prev => prev.filter(l => l.id !== deletedId))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id, supabase])

  async function deleteLance(lanceId: string) {
    if (!confirm('Tem certeza que deseja cancelar este lance? Ele será apagado e não pode ser desfeito.')) return
    const { error } = await supabase.from('lances').delete().eq('id', lanceId)
    if (error) {
      toast.error('Erro ao excluir lance')
    } else {
      toast.success('Lance excluído')
      // atualizar valor_atual do produto
      const { data: remainingLances } = await supabase
        .from('lances')
        .select('valor')
        .eq('produto_id', id)
        
      const maxL = remainingLances && remainingLances.length > 0 
        ? Math.max(...remainingLances.map(l => l.valor)) 
        : (produto.valor_inicial || 0)
        
      await supabase.from('produtos').update({ valor_atual: maxL }).eq('id', id)
      setProduto(prev => ({ ...prev, valor_atual: maxL }))
    }
  }

  const basePath = `/loja/${tenantSlug}/admin`

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-rosa-600 animate-spin" />
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Produto não encontrado.</p>
        <Link href={`${basePath}/produtos`} className="text-rosa-600 font-semibold mt-4 inline-block hover:underline">
          Voltar para produtos
        </Link>
      </div>
    )
  }

  const vencedor = lances.length > 0 ? lances[0] : null
  const outrosLances = lances.slice(1)
  const resolvidoAguardando = !produto.ativo && produto.status !== 'encerrado'

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href={`${basePath}/lances`} className="p-2 rounded-lg hover:bg-rosa-50 text-gray-500 hover:text-rosa-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">Histórico de Lances</h1>
          <p className="text-gray-500 text-sm mt-1">
            {lances.length} lance{lances.length !== 1 ? 's' : ''} registrado{lances.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <div className="aspect-square bg-gray-50 relative">
              {produto.imagens?.[0] ? (
                <img src={produto.imagens[0]} alt={produto.titulo} className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                  <Package className="w-12 h-12" />
                </div>
              )}
            </div>
            <div className="p-4">
              <h2 className="font-bold text-gray-800 text-lg mb-1">{produto.titulo}</h2>
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span>Inicial: {formatCurrency(produto.valor_inicial)}</span>
                <span className="font-semibold text-rosa-600 text-base">{formatCurrency(produto.valor_atual)}</span>
              </div>
              <Link 
                href={`/loja/${tenantSlug}/leilao/${produto.slug}`}
                target="_blank"
                className="flex items-center justify-center gap-2 w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium text-sm transition-colors border border-gray-200"
              >
                Ver na loja
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {lances.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center h-full flex flex-col items-center justify-center shadow-sm">
              <History className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="font-bold text-gray-800 mb-1">Nenhum lance ainda</h3>
              <p className="text-sm text-gray-500">Este produto não recebeu nenhum lance.</p>
            </div>
          ) : (
            <>
              {vencedor && (
                <div className="bg-white rounded-2xl border border-green-200 p-1 shadow-sm overflow-hidden relative">
                  <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-bl-xl z-10">
                    Ganhador Atual
                  </div>
                  <div className="bg-green-50/50 rounded-xl p-5 border border-green-100/50">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Trophy className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-lg">{formatWhatsApp(vencedor.telefone)}</p>
                            <p className="text-xs text-green-700 font-medium">{new Date(vencedor.criado_em).toLocaleString('pt-BR')}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-display font-bold text-2xl text-green-600">{formatCurrency(vencedor.valor)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <a 
                            href={getWhatsAppLink(vencedor.telefone)}
                            target="_blank"
                            className="flex-1 text-center bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg font-semibold text-sm transition-colors"
                          >
                            Chamar no WhatsApp
                          </a>
                          <button onClick={() => deleteLance(vencedor.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {outrosLances.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                      <History className="w-4 h-4 text-gray-400" />
                      Lances Anteriores ({outrosLances.length})
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {outrosLances.map((lance, idx) => (
                      <div key={lance.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-400">
                            {idx + 2}º
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{formatWhatsApp(lance.telefone)}</p>
                            <p className="text-xs text-gray-400">{new Date(lance.criado_em).toLocaleString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="font-bold text-gray-600">{formatCurrency(lance.valor)}</p>
                          <button onClick={() => deleteLance(lance.id)} className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
