import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { perteneceAudiencia, AUDIENCIAS } from '@/lib/notifications'
import NotificacionesAdmin from './NotificacionesAdmin'
import { emailAvisosConfigurado } from '@/lib/notice-email'

export default async function NotificacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin') redirect('/inicio')
  const [{ data: avisos, error }, { data: perfiles, error: errorPerfiles }] = await Promise.all([
    supabase.from('avisos').select('id,titulo,mensaje,destino,audiencias,publicado,archivado,created_at,email_solicitado').order('created_at', { ascending: false }).limit(100),
    supabase.from('perfiles').select('rol,tipo_usuario,desafio_socias_habilitada'),
  ])
  const cantidades = Object.fromEntries(AUDIENCIAS.map(a => [a.id, (perfiles ?? []).filter(p => perteneceAudiencia(p, [a.id])).length]))
  const { data: envios, error: errorEnvios } = avisos?.length ? await supabase.from('avisos_email_envios').select('aviso_id,estado').in('aviso_id', avisos.map(a => a.id)).limit(10000) : { data: [], error: null }
  const emailEstados: Record<string, Record<string, number>> = {}
  for (const envio of envios ?? []) {
    const estados = emailEstados[envio.aviso_id] ??= {}
    estados[envio.estado] = (estados[envio.estado] ?? 0) + 1
  }
  return <NotificacionesAdmin historial={avisos ?? []} cantidades={cantidades} emailEstados={emailEstados} emailListo={emailAvisosConfigurado()} errorCarga={Boolean(error || errorPerfiles || errorEnvios || envios?.length === 10000)} />
}
