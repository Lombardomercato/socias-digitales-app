'use client'

import NavigationIcon from './NavigationIcon'
import { nombreDia, type ResumenDia } from '@/lib/my-day'
import { resumirSemana } from '@/lib/my-day-week'

export interface WeeklyPlanSummaryProps {
  semana: ResumenDia[]
  fecha: string
  error?: boolean
  bloqueada?: boolean
  onElegir: (fecha: string) => void
}

export default function WeeklyPlanSummary({ semana, fecha, error = false, bloqueada = false, onElegir }: WeeklyPlanSummaryProps) {
  const resumen = resumirSemana(semana, fecha, error)
  const conocida = resumen.estado === 'listo'
  const periodo = resumen.desde && resumen.hasta ? `${Number(resumen.desde.slice(8))}/${Number(resumen.desde.slice(5, 7))} al ${Number(resumen.hasta.slice(8))}/${Number(resumen.hasta.slice(5, 7))}` : null
  return <section aria-label="Tu planificación semanal" className="min-w-0 rounded-[24px] border border-[#EC9BB6]/65 bg-[#FFFDFA] p-5 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#294A38]">Un paso a la vez</p><h2 className="mt-2 text-xl font-semibold">Tu semana</h2>{periodo && <p className="mt-1 text-xs text-[#746A64]">Del {periodo}</p>}</div><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4CAD8] text-[#294A38]"><NavigationIcon name="calendario" /></span></div>
    <dl className="mt-5 grid grid-cols-3 gap-2">{[
      { nombre: 'Planeadas', valor: resumen.total, fondo: 'bg-[#F4EFEA] border-[#E7DDD5]' },
      { nombre: 'Completadas', valor: resumen.completadas, fondo: 'bg-[#F4CAD8] border-[#EC9BB6]/60' },
      { nombre: 'Por hacer', valor: resumen.pendientes, fondo: 'bg-[#F4EFEA] border-[#E7DDD5]' },
    ].map(item => <div key={item.nombre} className={`min-w-0 rounded-2xl border px-2 py-3 ${item.fondo}`}><dt className="break-words text-[10px] leading-4 text-[#655B56]">{item.nombre}</dt><dd className="mt-1 break-words font-impact text-2xl font-semibold tabular-nums text-[#294A38]">{item.valor === null ? '—' : item.valor.toLocaleString('es-AR')}</dd></div>)}</dl>
    {!conocida ? <p role="alert" className="mt-4 text-xs leading-5 text-[#746A64]">No pudimos confirmar tu semana. No la contamos como cero; podés elegir un día para volver a consultar.</p> : resumen.total === 0 ? <p className="mt-4 text-sm leading-6 text-[#746A64]">Tu semana tiene espacio para lo que viene. Elegí un día y sumá tu primer paso.</p> : <p className="mt-4 text-xs leading-5 text-[#746A64]">Tenés acciones en {resumen.diasConTareas} {resumen.diasConTareas === 1 ? 'día' : 'días'} de esta semana. Las tareas archivadas no se incluyen.</p>}
    {resumen.dias.length > 0 && <div role="group" aria-label="Elegir un día de la semana" className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(44px,1fr))] gap-2">{resumen.dias.map(dia => {
      const elegida = dia.fecha === fecha
      const detalle = dia.total === null || dia.pendientes === null ? 'Avance no disponible' : dia.total === 0 ? 'Sin tareas' : `${dia.pendientes} por hacer, ${dia.completadas} completadas de ${dia.total}`
      return <button key={dia.fecha} type="button" disabled={bloqueada} aria-current={elegida ? 'date' : undefined} aria-label={`${nombreDia(dia.fecha)}: ${detalle}`} onClick={() => { if (!bloqueada) onElegir(dia.fecha) }} className={`flex min-h-11 min-w-[44px] flex-col items-center justify-center rounded-2xl border px-1 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294A38] disabled:cursor-not-allowed disabled:opacity-50 ${elegida ? 'border-[#EC9BB6] bg-[#F4CAD8] text-[#211C19]' : 'border-[#E7DDD5] bg-[#FAF7F3] text-[#294A38]'}`}>
        <span className="text-[10px] capitalize">{nombreDia(dia.fecha, true).split(/[ ,]/)[0]}</span><time dateTime={dia.fecha} className="mt-1 font-impact text-lg font-semibold tabular-nums">{Number(dia.fecha.slice(8))}</time><span className="mt-1 text-[10px] leading-4">{dia.pendientes === null ? '—' : dia.total === 0 ? 'Libre' : `${dia.pendientes} pend.`}</span>
      </button>
    })}</div>}
    <p className="mt-4 text-[11px] leading-5 text-[#746A64]">{bloqueada ? 'Terminá o cancelá la acción actual antes de cambiar de día.' : 'Elegí un día para ver, agregar o reprogramar tus tareas en Mi día.'}</p>
  </section>
}
