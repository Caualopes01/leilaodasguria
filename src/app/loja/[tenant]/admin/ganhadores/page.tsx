'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Trophy, Check, Phone, X, ExternalLink } from 'lucide-react'
import { formatWhatsApp, getWhatsAppLink } from '@/lib/utils'

export default function TenantGanhadoresPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [vencedores, setVencedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLance, setSelectedLance] = useState<any | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [tenantSlug])

  async function loadData() {
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', tenantSlug)
      .single()

    if (!tenant) {
      setLoading(false)
      return
    }
    setTenantId(tenant.id)

    // Buscar produtos encerrados
    const { data: prods } = await supabase
      .from('produtos')
      .select('id, titulo, slug')
      .eq('tenant_id', tenant.id)
      .eq('status', 'encerrado')
      .eq('ativo', true) // Apenas os que ainda não foram marcados como entregues

    if (!prods || prods.length === 0) {
      setVencedores([])
      setLoading(false)
      return
    }

    // Buscar o maior lance de cada produto encerrado
    const results = []
    for (const prod of prods) {
      const { data: lance } = await supabase
        .from('lances')
        .select('*')
        .eq('produto_id', prod.id)
        .order('valor', { ascending: false })
        .limit(1)
        .single()
        
      if (lance) {
        results.push({ ...lance, produto: prod })
      }
    }
    
    // Ordernar por data mais recente
    results.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime())
    setVencedores(results)
    setLoading(false)
  }

  async function marcarComoEntregue(e: React.MouseEvent, produtoId: string) {
    e.stopPropagation()
    if (!confirm('Deseja marcar como entregue e remover da lista de pendentes?')) return
    
    setVencedores(prev => prev.filter(v => v.produto_id !== produtoId))
    await supabase.from('produtos').update({ ativo: false }).eq('id', produtoId)
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between pb-2 border-b border-gray-200">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-rosa-600" />
            Últimos Ganhadores
          </h1>
          <p className="text-gray-500 text-sm mt-1">Lista de leilões encerrados pendentes de entrega.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
        </div>
      ) : vencedores.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium text-lg">Nenhum leilão pendente</p>
          <p className="text-gray-400 text-sm mt-1">Todos os ganhadores já foram marcados como entregues.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-4 font-semibold">Cliente</th>
                  <th className="px-6 py-4 font-semibold">Produto Arrematado</th>
                  <th className="px-6 py-4 font-semibold text-right">Valor Final</th>
                  <th className="px-6 py-4 font-semibold text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vencedores.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div 
                        className="flex items-center gap-3 cursor-pointer group"
                        onClick={() => setSelectedLance(v)}
                      >
                        <div className="w-10 h-10 rounded-full bg-rosa-100 flex items-center justify-center text-rosa-700 font-bold shrink-0 border border-rosa-200 shadow-sm group-hover:scale-105 transition-transform">
                          {v.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-gray-900 block">{v.nome}</span>
                          <span className="text-xs text-rosa-600 font-medium flex items-center gap-1 mt-0.5 group-hover:underline">
                            <Phone className="w-3 h-3" /> Ver contato
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-800">{v.produto?.titulo}</span>
                        <a 
                          href={`/loja/${tenantSlug}/leilao/${v.produto?.slug}`} 
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-gray-400 hover:text-rosa-600 flex items-center gap-1 mt-0.5 w-fit"
                        >
                          <ExternalLink className="w-3 h-3" /> Abrir vitrine
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-gray-900 text-base">{formatCurrency(v.valor)}</span>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(v.criado_em).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold whitespace-nowrap">
                        Aguardando Pagto/Envio
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => marcarComoEntregue(e, v.produto_id)}
                        className="inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 transition-all shadow-sm font-medium"
                      >
                        <Check className="w-4 h-4" />
                        Concluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalhes do Lance */}
      {selectedLance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedLance(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-fade-in">
            <div className="flex items-start justify-between mb-5">
              <h3 className="font-display font-bold text-lg text-gray-900">Detalhes do Ganhador</h3>
              <button onClick={() => setSelectedLance(null)} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-gray-700 font-bold shadow-sm border border-gray-200 text-lg">
                  {selectedLance.nome.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{selectedLance.nome}</p>
                  <p className="text-xs text-gray-500 font-medium">Lance vencedor via Web</p>
                </div>
              </div>

              <div className="space-y-4 px-1">
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Produto arrematado</p>
                  <p className="text-sm font-bold text-gray-800">{selectedLance.produto?.titulo}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1 font-medium">Valor Final</p>
                  <p className="text-xl font-black text-emerald-600">{formatCurrency(selectedLance.valor)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100">
                  <p className="text-xs text-green-800 mb-1 font-semibold">Contato WhatsApp</p>
                  <p className="flex items-center gap-2 text-sm font-bold text-green-700">
                    <Phone className="w-4 h-4" />
                    {selectedLance.whatsapp ? formatWhatsApp(selectedLance.whatsapp) : 'Não informado'}
                  </p>
                </div>
              </div>

              <a 
                href={getWhatsAppLink(selectedLance.whatsapp || '', `Olá ${selectedLance.nome.split(' ')[0]}, parabéns! Você foi o ganhador do leilão do produto "${selectedLance.produto?.titulo}" com o lance de ${formatCurrency(selectedLance.valor)}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebd5b] text-white font-bold py-3.5 rounded-xl transition-all shadow-sm shadow-[#25D366]/30 mt-4"
              >
                Chamar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
