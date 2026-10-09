import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { perteneceAudiencia, AUDIENCIAS } from '@/lib/notifications'
import NotificacionesAdmin from './NotificacionesAdmin'

export default async function NotificacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin') redirect('/inicio')
  const [{ data: avisos, error }, { data: perfiles, error: errorPerfiles }] = await Promise.all([
    supabase.from('avisos').select('id,titulo,mensaje,destino,audiencias,publicado,archivado,created_at').order('created_at', { ascending: false }).limit(100),
    supabase.from('perfiles').select('rol,tipo_usuario,desafio_socias_habilitada'),
  ])
  const cantidades = Object.fromEntries(AUDIENCIAS.map(a => [a.id, (perfiles ?? []).filter(p => perteneceAudiencia(p, [a.id])).length]))
  return <NotificacionesAdmin historial={avisos ?? []} cantidades={cantidades} errorCarga={Boolean(error || errorPerfiles)} />
}
