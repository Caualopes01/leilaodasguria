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
