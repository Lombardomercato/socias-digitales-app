import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { esAdministradora } from '@/lib/module-guard'
import { redirect } from 'next/navigation'
import ComunidadCliente from './ComunidadCliente'

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
      .order('created_at', { ascending: false }),
    supabase.from('reacciones').select('resultado_id, alumna_id'),
    supabase
      .from('comentarios_resultados')
      .select('*, perfiles(nombre, avatar_url)')
      .order('created_at', { ascending: true }),
    supabase.from('perfiles').select('nombre, avatar_url').eq('id', user.id).single(),
  ])

  return (
    <ComunidadCliente
      resultados={resultados ?? []}
      reacciones={reacciones ?? []}
      comentarios={comentarios ?? []}
      userId={user.id}
      miPerfil={perfil}
    />
  )
}
