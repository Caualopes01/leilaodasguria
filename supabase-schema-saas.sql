-- ============================================
-- DÊU LANCE - SaaS Multi-tenant Schema
-- Extensão do schema original (não destrutivo)
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- ======================
-- TABELA DE TENANTS
-- Cada leiloeira é um tenant
-- ======================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,           -- ex: "amanda", "joana" → usado na URL /loja/amanda
  logo_url TEXT,
  cor_primaria TEXT DEFAULT '#e91e8c',  -- personalização de marca
  cor_secundaria TEXT DEFAULT '#f97316',
  email TEXT NOT NULL,
  whatsapp TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- dono/admin do tenant
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- TABELA DE ASSINATURAS
-- Controle de planos (mensal/anual)
-- ======================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  plano TEXT CHECK (plano IN ('mensal', 'anual')) NOT NULL,
  status TEXT CHECK (status IN ('ativa', 'cancelada', 'expirada', 'trial', 'pendente')) DEFAULT 'trial',
  valor DECIMAL(10,2) NOT NULL DEFAULT 49.90,
  inicio_em TIMESTAMPTZ DEFAULT NOW(),
  fim_em TIMESTAMPTZ,
  -- Campos de gateway de pagamento (preenchidos quando definir gateway)
  gateway TEXT,                        -- 'stripe', 'mercadopago', 'asaas', etc.
  gateway_customer_id TEXT,
  gateway_subscription_id TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- ADICIONAR tenant_id NAS TABELAS EXISTENTES
-- Com DEFAULT NULL para não quebrar dados atuais
-- ======================
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);
ALTER TABLE lances ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id);

-- ======================
-- ÍNDICES
-- ======================
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id ON tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_ativo ON tenants(ativo);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_produtos_tenant ON produtos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lances_tenant ON lances(tenant_id);

-- ======================
-- RLS (Row Level Security)
-- ======================
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Tenants: leitura pública (para resolver slugs), escrita por admin
CREATE POLICY "tenants_leitura_publica" ON tenants FOR SELECT USING (true);
CREATE POLICY "tenants_escrita_admin" ON tenants FOR ALL USING (auth.role() = 'authenticated');

-- Subscriptions: leitura por admin, escrita por admin/sistema
CREATE POLICY "subscriptions_leitura_admin" ON subscriptions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "subscriptions_escrita_admin" ON subscriptions FOR ALL USING (auth.role() = 'authenticated');

-- ======================
-- REALTIME
-- ======================
ALTER PUBLICATION supabase_realtime ADD TABLE tenants;
ALTER PUBLICATION supabase_realtime ADD TABLE subscriptions;

-- ======================
-- FUNÇÕES AUXILIARES
-- ======================

-- Função para verificar se um tenant tem assinatura ativa
CREATE OR REPLACE FUNCTION tenant_assinatura_ativa(p_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE tenant_id = p_tenant_id 
    AND status IN ('ativa', 'trial')
    AND (fim_em IS NULL OR fim_em > NOW())
  );
END;
$$ LANGUAGE plpgsql;

-- Função para obter dias restantes da assinatura
CREATE OR REPLACE FUNCTION tenant_dias_restantes(p_tenant_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_fim TIMESTAMPTZ;
BEGIN
  SELECT fim_em INTO v_fim FROM subscriptions 
  WHERE tenant_id = p_tenant_id 
  AND status IN ('ativa', 'trial')
  ORDER BY fim_em DESC NULLS LAST
  LIMIT 1;
  
  IF v_fim IS NULL THEN RETURN 0; END IF;
  RETURN GREATEST(0, EXTRACT(DAY FROM v_fim - NOW())::INTEGER);
END;
$$ LANGUAGE plpgsql;
