'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import NavigationIcon from './NavigationIcon'
import { ADMIN_SECTIONS } from '@/lib/admin-sections'

export default function AdminSectionMenu() {
  const pathname = usePathname()
  const router = useRouter()
  const actual = ADMIN_SECTIONS.find(s => s.href === pathname || (s.href !== '/admin' && pathname.startsWith(`${s.href}/`)))?.href ?? '/admin'
  return <nav aria-label="Secciones del panel de Flor" className="sd-admin-section-menu border-b border-[#e7ddd5] px-5 py-3 sm:px-8">
    <label className="flex items-center gap-3 text-xs font-medium text-[#294A38] sm:hidden">Sección
      <select aria-label="Sección del panel de Flor" value={actual} onChange={e => router.push(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-[#e7ddd5] bg-white px-3 py-2 text-base text-[#211c19]">
        {ADMIN_SECTIONS.map(s => <option key={s.href} value={s.href}>{s.label}</option>)}
      </select>
    </label>
    <div className="mx-auto hidden max-w-6xl gap-2 overflow-x-auto sm:flex">
      {ADMIN_SECTIONS.map(item => <Link key={item.href} href={item.href} aria-current={actual === item.href ? 'page' : undefined} className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${actual === item.href ? 'bg-[#F4CAD8] text-[#211c19]' : 'text-[#746a64] hover:bg-[#F4EFEA]'}`}>
        <NavigationIcon name={item.icon} />{item.label}
      </Link>)}
    </div>
  </nav>
}
