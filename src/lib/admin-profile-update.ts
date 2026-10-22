import { normalizarNombre } from './perfil-preguntas'

export const CAMPOS_FICHA = ['nombre', 'whatsapp', 'pais', 'tipo_usuario', 'estado'] as const
export const CAMPOS_VERSION_FICHA = [...CAMPOS_FICHA, 'rol', 'desafio_socias_habilitada', 'desafio_socias_estado'] as const
export type VersionFicha = Record<typeof CAMPOS_VERSION_FICHA[number], string | boolean | null>
type PerfilVersionable = Partial<Record<typeof CAMPOS_VERSION_FICHA[number], string | boolean | null>>
export interface CambiosFicha { nombre: string; whatsapp: string | null; pais: string | null; tipo_usuario: 'gratuito' | 'desafio' | 'socia'; estado: 'activa' | 'pausada' | 'cancelada' }

// Snapshot de columnas conocidas, no un token de autorización ni metadata Auth.
export function versionFicha(perfil: PerfilVersionable): VersionFicha {
  return Object.fromEntries(CAMPOS_VERSION_FICHA.map(campo => [campo, perfil[campo] ?? null])) as VersionFicha
}
export function mismaVersionFicha(perfil: PerfilVersionable, esperado: VersionFicha) {
  return CAMPOS_VERSION_FICHA.every(campo => (perfil[campo] ?? null) === esperado[campo])
}
function objeto(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object' && !Array.isArray(value)) }
function mismasClaves(value: Record<string, unknown>, keys: readonly string[]) { return Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key)) }
function textoOpcional(value: unknown, maximo: number) {
  if (value === null || value === '') return null
  if (typeof value !== 'string' || value.length > maximo || /[\u0000-\u001f\u007f]/.test(value)) throw new Error('Revisá los datos de la ficha.')
  return value.trim() || null
}
export function validarCambioFicha(input: unknown): { cambios: CambiosFicha; esperado: VersionFicha } {
  if (!objeto(input) || !mismasClaves(input, ['cambios', 'esperado']) || !objeto(input.cambios) || !objeto(input.esperado)
    || !mismasClaves(input.cambios, CAMPOS_FICHA) || !mismasClaves(input.esperado, CAMPOS_VERSION_FICHA)) throw new Error('Solicitud de ficha no válida. Recargá y volvé a intentar.')
  const cambios = input.cambios
  if (typeof cambios.nombre !== 'string' || cambios.nombre.length > 120 || /[\u0000-\u001f\u007f]/.test(cambios.nombre)) throw new Error('Revisá el nombre (de 2 a 120 caracteres).')
  const nombre = normalizarNombre(cambios.nombre)
  if (nombre.length < 2) throw new Error('Completá el nombre (mínimo 2 caracteres).')
  if (!['gratuito', 'desafio', 'socia'].includes(String(cambios.tipo_usuario)) || !['activa', 'pausada', 'cancelada'].includes(String(cambios.estado))) throw new Error('Elegí un tipo de acceso y un estado válidos.')
  const whatsapp = textoOpcional(cambios.whatsapp, 40), pais = textoOpcional(cambios.pais, 80)
  if (whatsapp && !/^\+?[\d\s().-]{6,40}$/.test(whatsapp)) throw new Error('Revisá el WhatsApp; usá números y código de país.')
  for (const campo of CAMPOS_VERSION_FICHA) {
    const valor = input.esperado[campo]
    if (campo === 'desafio_socias_habilitada' ? valor !== null && typeof valor !== 'boolean' : valor !== null && (typeof valor !== 'string' || valor.length > 160 || /[\u0000-\u001f\u007f]/.test(valor))) throw new Error('La versión de la ficha no es válida. Recargá la lista.')
  }
  return { cambios: { nombre, whatsapp, pais, tipo_usuario: cambios.tipo_usuario as CambiosFicha['tipo_usuario'], estado: cambios.estado as CambiosFicha['estado'] }, esperado: input.esperado as VersionFicha }
}
export function cambiosPerfil(cambios: CambiosFicha, actual: PerfilVersionable): Record<string, string | boolean | null> {
  const patch: Record<string, string | boolean | null> = { ...cambios }
  if (cambios.tipo_usuario !== actual.tipo_usuario) {
    patch.rol = cambios.tipo_usuario === 'socia' ? 'afiliada' : 'alumna'
    patch.desafio_socias_estado = cambios.tipo_usuario === 'desafio' ? 'pendiente' : 'no_aplica'
    patch.desafio_socias_habilitada = false
    patch.desafio_socias_habilitada_at = null
    patch.desafio_socias_habilitada_por = null
  }
  return patch
}
