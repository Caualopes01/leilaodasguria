import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

export const maxDuration = 60

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')
    const secret = process.env.WEBHOOK_SECRET

    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await req.json()

    // Validate Supabase Webhook payload
    if (payload.type !== 'UPDATE' || payload.table !== 'produtos') {
      return NextResponse.json({ message: 'Not an update on produtos' }, { status: 200 })
    }

    const newRecord = payload.record
    const oldRecord = payload.old_record

    // Somente se mudou para encerrado
    if (newRecord.status !== 'encerrado' || oldRecord.status === 'encerrado') {
      return NextResponse.json({ message: 'Status não é encerrado ou já estava encerrado' }, { status: 200 })
    }

    const imagens = newRecord.imagens as string[]
    if (!imagens || imagens.length === 0) {
      return NextResponse.json({ message: 'Nenhuma imagem para processar' }, { status: 200 })
    }

    console.log(`Iniciando limpeza de ${imagens.length} imagens para o produto ${newRecord.id}`)

    const novasImagens = [...imagens]
    const arquivosParaDeletar: string[] = []

    // Processar todas as imagens em paralelo
    const processResults = await Promise.allSettled(
      imagens.map(async (imgUrl, index) => {
        if (imgUrl.includes('/arquivo/')) {
          console.log(`Imagem ${index} já está arquivada. Pulando.`)
          return { index, newUrl: imgUrl, oldUrl: null }
        }

        // Extrair o caminho antigo do bucket (assumindo que o bucket se chama "produtos")
        const oldPath = imgUrl.split('/storage/v1/object/public/produtos/')[1]
        if (!oldPath) throw new Error('Não foi possível extrair o caminho da imagem original')

        // 1. Baixar a imagem
        const res = await fetch(imgUrl)
        if (!res.ok) throw new Error(`Falha ao baixar imagem: ${res.statusText}`)
        const arrayBuffer = await res.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const oldSize = buffer.length

        // 2. Comprimir via sharp
        const compressedBuffer = await sharp(buffer)
          .resize({ width: 600, withoutEnlargement: true })
          .webp({ quality: 70 })
          .toBuffer()
        const newSize = compressedBuffer.length

        // 3. Upload para a nova pasta 'arquivo/'
        const fileExt = 'webp'
        const baseName = oldPath.split('/').pop()?.split('.')[0] || `img-${Date.now()}`
        // Para manter a estrutura de tenant/user, podemos pegar o prefixo
        const pathPrefix = oldPath.substring(0, oldPath.lastIndexOf('/'))
        const newPath = pathPrefix ? `${pathPrefix}/arquivo/${baseName}-sm.${fileExt}` : `arquivo/${baseName}-sm.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('produtos')
          .upload(newPath, compressedBuffer, {
            contentType: 'image/webp',
            upsert: true
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl: newUrl } } = supabase.storage.from('produtos').getPublicUrl(newPath)

        console.log(`Sucesso img ${index}: ${Math.round(oldSize/1024)}KB -> ${Math.round(newSize/1024)}KB`)

        return { index, newUrl, oldPath }
      })
    )

    let hasSuccess = false
    processResults.forEach(result => {
      if (result.status === 'fulfilled') {
        novasImagens[result.value.index] = result.value.newUrl
        if (result.value.oldPath) {
          arquivosParaDeletar.push(result.value.oldPath)
          hasSuccess = true
        }
      } else {
        console.error('Falha ao processar imagem:', result.reason)
      }
    })

    if (!hasSuccess) {
      return NextResponse.json({ message: 'Nenhuma nova imagem precisou ser processada ou salva' }, { status: 200 })
    }

    // 4. Atualizar no banco
    const { error: dbError } = await supabase
      .from('produtos')
      .update({ imagens: novasImagens })
      .eq('id', newRecord.id)

    if (dbError) {
      console.error('Erro ao atualizar banco:', dbError)
      return NextResponse.json({ error: 'Erro ao atualizar banco de dados' }, { status: 500 })
    }

    // 5. Deletar as antigas originais
    console.log(`Atualizado banco. Deletando originais: ${arquivosParaDeletar.join(', ')}`)
    const deleteResults = await Promise.allSettled(
      arquivosParaDeletar.map(path => supabase.storage.from('produtos').remove([path]))
    )

    deleteResults.forEach((res, i) => {
      if (res.status === 'rejected' || (res.status === 'fulfilled' && res.value.error)) {
        console.error(`Falha ao deletar arquivo antigo ${arquivosParaDeletar[i]}`, res)
      }
    })

    return NextResponse.json({ success: true, processed: arquivosParaDeletar.length })

  } catch (err: any) {
    console.error('Erro geral no webhook:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
