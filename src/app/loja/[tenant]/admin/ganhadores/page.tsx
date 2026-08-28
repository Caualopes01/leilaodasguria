'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { Trophy, Check, Phone, X, ExternalLink, PackageCheck, Banknote, ListTodo } from 'lucide-react'
import { formatWhatsApp, getWhatsAppLink } from '@/lib/utils'

export default function TenantGanhadoresPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [vencedores, setVencedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLance, setSelectedLance] = useState<any | null>(null)
  
  // Controle de abas
  const [activeTab, setActiveTab] = useState<'pendentes' | 'concluidos'>('pendentes')

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

    // Buscar produtos encerrados (ativos e inativos para termos pendentes e concluidos)
    const { data: prods } = await supabase
      .from('produtos')
      .select('id, titulo, slug, ativo, pedido_separado, pago')
      .eq('tenant_id', tenant.id)
      .eq('status', 'encerrado')

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

  async function toggleStatus(produtoId: string, campo: 'pedido_separado' | 'pago', valorAtual: boolean) {
    const newValue = !valorAtual
    
    // Atualiza localmente (optimistic UI)
    setVencedores(prev => prev.map(v => {
      if (v.produto_id === produtoId) {
        return { ...v, produto: { ...v.produto, [campo]: newValue } }
      }
      return v
    }))

    // Salva no banco
    await supabase.from('produtos').update({ [campo]: newValue }).eq('id', produtoId)
  }

  async function marcarComoEntregue(produtoId: string) {
    if (!confirm('Deseja marcar como entregue e enviar para a lista de concluídos?')) return
    
    // Atualiza para ativo = false (concluído)
    setVencedores(prev => prev.map(v => {
      if (v.produto_id === produtoId) {
        return { ...v, produto: { ...v.produto, ativo: false, pedido_separado: true, pago: true } }
      }
      return v
    }))

    await supabase.from('produtos').update({ 
      ativo: false,
      pedido_separado: true, // Força os outros status para true se já está entregue
      pago: true
    }).eq('id', produtoId)
  }

  // Filtragem das listas pelas abas
  const pendentes = vencedores.filter(v => v.produto?.ativo === true)
  const concluidos = vencedores.filter(v => v.produto?.ativo === false)

  const displayList = activeTab === 'pendentes' ? pendentes : concluidos

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="font-display text-2xl lg:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-7 h-7 text-rosa-600" />
            Gestão de Ganhadores
          </h1>
          <p className="text-gray-500 text-sm mt-1">Acompanhe as etapas de separação, pagamento e entrega.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 bg-gray-100/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('pendentes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'pendentes'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          <ListTodo className="w-4 h-4" />
          Pendentes
          {pendentes.length > 0 && (
            <span className="ml-1.5 bg-rosa-100 text-rosa-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {pendentes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('concluidos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'concluidos'
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
          }`}
        >
          <Check className="w-4 h-4" />
          Concluídos
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-rosa-200 border-t-rosa-600 rounded-full animate-spin" />
        </div>
      ) : displayList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-gray-300" />
          </div>
          <p className="text-gray-500 font-medium text-lg">Nenhum leilão {activeTab === 'pendentes' ? 'pendente' : 'concluído'}</p>
          <p className="text-gray-400 text-sm mt-1">
            {activeTab === 'pendentes' 
              ? 'Todos os ganhadores já foram despachados.' 
              : 'Nenhum leilão foi marcado como entregue ainda.'}
          </p>
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
                  
                  {/* Colunas de Status (Apenas para Pendentes) */}
                  {activeTab === 'pendentes' ? (
                    <>
                      <th className="px-4 py-4 font-semibold text-center border-l border-gray-100 bg-gray-50/50">Pedido Separado</th>
                      <th className="px-4 py-4 font-semibold text-center border-l border-gray-100 bg-gray-50/50">Pago</th>
                      <th className="px-4 py-4 font-semibold text-center border-l border-gray-100 bg-gray-50/50">Entregue</th>
                    </>
                  ) : (
                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayList.map(v => (
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
                    
                    {activeTab === 'pendentes' ? (
                      <>
                        <td className="px-4 py-4 text-center border-l border-gray-50">
                          <label className="flex items-center justify-center cursor-pointer group h-full w-full">
                            <input 
                              type="checkbox" 
                              checked={v.produto?.pedido_separado || false}
                              onChange={() => toggleStatus(v.produto_id, 'pedido_separado', v.produto?.pedido_separado || false)}
                              className="w-5 h-5 text-rosa-600 border-gray-300 rounded focus:ring-rosa-600 focus:ring-2 cursor-pointer transition-colors" 
                            />
                          </label>
                        </td>
                        <td className="px-4 py-4 text-center border-l border-gray-50">
                          <label className="flex items-center justify-center cursor-pointer group h-full w-full">
                            <input 
                              type="checkbox" 
                              checked={v.produto?.pago || false}
                              onChange={() => toggleStatus(v.produto_id, 'pago', v.produto?.pago || false)}
                              className="w-5 h-5 text-emerald-600 border-gray-300 rounded focus:ring-emerald-600 focus:ring-2 cursor-pointer transition-colors" 
                            />
                          </label>
                        </td>
                        <td className="px-4 py-4 text-center border-l border-gray-50">
                          <button
                            onClick={() => marcarComoEntregue(v.produto_id)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-white hover:border-emerald-600 hover:bg-emerald-600 transition-all shadow-sm font-medium text-xs w-full"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Finalizar
                          </button>
                        </td>
                      </>
                    ) : (
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap">
                          <Check className="w-3.5 h-3.5" /> Entregue
                        </span>
                      </td>
                    )}
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
