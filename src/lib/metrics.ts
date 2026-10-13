export const UUID_METRICA = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export function origenMetricasPermitido(origen: string | null, destino: string, host: string | null) {
  if (!origen) return false
  try {
    const fuente=new URL(origen), url=new URL(destino)
    if (fuente.origin!==origen) return false
    // Next puede construir su URL interna con localhost; Host conserva la
    // dirección recibida. No usamos forwarded-host ni aceptamos otros puertos.
    return origen===url.origin || (host!==null && fuente.protocol===url.protocol && fuente.host===host.toLowerCase())
  } catch { return false }
}
export const ESTRATEGIAS_METRICAS = { lanzamiento: 'Lanzamiento', automatica: 'Automática' } as const
export type EstrategiaMetrica = keyof typeof ESTRATEGIAS_METRICAS
export const CAMPOS_DINERO = ['comision_producto','inversion','inversion_por_dia','gasto_acumulado'] as const
export const CAMPOS_CONTEO = ['mensajes_recibidos','personas_grupo','reservas','ventas'] as const
export interface DatosMetrica {
  campana: string; fecha: string; estrategia: EstrategiaMetrica
  comision_producto: number | null; inversion: number | null
  inversion_por_dia: number | null; gasto_acumulado: number | null; dias_captacion: number | null
  mensajes_recibidos: number; personas_grupo: number; reservas: number; ventas: number
}
export interface Metrica extends DatosMetrica {
  id: string; alumna_id: string; version: number; created_at: string; actualizado_at: string
  perfiles?: { nombre: string | null } | null
}
export function fechaArgentina(ahora = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(ahora)
  return `${partes.find(p=>p.type==='year')?.value}-${partes.find(p=>p.type==='month')?.value}-${partes.find(p=>p.type==='day')?.value}`
}
export function validarMetrica(valor: unknown, modo: 'crear' | 'editar') {
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) throw new Error('Revisá los datos del análisis.')
  const x = valor as Record<string, unknown>
  const permitidos = ['id','version','campana','fecha','estrategia','dias_captacion',...CAMPOS_DINERO,...CAMPOS_CONTEO]
  if (Object.keys(x).some(k=>!permitidos.includes(k))) throw new Error('El envío contiene campos no permitidos.')
  if (typeof x.id !== 'string' || !UUID_METRICA.test(x.id)) throw new Error('Identificador no válido.')
  if (modo==='editar' && (typeof x.version!=='number' || !Number.isInteger(x.version) || x.version<1 || x.version>1e9)) throw new Error('Actualizá el análisis antes de editarlo.')
  if (modo==='crear' && x.version !== null) throw new Error('La versión de un análisis nuevo no es válida.')
  if (typeof x.campana!=='string') throw new Error('Poné un nombre a tu campaña.')
  const campana = x.campana.normalize('NFC').trim().replace(/\s+/g,' ')
  if (!campana || campana.length>100) throw new Error('Usá un nombre de campaña de hasta 100 caracteres.')
  if (x.estrategia!=='lanzamiento' && x.estrategia!=='automatica') throw new Error('Elegí una estrategia válida.')
  if (typeof x.fecha!=='string' || !/^(19|20)\d{2}-\d{2}-\d{2}$/.test(x.fecha) || !Number.isFinite(Date.parse(x.fecha)) || new Date(x.fecha+'T00:00:00Z').toISOString().slice(0,10)!==x.fecha || x.fecha>fechaArgentina()) throw new Error('Elegí una fecha válida, no futura.')
  for (const k of CAMPOS_DINERO) if (x[k]!==null && (typeof x[k]!=='number' || !Number.isFinite(x[k]) || x[k]<0 || x[k]>1e9 || Math.abs(x[k]*100-Math.round(x[k]*100))>.00001)) throw new Error('Los importes deben ser positivos, con hasta dos decimales, o quedar vacíos.')
  for (const k of CAMPOS_CONTEO) if (typeof x[k]!=='number' || !Number.isInteger(x[k]) || x[k]<0 || x[k]>1e9) throw new Error('Los conteos deben ser números enteros positivos o cero.')
  if (x.dias_captacion!==null && (typeof x.dias_captacion!=='number' || !Number.isInteger(x.dias_captacion) || x.dias_captacion<0 || x.dias_captacion>3650)) throw new Error('Revisá los días de captación.')
  if (!CAMPOS_DINERO.some(k=>x[k]!==null) && !CAMPOS_CONTEO.some(k=>Number(x[k])>0) && !Number(x.dias_captacion)) throw new Error('Completá al menos un importe o un conteo para guardar el análisis.')
  const datos = Object.fromEntries([...CAMPOS_DINERO,...CAMPOS_CONTEO,'dias_captacion'].map(k=>[k,x[k]])) as unknown as Omit<DatosMetrica,'campana'|'fecha'|'estrategia'>
  return { id:x.id, version:modo==='editar' ? x.version as number : null, datos:{...datos,campana,fecha:x.fecha,estrategia:x.estrategia} as DatosMetrica }
}
export function normalizarMetrica(row: Metrica): Metrica {
  const numeros = Object.fromEntries([...CAMPOS_DINERO,'dias_captacion'].map(k=>[k,row[k as keyof Metrica] == null ? null : Number(row[k as keyof Metrica])]))
  const conteos = Object.fromEntries(CAMPOS_CONTEO.map(k=>[k,Number(row[k] ?? 0)]))
  return {...row,...numeros,...conteos}
}
export function calcularMetricas(x: DatosMetrica) {
  const gasto=x.gasto_acumulado
  const comisiones=x.comision_producto!==null ? x.comision_producto*x.ventas : null
  const neto=comisiones!==null && gasto!==null ? comisiones-gasto : null
  const disponible=x.inversion!==null && gasto!==null ? x.inversion-gasto : null
  return {
    comisiones,neto,
    roi:gasto!==null && gasto>0 && neto!==null ? neto/gasto*100 : null,
    costoMensaje:gasto!==null && x.mensajes_recibidos>0 ? gasto/x.mensajes_recibidos : null,
    alGrupo:x.mensajes_recibidos>0 ? x.personas_grupo/x.mensajes_recibidos*100 : null,
    cierre:x.reservas>0 ? x.ventas/x.reservas*100 : null,
    disponible,
    diasPresupuesto:disponible!==null && x.inversion_por_dia!==null && x.inversion_por_dia>0 ? Math.max(0,Math.floor(disponible/x.inversion_por_dia)) : null,
    ventasPresupuesto:x.inversion!==null && x.comision_producto!==null && x.comision_producto>0 ? Math.ceil(x.inversion/x.comision_producto) : null,
  }
}
export function claveCampana(x: Pick<Metrica,'alumna_id'|'estrategia'|'campana'>) {
  return JSON.stringify([x.alumna_id,x.estrategia,x.campana.normalize('NFC').trim().replace(/\s+/g,' ').toLowerCase()])
}
export function ultimasMetricas(rows: Metrica[]) {
  const ultimas = new Map<string,Metrica>()
  for (const x of rows) {
    const clave=claveCampana(x), anterior=ultimas.get(clave)
    if (!anterior || x.fecha>anterior.fecha || (x.fecha===anterior.fecha && x.actualizado_at>anterior.actualizado_at)) ultimas.set(clave,x)
  }
  return [...ultimas.values()]
}
export function mismosDatos(row: Metrica, datos: DatosMetrica) {
  return Object.entries(datos).every(([k,v])=> v===null ? row[k as keyof Metrica]==null : typeof v==='number' ? Number(row[k as keyof Metrica])===v : row[k as keyof Metrica]===v)
}
export function dineroMetrica(valor: number | null) { return valor===null ? '—' : new Intl.NumberFormat('es-AR',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(valor) }
export function porcentajeMetrica(valor: number | null) { return valor===null ? '—' : `${valor.toLocaleString('es-AR',{maximumFractionDigits:1})}%` }
export function fechaMetrica(fecha: string) { return new Intl.DateTimeFormat('es-AR',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'}).format(new Date(fecha+'T12:00:00Z')) }
