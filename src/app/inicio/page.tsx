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
    <main className="min-h-screen px-5 py-10 md:px-10" style={{ background: '#F4EFEA', color: '#171413' }}>
      <div className="mx-auto max-w-5xl">
        <p className="font-impact text-xs font-bold uppercase tracking-[0.18em]" style={{ color: '#294A38' }}>Tu plataforma digital</p>
        <h1 className="mt-3 text-4xl md:text-6xl" style={{ fontFamily: 'var(--font-playfair)', fontWeight: 600 }}>
          {habilitada ? <>Hola, {nombre}<span style={{ color: '#EC9BB6' }}>.</span></> : <>Tu lugar en el <span style={{ color: '#EC9BB6' }}>Desafío</span></>}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-[#655B56]">
          Todo para <span className="font-impact font-semibold text-[#294A38]">acompañarte</span> en cada etapa.
        </p>
        {!habilitada ? (
          <section className="mt-8 max-w-2xl rounded-3xl bg-white p-7 md:p-10">
            <p className="text-xl font-semibold">Tu registro está listo</p>
            <p className="mt-3 leading-relaxed text-neutral-600">Cuando Flor habilite tu inscripción vas a recibir el email de bienvenida con el acceso a tus clases y al espacio de lanzamiento.</p>
            <Link href="/perfil" className="mt-6 inline-flex rounded-full px-5 py-3 text-sm font-semibold text-white" style={{ background: '#294A38' }}>Revisar mi perfil</Link>
          </section>
        ) : (
          <>
            <p className="mt-3 text-neutral-600">Tu espacio para las clases y el lanzamiento.</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Link href="/lanzamiento" className="group rounded-3xl p-7 transition-transform hover:-translate-y-1" style={{ background: '#EC9BB6' }}>
                <span className="text-sm font-semibold uppercase tracking-wider">01 · Organización</span>
                <h2 className="mt-8 text-3xl font-bold">Mi lanzamiento <span aria-hidden="true">↗</span></h2>
                <p className="mt-2 text-sm">Etapas, tareas y avances.</p>
              </Link>
              <Link href="/clases" className="group rounded-3xl p-7 transition-transform hover:-translate-y-1" style={{ background: '#FFFFFF' }}>
                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#294A38' }}>02 · Formación</span>
                <h2 className="mt-8 text-3xl font-bold">Clases <span aria-hidden="true">↗</span></h2>
                <p className="mt-2 text-sm text-neutral-600">Volvé a ver las clases grabadas del desafío.</p>
              </Link>
            </div>
            <p className="mt-6 text-sm text-neutral-500">Los demás espacios de la plataforma todavía están bloqueados.</p>
          </>
        )}
      </div>
    </main>
  )
}
