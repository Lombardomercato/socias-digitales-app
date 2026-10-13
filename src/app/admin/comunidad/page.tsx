import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ComunidadAdmin from './ComunidadAdmin'
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'

export default async function ComunidadAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect('/perfil')

  const ahora = new Date()
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()

  const [
    { data: preguntas },
    { data: publicaciones },
    { count: totalPreguntas },
    { count: sinResponder },
    { count: publicacionesMes },
    { count: comentariosMes },
    { count: reaccionesMes },
  ] = await Promise.all([
    supabase.from('preguntas').select('*, perfiles(nombre, avatar_url), respuestas(id, es_oficial, contenido, created_at, perfiles(nombre))').not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA).not('respuestas.autor_id', 'in', FILTRO_CUENTAS_PRUEBA).order('created_at', { ascending: false }).limit(50),
    supabase.from('publicaciones').select('*, perfiles(nombre, avatar_url), comentarios(id), reacciones(id)').not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA).not('comentarios.autor_id', 'in', FILTRO_CUENTAS_PRUEBA).not('reacciones.alumna_id', 'in', FILTRO_CUENTAS_PRUEBA).order('created_at', { ascending: false }).limit(50),
    supabase.from('preguntas').select('*', { count: 'exact', head: true }).not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA),
    supabase.from('preguntas').select('*', { count: 'exact', head: true }).not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA).eq('estado', 'abierta'),
    supabase.from('publicaciones').select('*', { count: 'exact', head: true }).not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA).gte('created_at', inicioMes),
    supabase.from('comentarios').select('*', { count: 'exact', head: true }).not('autor_id', 'in', FILTRO_CUENTAS_PRUEBA).gte('created_at', inicioMes),
    supabase.from('reacciones').select('*', { count: 'exact', head: true }).not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA).gte('created_at', inicioMes),
  ])

  const stats = {
    totalPreguntas: totalPreguntas ?? 0,
    sinResponder: sinResponder ?? 0,
    publicacionesMes: publicacionesMes ?? 0,
    comentariosMes: comentariosMes ?? 0,
    reaccionesMes: reaccionesMes ?? 0,
  }

  return <ComunidadAdmin preguntas={preguntas ?? []} publicaciones={publicaciones ?? []} stats={stats} adminId={user.id} />
}
