# 🎀 Leilão das Gurias

App de leilão online, mobile-first, com painel admin completo.

## Stack
- **Frontend + Backend**: Next.js 14 (App Router)
- **Banco de dados + Storage + Auth**: Supabase
- **Deploy**: Vercel

---

## 🚀 Passo a Passo para Subir

### 1. Criar conta no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Clique em **New Project** e escolha um nome (ex: `leilao-das-gurias`)
3. Anote a **senha do banco** (você vai precisar)
4. Aguarde o projeto ser criado (~2 minutos)

### 2. Configurar o banco de dados

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole o conteúdo do arquivo `supabase-schema.sql`
4. Clique em **Run** (▶️)
5. Deve aparecer "Success" para todos os comandos

### 3. Criar seu usuário admin

1. No Supabase, vá em **Authentication > Users**
2. Clique em **Add User > Create New User**
3. Informe seu email e uma senha forte
4. Clique em **Create User**

> ⚠️ **Guarde bem esse email e senha** — são suas credenciais de acesso ao painel admin.

### 4. Pegar as chaves do Supabase

1. Vá em **Settings > API**
2. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 5. Configurar variáveis de ambiente localmente

Crie um arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 6. Rodar localmente

```bash
npm install
npm run dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## ☁️ Deploy na Vercel

### 1. Subir código no GitHub

```bash
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/leilao-das-gurias.git
git push -u origin main
```

### 2. Conectar na Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **New Project**
3. Importe o repositório `leilao-das-gurias`
4. Em **Environment Variables**, adicione:

| Nome | Valor |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://SEU_ID.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sua_anon_key` |
| `NEXT_PUBLIC_SITE_URL` | `https://leilao-das-gurias.vercel.app` |

5. Clique em **Deploy** ✅

### 3. Atualizar URL no Supabase

Após o deploy, vá em **Supabase > Authentication > URL Configuration** e adicione:
- **Site URL**: `https://leilao-das-gurias.vercel.app`

---

## 📱 Como usar

### Painel Admin (`/admin`)
- Login com email/senha criado no Supabase
- **Dashboard**: visão geral de leilões, lances recentes e ganhadores
- **Produtos**: listar, criar, editar e apagar leilões
- Ao criar um produto: upload de fotos, título, descrição, valor inicial, incremento mínimo, data de início e fim

### Compartilhar um leilão
- Cada produto tem um link único: `https://seusite.com/leilao/SLUG-DO-PRODUTO`
- Copie esse link no botão de compartilhamento da listagem de produtos
- Envie pelo WhatsApp, Instagram ou onde preferir

### Página do leilão (mobile-first)
- Fotos em carrossel
- Timer com contagem regressiva ao vivo
- Lista de lances em tempo real
- Botão "Dar Lance" → abre modal simples (nome + WhatsApp + valor)
- Lances atualizados em tempo real para todos que estão na página

---

## 🎨 Estrutura de Arquivos

```
src/
├── app/
│   ├── admin/
│   │   ├── layout.tsx          # Layout com sidebar admin
│   │   ├── page.tsx            # Dashboard
│   │   ├── login/page.tsx      # Tela de login
│   │   └── produtos/
│   │       ├── page.tsx        # Lista de produtos
│   │       ├── novo/page.tsx   # Criar produto
│   │       └── [id]/page.tsx   # Editar produto
│   ├── leilao/
│   │   └── [slug]/page.tsx     # Página pública do leilão
│   ├── layout.tsx              # Layout raiz
│   └── globals.css
├── components/
│   └── ProdutoForm.tsx         # Formulário criar/editar produto
├── lib/
│   ├── supabase.ts             # Cliente Supabase (browser)
│   ├── supabase-server.ts      # Cliente Supabase (server)
│   └── utils.ts                # Funções utilitárias
└── middleware.ts               # Proteção de rotas admin
```

---

## 🔧 Manutenção

### Verificar/atualizar status dos leilões automaticamente

O status dos produtos (aguardando → ativo → encerrado) é calculado em tempo real baseado nos horários configurados. Opcionalmente, você pode criar um **Cron Job** no Supabase para atualizar via função:

Em **Supabase > Database > Functions**, a função `atualizar_status_produtos()` já está criada. Configure um cron job em **Database > Webhooks** para chamá-la a cada minuto se quiser atualização automática no banco também.

---

Feito com 💗 para o **Leilão das Gurias**
