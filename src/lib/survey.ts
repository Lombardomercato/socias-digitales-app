import { PASOS_PERFIL, INGRESOS, OCUPACIONES, normalizarNombre } from './perfil-preguntas'
import { tipoAcceso, type TipoAcceso } from './admin-usuarias'
import { CUENTAS_PRUEBA_IDS, esCuentaPrueba } from './test-accounts'

export const SURVEY_TEST_IDS = CUENTAS_PRUEBA_IDS
export const SURVEY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1eQQ6vScK4ZqGRx-5XZ-gyPyu42E2101YB7GK6_TmeWU/edit#gid=130102026'
export interface SurveyProfile {
  id: string; nombre: string | null; rol: string | null; tipo_usuario: string | null; estado: string | null; created_at: string
  whatsapp: string | null; fecha_nacimiento: string | null; ocupacion: string | null; titulo_profesional: string | null
  es_mama: boolean | null; ingresos_actuales: string | null; pais: string | null; provincia: string | null; avatar_url: string | null
}
export interface SurveyWelcome { usuaria_id: string; completado_at: string | null; actualizado_at: string | null; exenta: boolean; respondidas: string[] }
export interface SurveyRow {
  id: string; nombre: string; tipo: TipoAcceso; estado: string; prueba: boolean; registroDia: string
  completado_at: string | null; estadoEncuesta: 'completa' | 'en_curso' | 'anterior'; edad: number | null
  pais: string | null; provincia: string | null; ocupacion: string | null; titulo_profesional: string | null
  es_mama: boolean | null; ingresos_actuales: string | null; camposConDatos: string[]; camposRespondidos: string[]
}
export interface SurveyFilters { tipo: TipoAcceso | 'todas'; estadoEncuesta: 'todas' | SurveyRow['estadoEncuesta']; desde: string; hasta: string; pruebas: boolean }
export const SURVEY_DEFAULT_FILTERS: SurveyFilters = { tipo: 'todas', estadoEncuesta: 'todas', desde: '', hasta: '', pruebas: false }
export interface SurveyGroup { label: string; count: number; percent: number }
const EDADES_ENCUESTA = ['Menos de 18', '18–24', '25–34', '35–44', '45–54', '55–64', '65 o más'] as const
function rangoEdadEncuesta(age: number | null) {
  return age === null ? null : age < 18 ? EDADES_ENCUESTA[0] : age < 25 ? EDADES_ENCUESTA[1] : age < 35 ? EDADES_ENCUESTA[2] : age < 45 ? EDADES_ENCUESTA[3] : age < 55 ? EDADES_ENCUESTA[4] : age < 65 ? EDADES_ENCUESTA[5] : EDADES_ENCUESTA[6]
}

