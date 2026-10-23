import type { DatosLogros } from './achievements'
import { fechaDiaValida, moverDia } from './my-day'

export const ETAPAS_PERSONALES = [
  { id: 'inicio', etiqueta: 'Inicio' },
  { id: 'en-marcha', etiqueta: 'En marcha' },
  { id: 'en-foco', etiqueta: 'En foco' },
  { id: 'en-accion', etiqueta: 'En acción' },
  { id: 'socia-top', etiqueta: 'Socia TOP' },
] as const
export type EtiquetaPersonal = typeof ETAPAS_PERSONALES[number]['etiqueta']
export interface RequisitoPersonal { id: string; texto: string; actual: number; meta: number; href: string; accion: string }
export interface ConteosPersonales { clases: number; programas: number; tareas: number; dias: number }
export type RangoPersonal = { estado: 'error' | 'bloqueado' } | {
  estado: 'listo'
  etapa: typeof ETAPAS_PERSONALES[number]
  indice: number
  conteos: ConteosPersonales
  fecha: string
  desde: string
  proximo: { etapa: typeof ETAPAS_PERSONALES[number]; requisitos: RequisitoPersonal[]; progreso: number } | null
}
const conteoValido = (n: unknown): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= 1e9

export function rangoPersonal(datos: DatosLogros): RangoPersonal {
  if (!datos || !datos.clases || !datos.dia || !fechaDiaValida(datos.fecha) || datos.desde !== moverDia(datos.fecha, -29)) return { estado: 'error' }
  if (datos.clases.estado === 'error' || datos.dia.estado === 'error') return { estado: 'error' }
  if (datos.clases.estado === 'bloqueada' || datos.dia.estado === 'bloqueada') return { estado: 'bloqueado' }
  if (datos.clases.estado !== 'lista' || datos.dia.estado !== 'lista') return { estado: 'error' }
  const c = datos.clases.datos, d = datos.dia.datos
  if (!c || !d || ![c.completadas, c.disponibles, c.programas, d.tareas, d.dias].every(conteoValido) || c.completadas > c.disponibles || c.programas > c.completadas || d.dias > 30 || d.dias > d.tareas) return { estado: 'error' }
  const conteos = { clases: c.completadas, programas: c.programas, tareas: d.tareas, dias: d.dias }
  // Se recalcula el estado actual, sin sumar eventos, puntos ni toggles.
  const enMarcha = conteos.clases >= 1 || conteos.tareas >= 1
  const enFoco = conteos.clases >= 3 && conteos.dias >= 3
  const enAccion = enFoco && conteos.tareas >= 10
  const indice = enAccion && conteos.programas >= 1 ? 4 : enAccion ? 3 : enFoco ? 2 : enMarcha ? 1 : 0
  const requisito = (id: string, texto: string, actual: number, meta: number, href: string, accion: string): RequisitoPersonal => ({ id, texto, actual, meta, href, accion })
  const clases = requisito('clases', '3 clases completadas', conteos.clases, 3, '/classroom', 'Seguir mis clases')
  const dias = requisito('dias', 'Actividad en 3 días distintos · últimos 30 días', conteos.dias, 3, '/checklist', 'Abrir Mi día')
  const tareas = requisito('tareas', '10 tareas completadas · últimos 30 días', conteos.tareas, 10, '/checklist', 'Organizar mi día')
  const programas = requisito('programa', '1 programa completo, con su material de apoyo', conteos.programas, 1, '/classroom', 'Ver mis programas')
  const requisitos = indice === 0 ? [requisito('primer-paso', 'Tu primera clase o tu primera tarea completada', Math.min(1, conteos.clases + conteos.tareas), 1, '/classroom', 'Dar mi primer paso')]
    : indice === 1 ? [clases, dias] : indice === 2 ? [clases, dias, tareas] : indice === 3 ? [clases, dias, tareas, programas] : []
  const progreso = requisitos.length ? Math.round(requisitos.reduce((s, r) => s + Math.min(r.actual / r.meta, 1), 0) / requisitos.length * 100) : 100
  return { estado: 'listo', etapa: ETAPAS_PERSONALES[indice], indice, conteos, fecha: datos.fecha, desde: datos.desde,
    proximo: indice < 4 ? { etapa: ETAPAS_PERSONALES[indice + 1], requisitos, progreso } : null }
}

