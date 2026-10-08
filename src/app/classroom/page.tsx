import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClassroomCliente from './ClassroomCliente'

export default async function ClassroomPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, avatar_url, rol, plan, desafio_socias_habilitada')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin' && !perfil?.desafio_socias_habilitada) redirect('/inicio?acceso=pendiente')

  const { data: clases } = await supabase
    .from('clases')
    .select('*')
    .eq('activo', true)
    .order('orden')

  return (
    <ClassroomCliente
      clases={clases ?? []}
      esAdmin={perfil?.rol === 'admin'}
      perfil={perfil}
    />
  )
}
