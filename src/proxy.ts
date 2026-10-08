import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { obtenerRutaInicio } from '@/lib/access'

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const { pathname } = request.nextUrl

  // Las vistas de aprobación son públicas y nunca consultan datos reales.
  if (pathname.startsWith('/preview')) return supabaseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: claimsData } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub
  const userMetadata = claimsData?.claims?.user_metadata as { password_set?: boolean } | undefined

  function redirectConCookies(path: string) {
    const response = NextResponse.redirect(new URL(path, request.url))
    supabaseResponse.cookies.getAll().forEach(cookie => response.cookies.set(cookie))
    return response
  }

  // Rutas que requieren login
  const rutasProtegidas = ['/inicio', '/perfil', '/admin', '/metricas', '/classroom', '/clases', '/productos', '/ranking', '/logros', '/comunidad', '/resultados', '/checklist', '/objetivos', '/lanzamiento']
  if (!userId && rutasProtegidas.some(r => pathname.startsWith(r))) {
    const destino = `${pathname}${request.nextUrl.search}`
    return redirectConCookies(`/login?next=${encodeURIComponent(destino)}`)
  }

  let perfil: { rol: string; plan: string | null; desafio_socias_habilitada: boolean } | null = null
  if (userId) {
    const { data } = await supabase.from('perfiles').select('rol, plan, desafio_socias_habilitada').eq('id', userId).maybeSingle()
    perfil = data
  }

  // Las invitaciones deben definir la contraseña antes de abrir cualquier panel.
  const debeCrearContrasena = userMetadata?.password_set === false
  const rutasExentas = ['/crear-contrasena', '/auth/callback']
  if (userId && debeCrearContrasena && !rutasExentas.some(r => pathname.startsWith(r))) {
    return redirectConCookies('/crear-contrasena')
  }

  // Si ya está logueada, llevarla al espacio asignado.
  if (userId && (pathname === '/login' || pathname === '/registro')) {
    return redirectConCookies(obtenerRutaInicio(perfil?.rol))
  }

  // Las rutas administrativas quedan limitadas al rol administrador.
  if (userId && pathname.startsWith('/admin') && perfil?.rol !== 'admin') {
    return redirectConCookies('/inicio')
  }

  // Primera etapa: únicamente Inicio, Perfil, Lanzamiento y Clases están disponibles.
  // La autorización efectiva también se vuelve a comprobar en cada página/consulta.
  const rutasIniciales = ['/inicio', '/perfil']
  const rutasDesafio = ['/lanzamiento', '/classroom', '/clases']
  if (userId && perfil?.rol !== 'admin' && rutasProtegidas.some(r => pathname.startsWith(r))) {
    const permitida = [...rutasIniciales, ...rutasDesafio].some(r => pathname.startsWith(r))
    if (!permitida) return redirectConCookies('/inicio?acceso=bloqueado')
    if (rutasDesafio.some(r => pathname.startsWith(r)) && !perfil?.desafio_socias_habilitada) {
      return redirectConCookies('/inicio?acceso=pendiente')
    }
  }

  // Rutas aún no habilitadas — redirigir a perfil con aviso
  const rutasProximamente = ['/ranking', '/logros']
  if (userId && rutasProximamente.some(r => pathname.startsWith(r))) {
    return redirectConCookies('/inicio?proximamente=1')
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
