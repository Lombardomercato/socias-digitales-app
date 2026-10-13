import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminLanzamientoCliente from './AdminLanzamientoCliente'
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'

export default async function AdminLanzamientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin') redirect('/perfil')

  const { data: metricas } = await supabase
    .from('metricas_lanzamiento')
    .select('*, perfiles(nombre, email, instagram, pais, telefono, created_at)')
    .not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA)
    .order('actualizado_en', { ascending: false })

  const { data: afiliadas } = await supabase
    .from('perfiles')
    .select('id, nombre, email, instagram, pais, telefono, created_at')
    .eq('rol', 'afiliada_lanzamiento')
    .not('id', 'in', FILTRO_CUENTAS_PRUEBA)
    .order('created_at', { ascending: false })

  return <AdminLanzamientoCliente metricas={metricas ?? []} afiliadas={afiliadas ?? []} />
}
