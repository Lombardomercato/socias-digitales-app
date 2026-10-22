import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClassroomCliente from './ClassroomCliente'
import { leerCatalogoClases } from '@/lib/class-catalog'
import { leerProgresoClases } from '@/lib/class-progress-server'
import type { ProgresoClase } from '@/lib/class-progress'
import ClassroomRecovery from './ClassroomRecovery'

export default async function ClassroomPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil, error: perfilError } = await supabase
    .from('perfiles')
    .select('nombre, avatar_url, rol, tipo_usuario, estado, plan, desafio_socias_habilitada')
    .eq('id', user.id)
    .single()

  if (perfilError || !perfil) return <ClassroomRecovery esAdmin={false} />
  let clasesParaVista: Awaited<ReturnType<typeof leerCatalogoClases>>
  try { clasesParaVista = await leerCatalogoClases(perfil) }
  catch {
    console.error('class_catalog_read_failed')
    return <ClassroomRecovery esAdmin={perfil.rol === 'admin'} />
  }
  let progreso: ProgresoClase[] = []
  let errorProgreso = false
  if (perfil.rol !== 'admin') {
    try { progreso = await leerProgresoClases(supabase,user.id) }
    catch { errorProgreso = true }
  }

  return (
    <ClassroomCliente
      clases={clasesParaVista}
      esAdmin={perfil?.rol === 'admin'}
      perfil={perfil}
      progresoInicial={progreso}
      errorProgreso={errorProgreso}
    />
  )
}
