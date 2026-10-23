import Link from 'next/link'
import ArrowIcon from './ArrowIcon'
import NavigationIcon from './NavigationIcon'
import { UnreadNoticeLink } from './UnreadNotices'
import { tiempoClase } from '@/lib/class-progress'
import { nombreDia } from '@/lib/my-day'
import type { ProgramaCampus, ResumenCampus } from '@/lib/learning-campus'
import type { ResumenMiDiaInicio } from '@/lib/home-operations'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38]'
const action = `inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203a2c] ${focus}`
const classLink = (id: string) => `/classroom?clase=${encodeURIComponent(id)}`

function Programa({ programa }: { programa: ProgramaCampus }) {
  const conocido = programa.completadas !== null
  const porcentaje = conocido && programa.total > 0 ? Math.round(programa.completadas! / programa.total * 100) : null
  const recorridoCompleto = programa.bloqueadas === 0 && programa.sinVideo === 0
  return <article className="flex min-w-0 flex-col rounded-[20px] border border-[#E7DDD5] bg-[#FFFDFA] p-5">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h4 className="min-w-0 break-words text-sm font-semibold">{programa.nombre}</h4>
      <span className="rounded-full bg-[#F4EFEA] px-2.5 py-1 text-[10px] font-medium text-[#294A38]">{programa.completo ? 'Al día' : programa.enCurso ? 'En curso' : conocido ? 'Por empezar' : 'Avance sin comprobar'}</span>
    </div>
    {conocido && programa.total > 0 ? <div className="mt-4">
      <div className="flex flex-wrap justify-between gap-2 text-xs text-[#746A64]"><span>{programa.completadas} de {programa.total} {recorridoCompleto ? 'completadas' : 'disponibles completadas'}</span>{recorridoCompleto && <span className="font-semibold text-[#294A38]">{porcentaje}%</span>}</div>
      <div role="progressbar" aria-label={`Avance en ${programa.nombre}`} aria-valuemin={0} aria-valuemax={programa.total} aria-valuenow={programa.completadas!} className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#E7DDD5]"><div className="h-full rounded-full bg-[#294A38]" style={{ width: `${porcentaje}%` }} /></div>
    </div> : <p className="mt-4 text-xs text-[#746A64]">{!conocido ? 'Avance no disponible en este momento.' : 'Sin clases disponibles para reproducir.'}</p>}
    {programa.bloqueadas > 0 && <p className="mt-2 text-xs leading-5 text-[#746A64]">{programa.bloqueadas} {programa.bloqueadas === 1 ? 'clase requiere' : 'clases requieren'} otro acceso.</p>}
    {programa.sinVideo > 0 && <p className="mt-2 text-xs leading-5 text-[#746A64]">Hay contenido que todavía se está preparando.</p>}
    <Link href={programa.proxima ? classLink(programa.proxima.id) : '/classroom'} className={`mt-auto flex min-h-11 items-center justify-between gap-3 pt-4 text-xs font-semibold text-[#294A38] ${focus}`} aria-label={`${programa.proxima ? programa.proxima.motivo === 'continuar' ? 'Retomar' : 'Empezar' : 'Ver en la biblioteca'}: ${programa.nombre}`}>
      {programa.proxima ? programa.proxima.motivo === 'continuar' ? 'Retomar programa' : 'Empezar programa' : 'Ver en la biblioteca'}<ArrowIcon />
    </Link>
  </article>
}

function MiDia({ resumen }: { resumen: Exclude<ResumenMiDiaInicio, { estado: 'no-habilitado' }> }) {
  return <article className="flex min-w-0 flex-col rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">Mi día</h3><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4CAD8] text-[#294A38]"><NavigationIcon name="checklist" /></span></div>
    {resumen.estado === 'listo' ? <>
      <p className="mt-1 text-xs text-[#746A64]">{nombreDia(resumen.fecha)}</p>
      {resumen.total > 0 ? <>
        <p className="mt-5 text-sm"><strong className="text-3xl font-semibold tabular-nums text-[#294A38]">{resumen.completadas}<span className="mx-1 text-lg font-normal text-[#746A64]">/ {resumen.total}</span></strong><span className="mt-1 block text-xs text-[#746A64]">tareas completadas hoy</span></p>
        {resumen.pendientes > 0 ? <><p className="mt-4 text-xs font-semibold text-[#294A38]">{resumen.pendientes} {resumen.pendientes === 1 ? 'pendiente' : 'pendientes'}</p><ul className="mt-2 space-y-2">{resumen.proximas.slice(0, 2).map(tarea => <li key={tarea.id} className="flex items-start gap-2 text-xs leading-5 text-[#574D47]"><span aria-hidden="true" className="mt-1 h-3.5 w-3.5 shrink-0 rounded border border-[#D5C6BC]" /><span className="line-clamp-2 min-w-0 break-words">{tarea.texto}</span></li>)}</ul></> : <p className="mt-4 text-sm text-[#294A38]">Todo lo de hoy, completado.</p>}
      </> : <div className="my-5"><p className="text-base font-medium">Sin tareas para hoy.</p><p className="mt-2 text-sm leading-6 text-[#746A64]">Podés organizar tu día o reservar un momento para estudiar.</p></div>}
    </> : <p role="alert" className="my-5 text-sm leading-6 text-[#746A64]">No pudimos cargar tus tareas. Abrí Mi día para volver a intentar.</p>}
    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 pt-4">
      <Link href="/checklist" className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#294A38] ${focus}`}>Organizar mi día <ArrowIcon /></Link>
      <Link href="/checklist#plan-de-estudio" className={`inline-flex min-h-11 items-center text-xs text-[#746A64] underline underline-offset-4 ${focus}`}>Plan de estudio</Link>
    </div>
  </article>
}

