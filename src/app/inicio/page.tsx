import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function InicioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, avatar_url, rol, desafio_socias_habilitada')
    .eq('id', user.id)
    .maybeSingle()

  if (perfil?.rol === 'admin') redirect('/admin')
  const nombre = perfil?.nombre?.trim().split(' ')[0] || user.user_metadata?.nombre || 'Socia'

  const habilitada = Boolean(perfil?.desafio_socias_habilitada)
  return (
    <div className="min-h-screen bg-[#FAF7F3] text-[#211c19]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#e7ddd5] px-5 sm:px-8">
        <Link href="/inicio" aria-label="Socias Digitales, inicio">
          <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto object-contain" />
        </Link>
        <Link href="/perfil" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F4CAD8] text-sm font-semibold text-[#211c19]" aria-label="Mi perfil">
          {nombre.slice(0, 1).toUpperCase()}
        </Link>
      </header>

      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-76px)] border-r border-[#e7ddd5] px-5 py-7 lg:block">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#746a64]">Mi espacio</p>
          <nav className="mt-5 space-y-1.5" aria-label="Navegación principal">
            <Link href="/inicio" aria-current="page" className="flex items-center gap-3 rounded-xl bg-[#F4CAD8] px-3 py-3 text-sm font-semibold">Inicio</Link>
            {habilitada ? <>
              <Link href="/lanzamiento" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]">Mi lanzamiento</Link>
              <Link href="/clases" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]">Programa</Link>
            </> : null}
            <Link href="/perfil" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#746a64] transition hover:bg-[#F4EFEA] hover:text-[#211c19]">Mi perfil</Link>
          </nav>
          {habilitada ? <div className="mt-8 rounded-[22px] bg-[#294A38] p-5 text-white">
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/65">Tu acceso</p>
            <p className="mt-3 font-serif text-xl">Desafío Socias</p>
            <p className="mt-2 text-xs leading-5 text-white/70">Clases y espacio de lanzamiento habilitados.</p>
          </div> : null}
        </aside>

        <main className="min-w-0 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#294A38]">{habilitada ? 'Desafío Socias' : 'Tu espacio'}</p>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">{habilitada ? <>Hola, {nombre}.</> : <>Tu lugar en el <span className="text-[#b05e7c]">Desafío</span></>}</h1>
            </div>
            <Link href="/perfil" className="text-sm font-medium text-[#294A38]">Mi perfil&nbsp; ↗</Link>
          </div>

          {!habilitada ? (
            <section className="mt-7 max-w-3xl rounded-[24px] bg-[#F4CAD8] p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#211c19]/55">Inscripción recibida</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold">Tu acceso está en revisión.</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[#211c19]/70">Cuando Flor habilite tu inscripción, vas a recibir el email de bienvenida para entrar a tus clases y al espacio de lanzamiento.</p>
              <Link href="/perfil" className="mt-6 inline-flex rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203a2c]">Revisar mi perfil&nbsp; →</Link>
            </section>
          ) : (
            <>
              <section className="mt-7 grid gap-4 xl:grid-cols-[1.55fr_0.85fr]">
                <article className="flex min-h-[250px] flex-col items-start justify-between rounded-[26px] bg-[#F4CAD8] p-6 sm:p-8">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#211c19]/55">Tu próximo paso</p>
                    <h2 className="mt-4 max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-[-0.025em] sm:text-4xl">Seguí avanzando con tu lanzamiento.</h2>
                    <p className="mt-3 text-sm text-[#211c19]/65">Etapas, tareas y avances en un solo lugar.</p>
                  </div>
                  <Link href="/lanzamiento" className="mt-7 inline-flex items-center gap-3 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203a2c]">Continuar lanzamiento <span aria-hidden="true">→</span></Link>
                </article>
                <Link href="/clases" className="flex min-h-[250px] flex-col justify-between rounded-[26px] bg-[#294A38] p-6 text-white transition hover:bg-[#203a2c] sm:p-8">
                  <div><p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/65">Programa</p><h2 className="mt-4 font-serif text-3xl font-semibold">Tus clases</h2><p className="mt-3 text-sm leading-6 text-white/70">Volvé a ver las grabaciones del Desafío Socias.</p></div>
                  <span className="text-sm font-semibold">Ir a clases&nbsp; →</span>
                </Link>
              </section>
              <section className="mt-4 grid gap-3 sm:grid-cols-3">
                {[
                  { label: 'Lanzamiento', href: '/lanzamiento', note: 'Etapas y tareas', tone: 'bg-white' },
                  { label: 'Clases grabadas', href: '/clases', note: 'Programa Socias', tone: 'bg-[#EC9BB6]/70' },
                  { label: 'Mi perfil', href: '/perfil', note: 'Tus datos y cuenta', tone: 'bg-[#F4EFEA]' },
                ].map(item => <Link key={item.href} href={item.href} className={`flex min-h-28 flex-col justify-between rounded-[20px] p-5 transition hover:-translate-y-0.5 ${item.tone}`}><span className="text-sm font-semibold">{item.label}<span className="float-right" aria-hidden="true">↗</span></span><span className="text-xs text-[#746a64]">{item.note}</span></Link>)}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  )
}
