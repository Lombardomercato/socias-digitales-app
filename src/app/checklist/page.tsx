import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { permisoMiDia, leerMiDia } from '@/lib/my-day-server'
import { fechaDiaValida } from '@/lib/my-day'
import { fechaArgentina } from '@/lib/metrics'
import { redirect } from 'next/navigation'
import ChecklistCliente from './ChecklistCliente'

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
  return <ChecklistCliente key={fecha} {...await leerMiDia(supabase, user.id, fecha)} fecha={fecha} hoy={hoy} admin={acceso.admin} />
}
