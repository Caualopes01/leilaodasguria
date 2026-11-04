# Loja (E-commerce) — Design

**Data:** 2026-11-03
**Status:** Aprovado (brainstorming)

## Objetivo

Adicionar ao app uma **loja de venda direta** (sem leilão) para a loja `leilaodasgurias`: a dona cadastra roupas com preço, preço promocional, categoria e tamanhos; a cliente navega, monta uma sacola e finaliza o pedido pelo WhatsApp. O pedido fica salvo no sistema e a dona acompanha o status no painel admin.

## Decisões

| Tema | Decisão |
|---|---|
| Finalização | Sacola no site → pedido salvo no banco → cliente é levada ao WhatsApp da loja com mensagem pronta. Pagamento combinado fora do sistema (Pix etc.). |
| Escopo de lojas | **Só a loja `leilaodasgurias`**, hardcoded via constante `LOJA_TENANT_SLUG`. Sem flag/feature multi-tenant. As tabelas têm `tenant_id` apenas para seguir o padrão do banco e permitir RLS por dono. |
| Tamanhos/estoque | Lista de tamanhos disponíveis (`text[]`), **sem controle de estoque**. Dona controla manualmente (edita tamanhos ou despublica). |
| Ofertas v1 | Preço promocional ("de/por" + selo % OFF), categorias com filtro, produto em destaque, painel de pedidos com status. |
| Fora da v1 | Estoque, cupom, frete, pagamento online, notificações n8n de pedido, métricas da loja no dashboard. |
| Convivência com leilão | Mesmo app. Nova aba "Loja" no menu inferior público. URLs `/loja/leilaodasgurias/shop`, `/shop/[slug]`, `/shop/carrinho`. Ícone de sacola com badge no topo da loja. |
| Dados | Tabelas novas (`loja_categorias`, `loja_produtos`, `pedidos`, `pedido_itens`). A tabela `produtos` (leilão) **não é alterada** — ela tem `inicio_em/fim_em NOT NULL`, trigger de valor, webhook de imagens ao encerrar, n8n e toast realtime de "Novo Leilão" que disparariam errado. |

## Banco de dados (`loja-schema.sql`)

- `loja_categorias`: `id uuid pk`, `tenant_id uuid fk tenants`, `nome text not null`, `slug text not null`, `ordem int default 0`, `criado_em`. Único `(tenant_id, slug)`.
- `loja_produtos`: `id uuid pk`, `tenant_id`, `categoria_id uuid fk loja_categorias on delete set null`, `slug text unique not null`, `titulo text not null`, `descricao text`, `preco numeric(10,2) not null check (preco >= 0)`, `preco_promocional numeric(10,2) null check (preco_promocional >= 0)`, `tamanhos text[] default '{}'`, `imagens text[] default '{}'`, `destaque bool default false`, `publicado bool default false`, `criado_em`, `atualizado_em`.
- `pedidos`: `id uuid pk`, `numero bigint generated always as identity (start 1001) unique`, `tenant_id`, `cliente_nome text not null`, `cliente_whatsapp text not null` (só dígitos), `observacao text`, `total numeric(10,2) not null`, `status text default 'novo' check in ('novo','pago','enviado','entregue','cancelado')`, `criado_em`, `atualizado_em`.
- `pedido_itens`: `id uuid pk`, `pedido_id fk pedidos on delete cascade`, `produto_id fk loja_produtos on delete set null`, `titulo text not null`, `tamanho text null`, `quantidade int not null check (1..20)`, `preco_unitario numeric(10,2) not null`, `imagem text null`. Título/preço/tamanho/imagem são **cópia** do momento da compra.
- RLS:
  - Leitura pública de `loja_categorias` e de `loja_produtos` com `publicado = true`.
  - Escrita (e leitura total) apenas do **dono do tenant**: `auth.uid() = (select user_id from tenants where id = tenant_id)`.
  - `pedidos` e `pedido_itens`: sem acesso público; dono lê/atualiza. Inserção é feita pela API com service role.

## Regras de preço

- `precoFinal = preco_promocional` se `preco_promocional != null && preco_promocional < preco`; senão `preco`.
- `% OFF = round((1 - promocional/preco) * 100)`, exibido só quando em promoção.
- Valores arredondados a centavos.

