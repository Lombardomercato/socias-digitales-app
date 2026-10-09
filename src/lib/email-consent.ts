import { createHmac, timingSafeEqual } from 'node:crypto'

export const CONSENT_VERSION = 'email_avisos_2026_10_08'
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function crearTokenBaja(userId: string, fecha: string, secret: string) {
  const vence = Math.floor((new Date(fecha).getTime() + 90 * 86400000) / 1000)
  const contenido = `${userId}.${vence}`
  return `${contenido}.${createHmac('sha256', secret).update(`sd-email-baja:${contenido}`).digest('hex')}`
}
export function verificarTokenBaja(token: unknown, secret: string, ahora = Date.now()): string | null {
  if (typeof token !== 'string' || token.length > 180) return null
  const partes = token.split('.')
  if (partes.length !== 3 || !uuid.test(partes[0]) || !/^\d{10}$/.test(partes[1]) || !/^[a-f0-9]{64}$/.test(partes[2])) return null
  if (Number(partes[1]) * 1000 < ahora) return null
  const firma = createHmac('sha256', secret).update(`sd-email-baja:${partes[0]}.${partes[1]}`).digest()
  return timingSafeEqual(firma, Buffer.from(partes[2], 'hex')) ? partes[0] : null
}

const escapar = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export function contenidoEmailAviso(titulo: string, mensaje: string, site: string, token: string, banner: string) {
  const url = `${site}/notificaciones`
  const baja = `${site}/emails/preferencias#token=${encodeURIComponent(token)}`
  return {
    html: `<div style="background:#FAF7F3;padding:32px 16px;color:#171413;font-family:Arial,sans-serif"><div style="max-width:560px;margin:auto">${banner}<h1 style="font-size:26px;line-height:1.2;color:#294A38">${escapar(titulo)}</h1><p style="line-height:1.7">${escapar(mensaje).replaceAll('\n','<br>')}</p><a href="${escapar(url)}" style="display:block;margin:28px 0;padding:16px;text-align:center;background:#294A38;color:white;border-radius:12px;text-decoration:none;font-weight:bold">VER EN MI PLATAFORMA</a><p style="font-size:12px;line-height:1.6;color:#655B56">Recibís este aviso porque elegiste recibir novedades por email de Socias Digitales. <a href="${escapar(baja)}" style="color:#294A38">Dejar de recibir estos emails</a>. Los avisos siguen disponibles dentro de tu plataforma.</p></div></div>`,
    text: `${titulo}\n\n${mensaje}\n\nVer en mi plataforma: ${url}\n\nRecibís este aviso porque elegiste recibir novedades por email. Dejar de recibir estos emails: ${baja}`,
  }
}
