const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, titulo, valor_inicial, valor_atual, lances(*)')
    .ilike('titulo', '%Vestido tomara que caia%')

  console.log(JSON.stringify(produtos, null, 2))
}

run().catch(console.error)
