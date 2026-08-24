const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n_novo_lance_admin.json', 'utf8'));

// We add a new node for the group
const groupNode = {
  "parameters": {
    "method": "POST",
    "url": "EVOLUTION_URL_AQUI/message/sendMedia/EVOLUTION_INSTANCE_AQUI",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        { "name": "apikey", "value": "EVOLUTION_KEY_AQUI" },
        { "name": "Content-Type", "value": "application/json" }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ { number: 'COLOQUE_AQUI_O_ID_DO_GRUPO_OU_NUMERO', mediatype: 'image', mimetype: 'image/jpeg', media: ($json[0]?.imagens || $json.imagens)[0], caption: (() => { const record = $('Webhook Supabase').first().json.body.record; const nome = record.nome.split(' ')[0]; const valor = record.valor; const titulo = $json[0]?.titulo || $json.titulo; const slug = $json[0]?.slug || $json.slug; return `🔥 *Novo lance no leilão!* 🔥\n\nA *${nome}* está ganhando o produto *${titulo}* com o lance de *R$ ${valor}*!\n\nParticipe agora: https://leilao-das-gurias.vercel.app/leilao/${slug}`; })() } }}",
    "options": {}
  },
  "name": "Enviar WhatsApp Grupo (Novo Lance)",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [700, 300]
};

data.nodes.push(groupNode);

// Update connections
// Buscar Produto connects to Enviar WhatsApp Admin.
// We make Enviar WhatsApp Admin connect to Enviar WhatsApp Grupo (Novo Lance).
data.connections["Enviar WhatsApp Admin"] = {
  "main": [
    [
      { "node": "Enviar WhatsApp Grupo (Novo Lance)", "type": "main", "index": 0 }
    ]
  ]
};

fs.writeFileSync('n8n_novo_lance_admin.json', JSON.stringify(data, null, 2));
console.log('Updated n8n_novo_lance_admin.json');
