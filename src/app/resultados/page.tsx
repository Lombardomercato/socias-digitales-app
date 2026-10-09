import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { esAdministradora } from '@/lib/module-guard'
import { redirect } from 'next/navigation'
import ResultadosCliente from './ResultadosCliente'

export default async function ResultadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await esAdministradora(user.id)) return <ModuleLocked id="resultados" />

  const [{ data: misResultados }, { data: productos }] = await Promise.all([
    supabase
      .from('resultados')
      .select('*')
      .eq('alumna_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('productos')
      .select('id, nombre, tipo')
      .eq('activo', true)
      .order('nombre'),
  ])

  return <ResultadosCliente misResultados={misResultados ?? []} productos={productos ?? []} userId={user.id} />
}
