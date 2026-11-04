'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { createClient } from '@/lib/supabase'
import getCroppedImg from '@/lib/cropImage'
import imageCompression from 'browser-image-compression'
import {
  Upload, X, Loader2, ChevronLeft, ChevronRight, Check, Scissors
} from 'lucide-react'
import { toast } from 'sonner'

interface ImageUploaderProps {
  imagens: string[]
  setImagens: React.Dispatch<React.SetStateAction<string[]>>
  bucket?: string
  maxFiles?: number
}

export default function ImageUploader({
  imagens,
  setImagens,
  bucket = 'produtos',
  maxFiles = 10,
}: ImageUploaderProps) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)

  // Estados de Crop
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
    if (!user) {
      toast.error('Não autorizado')
      setUploading(false)
      return
    }

    for (const file of acceptedFiles) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (máx 5MB)`)
        continue
      }

      let fileToUpload = file
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: 'image/webp',
          initialQuality: 0.8,
        }
        fileToUpload = (await imageCompression(file, options)) as File
        const oldSize = (file.size / 1024).toFixed(0)
        const newSize = (fileToUpload.size / 1024).toFixed(0)
        toast.success(`Comprimido: ${oldSize}KB → ${newSize}KB`)
      } catch (error) {
        console.error('Erro na compressão:', error)
        toast.error(`Falha ao comprimir ${file.name}. Upload cancelado por segurança.`)
        continue
      }

      const ext = 'webp'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(path, fileToUpload, {
        cacheControl: '86400',
        upsert: false,
        contentType: 'image/webp',
      })
      if (error) {
        toast.error(`Erro ao fazer upload de ${file.name}`)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
      setImagens(prev => [...prev, publicUrl])
    }
    setUploading(false)
    toast.success('Imagem(ns) enviada(s)!')
  }, [supabase, bucket, setImagens])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'image/heic': ['.heic'],
    },
    maxFiles,
    disabled: uploading,
  })

  async function removeImagem(url: string) {
    const path = url.split(`/storage/v1/object/public/${bucket}/`)[1]
    if (path) {
      await supabase.storage.from(bucket).remove([path])
    }
    setImagens(prev => prev.filter(i => i !== url))
    if (previewIndex >= imagens.length - 1) setPreviewIndex(Math.max(0, imagens.length - 2))
  }

  async function startCrop(url: string) {
    setProcessingCrop(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)

      setCropImageOriginalUrl(url)
      setCropImageUrl(objectUrl)
      setCrop(undefined)
      setCompletedCrop(null)
      setIsCropping(true)
    } catch {
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

      let fileToUpload = croppedFile as File
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: 'image/webp',
          initialQuality: 0.8,
        }
        fileToUpload = (await imageCompression(croppedFile as File, options)) as File
        const oldSize = (croppedFile.size / 1024).toFixed(0)
        const newSize = (fileToUpload.size / 1024).toFixed(0)
        toast.success(`Recorte comprimido: ${oldSize}KB → ${newSize}KB`)
      } catch (error) {
        console.error('Erro na compressão do recorte:', error)
        throw new Error('Falha ao comprimir imagem recortada.')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autorizado')

      const ext = 'webp'
      const newPath = `${user.id}/${Date.now()}-cropped-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage.from(bucket).upload(newPath, fileToUpload, {
        cacheControl: '86400',
        upsert: false,
        contentType: 'image/webp',
      })
      if (uploadError) throw uploadError

      const { data: { publicUrl: newUrl } } = supabase.storage.from(bucket).getPublicUrl(newPath)

      setImagens(prev => prev.map(url => (url === cropImageOriginalUrl ? newUrl : url)))

      const oldPath = cropImageOriginalUrl.split(`/storage/v1/object/public/${bucket}/`)[1]
      if (oldPath) {
        await supabase.storage.from(bucket).remove([oldPath])
      }

      toast.success('Recorte salvo com sucesso!')
      cancelCrop()
    } catch (err: any) {
      toast.error(`Erro ao salvar recorte: ${err.message}`)
    }
    setProcessingCrop(false)
  }

  return (
    <div>
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
                type="button"
                onClick={() => setPreviewIndex(i => Math.max(0, i - 1))}
                disabled={previewIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
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
                type="button"
                onClick={() => setPreviewIndex(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  previewIndex === i ? 'border-rosa-500' : 'border-gray-200'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>

              <button
                type="button"
                onClick={() => removeImagem(img)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Apagar"
              >
                <X className="w-3 h-3" />
              </button>

              <button
                type="button"
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
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-rosa-400 bg-rosa-50'
            : 'border-gray-200 hover:border-rosa-300 hover:bg-rosa-50/50'
        } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
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

      {/* Modal de Crop */}
      {isCropping && cropImageUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fade-in touch-none">
          <div className="flex items-center justify-between p-4 bg-black/50 text-white z-10 backdrop-blur-md border-b border-white/10">
            <button
              type="button"
              onClick={cancelCrop}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <p className="font-semibold">Ajustar Recorte livre</p>
            <button
              type="button"
              onClick={handleSaveCrop}
              disabled={processingCrop || !completedCrop?.width || !completedCrop?.height}
              className="p-2 rounded-full bg-rosa-600 hover:bg-rosa-700 text-white transition-colors disabled:opacity-50"
            >
              {processingCrop ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-6 h-6" />
              )}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
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
              type="button"
              onClick={handleSaveCrop}
              disabled={processingCrop || !completedCrop?.width || !completedCrop?.height}
              className="w-full max-w-sm mx-auto py-3.5 bg-rosa-600 hover:bg-rosa-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-rosa-900/50"
            >
              {processingCrop ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Salvando...
                </>
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
