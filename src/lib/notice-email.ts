import 'server-only'
import { setTimeout as pausa } from 'node:timers/promises'
import { createAdminClient, isAdminSupabaseConfigured } from './supabase/admin'
import { perteneceAudiencia } from './notifications'
import { contenidoEmailAviso, crearTokenBaja } from './email-consent'
import { EMAIL_HEADER } from './email-brand'

export function emailAvisosConfigurado() { return isAdminSupabaseConfigured() && Boolean(process.env.RESEND_API_KEY) }

// Cola persistente, 20 por ejecución; el panel permite continuar pendientes.
export async function procesarEmailsAviso(avisoId: string) {
  if (!emailAvisosConfigurado()) return
  const admin = createAdminClient()
  const { data: aviso } = await admin.from('avisos').select('id,titulo,mensaje,audiencias,publicado,archivado,email_solicitado').eq('id', avisoId).maybeSingle()
  if (!aviso?.publicado || aviso.archivado || !aviso.email_solicitado) return
  const { data: trabajos, error } = await admin.rpc('tomar_emails_aviso', { p_aviso_id: avisoId })
  if (error) { console.error('notice_email_queue_error'); return }
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://app.sociasdigitales.com').replace(/\/$/,'')
  for (const trabajo of trabajos ?? []) {
    const guardar = async (estado: string, codigo: string | null = null, proveedorId: string | null = null) => {
      const { error: saveError } = await admin.from('avisos_email_envios').update({ estado, error_codigo: codigo, proveedor_id: proveedorId }).eq('aviso_id', avisoId).eq('usuaria_id', trabajo.usuaria_id)
      if (saveError) throw new Error('No se pudo registrar el resultado del envío.')
    }
    try {
      const [{ data: preferencia }, { data: perfil }, { data: actual }] = await Promise.all([
        admin.from('preferencias_email').select('acepta_email').eq('usuaria_id', trabajo.usuaria_id).maybeSingle(),
        admin.from('perfiles').select('rol,tipo_usuario,estado,desafio_socias_habilitada').eq('id', trabajo.usuaria_id).maybeSingle(),
        admin.from('avisos').select('archivado').eq('id', avisoId).maybeSingle(),
      ])
      if (!preferencia?.acepta_email || !perfil || perfil.estado !== 'activa' || !perteneceAudiencia(perfil,aviso.audiencias) || actual?.archivado !== false) { await guardar('omitido'); continue }
      const { data: { user }, error: authError } = await admin.auth.admin.getUserById(trabajo.usuaria_id)
      if (authError) { await guardar('error','auth_temporal'); continue }
      if (!user?.email || !user.email_confirmed_at) { await guardar('omitido'); continue }
      const token = crearTokenBaja(user.id,trabajo.creada_en,process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const contenido = contenidoEmailAviso(aviso.titulo,aviso.mensaje,site,token,EMAIL_HEADER)
      const response = await fetch('https://api.resend.com/emails', {
        method:'POST',headers:{ Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`sd-aviso/${avisoId}/${user.id}` },
        body:JSON.stringify({ from:process.env.RESEND_FROM || 'Flor · Socias Digitales <no-reply@sociasdigitales.com>',to:[user.email],subject:aviso.titulo,...contenido,
          headers:{'List-Unsubscribe':`<${site}/api/cuenta/email/baja?token=${encodeURIComponent(token)}>`, 'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'} }),
        signal:AbortSignal.timeout(10000),
      })
      if (!response.ok) { await guardar(response.status===429 || response.status>=500 ? 'error':'revision',`http_${response.status}`); if(response.status===429) break }
      else { const result=await response.json(); await guardar('aceptado',null,result.id) }
      await pausa(650)
    } catch { try { await guardar('error','conexion_o_registro') } catch { console.error('notice_email_status_error') } }
  }
}
