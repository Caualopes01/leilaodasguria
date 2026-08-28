const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const { data: tenants } = await supabase.from('tenants').select('id, slug')
  
  for (const tenant of tenants) {
    console.log(`\n=== Loja: ${tenant.slug} ===`)
    
    const { data: produtos } = await supabase
      .from('produtos')
      .select('id, titulo, status, ativo, lances(*)')
      .eq('tenant_id', tenant.id)
      .eq('status', 'encerrado')

    if (!produtos || produtos.length === 0) {
      console.log('Sem produtos encerrados.')
      continue
    }

    let faturamento = 0
    console.log('Vendas fechadas:')
    
    produtos.forEach(p => {
      if (p.lances && p.lances.length > 0) {
        const maiorLance = Math.max(...p.lances.map(l => l.valor))
        faturamento += maiorLance
        console.log(`- ${p.titulo} (Ativo: ${p.ativo}): R$ ${maiorLance.toFixed(2)} (${p.lances.length} lances)`)
      } else {
        console.log(`- ${p.titulo} (Ativo: ${p.ativo}): R$ 0,00 (Sem lances)`)
      }
    })
    
    console.log(`\n>>> Faturamento Geral Calculado: R$ ${faturamento.toFixed(2)}`)
  }
}

run().catch(console.error)