export function fechaEncuestaArgentina(value: Date | string = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}
export function fechaEncuestaValida(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function edadEncuesta(nacimiento: string | null, hoy: string): number | null {
  if (!nacimiento || !fechaEncuestaValida(nacimiento) || !fechaEncuestaValida(hoy) || nacimiento > hoy) return null
  const [year, month, day] = hoy.split('-').map(Number), [birthYear, birthMonth, birthDay] = nacimiento.split('-').map(Number)
  const age = year - birthYear - (month < birthMonth || (month === birthMonth && day < birthDay) ? 1 : 0)
  return age >= 0 && age <= 120 ? age : null
}
const conDato = (value: unknown) => typeof value === 'boolean' || (typeof value === 'string' && Boolean(value.trim()))
export function construirEncuesta(perfiles: SurveyProfile[], bienvenida: SurveyWelcome[], hoy: string): SurveyRow[] {
  const estados = new Map(bienvenida.map(b => [b.usuaria_id, b]))
  return perfiles.filter(p => p.rol !== 'admin' && !esCuentaPrueba(p.id)).map(p => {
    const b = estados.get(p.id)
    return { id: p.id, nombre: p.nombre || 'Sin nombre', tipo: tipoAcceso(p), estado: p.estado || 'Sin estado',
      prueba: SURVEY_TEST_IDS.some(id => id === p.id), registroDia: fechaEncuestaArgentina(p.created_at),
      completado_at: b?.completado_at ?? null, estadoEncuesta: b?.completado_at ? 'completa' : b?.exenta ? 'anterior' : 'en_curso',
      edad: edadEncuesta(p.fecha_nacimiento, hoy), pais: p.pais, provincia: p.provincia, ocupacion: p.ocupacion,
      titulo_profesional: p.titulo_profesional, es_mama: p.es_mama, ingresos_actuales: p.ingresos_actuales,
      camposConDatos: PASOS_PERFIL.filter(paso => conDato(p[paso.campo])).map(paso => paso.campo), camposRespondidos: b?.respondidas ?? [],
    }
  })
}
export function validarFiltrosEncuesta(params: URLSearchParams): SurveyFilters {
  const tipo = params.get('tipo') || 'todas', estadoEncuesta = params.get('estadoEncuesta') || 'todas'
  const desde = params.get('desde') || '', hasta = params.get('hasta') || '', pruebas = params.get('pruebas') || '0'
  if (!['todas', 'gratuito', 'desafio', 'socia'].includes(tipo) || !['todas', 'completa', 'en_curso', 'anterior'].includes(estadoEncuesta)
    || (desde && !fechaEncuestaValida(desde)) || (hasta && !fechaEncuestaValida(hasta)) || (desde && hasta && desde > hasta) || !['0', '1'].includes(pruebas)) throw new Error('Revisá los filtros de la encuesta.')
  // Compatibilidad con enlaces antiguos: pruebas=1 nunca reincorpora datos de ensayo.
  return { tipo: tipo as SurveyFilters['tipo'], estadoEncuesta: estadoEncuesta as SurveyFilters['estadoEncuesta'], desde, hasta, pruebas: false }
}
export function filtrarEncuesta(rows: SurveyRow[], filters: SurveyFilters) {
  return rows.filter(r => !r.prueba && !esCuentaPrueba(r.id) && (filters.tipo === 'todas' || r.tipo === filters.tipo)
    && (filters.estadoEncuesta === 'todas' || r.estadoEncuesta === filters.estadoEncuesta)
    && (!filters.desde || Boolean(r.registroDia && r.registroDia >= filters.desde)) && (!filters.hasta || Boolean(r.registroDia && r.registroDia <= filters.hasta)))
}
const clave = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-AR')
export function agruparEncuesta(values: (string | null)[], order: readonly string[] = []): SurveyGroup[] {
  const grupos = new Map<string, { label: string; count: number }>()
  for (const value of values) {
    const label = value?.trim().replace(/\s+/g, ' ') || 'Sin respuesta', key = clave(label)
    const entry = grupos.get(key) ?? { label: order.find(o => clave(o) === key) || (key === 'sin respuesta' ? 'Sin respuesta' : normalizarNombre(label)), count: 0 }
    entry.count++; grupos.set(key, entry)
  }
  const posiciones = new Map(order.map((label, i) => [clave(label), i]))
  return [...grupos.entries()].sort(([a, av], [b, bv]) => a === 'sin respuesta' ? 1 : b === 'sin respuesta' ? -1
    : order.length ? (posiciones.get(a) ?? order.length) - (posiciones.get(b) ?? order.length) || av.label.localeCompare(bv.label, 'es')
      : bv.count - av.count || av.label.localeCompare(bv.label, 'es'))
    .map(([, g]) => ({ ...g, percent: values.length ? Math.round(g.count * 1000 / values.length) / 10 : 0 }))
}
export function resumenEncuesta(rows: SurveyRow[]) {
  rows = rows.filter(r => !r.prueba && !esCuentaPrueba(r.id))
  return {
    total: rows.length, completas: rows.filter(r => r.estadoEncuesta === 'completa').length,
    enCurso: rows.filter(r => r.estadoEncuesta === 'en_curso').length, anteriores: rows.filter(r => r.estadoEncuesta === 'anterior').length,
    paises: agruparEncuesta(rows.map(r => r.pais)), provincias: agruparEncuesta(rows.map(r => r.provincia)),
    ocupaciones: agruparEncuesta(rows.map(r => r.ocupacion), OCUPACIONES), ingresos: agruparEncuesta(rows.map(r => r.ingresos_actuales), INGRESOS),
    edades: agruparEncuesta(rows.map(r => rangoEdadEncuesta(r.edad)), EDADES_ENCUESTA), maternidad: agruparEncuesta(rows.map(r => r.es_mama === true ? 'Sí' : r.es_mama === false ? 'No' : null), ['Sí', 'No']),
    cobertura: PASOS_PERFIL.map(paso => {
      const aplicables = paso.campo === 'titulo_profesional' ? rows.filter(r => r.ocupacion === 'Profesional' || r.camposConDatos.includes(paso.campo)) : rows
      return { ...paso, total: aplicables.length, conDatos: aplicables.filter(r => r.camposConDatos.includes(paso.campo)).length,
        contestadas: aplicables.filter(r => r.camposRespondidos.includes(paso.campo)).length }
    }),
  }
}
export function perfilEncuesta(rows: SurveyRow[]) {
  rows = rows.filter(r => !r.prueba && !esCuentaPrueba(r.id))
  // El perfil describe encuestas terminadas, no respuestas parciales ni intención de compra.
  const completas = rows.filter(r => r.estadoEncuesta === 'completa')
  const resumen = resumenEncuesta(completas)
  const dimensiones = [
    { id: 'ocupacion', title: 'Ocupación', groups: resumen.ocupaciones },
    { id: 'maternidad', title: 'Maternidad', groups: resumen.maternidad },
    { id: 'ingresos', title: 'Ingresos mensuales', groups: resumen.ingresos },
    { id: 'edad', title: 'Edad', groups: resumen.edades },
    { id: 'provincia', title: 'Provincia / estado', groups: resumen.provincias },
    { id: 'pais', title: 'País', groups: resumen.paises },
  ]
  const rasgos = dimensiones.map(d => {
    const validos = d.groups.filter(g => g.label !== 'Sin respuesta')
    const maximo = Math.max(0, ...validos.map(g => g.count))
    const ganadores = validos.filter(g => g.count === maximo)
    return { id: d.id, title: d.title, ganadores, conDato: validos.reduce((n, g) => n + g.count, 0) }
  })
  // Contar personas que reúnen las modas, nunca multiplicar porcentajes marginales.
  const unicos = rasgos.every(r => r.ganadores.length === 1)
  const valores = (r: SurveyRow) => [r.ocupacion, r.es_mama === null ? null : r.es_mama ? 'Sí' : 'No', r.ingresos_actuales, rangoEdadEncuesta(r.edad), r.provincia, r.pais]
  const coincidencia = unicos ? completas.filter(r => valores(r).every((v, i) => v !== null && clave(v) === clave(rasgos[i].ganadores[0].label))).length : null
  const grupos = new Map<string, { maternidad: string; ocupacion: string; ingresos: string; count: number }>()
  const etiqueta = (value: string, order: readonly string[]) => order.find(o => clave(o) === clave(value)) || normalizarNombre(value.trim())
  let conTresDatos = 0
  for (const r of completas) {
    if (r.es_mama === null || !r.ocupacion?.trim() || !r.ingresos_actuales?.trim()) continue
    conTresDatos++
    const key = JSON.stringify([r.es_mama, clave(r.ocupacion), clave(r.ingresos_actuales)])
    const grupo = grupos.get(key) ?? { maternidad: r.es_mama ? 'Es mamá' : 'No es mamá', ocupacion: etiqueta(r.ocupacion, OCUPACIONES), ingresos: etiqueta(r.ingresos_actuales, INGRESOS), count: 0 }
    grupo.count++; grupos.set(key, grupo)
  }
  const segmentos = [...grupos.values()].filter(g => g.count >= 2).sort((a, b) => b.count - a.count
    || `${a.maternidad} ${a.ocupacion} ${a.ingresos}`.localeCompare(`${b.maternidad} ${b.ocupacion} ${b.ingresos}`, 'es'))
    .slice(0, 3).map(g => ({ ...g, percent: Math.round(g.count * 1000 / completas.length) / 10 }))
  return { base: completas.length, excluidas: rows.length - completas.length, rasgos, coincidencia, segmentos, conTresDatos }
}
export function urlExportarEncuesta(filters: SurveyFilters) {
  return `/api/admin/encuesta/exportar?${new URLSearchParams({ tipo: filters.tipo, estadoEncuesta: filters.estadoEncuesta, desde: filters.desde, hasta: filters.hasta })}`
}
export function csvEncuesta(perfiles: SurveyProfile[], rows: SurveyRow[]) {
  const raw = new Map(perfiles.map(p => [p.id, p]))
  const cell = (value: unknown) => {
    let text = typeof value === 'boolean' ? value ? 'Sí' : 'No' : String(value ?? '')
    if (/^[\s]*[=+\-@]/u.test(text)) text = `'${text}`
    return `"${text.replaceAll('"', '""')}"`
  }
  const headers = ['ID', 'Tipo de acceso', 'Estado de cuenta', 'Estado de encuesta', 'Registro (Argentina)', 'Encuesta completada', 'Cuenta de prueba', ...PASOS_PERFIL.map(p => p.pregunta)]
  const lines = rows.filter(r => !r.prueba && !esCuentaPrueba(r.id)).map(r => [r.id, r.tipo, r.estado, r.estadoEncuesta, r.registroDia, r.completado_at, r.prueba, ...PASOS_PERFIL.map(p => raw.get(r.id)?.[p.campo])].map(cell).join(','))
  return '\uFEFF' + [headers.map(cell).join(','), ...lines].join('\r\n')
}
