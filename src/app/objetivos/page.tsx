import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { esAdministradora } from '@/lib/module-guard'
import { redirect } from 'next/navigation'
import ObjetivosCliente from './ObjetivosCliente'

export default async function ObjetivosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await esAdministradora(user.id)) return <ModuleLocked id="objetivos" />

  const { data: objetivo } = await supabase
    .from('objetivos')
    .select('*')
    .eq('alumna_id', user.id)
    .maybeSingle()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .maybeSingle()

  const esAdmin = perfil?.rol === 'admin'

  return <ObjetivosCliente userId={user.id} objetivoGuardado={objetivo} esAdmin={esAdmin} />
}
