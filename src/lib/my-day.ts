export const UUID_TAREA = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export const CATEGORIAS_DIA = {
  pagos: { nombre: 'Pagos', icono: 'productos' },
  negocio_digital: { nombre: 'Negocio digital', icono: 'resultados' },
  habitos: { nombre: 'Hábitos diarios', icono: 'checklist' },
  trabajo: { nombre: 'Trabajo', icono: 'objetivos' },
  vida_personal: { nombre: 'Vida personal', icono: 'perfil' },
} as const
export type CategoriaDia = keyof typeof CATEGORIAS_DIA
export interface DatosTarea { texto: string; fecha: string; categoria: CategoriaDia; completada: boolean; archivada: boolean }
export interface TareaDia extends DatosTarea { id: string; alumna_id: string; version: number; creado_en: string; actualizada_en: string }
export interface ResumenDia { alumna_id: string; fecha: string; total: number; completadas: number; generales: number; generales_completadas: number; negocio: number; negocio_completadas: number }
export function fechaDiaValida(fecha: unknown): fecha is string {
  return typeof fecha === 'string' && /^(20)\d{2}-\d{2}-\d{2}$/.test(fecha) && Number.isFinite(Date.parse(fecha)) && new Date(fecha + 'T12:00:00Z').toISOString().slice(0, 10) === fecha
}
export function moverDia(fecha: string, dias: number) {
  const d = new Date(fecha + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}
export function semanaDia(fecha: string) {
  const inicio = moverDia(fecha, -((new Date(fecha + 'T12:00:00Z').getUTCDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => moverDia(inicio, i))
}
export function nombreDia(fecha: string, corto = false) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', weekday: corto ? 'short' : 'long', day: 'numeric', ...(corto ? {} : { month: 'long' }) }).format(new Date(fecha + 'T12:00:00Z'))
}
export function validarTarea(valor: unknown, modo: 'crear' | 'editar') {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Revisá los datos de la tarea.')
  const x = valor as Record<string, unknown>
  if (Object.keys(x).some(k => !['id', 'version', 'texto', 'fecha', 'categoria', 'completada', 'archivada'].includes(k))) throw new Error('El envío contiene campos no permitidos.')
  if (typeof x.id !== 'string' || !UUID_TAREA.test(x.id)) throw new Error('Identificador no válido.')
  if (modo === 'crear' ? x.version !== null : typeof x.version !== 'number' || !Number.isInteger(x.version) || x.version < 1 || x.version > 1e9) throw new Error('Actualizá la tarea antes de editarla.')
  if (typeof x.texto !== 'string') throw new Error('Escribí tu tarea.')
  const texto = x.texto.normalize('NFC').trim().replace(/\s+/g, ' ')
  if (!texto || texto.length > 300) throw new Error('Usá un texto de entre 1 y 300 caracteres.')
  if (!fechaDiaValida(x.fecha)) throw new Error('Elegí una fecha válida.')
  if (typeof x.categoria !== 'string' || !Object.hasOwn(CATEGORIAS_DIA, x.categoria)) throw new Error('Elegí una categoría válida.')
  if (typeof x.completada !== 'boolean' || typeof x.archivada !== 'boolean') throw new Error('Estado de la tarea no válido.')
  if (modo === 'crear' && (x.completada || x.archivada)) throw new Error('Una tarea nueva empieza pendiente.')
  return { id: x.id, version: modo === 'crear' ? null : x.version as number, datos: { texto, fecha: x.fecha, categoria: x.categoria as CategoriaDia, completada: x.completada, archivada: x.archivada } }
}
export function mismaTarea(a: DatosTarea, b: DatosTarea) { return a.texto === b.texto && a.fecha === b.fecha && a.categoria === b.categoria && a.completada === b.completada && a.archivada === b.archivada }
export function resumenTareas(tareas: TareaDia[], fecha: string): ResumenDia {
  const activas = tareas.filter(t => !t.archivada && t.fecha === fecha)
  const negocio = activas.filter(t => t.categoria === 'negocio_digital')
  const generales = activas.filter(t => t.categoria !== 'negocio_digital')
  return { alumna_id: activas[0]?.alumna_id ?? '', fecha, total: activas.length, completadas: activas.filter(t => t.completada).length, generales: generales.length, generales_completadas: generales.filter(t => t.completada).length, negocio: negocio.length, negocio_completadas: negocio.filter(t => t.completada).length }
}
export function progresoDia(completadas: number, total: number) { return total > 0 ? Math.round(completadas / total * 100) : null }
