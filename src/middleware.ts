import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user ?? null
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || ''

  // =============================================
  // REWRITE DA PÁGINA DE VENDAS PARA O NOVO DOMÍNIO
  // =============================================
  if (pathname === '/' && hostname.includes('deulance')) {
    return NextResponse.rewrite(new URL('/vendas/index.html', request.url))
  }

  // =============================================
  // ROTAS ORIGINAIS /admin/* (intocadas)
  // =============================================
  const isOriginalAdminRoute = pathname.startsWith('/admin') && !pathname.startsWith('/admin/') === false
  const isOriginalLoginPage = pathname === '/admin/login'

  if (pathname.startsWith('/admin') && !pathname.startsWith('/loja/')) {
    if (!isOriginalLoginPage && !user) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    if (isOriginalLoginPage && user) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    return supabaseResponse
  }

  // =============================================
  // ROTAS MULTI-TENANT /loja/[tenant]/admin/*
  // =============================================
  const tenantAdminMatch = pathname.match(/^\/loja\/([^/]+)\/admin/)
  if (tenantAdminMatch) {
    const tenantSlug = tenantAdminMatch[1]
    const isTenantLoginPage = pathname === `/loja/${tenantSlug}/admin/login`

    // Redirecionar para login se não autenticado
    if (!isTenantLoginPage && !user) {
      return NextResponse.redirect(new URL(`/loja/${tenantSlug}/admin/login`, request.url))
    }

    // Se já logado e tentando acessar login, redirecionar para admin
    if (isTenantLoginPage && user) {
      return NextResponse.redirect(new URL(`/loja/${tenantSlug}/admin`, request.url))
    }

    // Verificar se o tenant existe e se o usuário é dono dele
    if (!isTenantLoginPage && user) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id, ativo, user_id')
        .eq('slug', tenantSlug)
        .single()

      // Tenant não existe
      if (!tenant) {
        return NextResponse.redirect(new URL('/pricing', request.url))
      }

      // Tenant inativo
      if (!tenant.ativo) {
        return NextResponse.redirect(new URL(`/loja/${tenantSlug}/admin/login?error=inactive`, request.url))
      }

      // Verificar se é o dono do tenant
      if (tenant.user_id !== user.id) {
        return NextResponse.redirect(new URL(`/loja/${tenantSlug}/admin/login?error=unauthorized`, request.url))
      }

      // Verificar assinatura
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, fim_em')
        .eq('tenant_id', tenant.id)
        .in('status', ['ativa', 'trial'])
        .order('fim_em', { ascending: false, nullsFirst: false })
        .limit(1)
        .single()

      const isSubscriptionValid = subscription && (
        !subscription.fim_em || new Date(subscription.fim_em) > new Date()
      )

      if (!isSubscriptionValid) {
        // Assinatura expirada → redirecionar para página de renovação
        return NextResponse.redirect(new URL(`/assinatura?tenant=${tenantSlug}&expired=true`, request.url))
      }
    }

    return supabaseResponse
  }

  // =============================================
  // ROTAS SUPER ADMIN /superadmin/*
  // =============================================
  if (pathname.startsWith('/superadmin')) {
    const isSuperLoginPage = pathname === '/superadmin/login'

    if (!isSuperLoginPage && !user) {
      return NextResponse.redirect(new URL('/superadmin/login', request.url))
    }

    // Verificar se é super admin (email específico via env var)
    if (!isSuperLoginPage && user) {
      const superAdminEmail = process.env.SUPER_ADMIN_EMAIL
      if (superAdminEmail && user.email !== superAdminEmail) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/admin/:path*', '/loja/:path*/admin/:path*', '/superadmin/:path*'],
}
