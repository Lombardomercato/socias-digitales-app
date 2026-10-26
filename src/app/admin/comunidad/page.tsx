import { redirect, unstable_rethrow } from 'next/navigation'
import ComunidadAdmin, { type PreguntaAnterior } from './ComunidadAdmin'
import { autorizarComunidad, leerComunidad } from '@/lib/community-server'
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'

export const dynamic = 'force-dynamic'

export default async function ComunidadAdminPage() {
  const auth = await autorizarComunidad()
  if ('error' in auth) {
    if (auth.error.status === 401) redirect('/login?next=%2Fadmin%2Fcomunidad')
    if (auth.error.status === 403) redirect('/inicio')
    return <ComunidadAdmin initial={{ estado: 'error', mensaje: 'No pudimos comprobar el acceso. Recargá la página.' }} preguntas={[]} consultasError totalPreguntas={null} sinResponder={null} adminId="" nombre={null} />
  }
  if (!auth.admin) redirect('/inicio')

  const { supabase } = auth
  const consultas = async () => {
    try {
      const [lista, total, pendientes] = await Promise.all([
        supabase.from('preguntas').select('id,titulo,contenido,estado,created_at,perfiles(nombre,avatar_url),respuestas(id,es_oficial,contenido,created_at,perfiles(nombre))').not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA).not('respuestas.autor_id', 'in', FILTRO_CUENTAS_PRUEBA).order('created_at', { ascending: false }).limit(50),
        supabase.from('preguntas').select('id', { count: 'exact', head: true }).not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA),
        supabase.from('preguntas').select('id', { count: 'exact', head: true }).not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA).eq('estado', 'abierta'),
      ])
      return { preguntas: (lista.data ?? []) as unknown as PreguntaAnterior[], error: Boolean(lista.error), total: total.error ? null : total.count, pendientes: pendientes.error ? null : pendientes.count }
    } catch (error) {
      unstable_rethrow(error)
      return { preguntas: [], error: true, total: null, pendientes: null }
    }
  }
  const [initial, anteriores] = await Promise.all([leerComunidad(auth, { vista: 'todas' }), consultas()])
  return <ComunidadAdmin initial={initial} preguntas={anteriores.preguntas} consultasError={anteriores.error} totalPreguntas={anteriores.total} sinResponder={anteriores.pendientes} adminId={auth.userId} nombre={auth.perfil.nombre} />
}
