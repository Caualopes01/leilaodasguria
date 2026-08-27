import json

base_url = "https://rpwuxmhzabijhhhcmhzv.supabase.co"

nodes = [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "cakto-webhook-saas",
        "options": {}
      },
      "id": "webhook-cakto-node-1234",
      "name": "Webhook Cakto",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 1,
      "position": [ 0, 300 ]
    },
    {
      "parameters": {
        "dataType": "string",
        "value1": "={{$json.body.event}}",
        "rules": {
          "rules": [
            {
              "value2": "purchase_approved",
              "output": 0
            },
            {
              "value2": "purchase_canceled",
              "output": 1
            },
            {
              "value2": "subscription_canceled",
              "output": 1
            },
            {
              "value2": "chargeback",
              "output": 1
            },
            {
              "value2": "purchase_refunded",
              "output": 1
            }
          ]
        },
        "fallbackOutput": 2
      },
      "name": "Switch Evento",
      "type": "n8n-nodes-base.switch",
      "typeVersion": 1,
      "position": [ 200, 300 ],
      "id": "switch-123"
    },
    {
      "parameters": {
        "jsCode": "const data = $input.all()[0].json.body.data;\nconst pwd = Math.random().toString(36).slice(-8);\nconst slug = data.customer.name.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') + '-' + Math.floor(Math.random() * 1000);\nreturn { ...$input.all()[0].json, senha_gerada: pwd, slug_gerado: slug };"
      },
      "name": "Gerar Senha e Slug",
      "type": "n8n-nodes-base.code",
      "typeVersion": 1,
      "position": [ 400, 100 ],
      "id": "code-123"
    },
    {
      "parameters": {
        "method": "POST",
        "url": f"{base_url}/auth/v1/admin/users",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" }
          ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ email: $json.body.data.customer.email, password: $json.senha_gerada, email_confirm: true, user_metadata: { name: $json.body.data.customer.name } }) }}",
        "options": {}
      },
      "name": "Criar Usuario Auth",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 600, 100 ],
      "id": "http-1"
    },
    {
      "parameters": {
        "method": "POST",
        "url": f"{base_url}/rest/v1/tenants",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Prefer", "value": "return=representation" }
          ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ nome: $('Gerar Senha e Slug').first().json.body.data.customer.name, slug: $('Gerar Senha e Slug').first().json.slug_gerado, email: $('Gerar Senha e Slug').first().json.body.data.customer.email, whatsapp: $('Gerar Senha e Slug').first().json.body.data.customer.phone, user_id: $json.id, ativo: true }) }}",
        "options": {}
      },
      "name": "Criar Tenant",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 800, 100 ],
      "id": "http-2"
    },
    {
      "parameters": {
        "method": "POST",
        "url": f"{base_url}/rest/v1/subscriptions",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Prefer", "value": "return=representation" }
          ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={{ JSON.stringify({ tenant_id: $json[0].id, plano: $('Gerar Senha e Slug').first().json.body.data.offer.name.toLowerCase().includes('anual') ? 'anual' : 'mensal', status: 'ativa', valor: $('Gerar Senha e Slug').first().json.body.data.amount, gateway: 'cakto', gateway_customer_id: $('Gerar Senha e Slug').first().json.body.data.customer.email, gateway_subscription_id: $('Gerar Senha e Slug').first().json.body.data.id }) }}",
        "options": {}
      },
      "name": "Criar Assinatura",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 1000, 100 ],
      "id": "http-3"
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://evolutionapi.autosulai.com.br/message/sendText/amanda_gc",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "9F27C3716F67-421B-B5CF-75DB2D187808" },
            { "name": "Content-Type", "value": "application/json" }
          ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "={{ { number: $('Gerar Senha e Slug').first().json.body.data.customer.phone.startsWith('55') ? $('Gerar Senha e Slug').first().json.body.data.customer.phone : '55' + $('Gerar Senha e Slug').first().json.body.data.customer.phone, text: `🎉 *Bem-vinda ao Dêu Lance!* 🎉\\n\\nO seu pagamento foi aprovado e a sua estrutura de leilão já está pronta e no ar.\\n\\n📍 *Sua Loja:* https://deulance.vercel.app/loja/${$('Gerar Senha e Slug').first().json.slug_gerado}\\n\\nPara gerenciar seus leilões e adicionar produtos, acesse o painel:\\n🔐 *Painel:* https://deulance.vercel.app/loja/${$('Gerar Senha e Slug').first().json.slug_gerado}/admin\\n📧 *Email:* ${$('Gerar Senha e Slug').first().json.body.data.customer.email}\\n🔑 *Senha:* ${$('Gerar Senha e Slug').first().json.senha_gerada}\\n\\nSe precisar de qualquer ajuda, é só me chamar por aqui! ❤️` } }}",
        "options": {}
      },
      "name": "Enviar WhatsApp Acesso",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 1200, 100 ],
      "id": "http-4"
    },
    {
      "parameters": {
        "method": "GET",
        "url": f"=https://rpwuxmhzabijhhhcmhzv.supabase.co/rest/v1/tenants?email=eq.{{{{$json.body.data.customer.email}}}}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" }
          ]
        },
        "options": {}
      },
      "name": "Buscar Tenant Cancelado",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 400, 400 ],
      "id": "http-5"
    },
    {
      "parameters": {
        "conditions": {
          "boolean": [ { "value1": "={{$json[0] != undefined}}", "value2": True } ]
        }
      },
      "name": "Encontrou Tenant?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 1,
      "position": [ 600, 400 ],
      "id": "if-1"
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": f"=https://rpwuxmhzabijhhhcmhzv.supabase.co/rest/v1/tenants?id=eq.{{{{$json[0].id}}}}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" }
          ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "{\"ativo\": false}",
        "options": {}
      },
      "name": "Desativar Tenant",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 800, 300 ],
      "id": "http-6"
    },
    {
      "parameters": {
        "method": "PATCH",
        "url": f"=https://rpwuxmhzabijhhhcmhzv.supabase.co/rest/v1/subscriptions?tenant_id=eq.{{{{$json.id}}}}",
        "sendHeaders": True,
        "headerParameters": {
          "parameters": [
            { "name": "apikey", "value": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" },
            { "name": "Authorization", "value": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJwd3V4bWh6YWJpamhoaGNtaHp2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQxNzAxMywiZXhwIjoyMTAyOTkzMDEzfQ.8gebmV1bMIYrfdwVR334YGNlGrUtksXT6-4tjnrMzQM" }
          ]
        },
        "sendBody": True,
        "specifyBody": "json",
        "jsonBody": "{\"status\": \"cancelada\"}",
        "options": {}
      },
      "name": "Desativar Assinatura",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 3,
      "position": [ 1000, 300 ],
      "id": "http-7"
    }
]

connections = {
  "Webhook Cakto": {
    "main": [
      [
        { "node": "Switch Evento", "type": "main", "index": 0 }
      ]
    ]
  },
  "Switch Evento": {
    "main": [
      [
        { "node": "Gerar Senha e Slug", "type": "main", "index": 0 }
      ],
      [
        { "node": "Buscar Tenant Cancelado", "type": "main", "index": 0 }
      ],
      []
    ]
  },
  "Gerar Senha e Slug": {
    "main": [
      [
        { "node": "Criar Usuario Auth", "type": "main", "index": 0 }
      ]
    ]
  },
  "Criar Usuario Auth": {
    "main": [
      [
        { "node": "Criar Tenant", "type": "main", "index": 0 }
      ]
    ]
  },
  "Criar Tenant": {
    "main": [
      [
        { "node": "Criar Assinatura", "type": "main", "index": 0 }
      ]
    ]
  },
  "Criar Assinatura": {
    "main": [
      [
        { "node": "Enviar WhatsApp Acesso", "type": "main", "index": 0 }
      ]
    ]
  },
  "Buscar Tenant Cancelado": {
    "main": [
      [
        { "node": "Encontrou Tenant?", "type": "main", "index": 0 }
      ]
    ]
  },
  "Encontrou Tenant?": {
    "main": [
      [
        { "node": "Desativar Tenant", "type": "main", "index": 0 }
      ]
    ]
  },
  "Desativar Tenant": {
    "main": [
      [
        { "node": "Desativar Assinatura", "type": "main", "index": 0 }
      ]
    ]
  }
}

workflow = {
  "name": "Webhook Cakto - Completo",
  "nodes": nodes,
  "connections": connections
}

with open('n8n_webhook_cakto.json', 'w') as f:
    json.dump(workflow, f, indent=2)

