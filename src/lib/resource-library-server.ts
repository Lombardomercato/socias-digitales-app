import 'server-only'
import { createHash } from 'node:crypto'
import type { PerfilClases } from './class-access'
import { leerCatalogoClases } from './class-catalog'
import { leerMateriales } from './class-materials-store'
import { CLASES_POR_PAGINA_RECURSOS, clasesAutorizadasRecursos, offsetRecursosValido, proyectarRecursosClase, type FalloClaseRecursos, type PaginaRecursos, type RecursoBiblioteca } from './resource-library'

// El llamador verificó sesión y leyó su perfil protegido. Ni la paginación ni la
// revisión del catálogo conceden acceso. Cada descarga lo vuelve a comprobar.
export async function leerBibliotecaRecursos(perfil: PerfilClases | null, offset: unknown = 0, revisionEsperada?: unknown): Promise<PaginaRecursos> {
  if (!perfil || typeof perfil !== 'object' || Array.isArray(perfil) || perfil.rol === 'admin') return { estado: 'error', mensaje: 'No pudimos comprobar tu acceso a los materiales.' }
  if (!offsetRecursosValido(offset) || (revisionEsperada !== undefined && (typeof revisionEsperada !== 'string' || !/^[a-f0-9]{64}$/.test(revisionEsperada)))) return { estado: 'error', mensaje: 'No pudimos abrir esta parte de la biblioteca. Volvé a cargarla desde el comienzo.' }
  let clases: ReturnType<typeof clasesAutorizadasRecursos>
  try { clases = clasesAutorizadasRecursos(await leerCatalogoClases(perfil), perfil) }
  catch {
    console.error('resource_library_catalog_read_failed')
    return { estado: 'error', mensaje: 'No pudimos cargar la biblioteca de materiales. Volvé a intentar.' }
  }
  // Huella de la clasificación autorizada, no credencial ni versión global de
  // los adjuntos. No contiene enlaces de reproducción o identidades de alumnas.
  const revisionCatalogo = createHash('sha256').update(JSON.stringify(clases)).digest('hex')
  if ((revisionEsperada !== undefined && revisionEsperada !== revisionCatalogo) || (offset > 0 && offset >= clases.length)) return { estado: 'actualizado', mensaje: 'La organización de la biblioteca cambió o esta parte ya no está disponible. Actualizá la biblioteca para seguir desde el comienzo.' }
  const pagina = clases.slice(offset, offset + CLASES_POR_PAGINA_RECURSOS)
  const resultados = pagina.map(() => ({ recursos: [] as RecursoBiblioteca[], fallo: null as FalloClaseRecursos | null }))
  let siguiente = 0
  async function reunir() {
    while (siguiente < pagina.length) {
      const indice = siguiente++
      const clase = pagina[indice]
      try {
        const lista = await leerMateriales(clase.claseId, { timeoutMs: 5000 })
        resultados[indice].recursos = proyectarRecursosClase(clase, lista.materiales)
      } catch {
        resultados[indice].fallo = { claseId: clase.claseId, claseTitulo: clase.claseTitulo, programa: clase.programa, seccion: clase.seccion }
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, pagina.length) }, reunir))
  const recursos = resultados.flatMap(resultado => resultado.recursos)
  const fallos = resultados.flatMap(resultado => resultado.fallo ? [resultado.fallo] : [])
  if (fallos.length) console.error('resource_library_materials_read_failed', { clases: fallos.length, offset })
  const hayMas = offset + pagina.length < clases.length
  return {
    estado: fallos.length ? 'parcial' : 'listo', offset, hayMas,
    nextOffset: hayMas ? offset + pagina.length : null, revisionCatalogo, recursos, fallos,
    resumen: { clasesRevisadas: pagina.length, clasesLeidas: pagina.length - fallos.length, materiales: recursos.length, archivos: recursos.filter(recurso => recurso.tipo === 'archivo').length, enlaces: recursos.filter(recurso => recurso.tipo === 'enlace').length },
  }
}
