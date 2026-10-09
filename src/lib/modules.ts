// Una sola lista para las tarjetas, los bloqueos y las próximas habilitaciones.
export const MODULOS_SOCIAS = [
  { id: 'productos', nombre: 'Productos', descripcion: 'Tu catálogo y enlaces de venta', href: '/productos', icon: 'productos' },
  { id: 'resultados', nombre: 'Mis resultados', descripcion: 'Ventas y comisiones', href: '/resultados', icon: 'resultados' },
  { id: 'objetivos', nombre: 'Mis objetivos', descripcion: 'Tus metas y próximos pasos', href: '/objetivos', icon: 'objetivos' },
  { id: 'metricas', nombre: 'Mis métricas', descripcion: 'La evolución de tu negocio', href: '/metricas', icon: 'resultados' },
  { id: 'checklist', nombre: 'Mi día', descripcion: 'Tareas y hábitos', href: '/checklist', icon: 'checklist' },
  { id: 'comunidad', nombre: 'Comunidad', descripcion: 'Logros y conversaciones', href: '/comunidad', icon: 'comunidad' },
  { id: 'logros', nombre: 'Mis logros', descripcion: 'Reconocimientos y avances', href: '/logros', icon: 'logros' },
  { id: 'ranking', nombre: 'Ranking', descripcion: 'Resultados de la comunidad', href: '/ranking', icon: 'logros' },
] as const

export type ModuloSociaId = typeof MODULOS_SOCIAS[number]['id']
