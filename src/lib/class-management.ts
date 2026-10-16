export const PROGRAMAS_INICIALES = [
  'Introducción',
  'Desafío Socias en vivo',
] as const
export const TAMANO_PARTE = 16 * 1024 * 1024
export const MAX_VIDEO_BYTES = 8 * 1024 * 1024 * 1024
export const esUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
export function validarVideo(nombre: unknown, bytes: unknown) {
  return (
    typeof nombre === 'string' &&
    nombre.length <= 200 &&
    /\.mp4$/i.test(nombre) &&
    typeof bytes === 'number' &&
    Number.isSafeInteger(bytes) &&
    bytes > 0 &&
    bytes <= MAX_VIDEO_BYTES
  )
}
export function puedePublicarClase(ficha: {
  tieneVideo: boolean
  vimeo_url: string | null
}) {
  return (
    ficha.tieneVideo ||
    /^https:\/\/(?:www\.)?vimeo\.com\/\d+(?:\/\w+)?$/.test(
      ficha.vimeo_url?.trim() ?? '',
    )
  )
}
export function datosClase(input: Record<string, unknown>) {
  const titulo = typeof input.titulo === 'string' ? input.titulo.trim() : ''
  const modulo =
    typeof input.modulo === 'string'
      ? input.modulo.trim().replace(/\s+/g, ' ')
      : ''
  const descripcion =
    typeof input.descripcion === 'string' ? input.descripcion.trim() : ''
  const orden = Number(input.orden)
  const vimeo_url =
    typeof input.vimeo_url === 'string' ? input.vimeo_url.trim() : ''
  if (
    !titulo ||
    titulo.length > 180 ||
    !modulo ||
    modulo.length > 100 ||
    descripcion.length > 3000 ||
    !Number.isInteger(orden) ||
    orden < 0 ||
    orden > 9999
  )
    return null
  if (
    vimeo_url &&
    !/^https:\/\/(?:www\.)?vimeo\.com\/\d+(?:\/\w+)?$/.test(vimeo_url)
  )
    return null
  return {
    titulo,
    modulo,
    descripcion: descripcion || null,
    orden,
    vimeo_url: vimeo_url || null,
    activo: input.activo === true,
    acceso_gratuito: input.acceso_gratuito === true,
  }
}
