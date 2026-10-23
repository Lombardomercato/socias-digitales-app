import Link from 'next/link'
import ArrowIcon from './ArrowIcon'
import NavigationIcon from './NavigationIcon'
import { tiempoClase } from '@/lib/class-progress'
import type { ProgramaCampus, ResumenCampus } from '@/lib/learning-campus'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38]'
const action = `inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203a2c] ${focus}`
const classLink = (id: string) => `/classroom?clase=${encodeURIComponent(id)}`

function Programa({ programa, indice }: { programa: ProgramaCampus; indice: number }) {
  const conocido = programa.completadas !== null
  const porcentaje = conocido && programa.total > 0 ? Math.round(programa.completadas! / programa.total * 100) : null
  const recorridoCompleto = programa.bloqueadas === 0 && programa.sinVideo === 0
  return <article className="flex min-w-0 flex-col rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-5 sm:p-6">
    <div className="flex items-center justify-between gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F4CAD8] text-xs font-semibold text-[#294A38]">{String(indice + 1).padStart(2, '0')}</span>
      <span className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${programa.completo ? 'bg-[#E7EDE5] text-[#294A38]' : 'bg-[#F4EFEA] text-[#746a64]'}`}>{programa.completo ? 'Al día' : programa.enCurso ? 'En curso' : 'Tu recorrido'}</span>
    </div>
    <h4 className="mt-5 break-words text-lg font-semibold leading-snug tracking-tight">{programa.nombre}</h4>
    <p className="mt-2 text-xs leading-5 text-[#746a64]">{programa.total} {programa.total === 1 ? 'clase disponible' : 'clases disponibles'}</p>
    {conocido && programa.total > 0 ? <div className="mt-5">
      <div className="flex flex-wrap justify-between gap-2 text-xs"><span>{programa.completadas} de {programa.total} {recorridoCompleto ? 'completadas' : 'disponibles completadas'}</span>{recorridoCompleto && <span className="font-semibold text-[#294A38]">{porcentaje}%</span>}</div>
      <div role="progressbar" aria-label={`Avance en ${programa.nombre}`} aria-valuemin={0} aria-valuemax={programa.total} aria-valuenow={programa.completadas!} className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#E7DDD5]"><div className="h-full rounded-full bg-[#294A38]" style={{ width: `${porcentaje}%` }} /></div>
    </div> : !conocido ? <p className="mt-5 text-xs text-[#746a64]">Avance no disponible en este momento.</p> : null}
    {programa.bloqueadas > 0 && <p className="mt-3 text-xs leading-5 text-[#746a64]">{programa.bloqueadas} {programa.bloqueadas === 1 ? 'clase requiere' : 'clases requieren'} otro acceso.</p>}
    {programa.sinVideo > 0 && <p className="mt-3 text-xs leading-5 text-[#746a64]">Hay contenido que todavía se está preparando.</p>}
    <Link href={programa.proxima ? classLink(programa.proxima.id) : '/classroom'} className={`mt-auto flex min-h-11 items-center justify-between gap-3 pt-6 text-sm font-semibold text-[#294A38] ${focus}`} aria-label={`${programa.proxima ? programa.proxima.motivo === 'continuar' ? 'Retomar' : 'Empezar' : 'Ver en la biblioteca'}: ${programa.nombre}`}>
      {programa.proxima ? programa.proxima.motivo === 'continuar' ? 'Retomar programa' : 'Empezar programa' : 'Ver en la biblioteca'}<ArrowIcon />
    </Link>
  </article>
}

export function HomeCampusLoading() {
  return <section role="status" aria-live="polite" className="mt-7 rounded-[26px] border border-[#E7DDD5] bg-[#FFFDFA] p-6 sm:p-8"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Tu campus</p><p className="mt-4 font-serif text-2xl">Reuniendo tu formación…</p><p className="mt-2 text-sm leading-6 text-[#746a64]">Estamos buscando tus programas y el punto donde quedaste.</p></section>
}

export default function HomeCampus({ resumen }: { resumen: ResumenCampus }) {
  const { proxima, total, completadas, enCurso, programas } = resumen
  const conocido = completadas !== null
  const alDia = conocido && total !== null && total > 0 && completadas === total && resumen.bloqueadas === 0 && resumen.sinVideo === 0
  return <section className="mt-7" aria-labelledby="campus-titulo">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#294A38]">Tu campus · Socias Digitales</p><h2 id="campus-titulo" className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Un paso más cerca de tu próxima versión.</h2></div>
      <Link href="/classroom" className={`inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#294A38] ${focus}`}>Toda mi formación <ArrowIcon diagonal /></Link>
    </div>
    {resumen.estado === 'error' && <div role="alert" className="mb-4 rounded-2xl border border-[#EC9BB6] bg-[#FFFDFA] p-5"><p className="text-sm font-semibold">No pudimos reunir {total === null ? 'tu formación' : 'tus avances'}.</p><p className="mt-1 text-sm leading-6 text-[#746a64]">Tus datos no se modificaron. Podés abrir la biblioteca o volver a intentar.</p><a href="/inicio" className={`mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#294A38] ${focus}`}>Reintentar <ArrowIcon /></a></div>}
    <div className="grid gap-4 xl:grid-cols-[1.5fr_0.85fr]">
      <article className="relative flex min-w-0 flex-col items-start rounded-[26px] border border-[#EC9BB6] bg-[#F4CAD8] p-6 sm:p-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#EC9BB6] bg-[#FFFDFA] px-3 py-2 text-[11px] font-semibold text-[#294A38]"><NavigationIcon name="clases" />{proxima?.motivo === 'continuar' ? 'Donde lo dejaste' : 'Tu próximo paso'}</span>
        <h3 className="mt-5 break-words font-serif text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{proxima?.titulo ?? (alDia ? '¡Mirá todo lo que avanzaste!' : total === 0 ? 'Tu recorrido está por empezar.' : 'Tu formación te espera.')}</h3>
        {proxima ? <><p className="mt-3 text-sm font-medium text-[#294A38]">{proxima.programa} <span aria-hidden="true">·</span> {proxima.seccion}</p><p className="mt-3 text-sm leading-6 text-[#574D47]">{proxima.motivo === 'continuar' ? `Retomá desde ${tiempoClase(proxima.posicionSeg ?? 0)} y seguí a tu ritmo.` : 'Un nuevo paso para convertir lo que aprendés en acción.'}</p></> : <p className="mt-3 max-w-xl text-sm leading-6 text-[#574D47]">{alDia ? 'Estás al día con las clases disponibles. Podés volver a tus favoritas y poner en práctica lo aprendido.' : total === 0 ? 'Todavía no hay clases disponibles para reproducir. Cuando se publiquen, vas a encontrarlas acá.' : 'Tus programas y materiales siguen en la biblioteca, listos para vos.'}</p>}
        <Link href={proxima ? classLink(proxima.id) : '/classroom'} className={`mt-7 ${action}`}>{proxima ? proxima.motivo === 'continuar' ? 'Retomar mi clase' : 'Empezar mi clase' : 'Abrir mi biblioteca'}<ArrowIcon /></Link>
      </article>
      <article className="flex min-w-0 flex-col justify-between rounded-[26px] border border-[#294A38] bg-[#294A38] p-6 text-white sm:p-7">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F4CAD8]">Cada paso cuenta</p><h3 className="mt-4 font-serif text-3xl font-semibold text-[#FAF7F3]">Tu constancia<br />se construye acá.</h3></div>
        <dl className="mt-7 grid grid-cols-2 gap-x-5 gap-y-6">
          <div><dt className="text-xs text-[#FAF7F3]/80">Clases disponibles</dt><dd className="mt-1 font-serif text-4xl font-semibold text-[#FAF7F3]">{total ?? '—'}</dd></div>
          <div><dt className="text-xs text-[#FAF7F3]/80">Completadas</dt><dd className="mt-1 font-serif text-4xl font-semibold text-[#F4CAD8]">{completadas ?? '—'}</dd></div>
          <div><dt className="text-xs text-[#FAF7F3]/80">En curso</dt><dd className="mt-1 text-xl font-semibold">{enCurso ?? '—'}</dd></div>
          <div><dt className="text-xs text-[#FAF7F3]/80">Programas</dt><dd className="mt-1 text-xl font-semibold">{total === null ? '—' : programas.length}</dd></div>
        </dl>
        <p className="mt-6 text-[11px] leading-5 text-[#FAF7F3]/80">El avance refleja las clases que marcás como completadas. Tu ritmo, sin compararte con nadie.</p>
      </article>
    </div>
    {programas.length > 0 && <div className="mt-7"><div className="mb-4"><h3 className="text-lg font-semibold">Mis programas</h3><p className="mt-1 text-sm leading-6 text-[#746a64]">Clases y material de apoyo, en el mismo recorrido.</p></div><div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{programas.map((programa, indice) => <Programa key={programa.nombre} programa={programa} indice={indice} />)}</div></div>}
  </section>
}
