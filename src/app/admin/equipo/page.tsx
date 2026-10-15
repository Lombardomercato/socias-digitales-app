import { redirect } from 'next/navigation'
import { autorizarAdmin } from '@/lib/admin-auth'
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'
import EquipoAdmin from './EquipoAdmin'
import CuentaPrueba from './CuentaPrueba'
import {
  createAdminClient,
  isAdminSupabaseConfigured,
} from '@/lib/supabase/admin'
import { emailsDelEquipo } from '@/lib/admin-team'

export default async function EquipoPage() {
  const auth = await autorizarAdmin()
  if (auth.error) redirect('/login')
  const { data, error } = await auth.supabase
    .from('perfiles')
    .select('id,nombre,rol')
    .not('id', 'in', FILTRO_CUENTAS_PRUEBA)
    .order('nombre')
  let personas = (data ?? []).map((p) => ({ ...p, email: '' }))
  let errorDirectorio = false
  try {
    if (!isAdminSupabaseConfigured())
      throw new Error('Directorio no configurado')
    const emails = await emailsDelEquipo(
      createAdminClient(),
      personas.map((p) => p.id),
    )
    personas = personas.map((p) => ({ ...p, email: emails.get(p.id) ?? '' }))
  } catch {
    errorDirectorio = true
    console.error('admin_team_directory_failed')
  }
  return (
    <EquipoAdmin
      personas={personas}
      errorCarga={Boolean(error || errorDirectorio)}
      actualId={auth.user.id}
    ><CuentaPrueba /></EquipoAdmin>
  )
}
