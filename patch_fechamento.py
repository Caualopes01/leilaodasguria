import json

with open('n8n_fechamento_leiloes.json', 'r') as f:
    data = json.load(f)

tenant_id = "eb4d8e7a-5803-4eeb-ac20-bce322218d9b"

# Update node texts and URLs
for node in data['nodes']:
    # 1. Update Buscar Expirados1 to filter by tenant_id
    if node['name'] == 'Buscar Expirados1':
        old_url = node['parameters']['url']
        node['parameters']['url'] = old_url.replace('?status=eq.ativo', f'?tenant_id=eq.{tenant_id}&status=eq.ativo')
    
    # 2. Update WhatsApp links
    if 'parameters' in node and 'jsonBody' in node['parameters']:
        body = node['parameters']['jsonBody']
        body = body.replace('https://leilaodasguria.vercel.app/leilao/', 'https://deulance.vercel.app/loja/leilaodasgurias/leilao/')
        body = body.replace('https://leilao-das-gurias.vercel.app/leilao/', 'https://deulance.vercel.app/loja/leilaodasgurias/leilao/')
        node['parameters']['jsonBody'] = body

# Add 'Verifica Loja' IF node after Webhook Supabase1
if_node = {
  "parameters": {
    "conditions": {
      "string": [
        {
          "value1": "={{$json.body.record.tenant_id}}",
          "value2": tenant_id
        }
      ]
    }
  },
  "name": "Verifica Loja",
  "type": "n8n-nodes-base.if",
  "typeVersion": 1,
  "position": [
    -540,
    1120
  ],
  "id": "e4b3c2d1-a1b2-c3d4-e5f6-fechamentoo"
}
data['nodes'].append(if_node)

# Move right-side nodes to make space for the IF node
for node in data['nodes']:
    if node['position'][1] == 1120 and node['position'][0] >= -432:
        node['position'][0] += 100

# Update connections
data['connections']['Webhook Supabase1'] = {
  "main": [
    [
      {
        "node": "Verifica Loja",
        "type": "main",
        "index": 0
      }
    ]
  ]
}
data['connections']['Verifica Loja'] = {
  "main": [
    [
      {
        "node": "Buscar Lances1",
        "type": "main",
        "index": 0
      }
    ]
  ]
}

with open('n8n_fechamento_leiloes.json', 'w') as f:
    json.dump(data, f, indent=2)

