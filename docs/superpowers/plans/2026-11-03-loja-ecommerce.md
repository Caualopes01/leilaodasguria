# Loja E-commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar recurso de e-commerce direto (catálogo de roupas, tamanhos, ofertas/promoções, sacola de compras, finalização pelo WhatsApp e gestão de pedidos) na loja `leilaodasgurias`.

**Architecture:** Módulo independente de leilões utilizando tabelas próprias no Supabase (`loja_categorias`, `loja_produtos`, `pedidos`, `pedido_itens`). A vitrine pública consome produtos publicados com sacola em `localStorage`. A finalização envia o pedido para uma API Next.js que revalida preços e itens via `SUPABASE_SERVICE_ROLE_KEY`, gera o registro seguro no banco com número sequencial e gera o link formatado para o WhatsApp da loja. O painel admin ganha novas rotas protegidas para gerenciar produtos, categorias e pedidos.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL, Storage, RLS, SSR Client), Lucide React, Sonner (toasts), Vitest (testes unitários de regras de negócio).

**Spec:** `docs/superpowers/specs/2026-11-03-loja-ecommerce-design.md`

## Global Constraints

- O módulo de leilão existente (`produtos`, `lances`, timers, websockets, webhooks) não deve sofrer alterações de schema nem quebras de comportamento.
- O e-commerce nesta versão é restrito à loja `leilaodasgurias` (definido pela constante `LOJA_TENANT_SLUG = 'leilaodasgurias'`).
- Preços promocionais devem ser validados: `preco_promocional` só é aplicado se for menor que `preco`.
- O cliente nunca define o total do pedido; a rota `/api/pedidos` recalcula e valida tudo no backend antes de persistir.
- O componente `ImageUploader` deve manter a mesma UX de drag-and-drop, compressão WebP e corte livre (crop) já adotada no projeto.
- Testes unitários com Vitest cobrem a lógica pura de preços, validação de pedidos e formatação de mensagens do WhatsApp.

---

### Task 1: Configuração do Vitest para Testes Unitários

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: comando `npm test` funcional executando Vitest com suporte a aliases (`@/*`).

- [ ] **Step 1: Instalar dependência de desenvolvimento vitest**

Execute:
```bash
npm install -D vitest
```

- [ ] **Step 2: Criar arquivo de configuração vitest.config.ts**

Criar `vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Adicionar script "test" no package.json**

Atualizar `package.json` para incluir `"test": "vitest run"` nos scripts:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run"
}
```

- [ ] **Step 4: Executar verificação**

Run: `npm test`
Expected: Nenhum teste encontrado ou 0 testes executados sem falha de configuração.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: setup vitest for unit testing"
```

---

### Task 2: Schema SQL e Tipos TypeScript

**Files:**
- Create: `loja-schema.sql`
- Create: `src/lib/loja-types.ts`

**Interfaces:**
- Produces: tipos `LojaProduto`, `LojaCategoria`, `Pedido`, `PedidoItem`, `CarrinhoItem` e constante `LOJA_TENANT_SLUG`.

- [ ] **Step 1: Criar script SQL loja-schema.sql**

Criar `loja-schema.sql`:
```sql
-- ============================================
-- SCHEMA DA LOJA E-COMMERCE (LEILÃO DAS GURIAS)
-- ============================================

-- Tabela de Categorias da Loja
CREATE TABLE IF NOT EXISTS loja_categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  slug TEXT NOT NULL,
  ordem INT DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_categoria_tenant_slug UNIQUE (tenant_id, slug)
);

-- Tabela de Produtos da Loja (Venda Direta)
CREATE TABLE IF NOT EXISTS loja_produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES loja_categorias(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  preco DECIMAL(10,2) NOT NULL CHECK (preco >= 0),
  preco_promocional DECIMAL(10,2) NULL CHECK (preco_promocional >= 0),
  tamanhos TEXT[] DEFAULT '{}',
  imagens TEXT[] DEFAULT '{}',
  destaque BOOLEAN DEFAULT false,
  publicado BOOLEAN DEFAULT false,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero BIGINT GENERATED ALWAYS AS IDENTITY (START WITH 1001) UNIQUE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  cliente_nome TEXT NOT NULL,
  cliente_whatsapp TEXT NOT NULL,
  observacao TEXT,
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'pago', 'enviado', 'entregue', 'cancelado')),
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de Itens do Pedido
CREATE TABLE IF NOT EXISTS pedido_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
  produto_id UUID REFERENCES loja_produtos(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  tamanho TEXT,
  quantidade INT NOT NULL CHECK (quantidade >= 1 AND quantidade <= 20),
  preco_unitario DECIMAL(10,2) NOT NULL,
  imagem TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_loja_produtos_tenant ON loja_produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_loja_produtos_categoria ON loja_produtos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_loja_produtos_publicado ON loja_produtos(publicado);
CREATE INDEX IF NOT EXISTS idx_loja_produtos_destaque ON loja_produtos(destaque);
CREATE INDEX IF NOT EXISTS idx_pedidos_tenant ON pedidos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedido_id);

-- RLS (Row Level Security)
ALTER TABLE loja_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedido_itens ENABLE ROW LEVEL SECURITY;

-- Categorias: leitura pública, edição pelo dono autenticado
CREATE POLICY "loja_categorias_leitura_publica" ON loja_categorias FOR SELECT USING (true);
CREATE POLICY "loja_categorias_escrita_dono" ON loja_categorias FOR ALL USING (
  EXISTS (SELECT 1 FROM tenants WHERE tenants.id = loja_categorias.tenant_id AND tenants.user_id = auth.uid())
);

-- Produtos: leitura pública apenas dos publicados
CREATE POLICY "loja_produtos_leitura_publica" ON loja_produtos FOR SELECT USING (publicado = true);
CREATE POLICY "loja_produtos_gerencia_dono" ON loja_produtos FOR ALL USING (
  EXISTS (SELECT 1 FROM tenants WHERE tenants.id = loja_produtos.tenant_id AND tenants.user_id = auth.uid())
);

-- Pedidos e itens: visíveis apenas pelo dono do tenant; inserções seguras feitas pela API
CREATE POLICY "pedidos_dono" ON pedidos FOR ALL USING (
  EXISTS (SELECT 1 FROM tenants WHERE tenants.id = pedidos.tenant_id AND tenants.user_id = auth.uid())
);
CREATE POLICY "pedido_itens_dono" ON pedido_itens FOR ALL USING (
  EXISTS (
    SELECT 1 FROM pedidos
    JOIN tenants ON tenants.id = pedidos.tenant_id
    WHERE pedidos.id = pedido_itens.pedido_id AND tenants.user_id = auth.uid()
  )
);
```

- [ ] **Step 2: Criar arquivo de tipos src/lib/loja-types.ts**

Criar `src/lib/loja-types.ts`:
```typescript
export const LOJA_TENANT_SLUG = 'leilaodasgurias'

