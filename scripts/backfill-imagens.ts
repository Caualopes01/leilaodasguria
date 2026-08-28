import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import * as fs from 'fs'
import * as dotenv from 'dotenv'

// Carrega o .env.local caso rode manualmente
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  const args = process.argv.slice(2)
  const isDryRun = args.includes('--dry-run')
  const limitArg = args.find(a => a.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined

  console.log('=============================================')
  console.log('🔄 Iniciando Backfill de Imagens (Ativos)')
  console.log(`Dry Run: ${isDryRun ? 'SIM' : 'NÃO'}`)
  console.log(`Limit: ${limit || 'Ilimitado'}`)
  console.log('=============================================\n')

  let query = supabase.from('produtos').select('id, titulo, imagens, tenant_id').eq('status', 'ativo')
  if (limit) {
    query = query.limit(limit)
  }

  const { data: produtos, error } = await query

  if (error || !produtos) {
    console.error('Erro ao buscar produtos ativos:', error)
    return
  }

  console.log(`Encontrados ${produtos.length} produtos ativos.\n`)

  const logData: any = {
    timestamp: new Date().toISOString(),
    isDryRun,
    totalProdutos: produtos.length,
    produtosProcessados: 0,
    imagensProcessadas: 0,
    bytesEconomizados: 0,
    erros: [],
    produtos: []
  }

  // Processa de 5 em 5
  const chunkSize = 5
  for (let i = 0; i < produtos.length; i += chunkSize) {
    const chunk = produtos.slice(i, i + chunkSize)
    
    for (const produto of chunk) {
      console.log(`[${produto.id}] Processando: ${produto.titulo}`)
      
      const imagensAtuais = produto.imagens || []
      const novasImagens = [...imagensAtuais]
      const arquivosParaDeletar: string[] = []
      
      let prodBytesSaved = 0
      let prodImagesProcessed = 0
      let hasError = false
      
      const prodLog: any = {
        id: produto.id,
        titulo: produto.titulo,
        mudancas: []
      }

      try {
        for (let j = 0; j < imagensAtuais.length; j++) {
          const imgUrl = imagensAtuais[j]

          // Idempotência
          if (imgUrl.includes('-opt.webp') || imgUrl.includes('/arquivo/')) {
            console.log(`  └ Imagem ${j+1}/${imagensAtuais.length} já otimizada. Pulando.`)
            continue
          }

          console.log(`  └ Baixando imagem ${j+1}/${imagensAtuais.length}...`)
          const res = await fetch(imgUrl)
          if (!res.ok) throw new Error(`Falha ao baixar imagem: ${res.statusText}`)
          const arrayBuffer = await res.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const oldSize = buffer.length

          console.log(`  └ Comprimindo...`)
          const compressedBuffer = await sharp(buffer)
            .resize({ width: 1600, withoutEnlargement: true })
            .webp({ quality: 80 })
            .toBuffer()
          
          const newSize = compressedBuffer.length
          const savedBytes = oldSize - newSize
          prodBytesSaved += savedBytes
          prodImagesProcessed++

          console.log(`  └ Redução: ${(oldSize/1024).toFixed(0)}KB -> ${(newSize/1024).toFixed(0)}KB (Economia: ${(savedBytes/1024).toFixed(0)}KB)`)

          // Preparar novo nome
          const oldPath = imgUrl.split('/storage/v1/object/public/produtos/')[1]
          if (!oldPath) throw new Error('Caminho de bucket inválido.')

          const baseName = oldPath.split('/').pop()?.split('.')[0] || `img-${Date.now()}`
          const pathPrefix = oldPath.substring(0, oldPath.lastIndexOf('/'))
          const newPath = pathPrefix ? `${pathPrefix}/${baseName}-opt.webp` : `${baseName}-opt.webp`

          if (!isDryRun) {
            console.log(`  └ Fazendo upload: ${newPath}`)
            const { error: uploadError } = await supabase.storage.from('produtos')
              .upload(newPath, compressedBuffer, { contentType: 'image/webp', upsert: false })
            if (uploadError) throw uploadError

            const { data: { publicUrl: newUrl } } = supabase.storage.from('produtos').getPublicUrl(newPath)
            novasImagens[j] = newUrl
            arquivosParaDeletar.push(oldPath)
          }

          prodLog.mudancas.push({
            oldUrl: imgUrl,
            newUrl: isDryRun ? '(dry run simulada)' : novasImagens[j],
            oldSizeKB: Math.round(oldSize / 1024),
            newSizeKB: Math.round(newSize / 1024)
          })
        }

        // Se houve modificações e não for dry-run
        if (!isDryRun && arquivosParaDeletar.length > 0) {
          console.log(`  └ Atualizando banco de dados...`)
          const { error: dbError } = await supabase.from('produtos')
            .update({ imagens: novasImagens })
            .eq('id', produto.id)
          
          if (dbError) throw dbError

          console.log(`  └ Deletando originais pesados...`)
          const { error: delError } = await supabase.storage.from('produtos').remove(arquivosParaDeletar)
          if (delError) console.error(`    [!] Erro ao deletar originais:`, delError)
        }

      } catch (err: any) {
        console.error(`  [ERRO] Falha no produto ${produto.id}:`, err.message)
        hasError = true
        logData.erros.push({ produtoId: produto.id, mensagem: err.message })
      }

      if (prodImagesProcessed > 0 || hasError) {
        prodLog.hasError = hasError
        logData.produtos.push(prodLog)
      }

      logData.produtosProcessados++
      logData.imagensProcessadas += prodImagesProcessed
      logData.bytesEconomizados += prodBytesSaved

      console.log(`[${produto.id}] Concluído.\n`)
    }

    if (i + chunkSize < produtos.length) {
      console.log(`Aguardando 1s para o próximo lote (anti rate-limit)...\n`)
      await delay(1000)
    }
  }

  // Gera Arquivo de Log
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logFileName = `backfill-log-${timestamp}.json`
  fs.writeFileSync(logFileName, JSON.stringify(logData, null, 2))

  console.log('=============================================')
  console.log('✅ Backfill Concluído')
  console.log(`Modo: ${isDryRun ? 'DRY RUN' : 'REAL'}`)
  console.log(`Produtos analisados: ${produtos.length}`)
  console.log(`Imagens comprimidas: ${logData.imagensProcessadas}`)
  console.log(`Espaço economizado: ${(logData.bytesEconomizados / 1024 / 1024).toFixed(2)} MB`)
  console.log(`Log salvo em: ${logFileName}`)
  console.log('=============================================')
}

run().catch(console.error)
