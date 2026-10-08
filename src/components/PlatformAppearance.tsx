'use client'

import { usePathname } from 'next/navigation'

const PLATFORM_PATHS = [
  '/inicio', '/perfil', '/classroom', '/clases', '/lanzamiento', '/comunidad',
  '/resultados', '/productos', '/objetivos', '/checklist', '/ranking', '/logros',
  '/metricas', '/admin',
]

export default function PlatformAppearance({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const isPlatform = PLATFORM_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`))

  if (!isPlatform) return children

  const area = pathname.startsWith('/admin') ? 'platform-design--admin' : 'platform-design--member'
  return <div className={`platform-design ${area}`}>{children}</div>
}
