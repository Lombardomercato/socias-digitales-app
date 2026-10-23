import { NextResponse } from 'next/server'
import { esUuid } from '@/lib/class-management'
import { autorizarMateriales, HEADERS_MATERIALES } from '@/lib/class-materials-access'
import { leerMateriales } from '@/lib/class-materials-store'
import { claveMaterial } from '@/lib/class-materials'
import { pedirR2 } from '@/lib/r2-upload'

export const maxDuration = 300
export async function GET(_request: Request, context: { params: Promise<{ id: string; materialId: string }> }) {
  const { id, materialId } = await context.params
  if (!esUuid(materialId)) return new NextResponse(null, { status: 404, headers: HEADERS_MATERIALES })
  const auth = await autorizarMateriales(id)
  if ('error' in auth) return auth.error
  try {
    const { materiales } = await leerMateriales(id)
    const material = materiales.find(m => m.id === materialId && m.activo)
    if (!material) return NextResponse.json({ error: 'Este material ya no está disponible.' }, { status: 404, headers: HEADERS_MATERIALES })
    if (material.tipo === 'enlace') return new NextResponse(null, { status: 302, headers: { ...HEADERS_MATERIALES, Location: material.url } })
    const file = await pedirR2('GET', claveMaterial(id, material.id, material.archivo.extension), {}, '', undefined, undefined, { timeoutMs: 240_000 })
    if (!file.ok || Number(file.headers.get('content-length')) !== material.archivo.bytes) throw new Error('material_missing')
    // Descarga privada por sesión, sin URL pública ni ejecución de contenido subido.
    return new NextResponse(file.body, { headers: {
      ...HEADERS_MATERIALES, 'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="material.${material.archivo.extension}"; filename*=UTF-8''${encodeURIComponent(material.archivo.nombre).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())}`,
      'Content-Length': String(material.archivo.bytes), 'Content-Security-Policy': "sandbox allow-downloads; default-src 'none'",
    } })
  } catch {
    console.error('class_material_download_failed')
    return NextResponse.json({ error: 'No pudimos abrir el material. Volvé a la clase e intentá nuevamente.' }, { status: 503, headers: HEADERS_MATERIALES })
  }
}