export function HomeCampusLoading() {
  return <section role="status" aria-live="polite" className="mt-6 rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-6"><p className="text-sm font-semibold">Preparando tu resumen…</p><p className="mt-2 text-sm text-[#746A64]">Buscando tus clases y actividad.</p></section>
}

export default function HomeCampus({ resumen, miDia = { estado: 'no-habilitado' } }: { resumen: ResumenCampus; miDia?: ResumenMiDiaInicio }) {
  const { proxima, total, completadas, enCurso, programas } = resumen
  const alDia = completadas !== null && total !== null && total > 0 && completadas === total && resumen.bloqueadas === 0 && resumen.sinVideo === 0
  return <section className="mt-6" aria-labelledby="campus-titulo">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4">
      <h2 id="campus-titulo" className="text-lg font-semibold">Tu resumen</h2>
      <Link href="/classroom" className={`inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#294A38] ${focus}`}>Ver todas las clases <ArrowIcon diagonal /></Link>
    </div>
    <dl className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {[['Clases disponibles', total], ['Completadas', completadas], ['En curso', enCurso], ['Programas', total === null ? null : programas.length]].map(([etiqueta, numero]) => <div key={String(etiqueta)} className="min-w-0 rounded-[18px] border border-[#E7DDD5] bg-[#FFFDFA] px-4 py-3"><dt className="text-[11px] text-[#746A64]">{etiqueta}</dt><dd className="mt-1 text-2xl font-semibold tabular-nums text-[#294A38]">{numero ?? '—'}</dd></div>)}
    </dl>
    {resumen.estado === 'error' && <div role="alert" className="mb-4 rounded-2xl border border-[#EC9BB6] bg-[#FFFDFA] p-4"><p className="text-sm font-semibold">No pudimos reunir {total === null ? 'tu formación' : 'tus avances'}.</p><p className="mt-1 text-xs leading-5 text-[#746A64]">Tus datos no se modificaron. Podés abrir la biblioteca o volver a intentar.</p><a href="/inicio" className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#294A38] ${focus}`}>Reintentar <ArrowIcon /></a></div>}
    <div className={`grid gap-4 ${miDia.estado !== 'no-habilitado' ? 'xl:grid-cols-[1.15fr_1fr]' : ''}`}>
      <article className="flex min-w-0 flex-col items-start rounded-[24px] border border-[#EC9BB6] bg-[#F4CAD8] p-5 sm:p-6">
        <div className="flex w-full items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#294A38]">{proxima?.motivo === 'continuar' ? 'Tu clase en curso' : 'Tu formación'}</p><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#FFFDFA] text-[#294A38]"><NavigationIcon name="clases" /></span></div>
        <h3 className="mt-4 break-words text-2xl font-semibold leading-snug tracking-tight">{proxima?.titulo ?? (alDia ? 'Tus clases están al día.' : total === 0 ? 'Todavía no hay clases disponibles.' : 'Tu biblioteca de clases.')}</h3>
        {proxima ? <><p className="mt-2 text-xs font-medium text-[#574D47]">{proxima.programa} <span aria-hidden="true">·</span> {proxima.seccion}</p><p className="mb-5 mt-3 text-sm leading-6 text-[#574D47]">{proxima.motivo === 'continuar' ? `Retomá desde ${tiempoClase(proxima.posicionSeg ?? 0)}.` : 'La próxima clase de tu recorrido está lista.'}</p></> : <p className="mb-5 mt-3 text-sm leading-6 text-[#574D47]">{alDia ? 'Estás al día con las clases disponibles. Podés volver a verlas en tu biblioteca.' : total === 0 ? 'Cuando se publiquen, vas a encontrarlas acá.' : 'Abrí la biblioteca para consultar tus programas y materiales.'}</p>}
        <Link href={proxima ? classLink(proxima.id) : '/classroom'} className={`mt-auto ${action}`}>{proxima ? proxima.motivo === 'continuar' ? 'Retomar mi clase' : 'Empezar mi clase' : 'Abrir mi biblioteca'}<ArrowIcon /></Link>
      </article>
      {miDia.estado !== 'no-habilitado' && <MiDia resumen={miDia} />}
    </div>
    <UnreadNoticeLink variante="resumen" />
    {programas.length > 0 && <div className="mt-5"><h3 className="mb-3 text-sm font-semibold">Mis programas</h3><div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{programas.map(programa => <Programa key={programa.nombre} programa={programa} />)}</div><p className="mt-2 text-[10px] leading-5 text-[#746A64]">El avance refleja las clases que marcás como completadas.</p></div>}
  </section>
}
