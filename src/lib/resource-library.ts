import { puedeVerClase, type ClaseCatalogo, type PerfilClases } from './class-access'
import { esUuid, PROGRAMAS_INICIALES, SECCIONES_CLASE, ubicacionClase, type SeccionClase } from './class-management'
import { materialesVisibles, validarMateriales, type MaterialVisible } from './class-materials'

export const CLASES_POR_PAGINA_RECURSOS = 20

export interface RecursoBiblioteca extends MaterialVisible {
  clave: string
  claseId: string
  claseTitulo: string
  programa: string
  seccion: SeccionClase
}
export interface FalloClaseRecursos {
  claseId: string
  claseTitulo: string
  programa: string
  seccion: SeccionClase
}
export interface ClaseParaRecursos extends FalloClaseRecursos { orden: number }
export type PaginaRecursos = {
  estado: 'listo' | 'parcial'
  offset: number
  nextOffset: number | null
  hayMas: boolean
  revisionCatalogo: string
  recursos: RecursoBiblioteca[]
  fallos: FalloClaseRecursos[]
  resumen: { clasesRevisadas: number; clasesLeidas: number; materiales: number; archivos: number; enlaces: number }
} | { estado: 'error'; mensaje: string } | { estado: 'actualizado'; mensaje: string }

export function offsetRecursosValido(offset: unknown): offset is number {
  return typeof offset === 'number' && Number.isSafeInteger(offset) && offset >= 0
}

export function clasesAutorizadasRecursos(catalogo: ClaseCatalogo[], perfil: PerfilClases | null): ClaseParaRecursos[] {
  if (!perfil || perfil.rol === 'admin') return []
  if (!Array.isArray(catalogo)) throw new Error('Catálogo no disponible.')
  const porId = new Map<string, ClaseParaRecursos>()
  for (const clase of catalogo) {
    if (!clase || !esUuid(clase.id) || clase.activo !== true || clase.puede_ver !== true || !puedeVerClase(perfil, clase)) continue
    const id = clase.id.toLowerCase()
    if (porId.has(id)) continue
    if (typeof clase.titulo !== 'string' || !clase.titulo.trim() || typeof clase.modulo !== 'string' || !clase.modulo.trim() || !Number.isSafeInteger(clase.orden) || clase.orden < 0) throw new Error('Catálogo no disponible.')
    const ubicacion = ubicacionClase(clase.modulo)
    if (!ubicacion.programa) throw new Error('Catálogo no disponible.')
    porId.set(id, { claseId: id, claseTitulo: clase.titulo.trim().replace(/\s+/g, ' '), ...ubicacion, orden: clase.orden })
  }
  const prioridad = (programa: string) => {
    const indice = PROGRAMAS_INICIALES.findIndex(nombre => nombre === programa)
    return indice < 0 ? PROGRAMAS_INICIALES.length : indice
  }
  return [...porId.values()].sort((a, b) => prioridad(a.programa) - prioridad(b.programa)
    || a.programa.localeCompare(b.programa, 'es')
    || SECCIONES_CLASE.indexOf(a.seccion) - SECCIONES_CLASE.indexOf(b.seccion)
    || a.orden - b.orden || a.claseId.localeCompare(b.claseId))
}

export function proyectarRecursosClase(clase: ClaseParaRecursos, materiales: unknown): RecursoBiblioteca[] {
  if (!esUuid(clase.claseId)) throw new Error('Clase no disponible.')
  return materialesVisibles(clase.claseId, validarMateriales(materiales)).map(material => ({
    id: material.id, titulo: material.titulo, tipo: material.tipo, detalle: material.detalle, href: material.href,
    clave: `${clase.claseId}:${material.id}`, claseId: clase.claseId, claseTitulo: clase.claseTitulo,
    programa: clase.programa, seccion: clase.seccion,
  }))
}

export function filtrarRecursosBiblioteca(recursos: RecursoBiblioteca[], { buscar = '', programa = '', tipo = 'todos' }: { buscar?: string; programa?: string; tipo?: 'todos' | 'archivo' | 'enlace' } = {}) {
  const normalizar = (texto: string) => texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es')
  const palabras = normalizar(buscar).split(/\s+/).filter(Boolean)
  return recursos.filter(recurso => {
    if ((programa && recurso.programa !== programa) || (tipo !== 'todos' && recurso.tipo !== tipo)) return false
    const texto = normalizar([recurso.titulo, recurso.claseTitulo, recurso.programa, recurso.seccion, recurso.tipo, recurso.detalle].join(' '))
    return palabras.every(palabra => texto.includes(palabra))
  })
}
