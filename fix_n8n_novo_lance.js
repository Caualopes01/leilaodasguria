const fs = require('fs');

const data = JSON.parse(fs.readFileSync('n8n_novo_lance_admin.json', 'utf8'));

// Find the node and update its body
const node = data.nodes.find(n => n.name === "Enviar WhatsApp Grupo (Novo Lance)");

node.parameters.jsonBody = "={{ { number: 'COLOQUE_AQUI_O_ID_DO_GRUPO_OU_NUMERO', mediatype: 'image', mimetype: 'image/jpeg', media: ($('Buscar Produto').first().json[0]?.imagens || $('Buscar Produto').first().json.imagens)[0], caption: (() => { const record = $('Webhook Supabase').first().json.body.record; const nome = record.nome.split(' ')[0]; const valor = record.valor; const produto = $('Buscar Produto').first().json[0] || $('Buscar Produto').first().json; const titulo = produto.titulo; const slug = produto.slug; return `🔥 *Novo lance no leilão!* 🔥\n\nA *${nome}* está ganhando o produto *${titulo}* com o lance de *R$ ${valor}*!\n\nParticipe agora: https://leilao-das-gurias.vercel.app/leilao/${slug}`; })() } }}";

fs.writeFileSync('n8n_novo_lance_admin.json', JSON.stringify(data, null, 2));
console.log('Fixed n8n_novo_lance_admin.json');
