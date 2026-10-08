import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LanzamientoCliente from './LanzamientoCliente'

export default async function LanzamientoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('nombre, rol, desafio_socias_habilitada')
    .eq('id', user.id)
    .maybeSingle()

  if (!perfil || (perfil.rol !== 'admin' && !perfil.desafio_socias_habilitada)) redirect('/inicio?acceso=pendiente')
  if (perfil.rol === 'admin') redirect('/admin/lanzamiento')

  const { data: metricas } = await supabase
    .from('metricas_lanzamiento')
    .select('*')
    .eq('alumna_id', user.id)
    .maybeSingle()

  return <LanzamientoCliente nombre={perfil?.nombre ?? ''} userId={user.id} metricasGuardadas={metricas} />
}
