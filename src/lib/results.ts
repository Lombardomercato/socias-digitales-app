export const ESTADOS_RESULTADO = ['pendiente', 'aprobado', 'rechazado'] as const
export type EstadoResultado = typeof ESTADOS_RESULTADO[number]
export const MAX_CAPTURA = 3 * 1024 * 1024
export const UUID_RESULTADO = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export interface Resultado {
  id: string; alumna_id?: string; tipo: string; titulo?: string | null
  descripcion: string | null; archivo_url: string | null; monto: number | null
  mes: string | null; producto_id: string | null; estado: string; created_at: string
  pais?: string | null; estrategia?: string | null
  perfiles?: { nombre: string | null; avatar_url: string | null } | null
}
export const ESTADO_RESULTADO = {
  pendiente: { nombre: 'En revisión', color: 'border-[#EC9BB6] bg-[#F4CAD8] text-[#211c19]' },
  aprobado: { nombre: 'Aprobado', color: 'border-[#294A38] bg-[#294A38] text-white' },
  rechazado: { nombre: 'Rechazado', color: 'border-[#e7ddd5] bg-[#F4EFEA] text-[#655B56]' },
}
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
export function validarResultado(entrada: unknown) {
  if (!entrada || typeof entrada !== 'object') throw new Error('Revisá los datos del resultado.')
  const x = entrada as Record<string, unknown>
  if (Object.keys(x).some(k => !['id','descripcion','monto','periodo','producto_id'].includes(k))) throw new Error('El envío contiene campos no permitidos.')
  if (typeof x.id !== 'string' || !UUID_RESULTADO.test(x.id)) throw new Error('Identificador no válido.')
  if (typeof x.descripcion !== 'string' || !x.descripcion.trim() || x.descripcion.trim().length > 2000) throw new Error('Escribí tu resultado en un máximo de 2.000 caracteres.')
  if (typeof x.periodo !== 'string' || !/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(x.periodo)) throw new Error('Elegí un mes válido.')
  if (x.producto_id !== null && (typeof x.producto_id !== 'string' || !UUID_RESULTADO.test(x.producto_id))) throw new Error('Elegí un producto válido.')
  if (x.monto !== null && (typeof x.monto !== 'number' || !Number.isFinite(x.monto) || x.monto < 0 || x.monto > 1e9 || Math.abs(x.monto * 100 - Math.round(x.monto * 100)) > 0.00001)) throw new Error('La comisión debe ser un número positivo con hasta dos decimales, o dejarse vacía.')
  return { id: x.id, descripcion: x.descripcion.trim(), monto: x.monto as number | null,
    producto_id: x.producto_id as string | null, mes: `${MESES[Number(x.periodo.slice(5)) - 1]} ${x.periodo.slice(0,4)}` }
}
export function formatoCaptura(bytes: Uint8Array, mime: string) {
  const png = [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n)
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
  const webp = String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP'
  if (mime === 'image/png' && png) return 'png'
  if (mime === 'image/jpeg' && jpg) return 'jpg'
  if (mime === 'image/webp' && webp) return 'webp'
  throw new Error('Usá una imagen JPG, PNG o WEBP válida.')
}
export function claveCaptura(valor: string, site: string) {
  const prefijo = `${site.replace(/\/$/, '')}/storage/v1/object/public/resultados/`
  let clave: string
  try { clave = valor.startsWith(prefijo) ? decodeURIComponent(valor.slice(prefijo.length)) : valor } catch { return null }
  if (!/^[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(clave) || clave.startsWith('/') || clave.includes('..')) return null
  return clave
}
export function resumenResultados(resultados: Resultado[]) {
  const aprobados = resultados.filter(r => r.estado === 'aprobado')
  return { total: resultados.length, pendientes: resultados.filter(r => r.estado === 'pendiente').length,
    aprobados: aprobados.length, monto: aprobados.reduce((total,r) => total + Number(r.monto ?? 0),0) }
}
export function capturaPertenece(clave: string, alumnaId: string, resultadoId: string) {
  if (!UUID_RESULTADO.test(alumnaId) || !UUID_RESULTADO.test(resultadoId)) return false
  return new RegExp(`^${alumnaId}/${resultadoId}/[a-f0-9]{64}\\.(png|jpg|webp)$`).test(clave)
    || new RegExp(`^resultado-${alumnaId}-[0-9]+\\.(png|jpe?g|webp)$`).test(clave)
}
export function dineroResultado(monto: number) { return new Intl.NumberFormat('es-AR', { style:'currency', currency:'USD', maximumFractionDigits:2 }).format(monto) }
