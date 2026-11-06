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
    const metodoEntrega = validacao.metodo_entrega || 'retirar_loja'
    const endereco = validacao.endereco || null
    const formaPagamento = validacao.forma_pagamento || 'pix'
    const obsOriginal = payload.observacao?.trim() || null

    let insertPayload: any = {
      tenant_id: tenant.id,
      cliente_nome: payload.cliente_nome.trim(),
      cliente_whatsapp: String(payload.cliente_whatsapp).replace(/\D/g, ''),
      observacao: obsOriginal,
      metodo_entrega: metodoEntrega,
      endereco: endereco,
      forma_pagamento: formaPagamento,
      total: validacao.totalCalculado,
      status: 'novo',
    }

    let { data: novoPedido, error: pedErr } = await supabaseAdmin
      .from('pedidos')
      .insert(insertPayload)
      .select('id, numero')
      .single()

    // Se as novas colunas ainda não existirem no Supabase, fazer fallback seguro
    if (
      pedErr &&
      (pedErr.message?.includes('column') ||
        pedErr.code === 'PGRST204' ||
        pedErr.message?.includes('schema cache'))
    ) {
      console.warn('Colunas de entrega/pagamento ausentes em pedidos. Usando fallback no campo observacao.')

      const entregaTxt =
        metodoEntrega === 'retirar_loja'
          ? '[Entrega: Retirar na Loja]'
          : `[Entrega: ${metodoEntrega === 'tele_entrega' ? 'Tele-entrega' : 'Correios'} - ${endereco || 'Sem endereço'}]`
      const pagTxt = `[Pagamento: ${formaPagamento.toUpperCase()}]`
      const obsComDetalhes = [entregaTxt, pagTxt, obsOriginal].filter(Boolean).join('\n')

      const fallbackInsert = {
        tenant_id: tenant.id,
        cliente_nome: payload.cliente_nome.trim(),
        cliente_whatsapp: String(payload.cliente_whatsapp).replace(/\D/g, ''),
        observacao: obsComDetalhes,
        total: validacao.totalCalculado,
        status: 'novo',
      }

      const retryRes = await supabaseAdmin
        .from('pedidos')
        .insert(fallbackInsert)
        .select('id, numero')
        .single()

      novoPedido = retryRes.data
      pedErr = retryRes.error
    }

    if (pedErr || !novoPedido) {
      console.error('Erro ao gravar pedido:', pedErr)
      return NextResponse.json(
        { erro: `Falha ao registrar pedido: ${pedErr?.message || 'Erro no banco'}` },
        { status: 500 }
      )
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
      return NextResponse.json(
        { erro: `Falha ao registrar itens do pedido: ${itensErr?.message || 'Erro no banco'}` },
        { status: 500 }
      )
    }

    // 6. Determinar link do pedido para acompanhamento
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'guriaschiques.vercel.app'
    const proto = req.headers.get('x-forwarded-proto') || 'https'
    const origin = req.headers.get('origin') || `${proto}://${host}`
    const linkPedido = `${origin}/loja/${LOJA_TENANT_SLUG}/shop/pedido/${novoPedido.id}`

    // 7. Gerar mensagem e link wa.me
    const mensagem = gerarMensagemPedido({
      numero: novoPedido.numero,
      cliente_nome: payload.cliente_nome.trim(),
      metodo_entrega: metodoEntrega,
      endereco: endereco,
      forma_pagamento: formaPagamento,
      observacao: payload.observacao?.trim() || null,
      total: validacao.totalCalculado,
      itens: validacao.itensProcessados,
      linkPedido,
    })

    const whatsappDestino = tenant.whatsapp || '5555981519990'
    const whatsappUrl = gerarLinkWhatsAppPedido(whatsappDestino, mensagem)

    return NextResponse.json(
      {
        sucesso: true,
        numero: novoPedido.numero,
        id: novoPedido.id,
        linkPedido,
        whatsappUrl,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro no endpoint de pedidos:', error)
    return NextResponse.json({ erro: 'Erro interno do servidor' }, { status: 500 })
  }
}
