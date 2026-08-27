import json

with open('n8n_novo_lance_atualizado.json', 'r') as f:
    data = json.load(f)

tenant_id = "eb4d8e7a-5803-4eeb-ac20-bce322218d9b"

# 1. Update Buscar Leilões Acabando
for node in data['nodes']:
    if node['name'] == 'Buscar Leilões Acabando':
        old_url = node['parameters']['url']
        node['parameters']['url'] = old_url.replace('?status=eq.ativo', f'?tenant_id=eq.{tenant_id}&status=eq.ativo')
        
# 2. Add 'Verifica Loja' IF node
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
    -10,
    304
  ],
  "id": "e4b3c2d1-a1b2-c3d4-e5f6-a1b2c3d4e5f6"
}
data['nodes'].append(if_node)

# Move right-side nodes to make space
for node in data['nodes']:
    if node['position'][1] == 304 and node['position'][0] >= 48:
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
        "node": "Buscar Produto",
        "type": "main",
        "index": 0
      }
    ]
  ]
}

with open('n8n_novo_lance_atualizado.json', 'w') as f:
    json.dump(data, f, indent=2)

