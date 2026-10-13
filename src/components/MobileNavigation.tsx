'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavigationIcon from './NavigationIcon'

export const MOBILE_SECTIONS = [
  { href: '/inicio', nombre: 'Inicio', icono: 'inicio', rutas: ['/inicio'] },
  { href: '/clases', nombre: 'Clases', icono: 'clases', rutas: ['/clases', '/classroom'] },
  { href: '/checklist', nombre: 'Mi día', icono: 'checklist', rutas: ['/checklist'] },
  { href: '/notificaciones', nombre: 'Avisos', icono: 'notificaciones', rutas: ['/notificaciones'] },
  { href: '/perfil', nombre: 'Perfil', icono: 'perfil', rutas: ['/perfil', '/cuenta'] },
] as const

export default function MobileNavigation() {
  const pathname = usePathname() ?? ''
  return <nav className="sd-mobile-navigation" aria-label="Navegación móvil">
    {MOBILE_SECTIONS.map(s => {
      const activo = s.rutas.some(r => pathname === r || pathname.startsWith(`${r}/`))
      return <Link key={s.href} href={s.href} prefetch={false} aria-current={activo ? 'page' : undefined} className={`sd-mobile-navigation__item ${activo ? 'sd-mobile-navigation__item--active' : ''}`}>
        <span className="sd-mobile-navigation__icon"><NavigationIcon name={s.icono} /></span>
        <span>{s.nombre}</span>
      </Link>
    })}
  </nav>
}
