import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClassroomAdmin from './ClassroomAdmin'

export default async function ClassroomAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect('/perfil')

  const [{ data: clases }, { data: alumnas }] = await Promise.all([
    supabase.from('clases').select('*').order('orden'),
    supabase.from('perfiles').select('id, nombre, plan').neq('rol', 'admin').not('id', 'in', FILTRO_CUENTAS_PRUEBA).order('nombre'),
  ])

  return <ClassroomAdmin clases={clases ?? []} alumnas={alumnas ?? []} />
}
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'
