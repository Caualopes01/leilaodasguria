const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase.rpc('get_tables')
  console.log('RPC Error:', error)
  
  // if no rpc, let's just guess table names
  const tables = ['analytics', 'logs', 'page_views', 'acessos', 'visitas']
  for(const t of tables) {
    const { data, error } = await supabase.from(t).select('count', { count: 'exact', head: true })
    if(!error) console.log(`Table ${t} exists.`)
  }
}

run().catch(console.error)
