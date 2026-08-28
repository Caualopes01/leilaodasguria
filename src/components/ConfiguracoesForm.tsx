'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import type { Tenant } from '@/lib/tenant'
import { Save, Upload, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

export default function ConfiguracoesForm({ tenant }: { tenant: Tenant }) {
  const router = useRouter()
  const supabase = createClient()
  
  const [nome, setNome] = useState(tenant.nome || '')
  const [appTitulo, setAppTitulo] = useState(tenant.app_titulo || '')
  
  const [logoUrl, setLogoUrl] = useState(tenant.logo_url || '')
  const [iconeUrl, setIconeUrl] = useState(tenant.app_icone_url || '')
  
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingIcone, setUploadingIcone] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setNome(tenant.nome || '')
    setAppTitulo(tenant.app_titulo || '')
    setLogoUrl(tenant.logo_url || '')
    setIconeUrl(tenant.app_icone_url || '')
  }, [tenant])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'logo' | 'icone') => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('O arquivo deve ser uma imagem')
      return
    }

    // Ícone recomenda-se ser quadrado
    if (tipo === 'icone' && file.size > 2 * 1024 * 1024) {
      toast.error('A imagem do ícone não pode ter mais de 2MB')
      return
    }

    try {
      if (tipo === 'logo') setUploadingLogo(true)
      else setUploadingIcone(true)

      const fileExt = file.name.split('.').pop()
      const fileName = `${tenant.slug}-${tipo}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('lojas')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('lojas')
        .getPublicUrl(filePath)

      if (tipo === 'logo') {
        setLogoUrl(publicUrl)
      } else {
        setIconeUrl(publicUrl)
      }
      
      toast.success('Imagem enviada com sucesso!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Erro ao enviar imagem. O bucket "lojas" existe e é público?')
    } finally {
      setUploadingLogo(false)
      setUploadingIcone(false)
    }
  }

  const handleSave = async () => {
    if (!nome) {
      toast.error('O nome da loja é obrigatório.')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          nome,
          app_titulo: appTitulo || null,
          logo_url: logoUrl || null,
          app_icone_url: iconeUrl || null,
        })
        .eq('id', tenant.id)

      if (error) throw error

      toast.success('Configurações salvas com sucesso!')
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8">
      
      {/* Dados Gerais */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Informações Públicas</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nome da Loja na Vitrine</label>
            <input
              type="text"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-colors"
              placeholder="Ex: Leilão da Maria"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nome do App (PWA)</label>
            <input
              type="text"
              value={appTitulo}
              onChange={e => setAppTitulo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rosa-500/20 focus:border-rosa-500 transition-colors"
              placeholder="Ex: Maria Leilões"
            />
            <p className="text-xs text-gray-500">Este é o nome que aparecerá no celular do cliente quando ele instalar o app.</p>
          </div>
        </div>
      </section>

      {/* Imagens */}
      <section className="border-t border-gray-100 pt-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-6">Identidade Visual</h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Logo */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 block">Logo da Loja</label>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                {logoUrl ? (
                  <Image src={logoUrl} alt="Logo" fill className="object-contain p-2" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-3">Logo usado no cabeçalho da vitrine de leilões.</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                  {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingLogo ? 'Enviando...' : 'Trocar Logo'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'logo')} disabled={uploadingLogo} />
                </label>
              </div>
            </div>
          </div>

          {/* Ícone */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 block">Ícone do App (Celular)</label>
            <div className="flex items-start gap-4">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden relative group shadow-sm">
                {iconeUrl ? (
                  <Image src={iconeUrl} alt="Icone" fill className="object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-rosa-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    {nome.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-3">Imagem quadrada (1:1) usada como ícone na tela inicial do celular do cliente. Formato ideal: PNG 512x512px.</p>
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors">
                  {uploadingIcone ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploadingIcone ? 'Enviando...' : 'Trocar Ícone'}
                  <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, 'icone')} disabled={uploadingIcone} />
                </label>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <div className="pt-6 border-t border-gray-100 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-rosa-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-rosa-700 focus:outline-none focus:ring-4 focus:ring-rosa-500/20 transition-all disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          Salvar Configurações
        </button>
      </div>
    </div>
  )
}
