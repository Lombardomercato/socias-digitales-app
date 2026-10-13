import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { esAdministradora } from '@/lib/module-guard'
import { redirect } from 'next/navigation'
import ComunidadCliente from './ComunidadCliente'
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'

export default async function ComunidadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await esAdministradora(user.id)) return <ModuleLocked id="comunidad" />

  const [{ data: resultados }, { data: reacciones }, { data: comentarios }, { data: perfil }] = await Promise.all([
    supabase
      .from('resultados')
      .select('*, perfiles(nombre, avatar_url), productos(nombre)')
      .eq('estado', 'aprobado')
      .not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA)
      .order('created_at', { ascending: false }),
    supabase.from('reacciones').select('resultado_id, alumna_id').not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA),
    supabase
      .from('comentarios_resultados')
      .select('*, perfiles(nombre, avatar_url)')
      .not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA)
      .order('created_at', { ascending: true }),
    supabase.from('perfiles').select('nombre, avatar_url').eq('id', user.id).single(),
  ])

  return (
    <ComunidadCliente
      resultados={(resultados ?? []).map(r => ({ ...r, archivo_url: r.archivo_url ? 'privada' : null }))}
      reacciones={reacciones ?? []}
      comentarios={comentarios ?? []}
      userId={user.id}
      miPerfil={perfil}
    />
  )
}
