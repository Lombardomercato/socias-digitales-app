import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ModuloCliente from './ModuloCliente'

export default async function ModuloPage({ params }: { params: Promise<{ moduloId: string }> }) {
  const { moduloId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfiles').select('rol, desafio_socias_habilitada').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin' && !perfil?.desafio_socias_habilitada) redirect('/inicio?acceso=pendiente')

  const [{ data: modulo }, { data: progresos }] = await Promise.all([
    supabase.from('modulos').select('*, lecciones(*)').eq('id', moduloId).order('orden', { referencedTable: 'lecciones' }).single(),
    supabase.from('progreso_lecciones').select('leccion_id, completada').eq('alumna_id', user.id),
  ])

  if (!modulo) redirect('/classroom')

  const leccionesCompletadas = new Set(progresos?.filter(p => p.completada).map(p => p.leccion_id) ?? [])

  return <ModuloCliente modulo={modulo} leccionesCompletadas={leccionesCompletadas} userId={user.id} />
}
