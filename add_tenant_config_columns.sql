-- Adiciona as colunas de configuração de aplicativo na tabela tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS app_titulo TEXT,
ADD COLUMN IF NOT EXISTS app_icone_url TEXT;
