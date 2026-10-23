import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { puedeVerClasesPrivadas } from '@/lib/class-access'
import PerfilCliente from './PerfilCliente'
import ProfileLearningSummary, { ProfileLearningSummaryLoading } from './ProfileLearningSummary'

export default async function PerfilPage() {
  const supabase = await createClient()

  const { data: { user }, error: errorSesion } = await supabase.auth.getUser()
  if (errorSesion || !user) redirect('/login')

  const { data: perfil, error: errorPerfil } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (errorPerfil || !perfil || perfil.id !== user.id) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <section role="alert" className="rounded-2xl border border-[#E7DDD5] bg-white p-5 sm:p-6">
          <h1 className="text-2xl font-semibold text-[#171413]">No pudimos cargar tu perfil</h1>
          <p className="mt-3 text-sm leading-6 text-[#655B56]">Tus datos no se modificaron. Volvé a intentar para ver y editar tu perfil.</p>
          <Link href="/perfil" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#294A38] px-5 py-2.5 text-sm font-semibold text-white">Reintentar</Link>
        </section>
      </main>
    )
  }

  const formacion = perfil.rol !== 'admin' && puedeVerClasesPrivadas(perfil) ? (
    <Suspense fallback={<ProfileLearningSummaryLoading />}>
      <ProfileLearningSummary supabase={supabase} usuariaId={user.id} perfil={perfil} />
    </Suspense>
  ) : null

  return <PerfilCliente user={user} perfil={perfil} formacion={formacion} />
}
