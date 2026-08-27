DO $$
DECLARE
    v_user_id uuid;
    v_user_email text;
    v_tenant_id uuid;
BEGIN
    -- Busca o ID e o E-mail do usuário administrador original
    SELECT id, email INTO v_user_id, v_user_email FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Nenhum usuário encontrado na tabela auth.users. Crie uma conta primeiro.';
    END IF;

    -- 1. Cria a loja oficial do Leilão das Gurias
    INSERT INTO public.tenants (id, slug, nome, email, cor_primaria, whatsapp, user_id, ativo)
    VALUES (
        gen_random_uuid(),
        'leilaodasgurias',
        'Leilão das Gurias',
        v_user_email,
        '#E8114B',
        '5555981519990', -- Coloque seu número aqui
        v_user_id,
        true
    )
    RETURNING id INTO v_tenant_id;

    -- 2. Cria a assinatura vitalícia gratuita para a sua loja
    INSERT INTO public.subscriptions (id, tenant_id, gateway, gateway_customer_id, gateway_subscription_id, plano, status, fim_em)
    VALUES (
        gen_random_uuid(),
        v_tenant_id,
        'legacy',
        'LEGACY',
        'LEGACY',
        'anual',
        'ativa',
        '2099-12-31 23:59:59'
    );

    -- 3. Atualiza TODOS os produtos legados (sem tenant) para pertencerem ao Leilão das Gurias
    UPDATE public.produtos
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;

    -- 4. Atualiza TODOS os lances legados para pertencerem à mesma loja
    UPDATE public.lances
    SET tenant_id = v_tenant_id
    WHERE tenant_id IS NULL;
    
    RAISE NOTICE 'Migração concluída com sucesso! Tenant ID: %', v_tenant_id;
END $$;
