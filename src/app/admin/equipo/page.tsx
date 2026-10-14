import { redirect } from 'next/navigation'
import { autorizarAdmin } from '@/lib/admin-auth'
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'
import EquipoAdmin from './EquipoAdmin'

export default async function EquipoPage() {
  const auth = await autorizarAdmin()
  if (auth.error) redirect('/login')
  const { data, error } = await auth.supabase
    .from('perfiles')
    .select('id,nombre,email,rol')
    .not('id', 'in', FILTRO_CUENTAS_PRUEBA)
    .order('nombre')
  return (
    <EquipoAdmin
      personas={data ?? []}
      errorCarga={Boolean(error)}
      actualId={auth.user.id}
    />
  )
}
