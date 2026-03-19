-- ============================================
-- LEILÃO DAS GURIAS - Supabase Schema
-- Execute este SQL no Supabase SQL Editor
-- ============================================

-- Tabela de produtos/leilões
CREATE TABLE IF NOT EXISTS produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  valor_inicial DECIMAL(10,2) NOT NULL DEFAULT 0,
  valor_atual DECIMAL(10,2) NOT NULL DEFAULT 0,
  incremento_minimo DECIMAL(10,2) NOT NULL DEFAULT 1,
  inicio_em TIMESTAMPTZ NOT NULL,
  fim_em TIMESTAMPTZ NOT NULL,
  ativo BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'ativo', 'encerrado')),
  imagens TEXT[] DEFAULT '{}',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de lances
CREATE TABLE IF NOT EXISTS lances (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_lances_produto_id ON lances(produto_id);
CREATE INDEX IF NOT EXISTS idx_lances_valor ON lances(valor DESC);
CREATE INDEX IF NOT EXISTS idx_produtos_slug ON produtos(slug);
CREATE INDEX IF NOT EXISTS idx_produtos_status ON produtos(status);

-- Função para atualizar valor_atual automaticamente
CREATE OR REPLACE FUNCTION atualizar_valor_atual()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE produtos 
  SET valor_atual = NEW.valor, atualizado_em = NOW()
  WHERE id = NEW.produto_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar valor_atual após novo lance
DROP TRIGGER IF EXISTS trigger_atualizar_valor ON lances;
CREATE TRIGGER trigger_atualizar_valor
  AFTER INSERT ON lances
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_valor_atual();

-- Função para atualizar status baseado no tempo
CREATE OR REPLACE FUNCTION atualizar_status_produtos()
RETURNS void AS $$
BEGIN
  -- Ativar produtos que já começaram
  UPDATE produtos 
  SET status = 'ativo'
  WHERE status = 'aguardando' AND inicio_em <= NOW() AND fim_em > NOW();
  
  -- Encerrar produtos que terminaram
  UPDATE produtos 
  SET status = 'encerrado'
  WHERE status = 'ativo' AND fim_em <= NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS (Row Level Security) - Storage público para leitura
-- Habilitar RLS nas tabelas
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE lances ENABLE ROW LEVEL SECURITY;

-- Policies para produtos: leitura pública, escrita apenas autenticados
CREATE POLICY "produtos_leitura_publica" ON produtos FOR SELECT USING (true);
CREATE POLICY "produtos_escrita_admin" ON produtos FOR ALL USING (auth.role() = 'authenticated');

-- Policies para lances: leitura pública, inserção pública, admin gerencia
CREATE POLICY "lances_leitura_publica" ON lances FOR SELECT USING (true);
CREATE POLICY "lances_insercao_publica" ON lances FOR INSERT WITH CHECK (true);
CREATE POLICY "lances_admin" ON lances FOR DELETE USING (auth.role() = 'authenticated');

-- Storage bucket para imagens
INSERT INTO storage.buckets (id, name, public) 
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy para storage
CREATE POLICY "imagens_leitura_publica" ON storage.objects 
  FOR SELECT USING (bucket_id = 'produtos');

CREATE POLICY "imagens_upload_admin" ON storage.objects 
  FOR INSERT WITH CHECK (bucket_id = 'produtos' AND auth.role() = 'authenticated');

CREATE POLICY "imagens_delete_admin" ON storage.objects 
  FOR DELETE USING (bucket_id = 'produtos' AND auth.role() = 'authenticated');

-- Habilitar Realtime nas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE lances;
ALTER PUBLICATION supabase_realtime ADD TABLE produtos;
