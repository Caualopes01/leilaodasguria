const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data, error } = await supabase
    .from('produtos')
    .update({ valor_atual: 30 })
    .eq('id', '9b18113a-b2a4-4817-b7c2-dc6573d3e517')

  console.log('Update result:', data, error)
}

run().catch(console.error)
