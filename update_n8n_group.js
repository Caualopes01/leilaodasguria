const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n_vencedora.json', 'utf8'));

// The new group notification node
const groupNode = {
  "parameters": {
    "method": "POST",
    "url": "https://evolutionapi.autosulai.com.br/message/sendMedia/amanda_gc",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "apikey",
          "value": "9F27C3716F67-421B-B5CF-75DB2D187808"
        },
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={{ { number: 'COLOQUE_AQUI_O_ID_DO_GRUPO_OU_NUMERO', mediatype: 'image', mimetype: 'image/jpeg', media: $('Split In Batches1').item.json.imagens[0], caption: (() => { const lance = $('Buscar Maior Lance1').item.json; const t = $('Split In Batches1').item.json.titulo; const s = $('Split In Batches1').item.json.slug; const v = lance.valor; const nome = lance.nome ? lance.nome.split(' ')[0] : 'Guria'; return `🎉 *Parabéns ${nome}!* 🎉\n\nVocê foi a grande vencedora do leilão do produto *${t}*!\nO lance vencedor foi de *R$ ${v}*! 💖\n\nConfira o leilão: https://leilao-das-gurias.vercel.app/leilao/${s}`; })() } }}",
    "options": {}
  },
  "name": "Enviar WhatsApp Grupo",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [
    1120,
    864
  ],
  "id": "group-notify-node-id-" + Date.now()
};

// Add node
data.nodes.push(groupNode);

// Change connections
// Currently:
// Enviar WhatsApp Admin Vencedor connects to Split In Batches1
// We change it so Admin connects to Group, and Group connects to Split In Batches1.

data.connections["Enviar WhatsApp Admin Vencedor"] = {
  "main": [
    [
      {
        "node": "Enviar WhatsApp Grupo",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

data.connections["Enviar WhatsApp Grupo"] = {
  "main": [
    [
      {
        "node": "Split In Batches1",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

fs.writeFileSync('n8n_vencedora.json', JSON.stringify(data, null, 2));
console.log('Updated n8n_vencedora.json with group node');
