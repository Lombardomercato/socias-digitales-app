'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import ArrowIcon from '@/components/ArrowIcon'
import NavigationIcon from '@/components/NavigationIcon'
import PersonalRankCard from '@/components/PersonalRankCard'
import { hitosLogros, type DatosLogros, type HitoLogro } from '@/lib/achievements'

const grupos = [
  { id: 'clases', nombre: 'Aprender y avanzar', detalle: 'Tu progreso en las clases disponibles.', icono: 'clases' },
  { id: 'metricas', nombre: 'Conocer tu negocio', detalle: 'Tus análisis guardados en Mis métricas.', icono: 'resultados' },
  { id: 'dia', nombre: 'Pasar a la acción', detalle: 'Tareas completadas en los últimos 30 días, según su fecha.', icono: 'checklist' },
] as const
const estados = { alcanzado: 'Alcanzado', pendiente: 'Por alcanzar', bloqueado: 'Requiere habilitación', error: 'No disponible' }
const boton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D8CFC8] px-4 py-3 text-sm font-medium text-[#294A38] disabled:opacity-50'

export function TarjetaLogro({ hito }: { hito: HitoLogro }) {
  const disponible = hito.estado === 'alcanzado' || hito.estado === 'pendiente'
  const valor = hito.actual === null ? null : Math.min(hito.actual, hito.meta)
  return <article className={`flex min-w-0 flex-col rounded-[22px] border p-5 ${hito.estado === 'alcanzado' ? 'border-[#EC9BB6] bg-[#F4CAD8]/50' : 'border-[#E7DDD5] bg-[#FFFDFA]'}`}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${hito.estado === 'alcanzado' ? 'bg-[#294A38] text-white' : 'border border-[#E7DDD5] bg-[#FAF7F3] text-[#294A38]'}`}><NavigationIcon name={hito.estado === 'alcanzado' ? 'logros' : hito.estado === 'bloqueado' ? 'bloqueo' : grupos.find(g => g.id === hito.categoria)!.icono} /></span>
      <span className="rounded-full border border-[#E7DDD5] bg-[#FFFDFA] px-3 py-1.5 text-[11px] font-semibold text-[#294A38]">{estados[hito.estado]}</span>
    </div>
    <h3 className="mt-4 break-words text-base font-semibold leading-6">{hito.titulo}</h3>
    <p className="mt-2 flex-1 text-sm leading-6 text-[#746A64]">{hito.descripcion}</p>
    {disponible && valor !== null ? <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs"><span className="text-[#746A64]">Tu avance</span><span className="font-impact font-semibold tabular-nums">{valor} / {hito.meta}</span></div>
      <progress aria-label={`Avance de ${hito.titulo}`} value={valor} max={hito.meta} className="block h-2 w-full overflow-hidden rounded-full bg-[#E7DDD5] [&::-webkit-progress-bar]:bg-[#E7DDD5] [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-[#294A38] [&::-moz-progress-bar]:bg-[#294A38]" />
    </div> : <p className="mt-5 text-xs leading-5 text-[#746A64]">{hito.estado === 'error' ? 'No pudimos consultar esta información. Actualizá los avances para reintentar.' : 'Flor habilita el módulo de origen. Este espacio no cambia tus permisos.'}</p>}
    {hito.estado !== 'error' && <Link href={hito.href} prefetch={false} className="mt-4 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold text-[#294A38]">{hito.estado === 'bloqueado' ? 'Ver mi acceso' : hito.accion}<ArrowIcon /></Link>}
  </article>
}

export default function LogrosCliente({ inicial }: { inicial: DatosLogros }) {
  const [datos, setDatos] = useState(inicial)
  const [filtro, setFiltro] = useState<'todos' | 'alcanzado' | 'pendiente'>('todos')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const ocupado = useRef(false)
  const hitos = hitosLogros(datos), alcanzados = hitos.filter(h => h.estado === 'alcanzado').length
  const proximo = hitos.find(h => h.estado === 'pendiente')
  const parcial = [datos.clases, datos.metricas, datos.dia].some(f => f.estado === 'error')
  const formatoFecha = (fecha: string) => new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(new Date(fecha + 'T12:00:00Z'))
  async function actualizar() {
    if (ocupado.current) return
    ocupado.current = true; setCargando(true); setError(''); setAviso('')
    try {
      const response = await fetch('/api/logros', { cache: 'no-store' })
      const siguiente = await response.json()
      if (!response.ok) throw new Error(siguiente.error ?? 'No pudimos actualizar tus avances.')
      setDatos(siguiente); setAviso('Avances actualizados con tus registros guardados.')
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos conectarnos. Conservamos la última lectura en pantalla.') }
    finally { ocupado.current = false; setCargando(false) }
  }
  return <div className="min-h-screen bg-[#F4EFEA] text-[#211C19]">
    <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-[#E7DDD5] px-5 py-3 sm:px-8"><Link href="/inicio" aria-label="Socias Digitales, mi espacio"><img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto max-w-[180px] object-contain" /></Link><Link href="/inicio" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#294A38]">Mi espacio <ArrowIcon /></Link></header>
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#294A38]">Socias Digitales</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Mis logros</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#746A64]">Cada paso cuenta. Acá ves el recorrido que estás construyendo con tus clases, tus números y tus acciones.</p></div><button type="button" onClick={() => void actualizar()} disabled={cargando} aria-busy={cargando} className={boton}>{cargando ? 'Actualizando…' : 'Actualizar avances'}</button></div>
      {error && <p role="alert" className="mt-5 rounded-xl border border-[#EC9BB6] bg-[#F4CAD8]/50 p-4 text-sm">{error} La pantalla conserva la última lectura; podés reintentar.</p>}
      {aviso && <p role="status" className="mt-5 rounded-xl border border-[#E7DDD5] bg-[#FFFDFA] p-4 text-sm text-[#294A38]">{aviso}</p>}
      {parcial && <p role="alert" className="mt-5 rounded-xl border border-[#E7DDD5] bg-[#FFFDFA] p-4 text-sm">Algunos avances no están disponibles. No los contamos como cero ni como alcanzados. Usá “Actualizar avances” para reintentar.</p>}
      <PersonalRankCard datos={datos} />
      <section aria-label="Resumen de avances" className="mt-7 grid gap-3 sm:grid-cols-3">
        <Resumen nombre="Clases completadas" valor={datos.clases.estado === 'lista' ? String(datos.clases.datos.completadas) : '—'} detalle={datos.clases.estado === 'lista' ? `De ${datos.clases.datos.disponibles} clases disponibles` : 'Lectura no disponible'} />
        <Resumen nombre="Hitos alcanzados" valor={parcial ? '—' : String(alcanzados)} detalle={parcial ? 'Lectura parcial · revisá las tarjetas' : 'Según tus registros actuales'} rosa />
        <Resumen nombre="Días en movimiento" valor={datos.dia.estado === 'lista' ? String(datos.dia.datos.dias) : '—'} detalle={datos.dia.estado === 'lista' ? 'Con tareas completadas · últimos 30 días' : datos.dia.estado === 'bloqueada' ? 'Mi día requiere habilitación de Flor' : 'Lectura no disponible'} />
      </section>
      {proximo && <section className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#EC9BB6]/60 bg-[#F4CAD8]/40 p-5 sm:p-6"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#294A38]">Tu próximo paso</p><h2 className="mt-2 text-lg font-semibold">{proximo.titulo}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#746A64]">{proximo.descripcion}</p></div><Link href={proximo.href} prefetch={false} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white">{proximo.accion}<ArrowIcon /></Link></section>}
      <div role="group" aria-label="Filtrar logros" className="mt-8 flex flex-wrap gap-2">{([{ id: 'todos', nombre: 'Todos' }, { id: 'alcanzado', nombre: 'Alcanzados' }, { id: 'pendiente', nombre: 'Por alcanzar' }] as const).map(f => <button type="button" key={f.id} aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)} className={`${boton} ${filtro === f.id ? 'border-[#294A38] bg-[#294A38] text-white' : 'bg-[#FFFDFA]'}`}>{f.nombre}</button>)}</div>
      {grupos.map(grupo => {
        const visibles = hitos.filter(h => h.categoria === grupo.id && (filtro === 'todos' || h.estado === filtro))
        if (!visibles.length) return null
        return <section key={grupo.id} aria-labelledby={`logros-${grupo.id}`} className="mt-7"><div className="mb-4"><h2 id={`logros-${grupo.id}`} className="flex items-center gap-2 text-xl font-semibold"><NavigationIcon name={grupo.icono} />{grupo.nombre}</h2><p className="mt-2 text-xs leading-5 text-[#746A64]">{grupo.detalle}</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibles.map(h => <TarjetaLogro key={h.id} hito={h} />)}</div></section>
      })}
      {!hitos.some(h => filtro === 'todos' || h.estado === filtro) && <p role="status" className="mt-6 rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-6 text-sm">{filtro === 'alcanzado' ? 'Todavía no hay hitos alcanzados en las fuentes disponibles. Empezá por una clase o una tarea, a tu ritmo.' : 'No hay hitos por alcanzar en las fuentes disponibles. Podés seguir aprendiendo y registrar tus próximos pasos.'}</p>}
      <footer className="mt-8 border-t border-[#E7DDD5] pt-5 text-xs leading-6 text-[#746A64]"><p>Mi día: del {formatoFecha(datos.desde)} al {formatoFecha(datos.fecha)}, hora Argentina.{datos.dia.estado === 'lista' && datos.dia.datos.racha > 0 ? ` Racha actual: ${datos.dia.datos.racha} ${datos.dia.datos.racha === 1 ? 'día' : 'días'} con tareas completadas, dentro de este período.` : ''}</p><p>Estos hitos se recalculan al entrar o actualizar. Cambiar una tarea, desmarcar una clase o reemplazar un video puede cambiar el avance. No son certificados ni garantizan resultados comerciales.</p></footer>
    </main>
  </div>
}
function Resumen({ nombre, valor, detalle, rosa = false }: { nombre: string; valor: string; detalle: string; rosa?: boolean }) {
  return <article className={`min-w-0 rounded-[22px] border p-5 ${rosa ? 'border-[#EC9BB6] bg-[#F4CAD8]' : 'border-[#E7DDD5] bg-[#FAF7F3]'}`}><h2 className="text-xs font-medium text-[#746A64]">{nombre}</h2><p className="mt-3 break-words font-impact text-4xl font-semibold tabular-nums">{valor}</p><p className="mt-3 text-xs leading-5 text-[#746A64]">{detalle}</p></article>
}
