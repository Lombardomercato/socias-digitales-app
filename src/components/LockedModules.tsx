import Link from 'next/link'
import ArrowIcon from './ArrowIcon'
import NavigationIcon from './NavigationIcon'
import { MODULOS_SOCIAS } from '@/lib/modules'

type PermisoComprobable = 'resultados' | 'metricas' | 'checklist'
type Modulo = typeof MODULOS_SOCIAS[number]
type Props = {
  venta?: boolean
  compacto?: boolean
  resultadosHabilitados?: boolean
  metricasHabilitadas?: boolean
  miDiaHabilitado?: boolean
  logrosHabilitados?: boolean
  erroresPermiso?: PermisoComprobable[]
}

function TarjetaModulo({ modulo, abierto, error, compacta=false }: { modulo: Modulo; abierto: boolean; error: boolean; compacta?: boolean }) {
  const accion = error ? 'No pudimos comprobar tu acceso' : abierto ? modulo.id === 'checklist' ? 'Abrir mi día' : modulo.id === 'metricas' ? 'Abrir mis métricas' : modulo.id === 'logros' ? 'Ver mis logros' : 'Abrir mis resultados' : 'Acceso con Socias Digitales'
  const etiqueta = error ? 'acceso sin comprobar' : abierto ? 'habilitado' : 'bloqueado'
  if (compacta) return <Link href={modulo.href} aria-label={`${modulo.nombre}: ${etiqueta}`} className="flex min-h-28 min-w-0 items-center gap-3 rounded-[20px] border border-[#E7DDD5] bg-[#FFFDFA] p-4 transition hover:border-[#EC9BB6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38]">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4CAD8] text-[#294A38]"><NavigationIcon name={modulo.icon} /></span>
    <div className="min-w-0 flex-1"><h3 className="break-words text-sm font-semibold">{modulo.nombre}</h3><p className="mt-1 text-xs leading-5 text-[#746A64]">{modulo.descripcion}</p><p className="mt-2 text-xs font-medium text-[#294A38]">{accion}</p></div>
    <span className="shrink-0 text-[#294A38]"><ArrowIcon /></span>
  </Link>
  return <Link href={modulo.href} aria-label={`${modulo.nombre}: ${etiqueta}`} className="flex min-h-40 min-w-0 flex-col rounded-[20px] border border-[#e7ddd5] bg-[#FAF7F3] p-5 transition hover:border-[#EC9BB6] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38]">
    <div className="flex items-center justify-between text-[#294A38]">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4CAD8]/60"><NavigationIcon name={modulo.icon} /></span>
      <span className="text-[#746a64]"><NavigationIcon name={abierto ? 'resultados' : 'bloqueo'} /></span>
    </div>
    <h3 className="mt-4 break-words text-sm font-semibold">{modulo.nombre}</h3>
    <p className="mt-1 text-xs text-[#746a64]">{modulo.descripcion}</p>
    <p className="mt-4 text-[11px] font-medium text-[#294A38]">{accion}</p>
  </Link>
}

export default function LockedModules({venta=false, compacto=false, resultadosHabilitados=false, metricasHabilitadas=false, miDiaHabilitado=false, logrosHabilitados=false, erroresPermiso=[]}: Props) {
  const errorPermiso=(id:string)=>erroresPermiso.some(modulo => modulo === id)
  const abierto=(id:string)=>!errorPermiso(id) && ((id === 'resultados' && resultadosHabilitados)||(id === 'metricas' && metricasHabilitadas)||(id==='checklist' && miDiaHabilitado)||(id==='logros' && logrosHabilitados))
  // El recorrido gratuito conserva su presentación comercial, incluso si un
  // consumidor solicita por error la variante compacta.
  const modoCompacto=compacto && !venta
  const activos=MODULOS_SOCIAS.filter(modulo => abierto(modulo.id))
  const restringidos=MODULOS_SOCIAS.filter(modulo => !abierto(modulo.id))
  return <section id="plan-socias" className="mt-9 scroll-mt-6" aria-labelledby="modulos-socias">
    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
      <h2 id="modulos-socias" className="text-xl font-semibold">{modoCompacto ? 'Mis herramientas' : 'Tu espacio Socias Digitales'}</h2>
      {!modoCompacto && <span className="rounded-full bg-[#F4CAD8] px-3 py-2 text-xs text-[#294A38]">Con el plan Socias</span>}
    </div>
    {modoCompacto ? <>
      {activos.length > 0 && <div className="grid gap-3 sm:grid-cols-2">{activos.map(modulo => <TarjetaModulo key={modulo.id} modulo={modulo} abierto error={false} compacta />)}</div>}
      {restringidos.length > 0 && <details className="group mt-4 rounded-[20px] border border-[#E7DDD5] bg-[#FFFDFA] p-4">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-[#294A38] focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38] [&::-webkit-details-marker]:hidden"><span>Otros espacios del plan Socias</span><span className="shrink-0"><ArrowIcon className="rotate-90 transition group-open:-rotate-90" /></span></summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{restringidos.map(modulo => <TarjetaModulo key={modulo.id} modulo={modulo} abierto={false} error={errorPermiso(modulo.id)} />)}</div>
      </details>}
    </> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{MODULOS_SOCIAS.map(modulo => <TarjetaModulo key={modulo.id} modulo={modulo} abierto={abierto(modulo.id)} error={errorPermiso(modulo.id)} />)}</div>}
    <p className="mt-3 text-xs leading-5 text-[#746a64]">Flor habilita cada módulo según tu acceso y su disponibilidad.</p>
    {venta && <div className="mt-6 flex flex-col gap-5 rounded-[24px] border border-[#EC9BB6]/50 bg-[#F4CAD8] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
      <div><h3 className="text-2xl font-semibold tracking-tight">¿Seguimos juntas?</h3><p className="mt-2 max-w-xl text-sm leading-6 text-[#655B56]">Más clases y un espacio para acompañar tu camino digital.</p></div>
      <div className="shrink-0"><button type="button" disabled aria-describedby="inscripcion-socias-pendiente" className="inline-flex items-center gap-3 rounded-full bg-[#294A38] px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed">Quiero ser Socia</button><p id="inscripcion-socias-pendiente" className="mt-2 text-center text-[11px] text-[#655B56]">Enlace de inscripción por confirmar.</p></div>
    </div>}
  </section>
}
