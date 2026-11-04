'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient, Produto } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import ImageUploader from '@/components/ImageUploader'

function getLocalISOString(dateString: string) {
  if (!dateString) return ''
  const date = new Date(dateString)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

interface ProdutoFormProps {
  produto?: Produto
  tenantId?: string
  basePath?: string
}

export default function ProdutoForm({ produto, tenantId, basePath = '/admin/produtos' }: ProdutoFormProps) {
  const isEditing = !!produto
  const router = useRouter()
  const supabase = createClient()

  const [titulo, setTitulo] = useState(produto?.titulo || '')
  const [descricao, setDescricao] = useState(produto?.descricao || '')
  const [valorInicial, setValorInicial] = useState(produto?.valor_inicial?.toString() || '')
  const [incremento, setIncremento] = useState(produto?.incremento_minimo?.toString() || '1')
  const [inicioEm, setInicioEm] = useState(
    produto?.inicio_em ? getLocalISOString(produto.inicio_em) : ''
  )
  const [fimEm, setFimEm] = useState(
    produto?.fim_em ? getLocalISOString(produto.fim_em) : ''
  )
  const [ativo, setAtivo] = useState(produto?.ativo ?? true)
  const [imagens, setImagens] = useState<string[]>(produto?.imagens || [])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!titulo.trim()) { toast.error('Informe o título'); return }
    if (!valorInicial || isNaN(Number(valorInicial))) { toast.error('Informe o valor inicial'); return }
    if (!inicioEm) { toast.error('Informe a data de início'); return }
    if (!fimEm) { toast.error('Informe a data de fim'); return }
    if (new Date(fimEm) <= new Date(inicioEm)) { toast.error('Data de fim deve ser após o início'); return }

    setSaving(true)

    const slug = isEditing ? produto.slug : slugify(titulo) + '-' + Date.now().toString(36)
    const now = new Date()
    const inicioDate = new Date(inicioEm)
    const fimDate = new Date(fimEm)
    
    let status: Produto['status'] = 'aguardando'
    if (!ativo) {
      status = 'aguardando'
    } else if (now >= fimDate) {
      status = 'encerrado'
    } else {
      status = 'ativo'
    }

    let novoValorAtual = Number(valorInicial)
    if (isEditing) {
      const hasLances = (produto as any).lances && (produto as any).lances.length > 0
      if (hasLances) {
        const maiorLance = Math.max(...(produto as any).lances.map((l: any) => l.valor))
        novoValorAtual = Math.max(Number(valorInicial), maiorLance)
      } else {
        novoValorAtual = Number(valorInicial)
      }
    }

    const payload: any = {
      titulo: titulo.trim(),
      slug,
      descricao: descricao.trim() || null,
      valor_inicial: Number(valorInicial),
      valor_atual: novoValorAtual,
      incremento_minimo: Number(incremento) || 1,
      inicio_em: inicioDate.toISOString(),
      fim_em: fimDate.toISOString(),
      ativo,
      status,
      imagens,
      atualizado_em: new Date().toISOString(),
    }

    if (tenantId) {
      payload.tenant_id = tenantId
    }

    let error
    if (isEditing) {
      ({ error } = await supabase.from('produtos').update(payload).eq('id', produto.id))
    } else {
      ({ error } = await supabase.from('produtos').insert({ ...payload, criado_em: new Date().toISOString() }))
    }

    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
      setSaving(false)
      return
    }

    toast.success(isEditing ? 'Produto atualizado!' : 'Produto criado!')
    router.refresh()
    router.push(basePath)
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={basePath} className="p-2 rounded-lg hover:bg-rosa-50 text-gray-500 hover:text-rosa-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-800">
            {isEditing ? 'Editar Produto' : 'Novo Produto'}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {isEditing ? `Slug: /${produto.slug}` : 'Configure seu leilão'}
          </p>
        </div>
      </div>

      {/* Imagens */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Imagens do Produto</h2>
        <ImageUploader imagens={imagens} setImagens={setImagens} bucket="produtos" />
      </div>

      {/* Dados do produto */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Informações</h2>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Título *</label>
          <input
            type="text"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ex: Bolsa Louis Vuitton"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1.5">Descrição</label>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            placeholder="Descreva o produto, condições, detalhes..."
            rows={4}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none transition-all"
          />
        </div>
      </div>

      {/* Valores */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800">Configurações do Leilão</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Valor Inicial *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
              <input
                type="number"
                value={valorInicial}
                onChange={e => setValorInicial(e.target.value)}
                placeholder="0,00"
                min="0"
                step="0.01"
                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Incremento Mínimo</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
              <input
                type="number"
                value={incremento}
                onChange={e => setIncremento(e.target.value)}
                placeholder="1,00"
                min="0.01"
                step="0.01"
                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-sm transition-all"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Início *</label>
            <input
              type="datetime-local"
              value={inicioEm}
              onChange={e => setInicioEm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Fim *</label>
            <input
              type="datetime-local"
              value={fimEm}
              onChange={e => setFimEm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => setAtivo(!ativo)}
            className={`relative w-12 h-6 rounded-full transition-colors ${ativo ? 'bg-rosa-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${ativo ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
          <span className="text-sm text-gray-600">Produto ativo</span>
        </div>
      </div>

      {/* Save */}
      <div className="flex gap-3 pb-8">
        <Link
          href={basePath}
          className="flex-1 py-3 px-4 border border-gray-200 text-gray-600 rounded-xl text-sm font-semibold text-center hover:bg-gray-50 transition-all"
        >
          Cancelar
        </Link>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 px-4 bg-rosa-600 hover:bg-rosa-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
        >
          {saving ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
          ) : (
            <><Save className="w-4 h-4" /> {isEditing ? 'Salvar Alterações' : 'Criar Produto'}</>
          )}
        </button>
      </div>
    </div>
  )
}
