import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProximaClase from './ProximaClase'
import ArrowIcon from '@/components/ArrowIcon'
import NavigationIcon from '@/components/NavigationIcon'
import LockedModules from '@/components/LockedModules'

async function leerHoraServidor() {
  return Date.now()
}

export default async function InicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, avatar_url, rol, tipo_usuario, desafio_socias_habilitada, desafio_socias_estado')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol === 'admin') redirect('/admin')
  const nombre = perfil?.nombre?.trim().split(' ')[0] || user.user_metadata?.nombre || 'Socia'

  const tipoUsuario = perfil?.tipo_usuario ?? (perfil?.rol === 'afiliada' || perfil?.rol === 'afiliada_lanzamiento' ? 'socia' : 'gratuito')
  const habilitada = Boolean(perfil?.desafio_socias_habilitada)
  const esDesafio = tipoUsuario === 'desafio'
  const mostrarClase = habilitada || tipoUsuario === 'socia'
  const { data: accesoEstrategia } = await supabase.from('accesos_estrategia').select('habilitada').eq('usuaria_id', user.id).maybeSingle()
  const estrategiaHabilitada = habilitada && Boolean(accesoEstrategia?.habilitada)
  const ahoraInicial = await leerHoraServidor()
  const accesoCerrado = perfil?.desafio_socias_estado === 'rechazada' || perfil?.desafio_socias_estado === 'bloqueada'
  return (
    <div className="min-h-screen bg-[#FAF7F3] text-[#211c19]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#e7ddd5] px-5 sm:px-8">
        <Link href="/inicio" aria-label="Socias Digitales, inicio">
          <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-4"><Link href="/notificaciones" className="flex items-center gap-2 text-sm text-[#294A38]" aria-label="Mis notificaciones"><NavigationIcon name="notificaciones" /><span className="hidden sm:inline">Avisos</span></Link>
        <Link href="/perfil" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4CAD8] text-sm font-semibold text-[#211c19]" aria-label="Mi perfil">
          {nombre.slice(0, 1).toUpperCase()}
        </Link></div>
      </header>

      <div className={`mx-auto grid max-w-[1400px] ${habilitada ? 'lg:grid-cols-[220px_minmax(0,1fr)]' : ''}`}>
        {habilitada && <aside className="hidden min-h-[calc(100vh-76px)] border-r border-[#e7ddd5] px-5 py-7 lg:block">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#746a64]">Mi espacio</p>
          <nav className="mt-5 space-y-1.5" aria-label="Navegación principal">
            <Link href="/inicio" aria-current="page" className="flex items-center gap-3 rounded-xl bg-[#F4CAD8] px-3 py-3 text-sm font-semibold"><NavigationIcon name="inicio" />Inicio</Link>
            {habilitada ? <>
              <Link href="/lanzamiento" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]"><NavigationIcon name="lanzamiento" />Estrategia</Link>
              <Link href="/clases" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]"><NavigationIcon name="clases" />Programa</Link>
            </> : null}
            <Link href="/perfil" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]"><NavigationIcon name="perfil" />Mi perfil</Link>
            <Link href="/notificaciones" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]"><NavigationIcon name="notificaciones" />Notificaciones</Link>
          </nav>
          {mostrarClase && <div className="mt-8"><ProximaClase ahoraInicial={ahoraInicial} /></div>}
        </aside>}

        <main className="min-w-0 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#294A38]">{habilitada ? 'Desafío Socias' : esDesafio ? 'Desafío Socias' : 'Acceso gratuito'}</p>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Hola, {nombre}.</h1>
            </div>
            <Link href="/perfil" className="inline-flex items-center gap-2 text-sm font-medium text-[#294A38]">Mi perfil <ArrowIcon diagonal /></Link>
          </div>

          {mostrarClase && <div className={`mt-6 ${habilitada ? 'lg:hidden' : ''}`}><ProximaClase ahoraInicial={ahoraInicial} /></div>}

          {!habilitada && esDesafio ? (
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
              <section className="mt-7 grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
                <article className="flex min-h-[250px] flex-col items-start justify-between rounded-[26px] bg-[#F4CAD8] p-6 sm:p-8">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#211c19]/55">Tu próximo paso</p>
                    <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">Avanzá con tu estrategia.</h2>
                    <p className="mt-3 text-sm text-[#211c19]/65">{estrategiaHabilitada ? 'Tu estrategia está habilitada.' : 'Flor habilitará este espacio para vos.'}</p>
                  </div>
                  {estrategiaHabilitada ? <Link href="/lanzamiento" className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203a2c]">Ver mi estrategia <ArrowIcon /></Link> : <button type="button" disabled className="mt-7 inline-flex items-center gap-3 rounded-full border border-[#294A38]/30 bg-[#FAF7F3]/70 px-5 py-3 text-sm font-semibold text-[#294A38]"><NavigationIcon name="lanzamiento" />Pendiente de habilitación</button>}
                </article>
                <Link href="/clases" className="flex min-h-[250px] items-start flex-col justify-between rounded-[26px] bg-[#294A38] p-6 text-white transition hover:bg-[#203a2c] sm:p-8">
                  <div><p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#FAF7F3]/80">Programa</p><h2 className="mt-4 font-serif text-3xl font-semibold text-[#FAF7F3]">Tus clases</h2><p className="mt-3 text-sm leading-6 text-[#FAF7F3]/90">Volvé a ver las grabaciones del Desafío Socias.</p></div>
                  <span className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#FAF7F3] px-5 py-3 text-sm font-semibold text-[#294A38]">Ir a clases <ArrowIcon /></span>
                </Link>
              </section>
              <section className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Estrategia', href: '/lanzamiento', note: estrategiaHabilitada ? 'Etapas y tareas' : 'Pendiente de habilitación', tone: 'bg-white' },
                  { label: 'Clases grabadas', href: '/clases', note: 'Programa Socias', tone: 'bg-[#EC9BB6]/70' },
                  { label: 'Mi perfil', href: '/perfil', note: 'Tus datos y cuenta', tone: 'bg-[#F4EFEA] border border-[#EC9BB6]/60' },
                ].map(item => <Link key={item.href} href={item.href} className={`group flex min-h-28 flex-col justify-between rounded-[20px] p-5 transition hover:-translate-y-0.5 ${item.tone}`}><span className="flex items-center justify-between gap-3 text-sm font-semibold">{item.label}<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FAF7F3]/80 text-[#294A38] transition group-hover:bg-[#294A38] group-hover:text-white"><ArrowIcon diagonal /></span></span><span className="text-xs text-[#746a64]">{item.note}</span></Link>)}
              </section>
            </>
          )}
          <Link href="/notificaciones" className="mt-5 flex items-center justify-between gap-4 rounded-[20px] border border-[#e7ddd5] bg-[#FAF7F3] p-5"><span className="flex items-center gap-3 text-sm font-semibold"><NavigationIcon name="notificaciones" />Mis notificaciones</span><ArrowIcon /></Link>
          <LockedModules />
        </main>
      </div>
    </div>
  )
}
