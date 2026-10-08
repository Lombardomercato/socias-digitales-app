export type RolPerfil = 'alumna' | 'afiliada' | 'afiliada_lanzamiento' | 'admin'
export type NivelAcceso = 'gratuita' | 'socia' | 'admin'

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

export const NIVEL_POR_ROL: Record<RolPerfil, NivelAcceso> = {
  alumna: 'gratuita',
  afiliada: 'socia',
  afiliada_lanzamiento: 'socia',
  admin: 'admin',
}

export const ACCESOS: Record<NivelAcceso, DefinicionAcceso> = {
  gratuita: {
    nombre: 'Acceso gratuito',
    etiqueta: 'Para empezar',
    resumen: 'Perfil, comunidad y primeros pasos.',
    modulos: [
      { id: 'perfil', nombre: 'Mi perfil', descripcion: 'Tu punto de partida', href: '/perfil' },
      { id: 'inicio', nombre: 'Primeros pasos', descripcion: 'Guía inicial', href: '/perfil' },
      { id: 'comunidad', nombre: 'Comunidad', descripcion: 'Logros compartidos', href: '/comunidad' },
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

export function obtenerNivelAcceso(rol: string | null | undefined): NivelAcceso {
  if (rol && rol in NIVEL_POR_ROL) return NIVEL_POR_ROL[rol as RolPerfil]
  return 'gratuita'
}

export function obtenerRutaInicio(rol: string | null | undefined) {
  return rol === 'admin' ? '/admin' : '/inicio'
}

export function tieneAccesoSocia(rol: string | null | undefined) {
  return rol === 'afiliada' || rol === 'afiliada_lanzamiento' || rol === 'admin'
}
