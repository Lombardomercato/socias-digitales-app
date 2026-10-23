import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProximaClase from './ProximaClase'
import ArrowIcon from '@/components/ArrowIcon'
import NavigationIcon from '@/components/NavigationIcon'
import LockedModules from '@/components/LockedModules'
import FreeStart from '@/components/FreeStart'
import { leerCatalogoClases } from '@/lib/class-catalog'
import { leerAvisosSinLeer } from '@/lib/unread-notices'
import { UnreadNoticesProvider, UnreadNoticeLink } from '@/components/UnreadNotices'
import { permisoResultados } from '@/lib/results-server'
import { permisoMetricas } from '@/lib/metrics-server'
import { permisoMiDia } from '@/lib/my-day-server'
import { puedeVerLogros } from '@/lib/achievements'
import { AgendaProvider } from './AgendaProvider'
import { leerAgenda } from '@/lib/agenda-store'
import { hitoParaAlumna } from '@/lib/agenda-management'
import type { HitoAgenda } from '@/lib/agenda'
import { accesoInicio } from '@/lib/home-access'
import CampusFormation from './CampusFormation'
import { HomeCampusLoading } from '@/components/HomeCampus'

async function leerHoraServidor() {
  return Date.now()
}

export default async function InicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil, error: errorPerfil } = await supabase
    .from('perfiles')
    .select('nombre, avatar_url, rol, tipo_usuario, estado, desafio_socias_habilitada, desafio_socias_estado')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol === 'admin') redirect('/admin')
  if (errorPerfil || !perfil) return <main className="min-h-screen bg-[#F4EFEA] px-5 py-12"><section className="mx-auto max-w-xl rounded-3xl border border-[#E7DDD5] bg-[#FFFDFA] p-6"><h1 className="font-serif text-3xl">No pudimos comprobar tu acceso.</h1><p role="alert" className="mt-4 text-sm leading-6">Volvé a intentarlo. Tu cuenta y tus avances no se modificaron.</p><a href="/inicio" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white">Reintentar</a></section></main>
  const [accesoResultados,accesoMetricas,accesoMiDia] = await Promise.all([permisoResultados(supabase,user.id),permisoMetricas(supabase,user.id),permisoMiDia(supabase,user.id)])
  const resumenAvisos = await leerAvisosSinLeer(supabase, user.id)
  const nombre = perfil?.nombre?.trim().split(' ')[0] || user.user_metadata?.nombre || 'Socia'

  const acceso = accesoInicio(perfil)
  const tipoUsuario = acceso.nivel
  const habilitada = acceso.formacion
  const esDesafio = tipoUsuario === 'desafio'
  const mostrarClase = acceso.formacion
  const { data: accesoEstrategia } = await supabase.from('accesos_estrategia').select('habilitada').eq('usuaria_id', user.id).maybeSingle()
  // El guardado heredado de Estrategia aún exige Desafío en RLS. No anunciar
  // un módulo habilitado para una Socia que todavía no puede persistirlo.
  const estrategiaHabilitada = habilitada && Boolean(perfil.desafio_socias_habilitada && accesoEstrategia?.habilitada)
  const ahoraInicial = await leerHoraServidor()
  const esGratuito = acceso.gratuito
  const clasesGratuitas = esGratuito && perfil ? await leerCatalogoClases(perfil) : []
  const accesoCerrado = perfil?.desafio_socias_estado === 'rechazada' || perfil?.desafio_socias_estado === 'bloqueada'
  let hitos: HitoAgenda[] = [], errorAgenda = false
  if (mostrarClase && perfil) {
    try { hitos = hitoParaAlumna((await leerAgenda()).hito, perfil) }
    catch { errorAgenda = true; console.error('agenda_read_failed') }
  }
  return (
    <UnreadNoticesProvider inicial={resumenAvisos}>
    <AgendaProvider inicial={hitos} errorInicial={errorAgenda}>
    <div className="min-h-screen bg-[#FAF7F3] text-[#211c19]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#e7ddd5] px-5 sm:px-8">
        <Link href="/inicio" aria-label="Socias Digitales, inicio">
          <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-4"><UnreadNoticeLink variante="header" />
        <Link href="/perfil" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4CAD8] text-sm font-semibold text-[#211c19]" aria-label="Mi perfil">
          {nombre.slice(0, 1).toUpperCase()}
        </Link></div>
      </header>

      <div className={`mx-auto grid max-w-[1400px] ${mostrarClase ? 'lg:grid-cols-[220px_minmax(0,1fr)]' : ''}`}>
        {mostrarClase && <aside className="hidden min-h-[calc(100vh-76px)] border-r border-[#e7ddd5] px-5 py-7 lg:block">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#746a64]">Mi espacio</p>
          <nav className="mt-5 space-y-1.5" aria-label="Navegación principal">
            <Link href="/inicio" aria-current="page" className="flex items-center gap-3 rounded-xl bg-[#F4CAD8] px-3 py-3 text-sm font-semibold"><NavigationIcon name="inicio" />Inicio</Link>
            {habilitada ? <>
              <Link href="/lanzamiento" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]"><NavigationIcon name="lanzamiento" />Estrategia</Link>
              <Link href="/clases" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]"><NavigationIcon name="clases" />Programa</Link>
            </> : null}
            <Link href="/perfil" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]"><NavigationIcon name="perfil" />Mi perfil</Link>
            <UnreadNoticeLink variante="menu" />
          </nav>
          <ProximaClase ahoraInicial={ahoraInicial} variante="contador" />
        </aside>}

        <main className="min-w-0 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#294A38]">{acceso.etiqueta}</p>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Hola, {nombre}.</h1>
            </div>
            <Link href="/perfil" className="inline-flex items-center gap-2 text-sm font-medium text-[#294A38]">Mi perfil <ArrowIcon diagonal /></Link>
          </div>

          {mostrarClase && <div className="mt-5"><ProximaClase ahoraInicial={ahoraInicial} variante="banner" /></div>}

          {acceso.suspendido ? <section className="mt-7 max-w-3xl rounded-[24px] border border-[#EC9BB6] bg-[#F4CAD8] p-6 sm:p-8"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#211c19]/55">Tu acceso</p><h2 className="mt-3 font-serif text-3xl font-semibold">Tu acceso al contenido pago está pausado.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#211c19]/70">Tus datos y avances siguen guardados. Si necesitás revisar tu acceso, comunicate con el equipo de Socias Digitales. Podés seguir entrando a tu perfil y tus avisos.</p><Link href="/perfil" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white">Ir a mi perfil <ArrowIcon /></Link></section> : esGratuito ? <FreeStart clases={clasesGratuitas} /> : !habilitada && esDesafio ? (
            <section className="mt-7 max-w-3xl rounded-[24px] bg-[#F4CAD8] p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#211c19]/55">Inscripción recibida</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold">{accesoCerrado ? 'Tu acceso no está habilitado.' : 'Tu acceso está en revisión.'}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#211c19]/70">{accesoCerrado ? 'Contactá a la administradora del Desafío Socias para consultar tu inscripción.' : 'Cuando Flor habilite tu inscripción, vas a recibir el email de bienvenida para entrar a tus clases. Flor habilita Estrategia por separado.'}</p>
              <Link href="/perfil" className="mt-6 inline-flex rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203a2c]">Revisar mi perfil&nbsp; →</Link>
            </section>
          ) : !habilitada ? (
            <section className="mt-7 max-w-3xl rounded-[24px] bg-[#F4CAD8] p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#211c19]/55">{tipoUsuario === 'socia' ? 'Espacio de socia' : 'Bienvenida'}</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold">Tu cuenta está lista.</h2>
            </section>
          ) : (
            <>
              <Suspense fallback={<HomeCampusLoading />}><CampusFormation supabase={supabase} usuariaId={user.id} perfil={perfil} /></Suspense>
              <section aria-label="Otros espacios" className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { label: 'Estrategia', href: '/lanzamiento', note: estrategiaHabilitada ? 'Etapas y tareas' : 'Pendiente de habilitación', tone: 'bg-white border border-[#E7DDD5]' },
                  { label: 'Mi perfil', href: '/perfil', note: 'Tus datos y cuenta', tone: 'bg-[#F4EFEA] border border-[#EC9BB6]/60' },
                ].map(item => <Link key={item.href} href={item.href} className={`group flex min-h-28 flex-col justify-between rounded-[20px] p-5 transition hover:-translate-y-0.5 ${item.tone}`}><span className="flex items-center justify-between gap-3 text-sm font-semibold">{item.label}<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF7F3]/80 text-[#294A38] transition group-hover:bg-[#294A38] group-hover:text-white"><ArrowIcon diagonal /></span></span><span className="text-xs text-[#746a64]">{item.note}</span></Link>)}
              </section>
            </>
          )}
          <UnreadNoticeLink variante="tarjeta" />
          <LockedModules venta={esGratuito} resultadosHabilitados={accesoResultados.permitido} metricasHabilitadas={accesoMetricas.permitido} miDiaHabilitado={accesoMiDia.permitido} logrosHabilitados={puedeVerLogros(perfil)} />
        </main>
      </div>
    </div>
    </AgendaProvider>
    </UnreadNoticesProvider>
  )
}
