'use client'

import Link from 'next/link'
import { useState } from 'react'
import ArrowIcon from '@/components/ArrowIcon'
import NavigationIcon from '@/components/NavigationIcon'
import { fechasMesCalendario, nombreMesCalendario, type CalendarioPersonal } from '@/lib/home-calendar'
import { nombreDia } from '@/lib/my-day'

const control = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#E7DDD5] bg-[#FFFDFA] px-4 py-2 text-sm font-medium text-[#294A38] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#294A38]'
const hrefMes = (mes: string) => `/inicio?mes=${mes}#mi-calendario`
const diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export default function HomeCalendar({ datos }: { datos: CalendarioPersonal }) {
  const [seleccionada, setSeleccionada] = useState(() => datos.estado === 'listo' ? datos.hoy.slice(0, 7) === datos.rango.mes ? datos.hoy : datos.rango.desde : null)
  if (datos.estado === 'error') return <section id="mi-calendario" aria-labelledby="titulo-calendario" className="mt-5 rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-5"><h2 id="titulo-calendario" className="text-xl font-semibold">Tu agenda</h2><p role="alert" className="mt-3 text-sm leading-6 text-[#746A64]">No pudimos comprobar el calendario. Tus tareas y encuentros no se modificaron.</p><Link href="/inicio#mi-calendario" prefetch={false} className={`${control} mt-4`}>Reintentar calendario</Link></section>

  const { rango, hoy, tareas, encuentros } = datos
  const fechas = fechasMesCalendario(rango)
  const vaciosInicio = (new Date(`${rango.desde}T12:00:00Z`).getUTCDay() + 6) % 7
  const seleccion = seleccionada && fechas.includes(seleccionada) ? seleccionada : rango.desde
  const dias = tareas.estado === 'lista' ? tareas.dias : []
  const hitos = encuentros.estado === 'lista' ? encuentros.encuentros : []
  const elegido = dias.find(dia => dia.fecha === seleccion)
  const hitosElegidos = hitos.filter(hito => hito.dia === seleccion)
  const proximas = dias.filter(dia => dia.fecha >= hoy && dia.pendientes > 0).slice(0, 2)
  const proximosEncuentros = hitos.filter(hito => hito.dia >= hoy).slice(0, 2)
  const sinMiDia = tareas.estado === 'no-habilitado'

  // Inicio deja 20px por lado. Recuperar 16px permite siete objetivos de 44px
  // a 320px sin comprimir los días ni esconder un desborde del documento.
  return <section id="mi-calendario" aria-labelledby="titulo-calendario" className="-mx-4 mt-5 min-w-0 scroll-mt-24 rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] py-5 sm:mx-0 sm:py-6">
    <header className="px-4 sm:px-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#294A38]">A tu ritmo</p><h2 id="titulo-calendario" className="mt-1 text-xl font-semibold">Tu agenda</h2></div>{tareas.estado === 'lista' && <Link href={`/checklist?fecha=${hoy}`} prefetch={false} className={control}><NavigationIcon name="calendario" />Mi día <ArrowIcon /></Link>}</div><p className="mt-2 text-xs leading-5 text-[#746A64]">{sinMiDia ? 'Tus encuentros publicados, en un solo lugar.' : 'Tus tareas y encuentros, a mano. Horarios de Argentina.'}</p></header>
    {rango.mesCorregido && <p role="status" className="mx-4 mt-3 rounded-xl border border-[#E7DDD5] bg-[#FAF7F3] px-3 py-2 text-xs leading-5 text-[#746A64] sm:mx-5">Abrimos el mes actual. Podés recorrer hasta seis meses hacia atrás o adelante.</p>}
    <div className="mt-4 min-w-0 items-start gap-5 md:grid md:grid-cols-[minmax(308px,360px)_minmax(0,1fr)] md:px-5">
      <div className="min-w-0 sm:mx-auto sm:max-w-[360px] md:mx-0 md:w-full">
        <div className="mb-2 flex items-center justify-between gap-2 px-3 md:px-0"><h3 id="mes-calendario" className="min-w-0 text-base font-semibold capitalize">{rango.etiqueta}</h3><nav aria-label="Cambiar mes del calendario" className="flex shrink-0 items-center gap-1">{rango.anterior ? <Link href={hrefMes(rango.anterior)} prefetch={false} aria-label={`Mes anterior: ${nombreMesCalendario(rango.anterior)}`} className={`${control} h-11 w-11 px-0`}><ArrowIcon className="rotate-180" /></Link> : <button type="button" disabled aria-label="Mes anterior, límite de seis meses" className={`${control} h-11 w-11 px-0 opacity-40`}><ArrowIcon className="rotate-180" /></button>}{rango.siguiente ? <Link href={hrefMes(rango.siguiente)} prefetch={false} aria-label={`Mes siguiente: ${nombreMesCalendario(rango.siguiente)}`} className={`${control} h-11 w-11 px-0`}><ArrowIcon /></Link> : <button type="button" disabled aria-label="Mes siguiente, límite de seis meses" className={`${control} h-11 w-11 px-0 opacity-40`}><ArrowIcon /></button>}</nav></div>
        <div className="grid grid-cols-[repeat(7,minmax(44px,1fr))] text-center" aria-hidden="true">{diasSemana.map(dia => <abbr key={dia} title={dia} className="py-2 text-[10px] font-semibold uppercase text-[#746A64] no-underline">{dia === 'Miércoles' ? 'X' : dia[0]}</abbr>)}</div>
        <div role="group" aria-labelledby="mes-calendario" className="grid grid-cols-[repeat(7,minmax(44px,1fr))] gap-y-0.5">
          {Array.from({ length: vaciosInicio }, (_, i) => <span key={`vacio-${i}`} aria-hidden="true" />)}
          {fechas.map(fecha => {
            const dia = dias.find(item => item.fecha === fecha)
            const totalEncuentros = hitos.filter(hito => hito.dia === fecha).length
            const detalle = dia ? `, ${dia.pendientes} ${dia.pendientes === 1 ? 'tarea pendiente' : 'tareas pendientes'} y ${dia.completadas} ${dia.completadas === 1 ? 'completada' : 'completadas'}` : tareas.estado === 'error' ? ', tareas sin comprobar' : ''
            return <button key={fecha} type="button" data-fecha-calendario={fecha} aria-label={`${nombreDia(fecha)}${detalle}${totalEncuentros ? `, ${totalEncuentros} ${totalEncuentros === 1 ? 'encuentro' : 'encuentros'}` : ''}`} aria-pressed={fecha === seleccion} aria-current={fecha === hoy ? 'date' : undefined} onClick={() => setSeleccionada(fecha)} className={`flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl py-1 text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-[#294A38] ${fecha === seleccion ? 'bg-[#F4CAD8] font-semibold text-[#211C19]' : 'text-[#211C19] hover:bg-[#FAF7F3]'} ${fecha === hoy ? 'ring-1 ring-inset ring-[#294A38]' : ''}`}><span>{Number(fecha.slice(8, 10))}</span><span aria-hidden="true" className="flex h-1 items-center justify-center gap-1">{dia && dia.total > 0 && <span className="h-1 w-1 rounded-full bg-[#EC9BB6]" />}{totalEncuentros > 0 && <span className="h-1 w-1 rounded-full bg-[#294A38]" />}</span></button>
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-4 md:px-0"><div className="flex flex-wrap gap-3 text-[10px] text-[#746A64]">{tareas.estado === 'lista' && <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#EC9BB6]" />Tus tareas</span>}<span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#294A38]" />Encuentros Socias</span></div>{rango.mes !== rango.actual && <Link href={hrefMes(rango.actual)} prefetch={false} className="inline-flex min-h-11 items-center text-xs font-medium text-[#294A38] underline underline-offset-4">Volver a este mes</Link>}</div>
      </div>
      <div className="mt-4 min-w-0 space-y-3 px-4 sm:px-5 md:mt-0 md:px-0">
        <section aria-labelledby="dia-calendario" className="rounded-2xl border border-[#E7DDD5] bg-[#FAF7F3] p-4"><h3 id="dia-calendario" className="text-sm font-semibold first-letter:uppercase">{nombreDia(seleccion)}</h3>
          {tareas.estado === 'error' ? <p role="alert" className="mt-2 text-xs leading-5 text-[#746A64]">No pudimos comprobar tus tareas de este mes. No significa que no tengas planes.</p> : elegido ? <><p className="mt-2 text-xs leading-5 text-[#746A64]">{elegido.total ? `${elegido.pendientes} por hacer · ${elegido.completadas} completadas` : 'Sin tareas guardadas para este día.'}</p><Link href={`/checklist?fecha=${seleccion}`} prefetch={false} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#294A38]">Abrir en Mi día <ArrowIcon /></Link></> : null}
          {encuentros.estado === 'error' ? <p role="alert" className="mt-2 text-xs leading-5 text-[#746A64]">No pudimos comprobar los encuentros de Flor. Actualizá antes de confirmar un horario.</p> : hitosElegidos.length ? <ul className="mt-3 space-y-3">{hitosElegidos.map(hito => <li key={hito.id} className="border-t border-[#E7DDD5] pt-3"><span className="text-[10px] font-semibold uppercase tracking-wider text-[#294A38]">Encuentro Socias · {hito.hora} hs</span><p className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">{hito.titulo}</p>{hito.enlace ? <a href={hito.enlace} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#294A38]">{hito.accion} <ArrowIcon /></a> : <p className="mt-2 text-xs text-[#746A64]">Enlace por confirmar.</p>}</li>)}</ul> : <p className="mt-2 text-xs leading-5 text-[#746A64]">No hay encuentros publicados para este día.</p>}
        </section>
        {(proximas.length > 0 || proximosEncuentros.length > 0) && <section aria-labelledby="proximos-calendario"><h3 id="proximos-calendario" className="px-1 text-xs font-semibold text-[#294A38]">Lo que viene en este mes</h3><div className="mt-2 space-y-2">{proximas.map(dia => <Link key={dia.fecha} href={`/checklist?fecha=${dia.fecha}`} prefetch={false} className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-[#E7DDD5] bg-[#FFFDFA] px-3 py-2"><span className="min-w-0"><span className="block text-xs font-medium first-letter:uppercase">{nombreDia(dia.fecha, true)}</span><span className="block text-[11px] text-[#746A64]">{dia.pendientes} {dia.pendientes === 1 ? 'tarea pendiente' : 'tareas pendientes'} · Mi día</span></span><ArrowIcon diagonal /></Link>)}{proximosEncuentros.map(hito => <button key={hito.id} type="button" onClick={() => setSeleccionada(hito.dia)} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-2xl border border-[#EC9BB6] bg-[#F4CAD8] px-3 py-2 text-left"><span className="min-w-0"><span className="block break-words text-xs font-medium [overflow-wrap:anywhere]">{hito.titulo}</span><span className="block text-[11px] text-[#746A64]">{nombreDia(hito.dia, true)} · {hito.hora} hs Argentina</span></span><NavigationIcon name="calendario" /></button>)}</div></section>}
        {sinMiDia && encuentros.estado === 'lista' && !hitos.length && <p className="px-1 text-xs leading-5 text-[#746A64]">Los próximos encuentros que publique Flor van a aparecer acá. Mientras tanto, <Link href="/clases" prefetch={false} className="font-medium text-[#294A38] underline underline-offset-4">seguí con tus clases</Link>.</p>}
        {(tareas.estado === 'error' || encuentros.estado === 'error') && <Link href={hrefMes(rango.mes)} prefetch={false} className={control}>Actualizar calendario <ArrowIcon /></Link>}
      </div>
    </div>
    <p className="mt-4 px-4 text-[10px] leading-5 text-[#746A64] sm:px-5">{tareas.estado === 'lista' ? 'Las tareas reflejan lo que guardaste en Mi día. Completar una tarea no marca una clase como vista.' : 'Solo aparecen los encuentros publicados para tu acceso.'}</p>
  </section>
}

export function HomeCalendarLoading() {
  return <section aria-label="Cargando tu agenda" aria-busy="true" className="mt-5 rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-5"><h2 className="text-xl font-semibold">Tu agenda</h2><p role="status" className="mt-3 text-sm text-[#746A64]">Preparando tu calendario…</p><div aria-hidden="true" className="mt-4 h-44 rounded-2xl border border-[#E7DDD5] bg-[#FAF7F3]" /></section>
}
