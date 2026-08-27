-- Vamos apenas criar as políticas, já que o bucket foi criado manualmente.

-- 1. Permite que qualquer pessoa veja as imagens (Select)
CREATE POLICY "Imagens_lojas_publicas" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'lojas' );

-- 2. Permite que os admins façam upload de imagens (Insert)
CREATE POLICY "Admins_upload_lojas" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'lojas' );

-- 3. Permite que os admins atualizem as imagens (Update)
CREATE POLICY "Admins_update_lojas" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'lojas' );

-- 4. Permite que os admins deletem as imagens (Delete)
CREATE POLICY "Admins_delete_lojas" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'lojas' );
