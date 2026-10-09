import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClassroomCliente from './ClassroomCliente'
import { leerCatalogoClases } from '@/lib/class-catalog'

export default async function ClassroomPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, avatar_url, rol, tipo_usuario, plan, desafio_socias_habilitada')
    .eq('id', user.id)
    .single()

  if (!perfil) redirect('/login')
  const clasesParaVista = await leerCatalogoClases(perfil)

  return (
    <ClassroomCliente
      clases={clasesParaVista}
      esAdmin={perfil?.rol === 'admin'}
      perfil={perfil}
    />
  )
}