export type LojaCategoria = {
  id: string
  tenant_id: string
  nome: string
  slug: string
  ordem: number
  criado_em: string
}

export type LojaProduto = {
  id: string
  tenant_id: string
  categoria_id: string | null
  slug: string
  titulo: string
  descricao: string | null
  preco: number
  preco_promocional: number | null
  tamanhos: string[]
  imagens: string[]
  destaque: boolean
  publicado: boolean
  criado_em: string
  atualizado_em: string
  categoria?: LojaCategoria | null
}

export type StatusPedido = 'novo' | 'pago' | 'enviado' | 'entregue' | 'cancelado'

export type Pedido = {
  id: string
  numero: number
  tenant_id: string
  cliente_nome: string
  cliente_whatsapp: string
  observacao: string | null
  total: number
  status: StatusPedido
  criado_em: string
  atualizado_em: string
  itens?: PedidoItem[]
}

export type PedidoItem = {
  id: string
  pedido_id: string
  produto_id: string | null
  titulo: string
  tamanho: string | null
  quantidade: number
  preco_unitario: number
  imagem: string | null
  criado_em: string
}

export type CarrinhoItem = {
  produtoId: string
  slug: string
  titulo: string
  precoUnitario: number
  imagem: string | null
  tamanho: string | null
  quantidade: number
}
```

- [ ] **Step 3: Commit**

```bash
git add loja-schema.sql src/lib/loja-types.ts
git commit -m "feat(loja): add database schema and typescript types"
```

---

### Task 3: Lógica Pura & Testes (TDD)

**Files:**
- Create: `src/lib/loja/precos.ts`
- Create: `src/lib/loja/whatsapp.ts`
- Create: `src/lib/loja/validarPedido.ts`
- Create: `tests/precos.test.ts`
- Create: `tests/whatsapp.test.ts`
- Create: `tests/validarPedido.test.ts`

**Interfaces:**
- Produces:
  - `obterPrecoFinal(preco: number, precoPromocional: number | null): number`
  - `calcularPercentualDesconto(preco: number, precoPromocional: number | null): number | null`
  - `gerarMensagemPedido(pedido: { numero: number; cliente_nome: string; observacao?: string | null; itens: { titulo: string; tamanho?: string | null; quantidade: number; preco_unitario: number }[]; total: number }): string`
  - `validarPayloadPedido(payload: any, produtosDoBanco: LojaProduto[]): { valido: boolean; erro?: string; totalCalculado?: number; itensProcessados?: Array<{ produto_id: string; titulo: string; tamanho: string | null; quantidade: number; preco_unitario: number; imagem: string | null }> }`

- [ ] **Step 1: Escrever os testes que falham para precos.test.ts**

Criar `tests/precos.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { obterPrecoFinal, calcularPercentualDesconto } from '@/lib/loja/precos'

describe('Regras de Preços da Loja', () => {
  it('retorna preco_promocional quando for menor que o preco regular', () => {
    expect(obterPrecoFinal(100, 79.9)).toBe(79.9)
  })

  it('retorna preco regular quando preco_promocional for nulo ou indefinido', () => {
    expect(obterPrecoFinal(100, null)).toBe(100)
    expect(obterPrecoFinal(100, undefined as any)).toBe(100)
  })

  it('ignora promocional se for maior ou igual ao preco regular', () => {
    expect(obterPrecoFinal(100, 120)).toBe(100)
    expect(obterPrecoFinal(100, 100)).toBe(100)
  })

  it('calcula o percentual de desconto arredondado', () => {
    expect(calcularPercentualDesconto(100, 75)).toBe(25)
    expect(calcularPercentualDesconto(199.9, 99.9)).toBe(50)
  })

  it('retorna null se não houver desconto válido', () => {
    expect(calcularPercentualDesconto(100, null)).toBeNull()
    expect(calcularPercentualDesconto(100, 100)).toBeNull()
    expect(calcularPercentualDesconto(100, 110)).toBeNull()
  })
})
```

- [ ] **Step 2: Executar testes de preços para verificar que falham**

Run: `npm test tests/precos.test.ts`
Expected: FAIL ("Cannot find module '@/lib/loja/precos'")

- [ ] **Step 3: Implementar src/lib/loja/precos.ts**

Criar `src/lib/loja/precos.ts`:
```typescript
export function obterPrecoFinal(preco: number, precoPromocional: number | null | undefined): number {
  if (precoPromocional != null && precoPromocional > 0 && precoPromocional < preco) {
    return Number(precoPromocional.toFixed(2))
  }
  return Number(preco.toFixed(2))
}

export function calcularPercentualDesconto(preco: number, precoPromocional: number | null | undefined): number | null {
  if (precoPromocional == null || precoPromocional >= preco || preco <= 0) {
    return null
  }
  const desconto = Math.round((1 - precoPromocional / preco) * 100)
  return desconto > 0 ? desconto : null
}
```

- [ ] **Step 4: Executar testes de preços para verificar que passam**

Run: `npm test tests/precos.test.ts`
Expected: PASS

- [ ] **Step 5: Escrever os testes para whatsapp.test.ts**

Criar `tests/whatsapp.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { gerarMensagemPedido, gerarLinkWhatsAppPedido } from '@/lib/loja/whatsapp'

