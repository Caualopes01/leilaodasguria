const fetch = require('node-fetch')

async function runTest() {
  console.log('Simulando chamada do Supabase Webhook...')
  
  // Pegue um ID de produto existente para testar. 
  // No banco, ele precisa estar com status = "encerrado".
  const PRODUTO_ID_TESTE = 'cc19f4ee-8d1f-4e15-badd-da2fdc8bdf71' // Mude para o ID que deseja testar
  const SECRET = 'MEU_SECRET_AQUI' // Substitua pelo seu secret

  // Payload que o Supabase normalmente envia
  const payload = {
    type: 'UPDATE',
    table: 'produtos',
    record: {
      id: PRODUTO_ID_TESTE,
      status: 'encerrado',
      imagens: [
        // Coloque aqui a URL de uma imagem real pesada existente no storage para o teste.
        // Ex: 'https://xxxxx.supabase.co/storage/v1/object/public/produtos/pasta/imagem-teste.jpg'
      ]
    },
    old_record: {
      id: PRODUTO_ID_TESTE,
      status: 'ativo'
    }
  }

  try {
    const res = await fetch('http://localhost:3000/api/webhooks/produto-encerrado', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`
      },
      body: JSON.stringify(payload)
    })

    const data = await res.json()
    console.log('Status da resposta:', res.status)
    console.log('Dados:', data)

  } catch (err) {
    console.error('Erro ao chamar o webhook:', err)
  }
}

runTest()
