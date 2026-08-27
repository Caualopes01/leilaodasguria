'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useDropzone } from 'react-dropzone'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { createClient, Produto } from '@/lib/supabase'
import { slugify } from '@/lib/utils'
import getCroppedImg from '@/lib/cropImage'
import {
  Upload, X, ArrowLeft, Save,
  Loader2, ChevronLeft, ChevronRight, Check, Scissors
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

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
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)

  // Crop states
  const [isCropping, setIsCropping] = useState(false)
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null)
  const [cropImageOriginalUrl, setCropImageOriginalUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [processingCrop, setProcessingCrop] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Não autorizado'); setUploading(false); return }

    for (const file of acceptedFiles) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (máx 5MB)`)
        continue
      }
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from('produtos').upload(path, file, {
        cacheControl: '3600',
        upsert: false
      })
      if (error) {
        toast.error(`Erro ao fazer upload de ${file.name}`)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('produtos').getPublicUrl(path)
      setImagens(prev => [...prev, publicUrl])
    }
    setUploading(false)
    toast.success('Imagem(ns) enviada(s)!')
  }, [supabase])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'image/heic': ['.heic']
    },
    maxFiles: 10,
    disabled: uploading,
  })

  async function removeImagem(url: string) {
    const path = url.split('/storage/v1/object/public/produtos/')[1]
    if (path) {
      await supabase.storage.from('produtos').remove([path])
    }
    setImagens(prev => prev.filter(i => i !== url))
    if (previewIndex >= imagens.length - 1) setPreviewIndex(Math.max(0, imagens.length - 2))
  }

  // CROP LOGIC
  async function startCrop(url: string) {
    setProcessingCrop(true)
    try {
      // Baixar a imagem para um blob local evita problemas de CORS no Canvas
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      
      setCropImageOriginalUrl(url)
      setCropImageUrl(objectUrl)
      setCrop(undefined)
      setCompletedCrop(null)
      setIsCropping(true)
    } catch (error) {
      toast.error('Erro ao carregar imagem para edição.')
    }
    setProcessingCrop(false)
  }

  function cancelCrop() {
    setIsCropping(false)
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl)
    setCropImageUrl(null)
    setCropImageOriginalUrl(null)
  }

  async function handleSaveCrop() {
    if (!completedCrop || !cropImageUrl || !cropImageOriginalUrl || !imgRef.current) return
    
    setProcessingCrop(true)
    try {
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height

      const actualCrop = {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY,
      }

      const croppedFile = await getCroppedImg(cropImageUrl, actualCrop)
      if (!croppedFile) throw new Error('Falha ao cortar imagem')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autorizado')

      // Upload nova imagem cortada
      const ext = croppedFile.name.split('.').pop()
      const newPath = `${user.id}/${Date.now()}-cropped-${Math.random().toString(36).slice(2)}.${ext}`
      
      const { error: uploadError } = await supabase.storage.from('produtos').upload(newPath, croppedFile, {
        cacheControl: '3600',
        upsert: false
      })
      if (uploadError) throw uploadError

      const { data: { publicUrl: newUrl } } = supabase.storage.from('produtos').getPublicUrl(newPath)
      
      // Atualizar no estado (substituindo a antiga pela nova no mesmo index)
      setImagens(prev => prev.map(url => url === cropImageOriginalUrl ? newUrl : url))

      // Apagar a imagem original pesada do Storage
      const oldPath = cropImageOriginalUrl.split('/storage/v1/object/public/produtos/')[1]
      if (oldPath) {
        await supabase.storage.from('produtos').remove([oldPath])
      }

      toast.success('Recorte salvo com sucesso!')
      cancelCrop() // fecha modal
    } catch (err: any) {
      toast.error(`Erro ao salvar recorte: ${err.message}`)
    }
    setProcessingCrop(false)
  }

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

    const payload: any = {
      titulo: titulo.trim(),
      slug,
      descricao: descricao.trim() || null,
      valor_inicial: Number(valorInicial),
      valor_atual: isEditing ? produto.valor_atual : Number(valorInicial),
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

        {/* Preview */}
        {imagens.length > 0 && (
          <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video mb-4">
            <img
              src={imagens[previewIndex]}
              alt="Preview"
              className="w-full h-full object-contain"
            />
            {imagens.length > 1 && (
              <>
                <button
                  onClick={() => setPreviewIndex(i => Math.max(0, i - 1))}
                  disabled={previewIndex === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewIndex(i => Math.min(imagens.length - 1, i + 1))}
                  disabled={previewIndex === imagens.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                  {previewIndex + 1}/{imagens.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Thumbnails */}
        {imagens.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {imagens.map((img, i) => (
              <div key={img} className="relative group">
                <button
                  onClick={() => setPreviewIndex(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${previewIndex === i ? 'border-rosa-500' : 'border-gray-200'}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
                
                {/* Remove button */}
                <button
                  onClick={() => removeImagem(img)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  title="Apagar"
                >
                  <X className="w-3 h-3" />
                </button>

                {/* Edit/Crop button */}
                <button
                  onClick={() => startCrop(img)}
                  disabled={processingCrop}
                  className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow transition-all z-10"
                  title="Cortar imagem"
                >
                  {processingCrop && cropImageOriginalUrl === img ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Scissors className="w-3 h-3" />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
            ${isDragActive ? 'border-rosa-400 bg-rosa-50' : 'border-gray-200 hover:border-rosa-300 hover:bg-rosa-50/50'}
            ${uploading ? 'opacity-60 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-rosa-400 animate-spin" />
              <p className="text-sm text-gray-500">Enviando imagens...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-gray-400" />
              <p className="text-sm font-medium text-gray-600">
                {isDragActive ? 'Solte as imagens aqui' : 'Clique ou arraste imagens'}
              </p>
              <p className="text-xs text-gray-400">JPG, PNG, WebP • Máx 5MB cada</p>
            </div>
          )}
        </div>
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
          href="/admin/produtos"
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

      {/* Modal de Crop */}
      {isCropping && cropImageUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fade-in touch-none">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 text-white z-10 backdrop-blur-md border-b border-white/10">
            <button 
              onClick={cancelCrop}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <p className="font-semibold">Ajustar Recorte livre</p>
            <button 
              onClick={handleSaveCrop}
              disabled={processingCrop || !completedCrop?.width || !completedCrop?.height}
              className="p-2 rounded-full bg-rosa-600 hover:bg-rosa-700 text-white transition-colors disabled:opacity-50"
            >
              {processingCrop ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-6 h-6" />}
            </button>
          </div>
          
          {/* Cropper Container */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <ReactCrop 
              crop={crop} 
              onChange={c => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              className="max-h-full max-w-full"
            >
              <img 
                ref={imgRef}
                src={cropImageUrl} 
                className="max-h-[70vh] w-auto mx-auto object-contain"
                alt="Crop preview" 
              />
            </ReactCrop>
          </div>
          
          <div className="p-6 bg-black text-white z-10 text-center pb-safe">
            <p className="text-sm text-gray-400 mb-4">
              Arraste as alças azuis nas bordas da imagem para ajustar o tamanho do corte.
            </p>
            <button
              onClick={handleSaveCrop}
              disabled={processingCrop || !completedCrop?.width || !completedCrop?.height}
              className="w-full max-w-sm mx-auto py-3.5 bg-rosa-600 hover:bg-rosa-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-rosa-900/50"
            >
              {processingCrop ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Salvando...</>
              ) : (
                <>Confirmar Recorte</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
