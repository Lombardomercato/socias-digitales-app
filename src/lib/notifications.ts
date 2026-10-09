import { obtenerNivelAcceso } from './access'

export const AUDIENCIAS = [
  { id: 'gratuito', nombre: 'Gratuitas' },
  { id: 'desafio', nombre: 'Desafío Socias', detalle: 'Solo accesos habilitados' },
  { id: 'socia', nombre: 'Socias' },
] as const
export type Audiencia = typeof AUDIENCIAS[number]['id']
export interface Aviso {
  id: string
  titulo: string
  mensaje: string
  destino: string | null
  audiencias: Audiencia[]
  publicado: boolean
  archivado: boolean
  created_at: string
  leido?: boolean
}

export function perteneceAudiencia(perfil: { rol?: string; tipo_usuario?: string; desafio_socias_habilitada?: boolean }, audiencias: Audiencia[]) {
  if (perfil.rol === 'admin') return false
  const nivel = obtenerNivelAcceso(perfil.rol, perfil.tipo_usuario)
  return nivel !== 'admin' && audiencias.includes(nivel) && (nivel !== 'desafio' || Boolean(perfil.desafio_socias_habilitada))
}

export function esDestinoValido(destino: unknown): destino is string {
  return typeof destino === 'string' && ['/inicio', '/perfil', '/clases', '/lanzamiento', '/notificaciones'].includes(destino)
}

export function fechaAviso(valor: string) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(valor))
}
