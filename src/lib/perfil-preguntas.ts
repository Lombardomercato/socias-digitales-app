export const OCUPACIONES = ['Estudiante', 'Trabajo en relación de dependencia', 'Emprendedora', 'Profesional', 'Desocupada']
export const INGRESOS = ['Sin ingresos', 'Menos de USD 500/mes', 'USD 500 - 1.000/mes', 'USD 1.000 - 3.000/mes', 'Más de USD 3.000/mes']
export type CampoPerfil = 'nombre' | 'whatsapp' | 'fecha_nacimiento' | 'ocupacion' | 'titulo_profesional' | 'es_mama' | 'ingresos_actuales' | 'pais' | 'provincia' | 'avatar_url'
export type ValorPerfil = string | boolean | null
export type RespuestasPerfil = Record<CampoPerfil, ValorPerfil>
export const PASOS_PERFIL: readonly { campo: CampoPerfil; pregunta: string; opcional?: boolean; tipo: 'texto' | 'telefono' | 'fecha' | 'opciones' | 'mama' | 'foto' }[] = [
  { campo: 'nombre', pregunta: '¿Cuál es tu nombre?', tipo: 'texto' },
  { campo: 'whatsapp', pregunta: '¿Cuál es tu WhatsApp?', tipo: 'telefono' },
  { campo: 'fecha_nacimiento', pregunta: '¿Cuándo naciste?', tipo: 'fecha', opcional: true },
  { campo: 'ocupacion', pregunta: '¿A qué te dedicás?', tipo: 'opciones' },
  { campo: 'titulo_profesional', pregunta: '¿Cuál es tu título profesional?', tipo: 'texto' },
  { campo: 'es_mama', pregunta: '¿Sos mamá?', tipo: 'mama', opcional: true },
  { campo: 'ingresos_actuales', pregunta: '¿Cuáles son tus ingresos actuales?', tipo: 'opciones', opcional: true },
  { campo: 'pais', pregunta: '¿En qué país vivís?', tipo: 'texto' },
  { campo: 'provincia', pregunta: '¿En qué provincia o estado vivís?', tipo: 'texto' },
  { campo: 'avatar_url', pregunta: '¿Sumamos tu foto?', tipo: 'foto', opcional: true },
]

export function pasosVisibles(datos: RespuestasPerfil) {
  return PASOS_PERFIL.filter(paso => paso.campo !== 'titulo_profesional' || datos.ocupacion === 'Profesional' || Boolean(datos.titulo_profesional))
}

export function necesitaBienvenida(estado: { exenta?: boolean; completado_at?: string | null } | null, rol?: string | null) {
  return rol !== 'admin' && !estado?.completado_at
}

export function normalizarNombre(nombre: string): string {
  return nombre.normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('es-AR')
    .replace(/(^|[\s\-'’])(\p{L})/gu, (_, separador: string, letra: string) => separador + letra.toLocaleUpperCase('es-AR'))
}

export function normalizarRespuestaBienvenida(campo: CampoPerfil, valor: unknown, contexto: Parameters<typeof normalizarRespuesta>[2], eleccionExplicita = false): ValorPerfil {
  const respuesta = normalizarRespuesta(campo, valor, contexto)
  if (respuesta === null && !(eleccionExplicita && PASOS_PERFIL.find(paso => paso.campo === campo)?.opcional)) {
    throw new Error('Completá esta respuesta para continuar.')
  }
  return respuesta
}

export function normalizarRespuesta(campo: CampoPerfil, valor: unknown, contexto: { userId: string; supabaseUrl: string; anterior?: ValorPerfil }): ValorPerfil {
  if (campo === 'es_mama') {
    if (valor === null || typeof valor === 'boolean') return valor
    throw new Error('Elegí una respuesta.')
  }
  if (valor !== null && typeof valor !== 'string') throw new Error('Revisá tu respuesta.')
  const texto = typeof valor === 'string' ? valor.trim() : ''
  if (!texto) {
    if (['nombre','ocupacion','pais'].includes(campo)) throw new Error('Completá esta respuesta para continuar.')
    return null
  }
  if (campo === 'nombre' && (texto.length < 2 || texto.length > 120)) throw new Error('Escribí un nombre de entre 2 y 120 caracteres.')
  if (campo === 'whatsapp' && !/^[+\d()\s.-]{6,30}$/.test(texto)) throw new Error('Revisá el teléfono e incluí el código de país.')
  if (campo === 'fecha_nacimiento') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto) || !Number.isFinite(Date.parse(texto)) || new Date(texto).toISOString().slice(0,10) !== texto || Date.parse(texto) > Date.now()) throw new Error('Revisá la fecha de nacimiento.')
  }
  if (campo === 'ocupacion' && !OCUPACIONES.includes(texto) && texto !== contexto.anterior) throw new Error('Elegí una ocupación.')
  if (campo === 'ingresos_actuales' && !INGRESOS.includes(texto) && texto !== contexto.anterior) throw new Error('Elegí un rango de ingresos.')
  if (['pais','provincia','titulo_profesional'].includes(campo) && (texto.length > 160 || (campo === 'pais' && texto.length < 2))) throw new Error('Revisá esta respuesta.')
  if (campo === 'avatar_url' && texto !== contexto.anterior && !texto.startsWith(`${contexto.supabaseUrl.replace(/\/$/,'')}/storage/v1/object/public/avatars/${contexto.userId}/`)) throw new Error('Subí tu foto desde este formulario.')
  return campo === 'nombre' ? normalizarNombre(texto) : texto
}