describe('Formatação de Mensagem de Pedido para WhatsApp', () => {
  it('gera mensagem com múltiplos itens e observação', () => {
    const pedido = {
      numero: 1042,
      cliente_nome: 'Amanda Silva',
      observacao: 'Deixar na portaria',
      total: 189,
      itens: [
        { titulo: 'Vestido Floral', tamanho: 'M', quantidade: 1, preco_unitario: 89 },
        { titulo: 'Blusa Básica', tamanho: null, quantidade: 2, preco_unitario: 50 },
      ],
    }

    const msg = gerarMensagemPedido(pedido)
    expect(msg).toContain('Olá! Quero finalizar meu pedido #1042 🛍️')
    expect(msg).toContain('1x Vestido Floral (Tam. M) — R$ 89,00')
    expect(msg).toContain('2x Blusa Básica — R$ 100,00')
    expect(msg).toContain('Total: R$ 189,00')
    expect(msg).toContain('Nome: Amanda Silva')
    expect(msg).toContain('Obs: Deixar na portaria')
  })

  it('omite linha de observação quando vazia', () => {
    const pedido = {
      numero: 1043,
      cliente_nome: 'Bruna',
      observacao: '',
      total: 89,
      itens: [{ titulo: 'Vestido', tamanho: 'P', quantidade: 1, preco_unitario: 89 }],
    }
    const msg = gerarMensagemPedido(pedido)
    expect(msg).not.toContain('Obs:')
  })

  it('gera link wa.me válido com o telefone do tenant', () => {
    const link = gerarLinkWhatsAppPedido('5551999998888', 'Olá!')
    expect(link).toContain('https://wa.me/5551999998888?text=Ol%C3%A1!')
  })
})
```

- [ ] **Step 6: Implementar src/lib/loja/whatsapp.ts**

Criar `src/lib/loja/whatsapp.ts`:
```typescript
import { formatCurrency, getWhatsAppLink } from '@/lib/utils'

export interface ItemParaMensagem {
  titulo: string
  tamanho?: string | null
  quantidade: number
  preco_unitario: number
}

export interface PedidoParaMensagem {
  numero: number
  cliente_nome: string
  observacao?: string | null
  itens: ItemParaMensagem[]
  total: number
}

export function gerarMensagemPedido(pedido: PedidoParaMensagem): string {
  const linhas: string[] = []

  linhas.push(`Olá! Quero finalizar meu pedido #${pedido.numero} 🛍️\n`)

  pedido.itens.forEach(item => {
    const tamStr = item.tamanho ? ` (Tam. ${item.tamanho})` : ''
    const subtotal = item.preco_unitario * item.quantidade
    linhas.push(`${item.quantidade}x ${item.titulo}${tamStr} — ${formatCurrency(subtotal)}`)
  })

  linhas.push(`\nTotal: ${formatCurrency(pedido.total)}`)
  linhas.push(`Nome: ${pedido.cliente_nome}`)

  if (pedido.observacao && pedido.observacao.trim()) {
    linhas.push(`Obs: ${pedido.observacao.trim()}`)
  }

  return linhas.join('\n')
}

export function gerarLinkWhatsAppPedido(telefoneLoja: string, mensagem: string): string {
  return getWhatsAppLink(telefoneLoja, mensagem)
}
```

- [ ] **Step 7: Executar testes de whatsapp para verificar que passam**

Run: `npm test tests/whatsapp.test.ts`
Expected: PASS

- [ ] **Step 8: Escrever os testes para validarPedido.test.ts**

Criar `tests/validarPedido.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { validarPayloadPedido } from '@/lib/loja/validarPedido'
import { LojaProduto } from '@/lib/loja-types'

const mockProdutos: LojaProduto[] = [
  {
    id: 'prod-1',
    tenant_id: 'tenant-1',
    categoria_id: null,
    slug: 'vestido-floral',
    titulo: 'Vestido Floral',
    descricao: null,
    preco: 100,
    preco_promocional: 80,
    tamanhos: ['P', 'M'],
    imagens: ['https://exemplo.com/foto.jpg'],
    destaque: false,
    publicado: true,
    criado_em: '2026-01-01',
    atualizado_em: '2026-01-01',
  },
  {
    id: 'prod-2',
    tenant_id: 'tenant-1',
    categoria_id: null,
    slug: 'blusa',
    titulo: 'Blusa Básica',
    descricao: null,
    preco: 50,
    preco_promocional: null,
    tamanhos: [],
    imagens: [],
    destaque: false,
    publicado: true,
    criado_em: '2026-01-01',
    atualizado_em: '2026-01-01',
  },
]

describe('Validação do Pedido no Backend', () => {
  it('valida com sucesso e calcula preço pelo banco (usando promocional quando aplicável)', () => {
    const payload = {
      cliente_nome: 'Ana',
      cliente_whatsapp: '5551988887777',
      observacao: 'teste',
      itens: [
        { produtoId: 'prod-1', tamanho: 'M', quantidade: 2 },
        { produtoId: 'prod-2', tamanho: null, quantidade: 1 },
      ],
    }

    const res = validarPayloadPedido(payload, mockProdutos)
    expect(res.valido).toBe(true)
    // 2 * 80 + 1 * 50 = 210
    expect(res.totalCalculado).toBe(210)
    expect(res.itensProcessados?.length).toBe(2)
  })

  it('rejeita se nome for curto ou whatsapp inválido', () => {
    const payloadNomeInvalido = {
      cliente_nome: 'A',
      cliente_whatsapp: '5551988887777',
      itens: [{ produtoId: 'prod-1', tamanho: 'P', quantidade: 1 }],
    }
    expect(validarPayloadPedido(payloadNomeInvalido, mockProdutos).valido).toBe(false)

    const payloadWhatsInvalido = {
      cliente_nome: 'Ana',
      cliente_whatsapp: '123',
      itens: [{ produtoId: 'prod-1', tamanho: 'P', quantidade: 1 }],
    }
    expect(validarPayloadPedido(payloadWhatsInvalido, mockProdutos).valido).toBe(false)
  })

  it('rejeita se o tamanho escolhido não existir no produto', () => {
    const payloadTamanhoErrado = {
      cliente_nome: 'Ana',
      cliente_whatsapp: '5551988887777',
      itens: [{ produtoId: 'prod-1', tamanho: 'GG', quantidade: 1 }],
    }
    const res = validarPayloadPedido(payloadTamanhoErrado, mockProdutos)
    expect(res.valido).toBe(false)
    expect(res.erro).toContain('Tamanho GG inválido')
  })
})
```

- [ ] **Step 9: Implementar src/lib/loja/validarPedido.ts**

Criar `src/lib/loja/validarPedido.ts`:
```typescript
import { LojaProduto } from '@/lib/loja-types'
import { obterPrecoFinal } from './precos'

export interface ItemPayload {
  produtoId: string
  tamanho?: string | null
  quantidade: number
}

export interface PedidoPayload {
  cliente_nome: string
  cliente_whatsapp: string
  observacao?: string | null
  itens: ItemPayload[]
}

export interface ResultadoValidacao {
  valido: boolean
  erro?: string
  totalCalculado?: number
  itensProcessados?: Array<{
    produto_id: string
    titulo: string
    tamanho: string | null
    quantidade: number
    preco_unitario: number
    imagem: string | null
  }>
}

