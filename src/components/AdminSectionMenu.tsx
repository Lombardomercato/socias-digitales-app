'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import NavigationIcon from './NavigationIcon'

const items = [
  { href: '/admin', label: 'Vista general', icon: 'inicio' },
  { href: '/admin/desafio', label: 'Solicitudes', icon: 'solicitudes' },
  { href: '/admin/classroom', label: 'Clases', icon: 'clases' },
  { href: '/admin/lanzamiento', label: 'Avances', icon: 'lanzamiento' },
  { href: '/admin/productos', label: 'Productos', icon: 'productos' },
  { href: '/admin/comunidad', label: 'Comunidad', icon: 'comunidad' },
  { href: '/admin/resultados', label: 'Resultados', icon: 'resultados' },
  { href: '/admin/notificaciones', label: 'Notificaciones', icon: 'notificaciones' },
  { href: '/admin/configuracion', label: 'Configuración', icon: 'configuracion' },
] as const

export default function AdminSectionMenu() {
  const pathname = usePathname()
  return <nav aria-label="Secciones del panel de Flor" className="border-b border-[#e7ddd5] px-5 py-3 sm:px-8">
    <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto">
      {items.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${pathname === item.href ? 'bg-[#F4CAD8] text-[#211c19]' : 'text-[#746a64] hover:bg-[#F4EFEA]'}`}>
        <NavigationIcon name={item.icon} />{item.label}
      </Link>)}
    </div>
  </nav>
}
