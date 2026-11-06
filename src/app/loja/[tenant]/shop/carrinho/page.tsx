'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCarrinho } from '@/lib/loja/useCarrinho'
import { formatCurrency } from '@/lib/utils'
import PhoneInput from '@/components/PhoneInput'
import TenantFooterNav from '@/components/TenantFooterNav'
import {
  ShoppingBag,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  MessageCircle,
  Loader2,
  Package,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Heart,
  Store,
  Truck,
  MapPin,
  CreditCard,
  Banknote,
  QrCode,
} from 'lucide-react'
import { toast } from 'sonner'
import { MetodoEntrega, FormaPagamento } from '@/lib/loja-types'

export default function LojaCarrinhoPage() {
  const params = useParams()
  const router = useRouter()
  const tenantSlug = params.tenant as string

  const {
    itens,
    carregado,
    removerItem,
    atualizarQuantidade,
    limparCarrinho,
    totalItens,
    totalValor,
  } = useCarrinho()

  // Dados do formulário
  const [nome, setNome] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [observacao, setObservacao] = useState('')
  const [metodoEntrega, setMetodoEntrega] = useState<MetodoEntrega>('retirar_loja')
  const [endereco, setEndereco] = useState('')
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('pix')
  const [enviando, setEnviando] = useState(false)

  // Recuperar dados persistidos do cliente
  useEffect(() => {
    try {
      const savedNome = localStorage.getItem('loja_cliente_nome') || ''
      const savedWhats = localStorage.getItem('loja_cliente_whatsapp') || ''
      const savedEnd = localStorage.getItem('loja_cliente_endereco') || ''
      if (savedNome) setNome(savedNome)
      if (savedWhats) setWhatsapp(savedWhats)
      if (savedEnd) setEndereco(savedEnd)
    } catch {}
  }, [])

  async function handleFinalizarPedido() {
    if (itens.length === 0) {
      toast.error('Sua sacola está vazia')
      return
    }

    if (!nome.trim()) {
      toast.error('Por favor, informe seu nome completo')
      return
    }

    const cleanWhats = whatsapp.replace(/\D/g, '')
    if (!cleanWhats || cleanWhats.length < 10) {
      toast.error('Informe um WhatsApp válido com DDD')
      return
    }

    if ((metodoEntrega === 'tele_entrega' || metodoEntrega === 'correios') && endereco.trim().length < 5) {
      toast.error('Por favor, informe seu endereço completo de entrega')
      return
    }

    setEnviando(true)

    // Salvar dados no localStorage para próximas compras
    try {
      localStorage.setItem('loja_cliente_nome', nome.trim())
      localStorage.setItem('loja_cliente_whatsapp', cleanWhats)
      if (endereco.trim()) {
        localStorage.setItem('loja_cliente_endereco', endereco.trim())
      }
    } catch {}

    try {
      const res = await fetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_nome: nome.trim(),
          cliente_whatsapp: cleanWhats,
          observacao: observacao.trim() || undefined,
          metodo_entrega: metodoEntrega,
          endereco: (metodoEntrega === 'tele_entrega' || metodoEntrega === 'correios') ? endereco.trim() : undefined,
          forma_pagamento: formaPagamento,
          itens: itens.map(it => ({
            produtoId: it.produtoId,
            tamanho: it.tamanho,
            quantidade: it.quantidade,
          })),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.sucesso) {
        toast.error(data.erro || 'Falha ao processar pedido. Tente novamente.')
        setEnviando(false)
        return
      }

      toast.success(`Pedido #${data.numero} criado com sucesso!`, {
        description: 'Redirecionando você para o WhatsApp...',
      })

      // Limpar a sacola local
      limparCarrinho()

      // Redirecionar para o WhatsApp oficial com a mensagem pré-formatada
      setTimeout(() => {
        window.location.href = data.whatsappUrl
      }, 1200)
    } catch (err: any) {
      console.error('Erro ao finalizar pedido:', err)
      toast.error('Erro de conexão ao enviar o pedido.')
      setEnviando(false)
    }
  }

  if (!carregado) {
    return (
      <div className="min-h-screen bg-pink-50/20 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-8 h-8 text-rosa-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-gray-500">Carregando sacola de compras...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pink-50/20 pb-32">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-rosa-100 shadow-xs">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/loja/${tenantSlug}/shop`}
            className="flex items-center gap-2 p-2 -ml-2 rounded-xl text-gray-600 hover:text-rosa-600 hover:bg-rosa-50 transition-colors text-xs font-bold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continuar Comprando</span>
          </Link>

          <h1 className="font-display font-bold text-base text-gray-900 flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-rosa-600" />
            Minha Sacola
          </h1>

          {itens.length > 0 && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja esvaziar toda a sacola?')) {
                  limparCarrinho()
                  toast.success('Sacola esvaziada')
                }
              }}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Esvaziar
            </button>
          )}
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-5">
        {itens.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-rosa-100 p-8 shadow-xs space-y-4">
            <div className="w-16 h-16 bg-rosa-50 text-rosa-400 rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">Sua sacola está vazia</h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto">
              Nenhuma peça foi adicionada à sacola ainda. Explore nosso catálogo e escolha seus looks favoritos!
            </p>
            <Link
              href={`/loja/${tenantSlug}/shop`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-rosa-600 hover:bg-rosa-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Ver Coleção de Roupas</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Lista de Peças na Sacola */}
            <div className="bg-white rounded-3xl border border-rosa-100/80 p-4 sm:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Itens Selecionados ({totalItens})
                </span>
                <span className="text-xs text-rosa-600 font-semibold">
                  Preços oficiais garantidos
                </span>
              </div>

              <div className="space-y-3">
                {itens.map((item, index) => {
                  const key = `${item.produtoId}-${item.tamanho || 'default'}-${index}`
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 p-3 bg-gray-50/70 hover:bg-gray-50 rounded-2xl border border-gray-100 transition-colors"
                    >
                      {/* Foto e Informações */}
                      <div className="flex items-center gap-3 min-w-0">
                        <Link
                          href={`/loja/${tenantSlug}/shop/${item.slug}`}
                          className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200"
                        >
                          {item.imagem ? (
                            <img
                              src={item.imagem}
                              alt={item.titulo}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <Package className="w-6 h-6" />
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0">
                          <Link
                            href={`/loja/${tenantSlug}/shop/${item.slug}`}
                            className="font-bold text-xs sm:text-sm text-gray-900 hover:text-rosa-600 line-clamp-1 block transition-colors"
                          >
                            {item.titulo}
                          </Link>

                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {item.tamanho && (
                              <span className="px-2 py-0.5 bg-rosa-100/80 text-rosa-700 text-[10px] font-bold rounded-md">
                                Tam. {item.tamanho}
                              </span>
                            )}
                            <span className="text-xs font-bold text-gray-700">
                              {formatCurrency(item.precoUnitario)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Controles de Quantidade & Excluir */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center border border-gray-200 rounded-xl bg-white p-0.5 shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              atualizarQuantidade(item.produtoId, item.tamanho, item.quantidade - 1)
                            }
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-rosa-600 transition-colors"
                            title="Diminuir quantidade"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center font-bold text-xs text-gray-900">
                            {item.quantidade}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              atualizarQuantidade(item.produtoId, item.tamanho, item.quantidade + 1)
                            }
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-rosa-600 transition-colors"
                            title="Aumentar quantidade"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removerItem(item.produtoId, item.tamanho)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          title="Remover peça"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Resumo Financeiro */}
            <div className="bg-white rounded-3xl border border-rosa-100/80 p-4 sm:p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Resumo do Pedido
              </h3>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal das peças ({totalItens} {totalItens === 1 ? 'item' : 'itens'}):</span>
                  <span className="font-bold text-gray-900">{formatCurrency(totalValor)}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Frete / Envio:</span>
                  <span className="text-emerald-600 font-semibold">A combinar via WhatsApp</span>
                </div>

                <div className="pt-2 border-t border-gray-100 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-gray-900">Total a Pagar:</span>
                  <span className="text-xl sm:text-2xl font-black text-rosa-600">
                    {formatCurrency(totalValor)}
                  </span>
                </div>
              </div>
            </div>

            {/* Formulário de Identificação do Cliente */}
            <div className="bg-white rounded-3xl border border-rosa-100/80 p-4 sm:p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  1. Seus Dados de Contato
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Preencha para enviarmos o resumo pronto para seu atendimento no WhatsApp.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Seu Nome Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={nome}
                    onChange={e => setNome(e.target.value)}
                    placeholder="Ex: Amanda Silva"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Seu WhatsApp com DDD *
                </label>
                <PhoneInput value={whatsapp} onChange={setWhatsapp} />
              </div>
            </div>

            {/* Como deseja receber o pedido? */}
            <div className="bg-white rounded-3xl border border-rosa-100/80 p-4 sm:p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  2. Forma de Recebimento *
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Escolha como prefere receber seus produtos.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* Opção Retirar na Loja */}
                <button
                  type="button"
                  onClick={() => setMetodoEntrega('retirar_loja')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    metodoEntrega === 'retirar_loja'
                      ? 'border-rosa-500 bg-rosa-50/50 ring-2 ring-rosa-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        metodoEntrega === 'retirar_loja'
                          ? 'bg-rosa-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Store className="w-4 h-4" />
                    </div>
                    {metodoEntrega === 'retirar_loja' && (
                      <CheckCircle2 className="w-4 h-4 text-rosa-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">Retirar na Loja</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Sem taxa de entrega</p>
                  </div>
                </button>

                {/* Opção Tele-entrega */}
                <button
                  type="button"
                  onClick={() => setMetodoEntrega('tele_entrega')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    metodoEntrega === 'tele_entrega'
                      ? 'border-rosa-500 bg-rosa-50/50 ring-2 ring-rosa-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        metodoEntrega === 'tele_entrega'
                          ? 'bg-rosa-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                    </div>
                    {metodoEntrega === 'tele_entrega' && (
                      <CheckCircle2 className="w-4 h-4 text-rosa-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">Tele-entrega</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Motoboy na sua cidade</p>
                  </div>
                </button>

                {/* Opção Correios */}
                <button
                  type="button"
                  onClick={() => setMetodoEntrega('correios')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    metodoEntrega === 'correios'
                      ? 'border-rosa-500 bg-rosa-50/50 ring-2 ring-rosa-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        metodoEntrega === 'correios'
                          ? 'bg-rosa-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                    </div>
                    {metodoEntrega === 'correios' && (
                      <CheckCircle2 className="w-4 h-4 text-rosa-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">Correios</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Envio PAC / Sedex</p>
                  </div>
                </button>
              </div>

              {/* Campo de Endereço se Tele-entrega ou Correios */}
              {(metodoEntrega === 'tele_entrega' || metodoEntrega === 'correios') && (
                <div className="pt-2 border-t border-gray-100 space-y-1.5 animate-in fade-in-50 duration-200">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Endereço Completo para Entrega *
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-rosa-500 absolute left-3.5 top-3" />
                    <textarea
                      value={endereco}
                      onChange={e => setEndereco(e.target.value)}
                      rows={2}
                      placeholder="Rua, número, complemento/apartamento, bairro e cidade"
                      className="w-full pl-10 pr-4 py-2.5 border border-rosa-200 bg-rosa-50/20 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all resize-none text-gray-800"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    A taxa de envio será combinada com a loja pelo WhatsApp.
                  </p>
                </div>
              )}
            </div>

            {/* Forma de Pagamento */}
            <div className="bg-white rounded-3xl border border-rosa-100/80 p-4 sm:p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  3. Forma de Pagamento *
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Como você prefere realizar o pagamento?
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {/* PIX */}
                <button
                  type="button"
                  onClick={() => setFormaPagamento('pix')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    formaPagamento === 'pix'
                      ? 'border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        formaPagamento === 'pix'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <QrCode className="w-4 h-4" />
                    </div>
                    {formaPagamento === 'pix' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-bold text-gray-900">PIX</p>
                      <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded">
                        Rápido
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">Chave enviada no WhatsApp</p>
                  </div>
                </button>

                {/* Cartão de Crédito */}
                <button
                  type="button"
                  onClick={() => setFormaPagamento('cartao_credito')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    formaPagamento === 'cartao_credito'
                      ? 'border-rosa-500 bg-rosa-50/50 ring-2 ring-rosa-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        formaPagamento === 'cartao_credito'
                          ? 'bg-rosa-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <CreditCard className="w-4 h-4" />
                    </div>
                    {formaPagamento === 'cartao_credito' && (
                      <CheckCircle2 className="w-4 h-4 text-rosa-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">Cartão de Crédito</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Link de pagamento ou maquininha</p>
                  </div>
                </button>

                {/* Dinheiro */}
                <button
                  type="button"
                  onClick={() => setFormaPagamento('dinheiro')}
                  className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                    formaPagamento === 'dinheiro'
                      ? 'border-rosa-500 bg-rosa-50/50 ring-2 ring-rosa-500/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        formaPagamento === 'dinheiro'
                          ? 'bg-rosa-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                    </div>
                    {formaPagamento === 'dinheiro' && (
                      <CheckCircle2 className="w-4 h-4 text-rosa-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-gray-900">Dinheiro</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">Pagamento presencial</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Observações Opcionais */}
            <div className="bg-white rounded-3xl border border-rosa-100/80 p-4 sm:p-5 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  4. Observações <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <textarea
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    rows={2}
                    placeholder="Ex: Prefiro receber no período da tarde, embalagem para presente..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Botão de Finalização WhatsApp */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleFinalizarPedido}
                disabled={enviando}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 disabled:opacity-60 text-white rounded-2xl font-black text-sm sm:text-base shadow-lg shadow-emerald-700/25 transition-all flex items-center justify-center gap-2.5"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Preparando seu pedido...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    <span>Finalizar Pedido pelo WhatsApp 🛍️</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Atendimento direto e seguro com as vendedoras da loja</span>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Menu do Rodapé */}
      <TenantFooterNav />
    </div>
  )
}
