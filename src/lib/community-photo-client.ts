// Browser-only image preparation. The server independently validates and
// re-encodes every upload; MIME and canvas checks are not an authorization gate.
export const LIMITE_ORIGINAL_FOTO_COMUNIDAD = 20 * 1024 * 1024
export const LIMITE_CARGA_FOTO_COMUNIDAD = 4 * 1024 * 1024
export const MAXIMO_PIXELES_FOTO_COMUNIDAD = 25_000_000
export const TIPOS_FOTO_COMUNIDAD = ['image/jpeg', 'image/png', 'image/webp'] as const
export interface FotoComunidadPreparada { archivo: Blob; ancho: number; alto: number }

export function validarArchivoFotoComunidad(archivo: File) {
  if (!TIPOS_FOTO_COMUNIDAD.includes(archivo.type as typeof TIPOS_FOTO_COMUNIDAD[number])) throw new Error('Elegí una foto JPG, PNG o WebP. Si tu teléfono usa HEIC, exportala primero como JPG.')
  if (!Number.isSafeInteger(archivo.size) || archivo.size <= 0 || archivo.size > LIMITE_ORIGINAL_FOTO_COMUNIDAD) throw new Error('Cada foto original puede pesar hasta 20 MB y no debe estar vacía.')
}

function comprobarCancelacion(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Preparación cancelada.', 'AbortError')
}

async function decodificarFoto(archivo: File, signal?: AbortSignal): Promise<{ imagen: CanvasImageSource; ancho: number; alto: number; cerrar: () => void }> {
  comprobarCancelacion(signal)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(archivo, { imageOrientation: 'from-image' })
      if (signal?.aborted) { bitmap.close(); comprobarCancelacion(signal) }
      return { imagen: bitmap, ancho: bitmap.width, alto: bitmap.height, cerrar: () => bitmap.close() }
    } catch (cause) {
      comprobarCancelacion(signal)
      if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
      // Safari and older browsers can decode formats through <img> even when
      // createImageBitmap is unavailable for that format. No network is used.
    }
  }
  const url = URL.createObjectURL(archivo)
  const imagen = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const terminar = (error?: Error) => {
        clearTimeout(timeout); signal?.removeEventListener('abort', cancelar)
        imagen.onload = null; imagen.onerror = null
        if (error) reject(error); else resolve()
      }
      const cancelar = () => { imagen.src = ''; terminar(new DOMException('Preparación cancelada.', 'AbortError')) }
      const timeout = setTimeout(() => terminar(new Error('No pudimos abrir esta foto. Probá con otra imagen JPG, PNG o WebP.')), 20_000)
      imagen.onload = () => terminar()
      imagen.onerror = () => terminar(new Error('No pudimos abrir esta foto. Probá con otra imagen JPG, PNG o WebP.'))
      signal?.addEventListener('abort', cancelar, { once: true })
      imagen.src = url
      if (signal?.aborted) cancelar()
    })
    comprobarCancelacion(signal)
    return { imagen, ancho: imagen.naturalWidth, alto: imagen.naturalHeight, cerrar: () => { imagen.src = ''; URL.revokeObjectURL(url) } }
  } catch (cause) { imagen.src = ''; URL.revokeObjectURL(url); throw cause }
}

function convertirWebp(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => {
    if (!blob || blob.type !== 'image/webp' || blob.size <= 0) reject(new Error('Este navegador no pudo preparar la foto. Probá desde una versión actualizada de Chrome o Safari.'))
    else resolve(blob)
  }, 'image/webp', 0.84))
}

export async function prepararFotoComunidad(archivo: File, signal?: AbortSignal): Promise<FotoComunidadPreparada> {
  validarArchivoFotoComunidad(archivo)
  comprobarCancelacion(signal)
  const fuente = await decodificarFoto(archivo, signal)
  let canvas: HTMLCanvasElement | null = null
  try {
    canvas = document.createElement('canvas')
    const { ancho, alto } = fuente
    if (!Number.isSafeInteger(ancho) || !Number.isSafeInteger(alto) || ancho < 1 || alto < 1 || ancho * alto > MAXIMO_PIXELES_FOTO_COMUNIDAD) throw new Error('La imagen es demasiado grande para prepararla con seguridad. Elegí una versión de hasta 25 megapíxeles.')
    for (const lado of [2048, 1600, 1280]) {
      comprobarCancelacion(signal)
      const escala = Math.min(1, lado / Math.max(ancho, alto))
      canvas.width = Math.max(1, Math.round(ancho * escala))
      canvas.height = Math.max(1, Math.round(alto * escala))
      const contexto = canvas.getContext('2d')
      if (!contexto) throw new Error('No pudimos preparar la foto en este navegador. Probá con otra imagen.')
      contexto.drawImage(fuente.imagen, 0, 0, canvas.width, canvas.height)
      const preparada = await convertirWebp(canvas)
      comprobarCancelacion(signal)
      if (preparada.size <= LIMITE_CARGA_FOTO_COMUNIDAD) return { archivo: preparada, ancho: canvas.width, alto: canvas.height }
    }
    throw new Error('No pudimos reducir esta foto a 4 MB. Elegí una imagen más pequeña.')
  } finally {
    fuente.cerrar()
    if (canvas) { canvas.width = 0; canvas.height = 0 }
  }
}
