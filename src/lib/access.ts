export type RolPerfil = 'alumna' | 'afiliada' | 'afiliada_lanzamiento' | 'admin'
export type TipoUsuario = 'gratuito' | 'desafio' | 'socia'
export type NivelAcceso = TipoUsuario | 'admin'

export interface ModuloAcceso {
  id: string
  nombre: string
  descripcion: string
  href: string
}

export interface DefinicionAcceso {
  nombre: string
  etiqueta: string
  resumen: string
  modulos: ModuloAcceso[]
}

export const ACCESOS: Record<NivelAcceso, DefinicionAcceso> = {
  gratuito: {
    nombre: 'Acceso gratuito',
    etiqueta: 'Bienvenida',
    resumen: 'Tu cuenta está creada. Los espacios se habilitarán según tu acceso.',
    modulos: [],
  },
  desafio: {
    nombre: 'Desafío Socias',
    etiqueta: 'Desafío',
    resumen: 'Lanzamiento y clases del desafío, una vez habilitados por Flor.',
    modulos: [
      { id: 'lanzamiento', nombre: 'Mi lanzamiento', descripcion: 'Etapas y tareas', href: '/lanzamiento' },
      { id: 'programa', nombre: 'Clases', descripcion: 'Clases y materiales', href: '/classroom' },
    ],
  },
  socia: {
    nombre: 'Espacio de socia',
    etiqueta: 'Negocio en acción',
    resumen: 'Lanzamiento, formación y resultados.',
    modulos: [
      { id: 'lanzamiento', nombre: 'Mi lanzamiento', descripcion: 'Etapas y tareas', href: '/lanzamiento' },
      { id: 'resultados', nombre: 'Mis resultados', descripcion: 'Ventas y comisiones', href: '/resultados' },
      { id: 'objetivos', nombre: 'Mis objetivos', descripcion: 'Metas personales', href: '/objetivos' },
      { id: 'programa', nombre: 'Programa', descripcion: 'Clases y materiales', href: '/classroom' },
      { id: 'productos', nombre: 'Productos', descripcion: 'Catálogo para vender', href: '/productos' },
      { id: 'comunidad', nombre: 'Comunidad', descripcion: 'Preguntas y logros', href: '/comunidad' },
    ],
  },
  admin: {
    nombre: 'Panel de Flor',
    etiqueta: 'Control general',
    resumen: 'Socias, actividad y gestión.',
    modulos: [
      { id: 'socias', nombre: 'Socias', descripcion: 'Accesos y actividad', href: '/admin' },
      { id: 'lanzamiento', nombre: 'Lanzamientos', descripcion: 'Progreso y métricas', href: '/admin/lanzamiento' },
      { id: 'contenido', nombre: 'Programa', descripcion: 'Clases y módulos', href: '/admin/classroom' },
      { id: 'resultados', nombre: 'Resultados', descripcion: 'Ventas y testimonios', href: '/admin/resultados' },
      { id: 'avisos', nombre: 'Notificaciones', descripcion: 'Mensajes', href: '/admin/notificaciones' },
      { id: 'ajustes', nombre: 'Configuración', descripcion: 'Datos generales', href: '/admin/configuracion' },
    ],
  },
}

export function obtenerNivelAcceso(rol: string | null | undefined, tipoUsuario?: string | null): NivelAcceso {
  if (rol === 'admin') return 'admin'
  if (tipoUsuario === 'socia' || rol === 'afiliada' || rol === 'afiliada_lanzamiento') return 'socia'
  if (tipoUsuario === 'desafio') return 'desafio'
  return 'gratuito'
}

export function obtenerRutaInicio(rol: string | null | undefined) {
  return rol === 'admin' ? '/admin' : '/inicio'
}

export function tieneAccesoSocia(rol: string | null | undefined) {
  return rol === 'afiliada' || rol === 'afiliada_lanzamiento' || rol === 'admin'
}
