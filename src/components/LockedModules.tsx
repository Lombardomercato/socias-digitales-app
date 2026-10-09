import Link from 'next/link'
import NavigationIcon from './NavigationIcon'
import { MODULOS_SOCIAS } from '@/lib/modules'

export default function LockedModules({venta=false}: {venta?:boolean}) {
  return <section id="plan-socias" className="mt-9 scroll-mt-6" aria-labelledby="modulos-socias">
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="modulos-socias" className="text-xl font-semibold">Tu espacio Socias Digitales</h2>
      <span className="rounded-full bg-[#F4CAD8] px-3 py-2 text-xs text-[#294A38]">Con el plan Socias</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {MODULOS_SOCIAS.map(modulo => <Link key={modulo.id} href={modulo.href} aria-label={`${modulo.nombre}: bloqueado`} className="flex min-h-40 flex-col rounded-[20px] border border-[#e7ddd5] bg-[#FAF7F3] p-5 transition hover:border-[#EC9BB6]">
        <div className="flex items-center justify-between text-[#294A38]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4CAD8]/60"><NavigationIcon name={modulo.icon} /></span>
          <span className="text-[#746a64]"><NavigationIcon name="bloqueo" /></span>
        </div>
        <h3 className="mt-4 text-sm font-semibold">{modulo.nombre}</h3>
        <p className="mt-1 text-xs text-[#746a64]">{modulo.descripcion}</p>
        <p className="mt-4 text-[11px] font-medium text-[#294A38]">Acceso con Socias Digitales</p>
      </Link>)}
    </div>
    <p className="mt-3 text-xs leading-5 text-[#746a64]">Flor habilita cada módulo según tu acceso y su disponibilidad.</p>
    {venta && <div className="mt-6 flex flex-col gap-5 rounded-[24px] border border-[#EC9BB6]/50 bg-[#F4CAD8] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div><h3 className="text-2xl font-semibold tracking-tight">¿Seguimos juntas?</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[#655B56]">Más clases y un espacio para acompañar tu camino digital.</p></div>
      <div className="shrink-0"><button type="button" disabled aria-describedby="inscripcion-socias-pendiente" className="inline-flex items-center gap-3 rounded-full bg-[#294A38] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed">Quiero ser Socia</button><p id="inscripcion-socias-pendiente" className="mt-2 text-center text-[11px] text-[#655B56]">Enlace de inscripción por confirmar.</p></div>
    </div>}
  </section>
}
