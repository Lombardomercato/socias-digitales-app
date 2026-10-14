import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClassroomAdmin from './ClassroomAdmin'
import { createAdminClient } from '@/lib/supabase/admin'
import { CUENTAS_PRUEBA_IDS } from '@/lib/test-accounts'

export default async function ClassroomAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') redirect('/perfil')

  const [{ data: clases, error: clasesError }, { data: alumnas, error: alumnasError }] = await Promise.all([
    supabase.from('clases').select('*').order('orden'),
    supabase.from('perfiles').select('id, nombre, plan').neq('rol', 'admin').not('id', 'in', FILTRO_CUENTAS_PRUEBA).order('nombre'),
  ])

  const {data:estadisticas,error:progresoError}=await createAdminClient().rpc('estadisticas_progreso_clases',{p_excluir:[...CUENTAS_PRUEBA_IDS]})
  return <ClassroomAdmin clases={clases ?? []} alumnas={alumnas ?? []} errorCarga={Boolean(clasesError || alumnasError)} estadisticas={estadisticas??[]} errorProgreso={Boolean(progresoError)} />
}
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'