export function validarPayloadPedido(
  payload: any,
  produtosDoBanco: LojaProduto[]
): ResultadoValidacao {
  if (!payload || typeof payload !== 'object') {
    return { valido: false, erro: 'Dados do pedido inválidos' }
  }

  const nome = (payload.cliente_nome || '').trim()
  if (nome.length < 2) {
    return { valido: false, erro: 'Informe seu nome completo (mínimo 2 caracteres)' }
  }

  const cleanWhats = String(payload.cliente_whatsapp || '').replace(/\D/g, '')
  if (cleanWhats.length < 10 || cleanWhats.length > 13) {
    return { valido: false, erro: 'Informe um número de WhatsApp válido com DDD' }
  }

  if (!Array.isArray(payload.itens) || payload.itens.length === 0) {
    return { valido: false, erro: 'Sua sacola está vazia' }
  }

  if (payload.itens.length > 50) {
    return { valido: false, erro: 'Número de itens excede o limite permitido' }
  }

  const mapaProdutos = new Map(produtosDoBanco.map(p => [p.id, p]))
  let total = 0
  const itensProcessados: Array<{
    produto_id: string
    titulo: string
    tamanho: string | null
    quantidade: number
    preco_unitario: number
    imagem: string | null
  }> = []

  for (const item of payload.itens) {
    const qtd = Number(item.quantidade)
    if (!Number.isInteger(qtd) || qtd < 1 || qtd > 20) {
      return { valido: false, erro: 'Quantidade de item inválida (deve ser entre 1 e 20)' }
    }

    const prod = mapaProdutos.get(item.produtoId)
    if (!prod || !prod.publicado) {
      return { valido: false, erro: `Produto "${item.produtoId}" não está mais disponível` }
    }

    const temTamanhos = Array.isArray(prod.tamanhos) && prod.tamanhos.length > 0
    let tamanhoFinal: string | null = null

    if (temTamanhos) {
      if (!item.tamanho || !prod.tamanhos.includes(item.tamanho)) {
        return {
          valido: false,
          erro: `Tamanho ${item.tamanho || 'não informado'} inválido para o produto "${prod.titulo}"`,
        }
      }
      tamanhoFinal = String(item.tamanho)
    }

    const precoUnitario = obterPrecoFinal(prod.preco, prod.preco_promocional)
    total += precoUnitario * qtd

    itensProcessados.push({
      produto_id: prod.id,
      titulo: prod.titulo,
      tamanho: tamanhoFinal,
      quantidade: qtd,
      preco_unitario: precoUnitario,
      imagem: prod.imagens && prod.imagens.length > 0 ? prod.imagens[0] : null,
    })
  }

  return {
    valido: true,
    totalCalculado: Number(total.toFixed(2)),
    itensProcessados,
  }
}
```

- [ ] **Step 10: Executar todos os testes**

Run: `npm test`
Expected: Todos os testes de precos, whatsapp e validarPedido passam com 100% de sucesso.

- [ ] **Step 11: Commit**

```bash
git add src/lib/loja/ tests/
git commit -m "feat(loja): implement core domain logic with comprehensive unit tests"
```

---

### Task 4: Refatoração Pontual — Componente ImageUploader Reutilizável

**Files:**
- Create: `src/components/ImageUploader.tsx`
- Modify: `src/components/ProdutoForm.tsx`

**Interfaces:**
- Produces: `<ImageUploader imagens={imagens} setImagens={setImagens} bucket="produtos" maxFiles={10} />`

- [ ] **Step 1: Criar src/components/ImageUploader.tsx extraindo upload, compressão e crop**

Criar `src/components/ImageUploader.tsx`:
```tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { useDropzone } from 'react-dropzone'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { createClient } from '@/lib/supabase'
import getCroppedImg from '@/lib/cropImage'
import imageCompression from 'browser-image-compression'
import {
  Upload, X, Loader2, ChevronLeft, ChevronRight, Check, Scissors
} from 'lucide-react'
import { toast } from 'sonner'

interface ImageUploaderProps {
  imagens: string[]
  setImagens: React.Dispatch<React.SetStateAction<string[]>>
  bucket?: string
  maxFiles?: number
}

