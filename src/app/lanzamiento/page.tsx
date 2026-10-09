import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LanzamientoCliente from './LanzamientoCliente'
import Link from 'next/link'

export default async function LanzamientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol, desafio_socias_habilitada')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil || (perfil.rol !== 'admin' && !perfil.desafio_socias_habilitada)) redirect('/inicio?acceso=pendiente')
  if (perfil.rol === 'admin') redirect('/admin/lanzamiento')

  const { data: acceso } = await supabase.from('accesos_estrategia').select('habilitada').eq('usuaria_id', user.id).maybeSingle()
  if (!acceso?.habilitada) return (
    <main className="min-h-screen bg-[#FAF7F3] px-5 py-12 text-[#171413]">
      <section className="mx-auto max-w-xl rounded-3xl border border-[#EC9BB6]/60 bg-[#F4EFEA] p-8">
        <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="mb-8 h-12 w-auto" />
        <p className="text-xs font-semibold uppercase tracking-widest text-[#294A38]">Tu espacio</p>
        <h1 className="mt-3 font-serif text-4xl">Estrategia</h1>
        <p className="mt-5 text-sm leading-6 text-[#655B56]">Flor habilitará este módulo cuando esté listo para vos. Tu acceso a las clases sigue disponible.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/clases" className="rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white">Ver mis clases</Link>
          <Link href="/inicio" className="rounded-full border border-[#EC9BB6] px-5 py-3 text-sm">Volver a mi espacio</Link>
        </div>
      </section>
    </main>
  )

  const { data: metricas } = await supabase
    .from('metricas_lanzamiento')
    .select('*')
    .eq('alumna_id', user.id)
    .maybeSingle()

  return <LanzamientoCliente nombre={perfil?.nombre ?? ''} userId={user.id} metricasGuardadas={metricas} />
}