## Fluxo do pedido

1. Cliente adiciona itens (produto + tamanho + quantidade) na sacola (localStorage `loja_carrinho_leilaodasgurias`). Mesmo produto+tamanho soma quantidade.
2. Na sacola, informa nome, WhatsApp e observação opcional → `POST /api/pedidos` com `{ cliente_nome, cliente_whatsapp, observacao, itens: [{ produto_id, tamanho, quantidade }] }`.
3. A API (service role) busca os produtos no banco e valida:
   - nome ≥ 2 caracteres; WhatsApp com 10–13 dígitos;
   - 1–50 itens; quantidade inteira 1–20;
   - produto existe, pertence à loja e está publicado;
   - se o produto tem tamanhos, o tamanho enviado deve estar na lista; se não tem, tamanho deve ser `null`.
   - Preços vêm **do banco**, nunca do cliente.
4. Inválido → `422 { erro, produtosInvalidos: string[] }`; a sacola remove os itens inválidos e avisa.
5. Válido → grava `pedidos` + `pedido_itens` (se itens falharem, apaga o pedido), monta a mensagem e responde `201 { numero, whatsappUrl }`.
6. Front limpa a sacola e redireciona para `whatsappUrl` (wa.me para o WhatsApp do tenant).

Mensagem:
```
Olá! Quero finalizar meu pedido #1042 🛍️

1x Vestido Floral (Tam. M) — R$ 89,00
2x Blusa Básica — R$ 100,00

Total: R$ 189,00
Nome: Maria
Obs: entregar à tarde
```
(linha do item mostra subtotal = preço × quantidade; "Obs" só aparece se houver.)

## Telas

**Públicas** (somente quando `params.tenant === LOJA_TENANT_SLUG`; senão `notFound()`):
- `/shop`: cabeçalho com nome da loja + botão sacola (badge); faixa horizontal de destaques; chips de categoria ("Todas" + categorias com produtos); grid 2 colunas de cards (foto, título, preço de/por, selo % OFF).
- `/shop/[slug]`: carrossel de fotos (scroll-snap), título, preço, chips de tamanho (obrigatório escolher se houver), descrição, botão fixo "Adicionar à sacola" com seletor de quantidade.
- `/shop/carrinho`: itens com +/− e remover, total, formulário (nome, `PhoneInput`, observação), botão "Finalizar pelo WhatsApp". Nome/WhatsApp lembrados em localStorage.
- `TenantFooterNav`: aba "Loja" entre "Explorar" e "Meus Lances", só para `LOJA_TENANT_SLUG`.

**Admin** (`/loja/[tenant]/admin/loja/...`, já protegido pelo middleware; itens de menu só para `LOJA_TENANT_SLUG`):
- Produtos da Loja: lista com filtro (todos/publicados/rascunhos) e categoria, toggles publicar/destaque, copiar link, editar, apagar.
- Formulário: fotos (componente `ImageUploader` extraído do `ProdutoForm`, mesmo comportamento de upload/compressão/crop), título, descrição, categoria, preço, preço promocional (deve ser menor que o preço), tamanhos (chips rápidos PP/P/M/G/GG/Único/34–46 + campo livre), destaque, publicado.
- Categorias: criar, renomear, reordenar (subir/descer), apagar.
- Pedidos: lista com filtro por status; detalhe com itens, total, botão WhatsApp da cliente, troca de status.

## Refactor pontual

Extrair upload/crop/compressão de imagens de `ProdutoForm.tsx` para `src/components/ImageUploader.tsx` (props `imagens`, `setImagens`). `ProdutoForm` passa a usá-lo sem mudança de comportamento.

## Erros

- API sem `SUPABASE_SERVICE_ROLE_KEY` → 500 com mensagem "Configuração do servidor incompleta".
- Falha de rede ao finalizar → toast de erro, sacola preservada.
- Produto despublicado acessado por link → página "Produto indisponível" com link para a loja.

## Testes

- Adicionar **Vitest** (`npm test`) para lógica pura: `precos.ts`, `carrinho.ts`, `mensagem.ts`, `validarPedido.ts`.
- `npm run build` sem erros de tipo.
- Checklist manual no navegador (ver plano).

