'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavigationIcon from '@/components/NavigationIcon'
import ArrowIcon from '@/components/ArrowIcon'
import SuccessCelebration, { useSuccessCelebration } from '@/components/SuccessCelebration'
import StudyPlannerClient from '@/components/StudyPlannerClient'
import WeeklyPlanSummary from '@/components/WeeklyPlanSummary'
import type { PlanEstudio } from '@/lib/study-planner'
import { CATEGORIAS_DIA, nombreDia, moverDia, resumenTareas, progresoDia, validarTarea, fechaDiaValida, type CategoriaDia, type TareaDia, type ResumenDia, type DatosTarea } from '@/lib/my-day'

const campo = 'w-full min-w-0 rounded-xl border border-[#e7ddd5] bg-[#FAF7F3] px-4 py-3 text-sm outline-none focus:border-[#294A38]'
const boton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'
function AnilloDia({ nombre, completadas, total, rosa = false }: { nombre: string; completadas: number; total: number; rosa?: boolean }) {
  const porcentaje = progresoDia(completadas, total)
  const circ = 2 * Math.PI * 45
  return <article className={`flex items-center gap-4 rounded-[22px] border p-5 ${rosa ? 'border-[#EC9BB6]/60 bg-[#F4CAD8]' : 'border-[#e7ddd5] bg-white'}`}>
    <div className="relative h-28 w-28 shrink-0"><svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`${nombre}: ${total ? `${completadas} de ${total} completadas` : 'sin tareas'}`}><circle cx="56" cy="56" r="45" fill="none" stroke={rosa ? '#FAF7F3' : '#F4EFEA'} strokeWidth="8" /><circle cx="56" cy="56" r="45" fill="none" stroke="#294A38" strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - (porcentaje ?? 0) / 100)} transform="rotate(-90 56 56)" /></svg><span className="absolute inset-0 flex items-center justify-center font-impact text-2xl font-semibold tabular-nums text-[#294A38]">{porcentaje === null ? '—' : `${porcentaje}%`}</span></div>
    <div><h2 className="text-sm font-semibold">{nombre}</h2><p className="mt-2 text-xs leading-5 text-[#655B56]">{total ? `${completadas} de ${total} completadas` : 'Sin tareas para esta fecha'}</p></div>
  </article>
}
export default function ChecklistCliente({ tareas, semana, fecha, hoy, admin = false, errorCarga = false, limitado = false, planEstudio = null, alumnaId = '' }: { tareas: TareaDia[]; semana: ResumenDia[]; fecha: string; hoy: string; admin?: boolean; errorCarga?: boolean; limitado?: boolean; planEstudio?: PlanEstudio | null; alumnaId?: string }) {
  const router = useRouter()
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState<CategoriaDia>('negocio_digital')
  const [editando, setEditando] = useState<TareaDia | null>(null)
  const [locales, setLocales] = useState<Record<string, TareaDia>>({})
  const [filtro, setFiltro] = useState('todas')
  const [estado, setEstado] = useState('activas')
  const [ocupado, setOcupado] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [conflicto, setConflicto] = useState(false)
  const bloqueo = useRef(false)
  const intento = useRef<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [reprogramacion, setReprogramacion] = useState<{ tarea: TareaDia; destino: string; conflicto: boolean } | null>(null)
  const [destinoGuardado, setDestinoGuardado] = useState<string | null>(null)
  const [planAbierto, setPlanAbierto] = useState(false)
  const reprogramacionRef = useRef<HTMLHeadingElement>(null)
  const { celebration, celebrate, dismiss } = useSuccessCelebration()
  const reprogramando = Boolean(reprogramacion)
  useEffect(() => {
    if (!reprogramando) return
    const salir = (evento: BeforeUnloadEvent) => { evento.preventDefault(); evento.returnValue = '' }
    window.addEventListener('beforeunload', salir)
    return () => window.removeEventListener('beforeunload', salir)
  }, [reprogramando])
  const listado = new Map(tareas.map(t => [t.id, t]))
  Object.values(locales).forEach(t => { const anterior = listado.get(t.id); if (!anterior || t.version > anterior.version) listado.set(t.id, t) })
  const todas = [...listado.values()].filter(t => t.fecha === fecha).sort((a, b) => a.creado_en.localeCompare(b.creado_en) || a.id.localeCompare(b.id))
  const activas = todas.filter(t => !t.archivada)
  const visibles = todas.filter(t => (estado === 'archivadas' ? t.archivada : !t.archivada) && (estado !== 'pendientes' || !t.completada) && (filtro === 'todas' || t.categoria === filtro))
  const resumen = limitado ? semana.find(d => d.fecha === fecha) ?? resumenTareas([], fecha) : resumenTareas(todas, fecha)
  const semanaActual = errorCarga ? semana : [...semana.filter(d => d.fecha !== fecha), resumen]
  const navegacionBloqueada = Boolean(ocupado || texto.trim() || editando || reprogramacion || planAbierto)
  function cancelar() { setTexto(''); setEditando(null); setConflicto(false); setError(''); intento.current = null }
  function editar(t: TareaDia) { setTexto(t.texto); setCategoria(t.categoria); setEditando(t); setConflicto(false); setError(''); setMensaje(''); intento.current = null; formRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }) }
  async function guardar(datos: DatosTarea, tarea: TareaDia | null) {
    if (bloqueo.current) return false
    dismiss()
    bloqueo.current = true; setOcupado(tarea?.id ?? 'nueva'); setError(''); setMensaje(''); setDestinoGuardado(null)
    const controlador = new AbortController()
    const plazo = setTimeout(() => controlador.abort(), 20_000)
    try {
      if (!tarea) intento.current ??= crypto.randomUUID()
      const entrada = { ...datos, id: tarea?.id ?? intento.current, version: tarea?.version ?? null }
      validarTarea(entrada, tarea ? 'editar' : 'crear')
      const response = await fetch('/api/checklist', { method: tarea ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entrada), signal: controlador.signal })
      const data = await response.json()
      if (!response.ok || !data.ok || !data.tarea) {
        if (response.status === 409 || (response.ok && (!data.ok || !data.tarea))) {
          if (editando?.id === tarea?.id) setConflicto(true)
          if (reprogramacion?.tarea.id === tarea?.id) setReprogramacion(actual => actual ? { ...actual, conflicto: true } : null)
          router.refresh()
        }
        throw new Error(data.error || 'No pudimos guardar la tarea.')
      }
      const guardada = data.tarea as TareaDia
      if (reprogramacion?.tarea.id === tarea?.id && tarea && (guardada.id !== tarea.id || guardada.alumna_id !== tarea.alumna_id || guardada.texto !== tarea.texto || guardada.categoria !== tarea.categoria || guardada.fecha !== datos.fecha || guardada.completada !== false || guardada.archivada !== false || guardada.version !== tarea.version + 1 || guardada.creado_en !== tarea.creado_en)) {
        setReprogramacion(actual => actual ? { ...actual, conflicto: true } : null)
        router.refresh()
        throw new Error('No pudimos confirmar la nueva fecha. Recargá la tarea para comprobar su estado antes de reintentar.')
      }
      if (tarea && !tarea.completada && !tarea.archivada && datos.completada === true && !datos.archivada && guardada.id === tarea.id && guardada.alumna_id === tarea.alumna_id && guardada.completada === true && guardada.archivada === false && guardada.version === tarea.version + 1 && guardada.fecha === datos.fecha && guardada.texto === tarea.texto && guardada.categoria === tarea.categoria && guardada.creado_en === tarea.creado_en) celebrate({ key: `tarea:${guardada.id}`, title: '¡Un paso más, Socia!', message: 'Tu tarea quedó completada.' })
      setLocales(prev => ({ ...prev, [guardada.id]: guardada })); if (!tarea) intento.current = null
      setMensaje(datos.archivada ? 'Tarea archivada. Podés recuperarla desde Archivadas.' : tarea?.archivada ? 'Tarea recuperada.' : datos.completada ? 'Tarea completada.' : 'Tarea guardada.')
      router.refresh()
      return true
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'No pudimos conectarnos. Tus cambios se conservan.'); return false }
    finally { clearTimeout(plazo); setOcupado(null); bloqueo.current = false }
  }
  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (conflicto) return
    if (await guardar({ texto, categoria, fecha, completada: editando?.completada ?? false, archivada: false }, editando)) cancelar()
  }
  async function cambiar(t: TareaDia, cambios: Partial<Pick<DatosTarea, 'completada' | 'archivada'>>) {
    await guardar({ texto: t.texto, fecha: t.fecha, categoria: t.categoria, completada: t.completada, archivada: t.archivada, ...cambios }, t)
  }
  function abrirReprogramacion(t: TareaDia) {
    if (navegacionBloqueada || errorCarga || t.completada || t.archivada) return
    const manana = moverDia(hoy, 1)
    setReprogramacion({ tarea: t, destino: fechaDiaValida(manana) ? manana : hoy, conflicto: false })
    setError(''); setMensaje(''); setDestinoGuardado(null)
    requestAnimationFrame(() => { reprogramacionRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }); reprogramacionRef.current?.focus() })
  }
  function reabrirReprogramacion() {
    if (!reprogramacion || ocupado) return
    const actual = listado.get(reprogramacion.tarea.id)
    if (!actual || actual.version <= reprogramacion.tarea.version) {
      setError('Todavía no pudimos leer una versión más reciente. Recargá las tareas o cancelá esta acción para revisar la lista.')
      router.refresh(); return
    }
    if (actual.completada || actual.archivada || actual.fecha !== fecha) {
      setReprogramacion(null); setError(''); setMensaje('La tarea cambió y ya no se puede reprogramar desde esta lista. No se hicieron cambios.'); return
    }
    setReprogramacion({ ...reprogramacion, tarea: actual, conflicto: false }); setError('')
  }
  async function confirmarReprogramacion(evento: React.FormEvent) {
    evento.preventDefault()
    if (!reprogramacion || reprogramacion.conflicto || ocupado) return
    const { tarea, destino } = reprogramacion
    if (!fechaDiaValida(destino) || destino === tarea.fecha || tarea.completada || tarea.archivada) return
    if (await guardar({ texto: tarea.texto, categoria: tarea.categoria, fecha: destino, completada: false, archivada: false }, tarea)) {
      setReprogramacion(null); setDestinoGuardado(destino)
      setMensaje(`Tarea reprogramada para ${nombreDia(destino)}. Sigue pendiente.`)
    }
  }
  return <div className="min-h-screen bg-[#F4EFEA] text-[#211c19]">
    <SuccessCelebration celebration={celebration} />
    <header data-student-section-header="true" className="flex h-[76px] items-center justify-between border-b border-[#e7ddd5] px-5 sm:px-8"><Link href={admin ? '/admin' : '/inicio'}><img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto" /></Link><Link href={admin ? '/admin' : '/inicio'} className="inline-flex items-center gap-2 text-sm text-[#294A38]">{admin ? 'Panel de Flor' : 'Mi espacio'} <ArrowIcon /></Link></header>
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#294A38]">Tu agenda</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Mi día</h1><p className="mt-2 text-sm first-letter:uppercase text-[#746a64]">{nombreDia(fecha)}</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={navegacionBloqueada || !fechaDiaValida(moverDia(fecha, -1))} onClick={() => router.push(`/checklist?fecha=${moverDia(fecha, -1)}`)} aria-label="Día anterior" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e7ddd5] bg-white text-[#294A38] disabled:opacity-40"><ArrowIcon className="rotate-180" /></button><label className="sr-only" htmlFor="fecha-mi-dia">Elegir fecha</label><input id="fecha-mi-dia" type="date" min="2000-01-01" max="2099-12-31" value={fecha} disabled={navegacionBloqueada} onChange={e => { if (fechaDiaValida(e.target.value)) router.push(`/checklist?fecha=${e.target.value}`) }} className="min-w-0 rounded-full border border-[#e7ddd5] bg-white px-3 py-2 text-sm disabled:opacity-50" /><button type="button" disabled={navegacionBloqueada || !fechaDiaValida(moverDia(fecha, 1))} onClick={() => router.push(`/checklist?fecha=${moverDia(fecha, 1)}`)} aria-label="Día siguiente" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e7ddd5] bg-white text-[#294A38] disabled:opacity-40"><ArrowIcon /></button>{fecha !== hoy && <button type="button" disabled={navegacionBloqueada} onClick={() => router.push('/checklist')} className="rounded-full px-3 py-2 text-sm font-medium text-[#294A38] disabled:opacity-50">Hoy</button>}</div></div>
      {errorCarga && <p role="alert" className="mt-5 rounded-xl border border-[#EC9BB6] bg-[#F4CAD8] p-4 text-sm">No pudimos cargar tus tareas. <button type="button" onClick={() => router.refresh()} className="underline">Reintentar</button></p>}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {!admin && planEstudio && <StudyPlannerClient plan={planEstudio} fechaInicial={fecha} hoy={hoy} alumnaId={alumnaId} bloqueada={Boolean(ocupado || texto.trim() || editando || reprogramacion || errorCarga)} onBorradorChange={setPlanAbierto} onGuardada={tarea => { setLocales(prev => ({ ...prev, [tarea.id]: tarea })); router.refresh() }} />}
          <form ref={formRef} onSubmit={enviar} className="scroll-mt-5 rounded-[22px] border border-[#e7ddd5] bg-white p-5">
            <fieldset disabled={Boolean(ocupado) || errorCarga || reprogramando || planAbierto}>
              <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{editando ? 'Editar tarea' : '¿Qué vas a hacer?'}</h2>{(editando || texto) && <button type="button" onClick={cancelar} className="text-xs text-[#746a64] underline">Cancelar</button>}</div>
              <label className="sr-only" htmlFor="tarea-mi-dia">Tu tarea</label><input id="tarea-mi-dia" required maxLength={300} value={texto} onChange={e => { setTexto(e.target.value); intento.current = null; setError('') }} placeholder="Ej. Preparar el contenido de mañana" className={`mt-4 ${campo}`} />
              <fieldset className="mt-4"><legend className="mb-2 text-[11px] font-medium text-[#746a64]">Categoría</legend><div className="flex flex-wrap gap-2">{Object.entries(CATEGORIAS_DIA).map(([id, c]) => <button key={id} type="button" aria-pressed={categoria === id} onClick={() => { setCategoria(id as CategoriaDia); intento.current = null }} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${categoria === id ? 'border-[#294A38] bg-[#294A38] text-white' : 'border-[#e7ddd5] bg-[#FAF7F3] text-[#655B56]'}`}><NavigationIcon name={c.icono} />{c.nombre}</button>)}</div></fieldset>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#746a64]">{editando ? 'Tus cambios reemplazan esta tarea.' : `Para ${nombreDia(fecha, true)}`}</p><button type="submit" disabled={Boolean(ocupado) || !texto.trim() || conflicto} className={boton}>{ocupado === (editando?.id ?? 'nueva') ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar tarea'} <ArrowIcon /></button></div>
            </fieldset>
          </form>
          {error && <div role="alert" className="mt-4 rounded-xl border border-[#EC9BB6] bg-[#F4CAD8] p-4 text-sm"><p>{error}</p>{conflicto && editando && <button type="button" onClick={() => { const t = listado.get(editando.id); if (t) editar(t) }} className="mt-2 font-medium underline">Descartar mis cambios y abrir la versión guardada</button>}</div>}
          {mensaje && <p role="status" className="mt-4 text-sm text-[#294A38]">{mensaje}</p>}
          {destinoGuardado && <Link href={`/checklist?fecha=${destinoGuardado}`} prefetch={false} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#294A38] underline underline-offset-4">Ver las tareas del {nombreDia(destinoGuardado)} <ArrowIcon /></Link>}
          {reprogramacion && <section aria-labelledby="reprogramar-titulo" className="mt-5 min-w-0 rounded-[22px] border border-[#EC9BB6] bg-[#F4CAD8]/40 p-5">
            <h2 ref={reprogramacionRef} tabIndex={-1} id="reprogramar-titulo" className="text-base font-semibold outline-none">Reprogramar tarea</h2>
            <p className="mt-2 break-words text-sm leading-6">{reprogramacion.tarea.texto}</p>
            <p className="mt-2 text-xs leading-5 text-[#746A64]">La movemos sin duplicarla. Va a seguir pendiente, con su categoría y sus datos originales.</p>
            <form onSubmit={confirmarReprogramacion} className="mt-4">
              <fieldset disabled={Boolean(ocupado) || reprogramacion.conflicto}>
                <label htmlFor="fecha-reprogramar" className="block text-sm font-medium">Nueva fecha</label>
                <input id="fecha-reprogramar" type="date" required min="2000-01-01" max="2099-12-31" value={reprogramacion.destino} onChange={e => setReprogramacion(actual => actual ? { ...actual, destino: e.target.value } : null)} className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[#E7DDD5] bg-[#FFFDFA] px-3 py-3 text-base" />
                <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => setReprogramacion(actual => actual ? { ...actual, destino: hoy } : null)} disabled={hoy === reprogramacion.tarea.fecha} className="min-h-11 rounded-full border border-[#294A38]/25 px-4 py-2 text-sm text-[#294A38] disabled:opacity-40">Hoy</button><button type="button" onClick={() => setReprogramacion(actual => actual ? { ...actual, destino: moverDia(hoy, 1) } : null)} disabled={!fechaDiaValida(moverDia(hoy, 1)) || moverDia(hoy, 1) === reprogramacion.tarea.fecha} className="min-h-11 rounded-full border border-[#294A38]/25 px-4 py-2 text-sm text-[#294A38] disabled:opacity-40">Mañana</button></div>
                <p aria-live="polite" className="mt-4 text-sm leading-6 text-[#294A38]">{!fechaDiaValida(reprogramacion.destino) ? 'Elegí una fecha válida para continuar.' : reprogramacion.destino === reprogramacion.tarea.fecha ? 'Elegí una fecha distinta de la actual.' : <>Va a quedar pendiente para <strong>{nombreDia(reprogramacion.destino)}</strong>.</>}</p>
                <button type="submit" disabled={Boolean(ocupado) || reprogramacion.conflicto || !fechaDiaValida(reprogramacion.destino) || reprogramacion.destino === reprogramacion.tarea.fecha} className={`mt-4 ${boton}`}>{ocupado ? 'Reprogramando…' : 'Confirmar nueva fecha'} <ArrowIcon /></button>
              </fieldset>
            </form>
            {reprogramacion.conflicto && <div className="mt-4 text-sm leading-6"><p>Necesitamos volver a leer esta tarea. Primero recargá y reabrí su última versión; no vamos a reemplazarla con datos anteriores.</p><div className="mt-2 flex flex-wrap gap-2"><button type="button" disabled={Boolean(ocupado)} onClick={() => router.refresh()} className="min-h-11 rounded-full border border-[#294A38]/25 px-4 py-2 text-sm text-[#294A38]">Recargar tareas</button><button type="button" disabled={Boolean(ocupado)} onClick={reabrirReprogramacion} className="min-h-11 rounded-full border border-[#294A38]/25 px-4 py-2 text-sm text-[#294A38]">Reabrir tarea actualizada</button></div></div>}
            <button type="button" disabled={Boolean(ocupado)} onClick={() => { setReprogramacion(null); setError('') }} className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-[#746A64] underline underline-offset-4 disabled:opacity-40">Cancelar reprogramación</button>
          </section>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" aria-label="Filtrar tareas">{[['activas', 'Todas'], ['pendientes', 'Pendientes'], ['archivadas', 'Archivadas']].map(([id, n]) => <button key={id} type="button" disabled={reprogramando} aria-pressed={estado === id} onClick={() => setEstado(id)} className={`rounded-full border px-3 py-2 text-xs font-medium disabled:opacity-50 ${estado === id ? 'border-[#EC9BB6] bg-[#F4CAD8]' : 'border-[#e7ddd5] bg-[#FAF7F3] text-[#746a64]'}`}>{n}{id === 'activas' ? ` (${activas.length})` : ''}</button>)}</div><label className="sr-only" htmlFor="categoria-filtro">Filtrar por categoría</label><select id="categoria-filtro" value={filtro} disabled={reprogramando} onChange={e => setFiltro(e.target.value)} className="max-w-full rounded-full border border-[#e7ddd5] bg-white px-3 py-2 text-xs disabled:opacity-50"><option value="todas">Todas las categorías</option>{Object.entries(CATEGORIAS_DIA).map(([id, c]) => <option key={id} value={id}>{c.nombre}</option>)}</select></div>
          {limitado && <p className="mt-3 text-xs text-[#746a64]">Mostramos las primeras 500 tareas de esta fecha. El resumen incluye todas.</p>}
          <div className="mt-4 space-y-2">{visibles.map(t => <article key={t.id} className={`flex flex-wrap items-center gap-3 rounded-[18px] border bg-[#FAF7F3] p-4 ${t.completada ? 'border-[#294A38]/25' : 'border-[#e7ddd5]'}`}>
            {!t.archivada && <button type="button" role="checkbox" aria-checked={t.completada} aria-label={`Completar: ${t.texto}`} disabled={Boolean(ocupado) || Boolean(editando) || reprogramando || errorCarga || planAbierto} onClick={() => cambiar(t, { completada: !t.completada })} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-50 ${t.completada ? 'border-[#294A38] bg-[#294A38] text-white' : 'border-[#294A38]/40 bg-white text-[#294A38]'}`}>{t.completada ? <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}</button>}
            <div className="min-w-0 flex-1"><p className={`break-words text-sm ${t.completada ? 'text-[#746a64] line-through' : ''}`}>{t.texto}</p><p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[#746a64]"><NavigationIcon name={CATEGORIAS_DIA[t.categoria].icono} />{CATEGORIAS_DIA[t.categoria].nombre}</p></div>
            <div className="flex w-full max-w-full flex-wrap items-center justify-end gap-3 text-xs text-[#294A38] sm:w-auto">{t.archivada ? <button type="button" disabled={Boolean(ocupado) || Boolean(editando) || reprogramando || errorCarga || planAbierto} onClick={() => cambiar(t, { archivada: false })} className="min-h-11 font-medium underline disabled:opacity-50">Recuperar</button> : <><button type="button" disabled={Boolean(ocupado) || Boolean(editando) || reprogramando || errorCarga || planAbierto} onClick={() => editar(t)} className="min-h-11 font-medium underline disabled:opacity-50">Editar</button>{!t.completada && <button type="button" disabled={navegacionBloqueada || errorCarga} onClick={() => abrirReprogramacion(t)} className="min-h-11 font-medium underline underline-offset-4 disabled:opacity-50">Reprogramar</button>}<button type="button" disabled={Boolean(ocupado) || Boolean(editando) || reprogramando || errorCarga || planAbierto} onClick={() => cambiar(t, { archivada: true })} className="min-h-11 text-[#746a64] disabled:opacity-50">Archivar</button></>}{ocupado === t.id && <span role="status">Guardando…</span>}</div>
          </article>)}</div>
          {!errorCarga && !visibles.length && <div className="mt-4 rounded-[22px] border border-[#e7ddd5] bg-[#FAF7F3] px-5 py-8 text-center"><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F4CAD8] text-[#294A38]"><NavigationIcon name="checklist" /></span><p className="mt-3 text-sm font-medium">{estado === 'archivadas' ? 'No hay tareas archivadas con estos filtros.' : estado === 'pendientes' && activas.length ? 'Sin pendientes con estos filtros.' : 'Tu agenda empieza con una tarea.'}</p></div>}
        </div>
        <aside className="space-y-4" aria-label="Progreso de tu agenda">
          {!errorCarga && <><AnilloDia nombre="Mi día en general" completadas={Number(resumen.generales_completadas)} total={Number(resumen.generales)} /><AnilloDia nombre="Negocio digital" completadas={Number(resumen.negocio_completadas)} total={Number(resumen.negocio)} rosa /></>}
          <WeeklyPlanSummary semana={semanaActual} fecha={fecha} error={errorCarga} bloqueada={navegacionBloqueada} onElegir={dia => router.push(`/checklist?fecha=${dia}`)} />
        </aside>
      </div>
    </main>
  </div>
}