export default function ImageUploader({
  imagens,
  setImagens,
  bucket = 'produtos',
  maxFiles = 10,
}: ImageUploaderProps) {
  const supabase = createClient()
  const [uploading, setUploading] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(0)

  // Estados de Crop
  const [isCropping, setIsCropping] = useState(false)
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null)
  const [cropImageOriginalUrl, setCropImageOriginalUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [processingCrop, setProcessingCrop] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('Não autorizado')
      setUploading(false)
      return
    }

    for (const file of acceptedFiles) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} é muito grande (máx 5MB)`)
        continue
      }

      let fileToUpload = file
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: 'image/webp',
          initialQuality: 0.8,
        }
        fileToUpload = (await imageCompression(file, options)) as File
        const oldSize = (file.size / 1024).toFixed(0)
        const newSize = (fileToUpload.size / 1024).toFixed(0)
        toast.success(`Comprimido: ${oldSize}KB → ${newSize}KB`)
      } catch (error) {
        console.error('Erro na compressão:', error)
        toast.error(`Falha ao comprimir ${file.name}. Upload cancelado por segurança.`)
        continue
      }

      const ext = 'webp'
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(path, fileToUpload, {
        cacheControl: '86400',
        upsert: false,
        contentType: 'image/webp',
      })
      if (error) {
        toast.error(`Erro ao fazer upload de ${file.name}`)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
      setImagens(prev => [...prev, publicUrl])
    }
    setUploading(false)
    toast.success('Imagem(ns) enviada(s)!')
  }, [supabase, bucket, setImagens])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': [],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'image/heic': ['.heic'],
    },
    maxFiles,
    disabled: uploading,
  })

  async function removeImagem(url: string) {
    const path = url.split(`/storage/v1/object/public/${bucket}/`)[1]
    if (path) {
      await supabase.storage.from(bucket).remove([path])
    }
    setImagens(prev => prev.filter(i => i !== url))
    if (previewIndex >= imagens.length - 1) setPreviewIndex(Math.max(0, imagens.length - 2))
  }

  async function startCrop(url: string) {
    setProcessingCrop(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)

      setCropImageOriginalUrl(url)
      setCropImageUrl(objectUrl)
      setCrop(undefined)
      setCompletedCrop(null)
      setIsCropping(true)
    } catch {
      toast.error('Erro ao carregar imagem para edição.')
    }
    setProcessingCrop(false)
  }

  function cancelCrop() {
    setIsCropping(false)
    if (cropImageUrl) URL.revokeObjectURL(cropImageUrl)
    setCropImageUrl(null)
    setCropImageOriginalUrl(null)
  }

  async function handleSaveCrop() {
    if (!completedCrop || !cropImageUrl || !cropImageOriginalUrl || !imgRef.current) return

    setProcessingCrop(true)
    try {
      const scaleX = imgRef.current.naturalWidth / imgRef.current.width
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height

      const actualCrop = {
        x: completedCrop.x * scaleX,
        y: completedCrop.y * scaleY,
        width: completedCrop.width * scaleX,
        height: completedCrop.height * scaleY,
      }

      const croppedFile = await getCroppedImg(cropImageUrl, actualCrop)
      if (!croppedFile) throw new Error('Falha ao cortar imagem')

      let fileToUpload = croppedFile as File
      try {
        const options = {
          maxSizeMB: 1,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          fileType: 'image/webp',
          initialQuality: 0.8,
        }
        fileToUpload = (await imageCompression(croppedFile as File, options)) as File
        const oldSize = (croppedFile.size / 1024).toFixed(0)
        const newSize = (fileToUpload.size / 1024).toFixed(0)
        toast.success(`Recorte comprimido: ${oldSize}KB → ${newSize}KB`)
      } catch (error) {
        console.error('Erro na compressão do recorte:', error)
        throw new Error('Falha ao comprimir imagem recortada.')
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Não autorizado')

      const ext = 'webp'
      const newPath = `${user.id}/${Date.now()}-cropped-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage.from(bucket).upload(newPath, fileToUpload, {
        cacheControl: '86400',
        upsert: false,
        contentType: 'image/webp',
      })
      if (uploadError) throw uploadError

      const { data: { publicUrl: newUrl } } = supabase.storage.from(bucket).getPublicUrl(newPath)

      setImagens(prev => prev.map(url => (url === cropImageOriginalUrl ? newUrl : url)))

      const oldPath = cropImageOriginalUrl.split(`/storage/v1/object/public/${bucket}/`)[1]
      if (oldPath) {
        await supabase.storage.from(bucket).remove([oldPath])
      }

      toast.success('Recorte salvo com sucesso!')
      cancelCrop()
    } catch (err: any) {
      toast.error(`Erro ao salvar recorte: ${err.message}`)
    }
    setProcessingCrop(false)
  }

  return (
    <div>
      {/* Preview */}
      {imagens.length > 0 && (
        <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-video mb-4">
          <img
            src={imagens[previewIndex]}
            alt="Preview"
            className="w-full h-full object-contain"
          />
          {imagens.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setPreviewIndex(i => Math.max(0, i - 1))}
                disabled={previewIndex === 0}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewIndex(i => Math.min(imagens.length - 1, i + 1))}
                disabled={previewIndex === imagens.length - 1}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 text-white rounded-full disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full">
                {previewIndex + 1}/{imagens.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Thumbnails */}
      {imagens.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {imagens.map((img, i) => (
            <div key={img} className="relative group">
              <button
                type="button"
                onClick={() => setPreviewIndex(i)}
                className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                  previewIndex === i ? 'border-rosa-500' : 'border-gray-200'
                }`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>

              <button
                type="button"
                onClick={() => removeImagem(img)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Apagar"
              >
                <X className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={() => startCrop(img)}
                disabled={processingCrop}
                className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow transition-all z-10"
                title="Cortar imagem"
              >
                {processingCrop && cropImageOriginalUrl === img ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Scissors className="w-3 h-3" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-rosa-400 bg-rosa-50'
            : 'border-gray-200 hover:border-rosa-300 hover:bg-rosa-50/50'
        } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-rosa-400 animate-spin" />
            <p className="text-sm text-gray-500">Enviando imagens...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-600">
              {isDragActive ? 'Solte as imagens aqui' : 'Clique ou arraste imagens'}
            </p>
            <p className="text-xs text-gray-400">JPG, PNG, WebP • Máx 5MB cada</p>
          </div>
        )}
      </div>

      {/* Modal de Crop */}
      {isCropping && cropImageUrl && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 animate-fade-in touch-none">
          <div className="flex items-center justify-between p-4 bg-black/50 text-white z-10 backdrop-blur-md border-b border-white/10">
            <button
              type="button"
              onClick={cancelCrop}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <p className="font-semibold">Ajustar Recorte livre</p>
            <button
              type="button"
              onClick={handleSaveCrop}
              disabled={processingCrop || !completedCrop?.width || !completedCrop?.height}
              className="p-2 rounded-full bg-rosa-600 hover:bg-rosa-700 text-white transition-colors disabled:opacity-50"
            >
              {processingCrop ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Check className="w-6 h-6" />
              )}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              onComplete={c => setCompletedCrop(c)}
              className="max-h-full max-w-full"
            >
              <img
                ref={imgRef}
                src={cropImageUrl}
                className="max-h-[70vh] w-auto mx-auto object-contain"
                alt="Crop preview"
              />
            </ReactCrop>
          </div>

          <div className="p-6 bg-black text-white z-10 text-center pb-safe">
            <p className="text-sm text-gray-400 mb-4">
              Arraste as alças azuis nas bordas da imagem para ajustar o tamanho do corte.
            </p>
            <button
              type="button"
              onClick={handleSaveCrop}
              disabled={processingCrop || !completedCrop?.width || !completedCrop?.height}
              className="w-full max-w-sm mx-auto py-3.5 bg-rosa-600 hover:bg-rosa-700 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-rosa-900/50"
            >
              {processingCrop ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Salvando...
                </>
              ) : (
                <>Confirmar Recorte</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Atualizar ProdutoForm.tsx para consumir ImageUploader**

Substituir o bloco de Dropzone/Crop inline em `src/components/ProdutoForm.tsx` pelo componente `ImageUploader`:
```tsx
import ImageUploader from '@/components/ImageUploader'
...
{/* Imagens */}
<div className="bg-white rounded-2xl border border-gray-100 p-6">
  <h2 className="font-semibold text-gray-800 mb-4">Imagens do Produto</h2>
  <ImageUploader imagens={imagens} setImagens={setImagens} bucket="produtos" />
</div>
```

- [ ] **Step 3: Testar e verificar compilação**

Run: `npm run lint` ou `npx tsc --noEmit`
Expected: Sem erros de tipagem.

- [ ] **Step 4: Commit**

```bash
git add src/components/ImageUploader.tsx src/components/ProdutoForm.tsx
git commit -m "refactor: extract ImageUploader component for reuse in ecommerce and auction"
```

---

### Task 5: Rota de API Segura para Criação de Pedidos (`POST /api/pedidos`)

**Files:**
- Create: `src/app/api/pedidos/route.ts`

**Interfaces:**
- Consumes: `validarPayloadPedido`, `gerarMensagemPedido`, `gerarLinkWhatsAppPedido`, `LOJA_TENANT_SLUG`.
- Produces: Endpoint `POST /api/pedidos` retornando `{ numero: number, whatsappUrl: string }` com status 201 ou erro 400/422/500.

- [ ] **Step 1: Criar src/app/api/pedidos/route.ts**

Criar `src/app/api/pedidos/route.ts`:
```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LOJA_TENANT_SLUG, LojaProduto } from '@/lib/loja-types'
import { validarPayloadPedido } from '@/lib/loja/validarPedido'
import { gerarMensagemPedido, gerarLinkWhatsAppPedido } from '@/lib/loja/whatsapp'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(req: Request) {
  try {
    const payload = await req.json()

    // 1. Buscar o tenant oficial
    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from('tenants')
      .select('id, whatsapp, nome')
      .eq('slug', LOJA_TENANT_SLUG)
      .eq('ativo', true)
      .single()

    if (tenantErr || !tenant) {
      return NextResponse.json({ erro: 'Loja não encontrada ou inativa' }, { status: 404 })
    }

    if (!payload.itens || !Array.isArray(payload.itens) || payload.itens.length === 0) {
      return NextResponse.json({ erro: 'Sacola vazia' }, { status: 400 })
    }

    // 2. Buscar os produtos no banco para garantir preços e status atualizados
    const productIds = payload.itens.map((it: any) => it.produtoId).filter(Boolean)
    const { data: prods, error: prodsErr } = await supabaseAdmin
      .from('loja_produtos')
      .select('*')
      .in('id', productIds)
      .eq('tenant_id', tenant.id)

    if (prodsErr || !prods) {
      return NextResponse.json({ erro: 'Erro ao consultar produtos' }, { status: 500 })
    }

    // 3. Validar payload contra dados oficiais do banco
    const validacao = validarPayloadPedido(payload, prods as LojaProduto[])
    if (!validacao.valido || !validacao.totalCalculado || !validacao.itensProcessados) {
      return NextResponse.json({ erro: validacao.erro || 'Pedido inválido' }, { status: 422 })
    }

    // 4. Inserir Pedido no Supabase
    const { data: novoPedido, error: pedErr } = await supabaseAdmin
      .from('pedidos')
      .insert({
        tenant_id: tenant.id,
        cliente_nome: payload.cliente_nome.trim(),
        cliente_whatsapp: String(payload.cliente_whatsapp).replace(/\D/g, ''),
        observacao: payload.observacao?.trim() || null,
        total: validacao.totalCalculado,
        status: 'novo',
      })
      .select('id, numero')
      .single()

    if (pedErr || !novoPedido) {
      console.error('Erro ao gravar pedido:', pedErr)
      return NextResponse.json({ erro: 'Falha ao registrar pedido' }, { status: 500 })
    }

    // 5. Inserir Itens do Pedido
    const itensParaInserir = validacao.itensProcessados.map(it => ({
      pedido_id: novoPedido.id,
      produto_id: it.produto_id,
      titulo: it.titulo,
      tamanho: it.tamanho,
      quantidade: it.quantidade,
      preco_unitario: it.preco_unitario,
      imagem: it.imagem,
    }))

    const { error: itensErr } = await supabaseAdmin
      .from('pedido_itens')
      .insert(itensParaInserir)

    if (itensErr) {
      console.error('Erro ao gravar itens do pedido:', itensErr)
      // Rollback manual do pedido
      await supabaseAdmin.from('pedidos').delete().eq('id', novoPedido.id)
      return NextResponse.json({ erro: 'Falha ao registrar itens do pedido' }, { status: 500 })
    }

    // 6. Gerar mensagem e link wa.me
    const mensagem = gerarMensagemPedido({
      numero: novoPedido.numero,
      cliente_nome: payload.cliente_nome.trim(),
      observacao: payload.observacao?.trim() || null,
      total: validacao.totalCalculado,
      itens: validacao.itensProcessados,
    })

    const whatsappDestino = tenant.whatsapp || '5555981519990'
    const whatsappUrl = gerarLinkWhatsAppPedido(whatsappDestino, mensagem)

    return NextResponse.json(
      {
        sucesso: true,
        numero: novoPedido.numero,
        whatsappUrl,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro no endpoint de pedidos:', error)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/pedidos/route.ts
git commit -m "feat(loja): add secure order checkout API endpoint"
```

---

### Task 6: Hook de Gerenciamento da Sacola / Carrinho (`useCarrinho`)

**Files:**
- Create: `src/lib/loja/useCarrinho.ts`

**Interfaces:**
- Produces: `useCarrinho()` provendo `{ itens, adicionarItem, removerItem, atualizarQuantidade, limparCarrinho, totalItens, totalValor }` com sincronização reativa via `localStorage` e eventos `CustomEvent`.

- [ ] **Step 1: Criar src/lib/loja/useCarrinho.ts**

Criar `src/lib/loja/useCarrinho.ts`:
```typescript
'use client'

import { useState, useEffect } from 'react'
import { CarrinhoItem, LOJA_TENANT_SLUG } from '@/lib/loja-types'

const STORAGE_KEY = `loja_carrinho_${LOJA_TENANT_SLUG}`
const SYNC_EVENT = `loja_carrinho_sync_${LOJA_TENANT_SLUG}`

export function useCarrinho() {
  const [itens, setItens] = useState<CarrinhoItem[]>([])
  const [carregado, setCarregado] = useState(false)

  function carregarDoStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      setItens(data ? JSON.parse(data) : [])
    } catch {
      setItens([])
    }
  }

  useEffect(() => {
    carregarDoStorage()
    setCarregado(true)

    function handleSync() {
      carregarDoStorage()
    }

    window.addEventListener(SYNC_EVENT, handleSync)
    window.addEventListener('storage', handleSync)
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync)
      window.removeEventListener('storage', handleSync)
    }
  }, [])

  function salvar(novosItens: CarrinhoItem[]) {
    setItens(novosItens)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(novosItens))
      window.dispatchEvent(new Event(SYNC_EVENT))
    } catch (e) {
      console.error('Erro ao salvar carrinho no localStorage:', e)
    }
  }

  function adicionarItem(item: {
    produtoId: string
    slug: string
    titulo: string
    precoUnitario: number
    imagem: string | null
    tamanho: string | null
    quantidade?: number
  }) {
    const qtdAdicionar = item.quantidade || 1
    const idx = itens.findIndex(
      it => it.produtoId === item.produtoId && it.tamanho === (item.tamanho || null)
    )

    if (idx >= 0) {
      const clone = [...itens]
      clone[idx].quantidade = Math.min(20, clone[idx].quantidade + qtdAdicionar)
      salvar(clone)
    } else {
      const novo: CarrinhoItem = {
        produtoId: item.produtoId,
        slug: item.slug,
        titulo: item.titulo,
        precoUnitario: item.precoUnitario,
        imagem: item.imagem,
        tamanho: item.tamanho || null,
        quantidade: Math.min(20, qtdAdicionar),
      }
      salvar([...itens, novo])
    }
  }

  function removerItem(produtoId: string, tamanho: string | null) {
    const filtrados = itens.filter(
      it => !(it.produtoId === produtoId && it.tamanho === tamanho)
    )
    salvar(filtrados)
  }

  function atualizarQuantidade(produtoId: string, tamanho: string | null, novaQuantidade: number) {
    if (novaQuantidade <= 0) {
      removerItem(produtoId, tamanho)
      return
    }
    const clone = itens.map(it => {
      if (it.produtoId === produtoId && it.tamanho === tamanho) {
        return { ...it, quantidade: Math.min(20, novaQuantidade) }
      }
      return it
    })
    salvar(clone)
  }

  function limparCarrinho() {
    salvar([])
  }

  const totalItens = itens.reduce((acc, it) => acc + it.quantidade, 0)
  const totalValor = itens.reduce((acc, it) => acc + it.precoUnitario * it.quantidade, 0)

  return {
    itens,
    carregado,
    adicionarItem,
    removerItem,
    atualizarQuantidade,
    limparCarrinho,
    totalItens,
    totalValor: Number(totalValor.toFixed(2)),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/loja/useCarrinho.ts
git commit -m "feat(loja): implement shopping bag hook with local storage sync"
```

---

### Task 7: Painel Admin — Gestão de Categorias

**Files:**
- Create: `src/app/loja/[tenant]/admin/loja/categorias/page.tsx`

**Interfaces:**
- Produces: Tela de administração de categorias em `/loja/[tenant]/admin/loja/categorias` permitindo adicionar, editar ordem e apagar categorias.

- [ ] **Step 1: Criar src/app/loja/[tenant]/admin/loja/categorias/page.tsx**

Criar a página com listagem das categorias, input para adicionar nova categoria (gerando slug automático via `slugify`), botões de subir/descer para reordenar, e botão de exclusão com toast de confirmação.

- [ ] **Step 2: Commit**

```bash
git add src/app/loja/[tenant]/admin/loja/categorias/page.tsx
git commit -m "feat(admin): add categories management page"
```

---

### Task 8: Painel Admin — Gestão e Cadastro de Produtos da Loja

**Files:**
- Create: `src/components/LojaProdutoForm.tsx`
- Create: `src/app/loja/[tenant]/admin/loja/produtos/page.tsx`
- Create: `src/app/loja/[tenant]/admin/loja/produtos/novo/page.tsx`
- Create: `src/app/loja/[tenant]/admin/loja/produtos/[id]/page.tsx`

**Interfaces:**
- Produces:
  - Form de produto da loja com `ImageUploader`, título, descrição, categoria, preço, preço promocional, seletor de tamanhos (chips com tamanhos populares + input livre), toggle destaque e toggle publicado.
  - Listagem de produtos da loja com filtros por categoria e status (todos, publicado, rascunho), toggle rápido de publicação e atalho para copiar link do produto.

- [ ] **Step 1: Criar componente src/components/LojaProdutoForm.tsx**

Implementar formulário completo com suporte a criação e edição, integrando `ImageUploader`, cálculo visual do desconto se `preco_promocional` for preenchido, e chips interativos para adicionar/remover tamanhos (`PP`, `P`, `M`, `G`, `GG`, `Único`, etc.).

- [ ] **Step 2: Criar página de listagem src/app/loja/[tenant]/admin/loja/produtos/page.tsx**

Implementar tabela/cards responsivos com imagem, título, preço de/por, tags de tamanhos, status publicado/destaque e ações de edição/exclusão.

- [ ] **Step 3: Criar páginas de rotas /novo e /[id]**

Criar as páginas `src/app/loja/[tenant]/admin/loja/produtos/novo/page.tsx` e `src/app/loja/[tenant]/admin/loja/produtos/[id]/page.tsx` integrando o `LojaProdutoForm`.

- [ ] **Step 4: Commit**

```bash
git add src/components/LojaProdutoForm.tsx src/app/loja/[tenant]/admin/loja/produtos/
git commit -m "feat(admin): add store products list and create/edit forms"
```

---

### Task 9: Painel Admin — Gestão de Pedidos da Loja

**Files:**
- Create: `src/app/loja/[tenant]/admin/loja/pedidos/page.tsx`

**Interfaces:**
- Produces: Visualização de pedidos recebidos com badges de status (`novo`, `pago`, `enviado`, `entregue`, `cancelado`), busca por cliente/número, detalhe dos itens e botão direto para abrir WhatsApp com a cliente.

- [ ] **Step 1: Criar src/app/loja/[tenant]/admin/loja/pedidos/page.tsx**

Implementar listagem com tabs de filtro por status, accordion ou modal para abrir detalhes do pedido (fotos, tamanhos, quantidades, totais e observação do cliente) e select para alterar status instantaneamente no Supabase.

- [ ] **Step 2: Commit**

```bash
git add src/app/loja/[tenant]/admin/loja/pedidos/page.tsx
git commit -m "feat(admin): add order management and customer tracking page"
```

---

### Task 10: Atualização da Navegação Admin e Footer Público

**Files:**
- Modify: `src/app/loja/[tenant]/admin/layout.tsx`
- Modify: `src/components/TenantFooterNav.tsx`

**Interfaces:**
- Modifies:
  - Adiciona itens no menu lateral admin para `leilaodasgurias`: "Loja: Produtos", "Loja: Categorias", "Loja: Pedidos".
  - Adiciona aba "Loja" no menu inferior mobile de clientes apenas para o tenant `leilaodasgurias`.

- [ ] **Step 1: Atualizar layout do Admin**

Editar `src/app/loja/[tenant]/admin/layout.tsx`:
Se `tenantSlug === LOJA_TENANT_SLUG`, adicionar seção no sidebar com links para:
- `${basePath}/loja/produtos` (Ícone: Shirt ou ShoppingBag)
- `${basePath}/loja/pedidos` (Ícone: ClipboardList)
- `${basePath}/loja/categorias` (Ícone: Tags)

- [ ] **Step 2: Atualizar TenantFooterNav.tsx**

Editar `src/components/TenantFooterNav.tsx`:
Adicionar a aba `{ href: `${basePath}/shop`, label: 'Loja', icon: ShoppingBag, active: pathname.startsWith(`${basePath}/shop`) }` posicionada harmonicamente entre "Explorar" e "Meus Lances" quando `tenantSlug === LOJA_TENANT_SLUG`.

- [ ] **Step 3: Commit**

```bash
git add src/app/loja/[tenant]/admin/layout.tsx src/components/TenantFooterNav.tsx
git commit -m "feat(navigation): integrate store tabs into admin sidebar and public footer nav"
```

---

### Task 11: Vitrine Pública da Loja (`/loja/[tenant]/shop`)

**Files:**
- Create: `src/app/loja/[tenant]/shop/page.tsx`
- Create: `src/components/LojaProdutoCard.tsx`

**Interfaces:**
- Produces: Página da vitrine de e-commerce da loja com banner/destaques, carrossel de categorias, busca de produtos e grid com cards de roupas exibindo preços e selos de desconto.

- [ ] **Step 1: Criar src/components/LojaProdutoCard.tsx**

Card otimizado com `next/image`, selo promocional flutuante (`-25%`), título, tamanhos disponíveis em mini-tags, preço anterior riscado e preço atual em destaque.

- [ ] **Step 2: Criar vitrine em src/app/loja/[tenant]/shop/page.tsx**

Implementar página pública com:
- Header elegante com nome da loja e botão da Sacola flutuante/topo com contador animado de itens.
- Carrossel horizontal de produtos em destaque.
- Barra de categorias deslizável ("Todas", "Vestidos", "Blusas", etc.).
- Grid 2 colunas responsivo com `LojaProdutoCard`.
- Inclusão do `TenantFooterNav`.

- [ ] **Step 3: Commit**

```bash
git add src/components/LojaProdutoCard.tsx src/app/loja/[tenant]/shop/page.tsx
git commit -m "feat(storefront): create public clothing catalog and showcase"
```

---

### Task 12: Página de Detalhe do Produto (`/loja/[tenant]/shop/[slug]`)

**Files:**
- Create: `src/app/loja/[tenant]/shop/[slug]/page.tsx`

**Interfaces:**
- Produces: Página de detalhe da peça com galeria de fotos, seleção de tamanho obrigatória (se aplicável), descrição completa, botão de adicionar à sacola com feedback sonner/toast e redirecionamento opcional para ver sacola.

- [ ] **Step 1: Criar src/app/loja/[tenant]/shop/[slug]/page.tsx**

Implementar:
- Carrossel de fotos (scroll-snap / swiper leve) com contador de imagem.
- Título, preço normal e promocional com cálculo de % OFF.
- Seletor de tamanhos: chips interativos com validação (não permite adicionar à sacola sem selecionar tamanho se o produto possuir opções).
- Seletor de quantidade (1 a 20).
- Botão fixo no rodapé: "Adicionar à Sacola" integrado com `useCarrinho`.
- Breadcrumb ou botão voltar para a vitrine `/shop`.

- [ ] **Step 2: Commit**

```bash
git add src/app/loja/[tenant]/shop/[slug]/page.tsx
git commit -m "feat(storefront): create product detail page with size selector and bag integration"
```

---

### Task 13: Página da Sacola e Checkout via WhatsApp (`/loja/[tenant]/shop/carrinho`)

**Files:**
- Create: `src/app/loja/[tenant]/shop/carrinho/page.tsx`

**Interfaces:**
- Produces: Tela da sacola de compras com controle de itens, inputs para dados de entrega/contato e botão finalizador disparando `POST /api/pedidos` e redirecionando para WhatsApp.

- [ ] **Step 1: Criar src/app/loja/[tenant]/shop/carrinho/page.tsx**

Implementar:
- Lista de produtos adicionados com miniatura, título, tamanho escolhido, preço unitário, botões de incremento/decremento de quantidade e botão de excluir.
- Resumo financeiro com subtotal e total.
- Campos de identificação: Nome completo (lembrado em `localStorage`), `PhoneInput` para WhatsApp e campo opcional de Observações.
- Validação no submit: exibe loading no botão, envia requisição para `/api/pedidos`, limpa a sacola em caso de sucesso e redireciona via `window.location.href = res.whatsappUrl`.
- Empty state carinhoso com botão "Voltar às Compras" caso a sacola esteja vazia.

- [ ] **Step 2: Commit**

```bash
git add src/app/loja/[tenant]/shop/carrinho/page.tsx
git commit -m "feat(storefront): create shopping bag page with whatsapp checkout"
```

---

### Task 14: Verificação Final, Build e Testes Manuais

**Files:**
- Run and check all modified files.

**Interfaces:**
- Produces: `npm test` 100% aprovado, `npm run build` gerando bundle de produção sem erros de tipos ou rotas.

- [ ] **Step 1: Executar suite de testes unitários**

Run: `npm test`
Expected: Todos os testes passando sem erros.

- [ ] **Step 2: Executar build de produção do Next.js**

Run: `npm run build`
Expected: Build concluído com sucesso sem falhas de compilação ou rotas 404.

- [ ] **Step 3: Checklist manual de verificação**
  - [ ] Acessar `/loja/leilaodasgurias/admin/loja/categorias` e criar categorias de teste.
  - [ ] Acessar `/loja/leilaodasgurias/admin/loja/produtos/novo` e cadastrar uma roupa com fotos, tamanhos e preço promocional.
  - [ ] Acessar `/loja/leilaodasgurias/shop` e checar se o card aparece com selo de promoção.
  - [ ] Clicar no produto, escolher tamanho e adicionar à sacola.
  - [ ] Abrir `/loja/leilaodasgurias/shop/carrinho`, preencher nome/WhatsApp e clicar em finalizar.
  - [ ] Verificar se o pedido foi salvo no banco e aparece no admin em `/loja/leilaodasgurias/admin/loja/pedidos`.
  - [ ] Verificar se os leilões originais continuam funcionando normalmente.

- [ ] **Step 4: Commit final da branch / feature**

```bash
git commit --allow-empty -m "chore: complete loja ecommerce feature verification"
```

