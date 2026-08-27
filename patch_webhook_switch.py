import json

with open('n8n_webhook_cakto.json', 'r') as f:
    data = json.load(f)

# Update the Switch Node
for node in data['nodes']:
    if node['name'] == 'Switch Evento':
        node['parameters']['rules']['rules'] = [
            { "value2": "purchase_approved", "output": 0 },
            { "value2": "subscription_created", "output": 0 }, # Pode ir pro mesmo caminho, o Supabase ignora duplicação se der erro no Auth, ou podemos ignorar
            
            { "value2": "subscription_canceled", "output": 1 },
            { "value2": "subscription_paused", "output": 1 },
            { "value2": "subscription_renewal_refused", "output": 1 },
            { "value2": "chargeback", "output": 1 },
            { "value2": "purchase_refunded", "output": 1 },
            
            { "value2": "subscription_resumed", "output": 2 },
            { "value2": "subscription_renewed", "output": 2 }
        ]

# We need to add the Reactivate Branch (Output 2)
reactivate_nodes = [
    {
      "parameters": {
        "method": "GET",
        "url": "=https://rpwuxmhzabijhhhcmhzv.supabase.co/rest/v1/tenants?email=eq.{{$json.body.data.customer.email}}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" }
          ]
        },
        "options": {}
      },
      "name": "Buscar Tenant Reativado",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 400, 600 ],
      "id": "http-reactivate-1"
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [ { "value1": "={{$json[0] != undefined}}", "value2": True } ]
        }
      },
      "name": "Encontrou Tenant Reativado?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [ 600, 600 ],
      "id": "if-reactivate-2"
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": "=https://rpwuxmhzabijhhhcmhzv.supabase.co/rest/v1/tenants?id=eq.{{$json[0].id}}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" }
          ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "{\"ativo\": true}",
        "options": {}
      },
      "name": "Reativar Tenant",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 800, 500 ],
      "id": "http-reactivate-3"
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": "=https://rpwuxmhzabijhhhcmhzv.supabase.co/rest/v1/subscriptions?tenant_id=eq.{{$json.id}}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" }
          ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "{\"status\": \"ativa\"}",
        "options": {}
      },
      "name": "Reativar Assinatura",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 1000, 500 ],
      "id": "http-reactivate-4"
    }
]

data['nodes'].extend(reactivate_nodes)

data['connections']['Switch Evento']['main'].append([
    { "node": "Buscar Tenant Reativado", "type": "main", "index": 0 }
])

data['connections']['Buscar Tenant Reativado'] = {
    "main": [ [ { "node": "Encontrou Tenant Reativado?", "type": "main", "index": 0 } ] ]
}

data['connections']['Encontrou Tenant Reativado?'] = {
    "main": [ [ { "node": "Reativar Tenant", "type": "main", "index": 0 } ] ]
}

data['connections']['Reativar Tenant'] = {
    "main": [ [ { "node": "Reativar Assinatura", "type": "main", "index": 0 } ] ]
}

with open('n8n_webhook_cakto.json', 'w') as f:
    json.dump(data, f, indent=2)

