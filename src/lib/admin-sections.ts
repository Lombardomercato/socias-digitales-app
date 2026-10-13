// Misma navegación en Inicio y en cada sección; no se pierden módulos en móvil.
export const ADMIN_SECTIONS = [
  { href: '/admin', label: 'Vista general', icon: 'inicio' },
  { href: '/admin/desafio', label: 'Solicitudes', icon: 'solicitudes' },
  { href: '/admin/encuesta', label: 'Encuesta', icon: 'encuesta' },
  { href: '/admin/invitar', label: 'Invitaciones', icon: 'invitaciones' },
  { href: '/admin/classroom', label: 'Clases', icon: 'clases' },
  { href: '/admin/lanzamiento', label: 'Avances', icon: 'lanzamiento' },
  { href: '/admin/productos', label: 'Productos', icon: 'productos' },
  { href: '/admin/comunidad', label: 'Comunidad', icon: 'comunidad' },
  { href: '/admin/resultados', label: 'Resultados', icon: 'resultados' },
  { href: '/admin/metricas', label: 'Métricas', icon: 'resultados' },
  { href: '/admin/checklist', label: 'Mi día', icon: 'checklist' },
  { href: '/admin/notificaciones', label: 'Notificaciones', icon: 'notificaciones' },
  { href: '/admin/configuracion', label: 'Configuración', icon: 'configuracion' },
] as const
