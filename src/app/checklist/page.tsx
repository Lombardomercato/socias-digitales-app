import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { permisoMiDia, leerMiDia } from '@/lib/my-day-server'
import { fechaDiaValida } from '@/lib/my-day'
import { fechaArgentina } from '@/lib/metrics'
import { redirect } from 'next/navigation'
import ChecklistCliente from './ChecklistCliente'
import { leerPlanEstudio } from '@/lib/study-planner-server'

export default async function ChecklistPage({ searchParams }: { searchParams: Promise<{ fecha?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const acceso = await permisoMiDia(supabase, user.id)
  if (acceso.error) return <main className="p-8"><p role="alert">No pudimos comprobar tu acceso. Intentá nuevamente.</p><a href="/inicio">Volver a mi espacio</a></main>
  if (!acceso.permitido) return <ModuleLocked id="checklist" />
  const hoy = fechaArgentina()
  const params = await searchParams
  const fecha = fechaDiaValida(params.fecha) ? params.fecha : hoy
  const [dia, planEstudio] = await Promise.all([
    leerMiDia(supabase, user.id, fecha),
    acceso.admin ? Promise.resolve(null) : leerPlanEstudio(supabase, user.id),
  ])
  return <ChecklistCliente key={fecha} {...dia} fecha={fecha} hoy={hoy} admin={acceso.admin} planEstudio={planEstudio} alumnaId={user.id} />
}