// La imagen solo recibe esta proyección explícita: nunca perfiles, identificadores,
// nombres de clase/tarea, texto libre, métricas comerciales ni datos financieros.
export interface ImagenRangoPersonal extends ConteosPersonales { etiqueta: EtiquetaPersonal; fecha: string; desde: string }
export function datosImagenRango(datos: DatosLogros): ImagenRangoPersonal | null {
  const rango = rangoPersonal(datos)
  if (rango.estado !== 'listo' || rango.indice === 0) return null
  return { etiqueta: rango.etapa.etiqueta, clases: rango.conteos.clases, programas: rango.conteos.programas, tareas: rango.conteos.tareas, dias: rango.conteos.dias, fecha: rango.fecha, desde: rango.desde }
}
export function fechaRango(fecha: string) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(fecha + 'T12:00:00Z'))
}
export function dibujarImagenRango(ctx: CanvasRenderingContext2D, data: ImagenRangoPersonal, fuentes: { fuente: string; editorial: string }) {
  if (!ETAPAS_PERSONALES.some(e => e.etiqueta === data.etiqueta) || !fechaDiaValida(data.fecha) || data.desde !== moverDia(data.fecha, -29) || ![data.clases, data.programas, data.tareas, data.dias].every(conteoValido)) throw new Error('No pudimos preparar este nivel.')
  const verde = '#294A38', crema = '#F4EFEA', papel = '#FFFDFA', rosa = '#EC9BB6', blush = '#F4CAD8', tinta = '#211C19', secundario = '#746A64'
  function texto(valor: string, x: number, y: number, tamano: number, color = tinta, peso = 400, max = 920, fuente = fuentes.fuente, centrado = false) {
    ctx.fillStyle = color; ctx.textAlign = centrado ? 'center' : 'left'; ctx.font = `${peso} ${tamano}px ${fuente}`
    while (ctx.measureText(valor).width > max && tamano > 18) { tamano -= 2; ctx.font = `${peso} ${tamano}px ${fuente}` }
    ctx.fillText(valor, x, y)
  }
  function caja(x: number, y: number, w: number, h: number, color: string, borde?: string) {
    ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, 34); ctx.fill()
    if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 2; ctx.stroke() }
  }
  ctx.fillStyle = crema; ctx.fillRect(0, 0, 1080, 1920)
  texto('SOCIAS DIGITALES', 540, 116, 26, verde, 600, 920, fuentes.fuente, true)
  texto('Estoy construyendo', 540, 228, 64, tinta, 600, 920, fuentes.editorial, true)
  texto('mi próximo capítulo.', 540, 306, 64, tinta, 600, 920, fuentes.editorial, true)
  // Lazo trazado, no una insignia ajena ni una imagen descargada.
  ctx.strokeStyle = verde; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.beginPath()
  ctx.moveTo(540, 409); ctx.bezierCurveTo(463, 324, 415, 405, 463, 430); ctx.bezierCurveTo(491, 446, 523, 424, 540, 409)
  ctx.bezierCurveTo(617, 324, 665, 405, 617, 430); ctx.bezierCurveTo(589, 446, 557, 424, 540, 409)
  ctx.moveTo(535, 417); ctx.lineTo(495, 471); ctx.moveTo(545, 417); ctx.lineTo(585, 471); ctx.stroke()
  caja(64, 495, 952, 316, verde)
  texto('MI NIVEL ACTUAL', 540, 563, 22, blush, 600, 860, fuentes.fuente, true)
  texto(data.etiqueta, 540, 683, 106, papel, 600, 860, fuentes.fuente, true)
  texto('Aprender. Hacer. Avanzar.', 540, 751, 27, papel, 400, 860, fuentes.fuente, true)
  const stats = [[data.clases, 'CLASES COMPLETADAS', 'En mi formación'], [data.programas, 'PROGRAMAS COMPLETOS', 'Con su material de apoyo'], [data.tareas, 'TAREAS COMPLETADAS', 'En los últimos 30 días'], [data.dias, 'DÍAS EN ACCIÓN', 'En los últimos 30 días']] as const
  stats.forEach(([n, etiqueta, nota], i) => {
    const x = i % 2 ? 554 : 64, y = i < 2 ? 856 : 1124
    caja(x, y, 462, 242, i === 2 ? blush : papel, i === 2 ? rosa : '#E7DDD5')
    texto(n.toLocaleString('es-AR'), x + 28, y + 105, 80, verde, 600, 406)
    texto(etiqueta, x + 28, y + 157, 18, verde, 600, 406)
    texto(nota, x + 28, y + 201, 18, secundario, 400, 406)
  })
  texto('Un paso más, a mi manera.', 540, 1482, 47, verde, 600, 920, fuentes.editorial, true)
  texto(`Mi día · ${fechaRango(data.desde)} al ${fechaRango(data.fecha)}`, 540, 1561, 22, secundario, 400, 920, fuentes.fuente, true)
  texto(`Nivel actual al ${fechaRango(data.fecha)}`, 540, 1606, 22, secundario, 400, 920, fuentes.fuente, true)
  texto('Mi camino con Socias Digitales.', 540, 1732, 38, tinta, 600, 920, fuentes.editorial, true)
  texto('Actividad personal, no un ranking ni un certificado.', 540, 1805, 19, secundario, 400, 920, fuentes.fuente, true)
  texto('El nivel puede cambiar con mis registros y el período de actividad.', 540, 1844, 18, secundario, 400, 920, fuentes.fuente, true)
  return { ancho: 1080, alto: 1920 }
}
