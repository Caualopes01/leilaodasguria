const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n_vencedora.json', 'utf8'));

// The new admin notification node
const adminNode = {
  "parameters": {
    "method": "POST",
    "url": "https://evolutionapi.autosulai.com.br/message/sendText/amanda_gc",
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
    "jsonBody": "={{ { number: '5555981519990', text: (() => { const lance = $('Buscar Maior Lance1').item.json; const t = $('Split In Batches1').item.json.titulo; const fim_em = $('Split In Batches1').item.json.fim_em; const v = lance.valor; const nome = lance.nome ? lance.nome : 'Guria'; const whatsapp = lance.whatsapp; const dataFormatada = new Date(fim_em).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }); return `🚨 *Leilão Encerrado com Ganhadora!*\n\n*Leilão:* ${t}\n*Ganhadora:* ${nome}\n*Contato:* ${whatsapp}\n*Valor:* R$ ${v}\n*Encerrado em:* ${dataFormatada}`; })() } }}",
    "options": {}
  },
  "name": "Enviar WhatsApp Admin Vencedor",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 3,
  "position": [
    928,
    864
  ],
  "id": "admin-notify-node-id-" + Date.now()
};

// Add node
data.nodes.push(adminNode);

// Change connections
// Currently:
// Enviar WhatsApp2 connects to Split In Batches1
// Teve Lance?1 connects to Enviar WhatsApp2 AND Split In Batches1 (which is weird, maybe it triggers Split for the true condition as well, but actually they are both in the main[0] array).
// Let's modify Enviar WhatsApp2 to connect to Enviar WhatsApp Admin Vencedor, and Enviar WhatsApp Admin Vencedor connects to Split In Batches1.

data.connections["Enviar WhatsApp2"] = {
  "main": [
    [
      {
        "node": "Enviar WhatsApp Admin Vencedor",
        "type": "main",
        "index": 0
      }
    ]
  ]
};

data.connections["Enviar WhatsApp Admin Vencedor"] = {
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

// Teve Lance?1 has two items in main[0].
// Let's check it.
let teveLance = data.connections["Teve Lance?1"].main[0];
// One goes to Enviar WhatsApp2, the other goes to Split In Batches1.
// If Teve Lance?1 true, it goes to Enviar WhatsApp2. And apparently ALSO to Split In Batches1.
// Let's leave Teve Lance?1 as is, just replacing the subsequent chain. 
// Wait, if Teve Lance?1 goes to Split In Batches1, it means the loop advances immediately. 
// Actually, it might be that index 0 is Enviar WhatsApp2 and index 1 should have been Split In Batches1 (for false condition: when there is no bid, advance to next item). 
// If it's `main: [[{node: Enviar WhatsApp2}, {node: Split In Batches1}]]`, it means BOTH are on the TRUE branch. The FALSE branch is missing. 
// This is likely a bug in their n8n flow where if there is no bid, it gets stuck (the loop doesn't advance). 
// Or maybe they put both in True, and False is empty. 
// We don't need to fix their existing logic if it works for them (maybe every expired auction has a bid), but let's just insert our node in the chain.

fs.writeFileSync('n8n_vencedora.json', JSON.stringify(data, null, 2));
console.log('Updated n8n_vencedora.json');
