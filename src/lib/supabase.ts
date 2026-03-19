import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export type Produto = {
  id: string
  slug: string
  titulo: string
  descricao: string | null
  valor_inicial: number
  valor_atual: number
  incremento_minimo: number
  inicio_em: string
  fim_em: string
  ativo: boolean
  status: 'aguardando' | 'ativo' | 'encerrado'
  imagens: string[]
  criado_em: string
  atualizado_em: string
}

export type Lance = {
  id: string
  produto_id: string
  nome: string
  whatsapp: string
  valor: number
  criado_em: string
}
