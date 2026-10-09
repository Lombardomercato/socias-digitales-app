import Link from 'next/link'
import NavigationIcon from './NavigationIcon'
import { MODULOS_SOCIAS } from '@/lib/modules'

export default function LockedModules() {
  return <section className="mt-8" aria-labelledby="modulos-socias">
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="modulos-socias" className="text-xl font-semibold">Tu espacio Socias Digitales</h2>
      <span className="text-xs text-[#746a64]">Próximamente</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {MODULOS_SOCIAS.map(modulo => <Link key={modulo.id} href={modulo.href} aria-label={`${modulo.nombre}: bloqueado`} className="flex min-h-40 flex-col rounded-[20px] border border-[#e7ddd5] bg-[#FAF7F3] p-5 transition hover:border-[#EC9BB6]">
        <div className="flex items-center justify-between text-[#294A38]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4CAD8]/60"><NavigationIcon name={modulo.icon} /></span>
          <span className="text-[#746a64]"><NavigationIcon name="bloqueo" /></span>
        </div>
        <h3 className="mt-4 text-sm font-semibold">{modulo.nombre}</h3>
        <p className="mt-1 text-xs text-[#746a64]">{modulo.descripcion}</p>
        <p className="mt-4 text-[11px] font-medium text-[#294A38]">Se habilita con Socias Digitales</p>
      </Link>)}
    </div>
  </section>
}
