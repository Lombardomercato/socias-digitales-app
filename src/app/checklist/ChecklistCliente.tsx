'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import NavigationIcon from '@/components/NavigationIcon'
import ArrowIcon from '@/components/ArrowIcon'
import { CATEGORIAS_DIA, nombreDia, moverDia, semanaDia, resumenTareas, progresoDia, validarTarea, fechaDiaValida, type CategoriaDia, type TareaDia, type ResumenDia, type DatosTarea } from '@/lib/my-day'

const campo = 'w-full min-w-0 rounded-xl border border-[#e7ddd5] bg-[#FAF7F3] px-4 py-3 text-sm outline-none focus:border-[#294A38]'
const boton = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50'
function AnilloDia({ nombre, completadas, total, rosa = false }: { nombre: string; completadas: number; total: number; rosa?: boolean }) {
  const porcentaje = progresoDia(completadas, total)
  const circ = 2 * Math.PI * 45
  return <article className={`flex items-center gap-4 rounded-[22px] border p-5 ${rosa ? 'border-[#EC9BB6]/60 bg-[#F4CAD8]' : 'border-[#e7ddd5] bg-white'}`}>
    <div className="relative h-28 w-28 shrink-0"><svg width="112" height="112" viewBox="0 0 112 112" role="img" aria-label={`${nombre}: ${total ? `${completadas} de ${total} completadas` : 'sin tareas'}`}><circle cx="56" cy="56" r="45" fill="none" stroke={rosa ? '#FAF7F3' : '#F4EFEA'} strokeWidth="8" /><circle cx="56" cy="56" r="45" fill="none" stroke="#294A38" strokeWidth="8" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - (porcentaje ?? 0) / 100)} transform="rotate(-90 56 56)" /></svg><span className="absolute inset-0 flex items-center justify-center font-impact text-2xl font-semibold tabular-nums text-[#294A38]">{porcentaje === null ? '—' : `${porcentaje}%`}</span></div>
    <div><h2 className="text-sm font-semibold">{nombre}</h2><p className="mt-2 text-xs leading-5 text-[#655B56]">{total ? `${completadas} de ${total} completadas` : 'Sin tareas para esta fecha'}</p></div>
  </article>
}
export default function ChecklistCliente({ tareas, semana, fecha, hoy, admin = false, errorCarga = false, limitado = false }: { tareas: TareaDia[]; semana: ResumenDia[]; fecha: string; hoy: string; admin?: boolean; errorCarga?: boolean; limitado?: boolean }) {
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
  const listado = new Map(tareas.map(t => [t.id, t]))
  Object.values(locales).forEach(t => { const anterior = listado.get(t.id); if (!anterior || t.version > anterior.version) listado.set(t.id, t) })
  const todas = [...listado.values()].filter(t => t.fecha === fecha).sort((a, b) => a.creado_en.localeCompare(b.creado_en) || a.id.localeCompare(b.id))
  const activas = todas.filter(t => !t.archivada)
  const visibles = todas.filter(t => (estado === 'archivadas' ? t.archivada : !t.archivada) && (estado !== 'pendientes' || !t.completada) && (filtro === 'todas' || t.categoria === filtro))
  const resumen = limitado ? semana.find(d => d.fecha === fecha) ?? resumenTareas([], fecha) : resumenTareas(todas, fecha)
  const dias = semanaDia(fecha)
  const navegacionBloqueada = Boolean(ocupado || texto.trim() || editando)
  function cancelar() { setTexto(''); setEditando(null); setConflicto(false); setError(''); intento.current = null }
  function editar(t: TareaDia) { setTexto(t.texto); setCategoria(t.categoria); setEditando(t); setConflicto(false); setError(''); setMensaje(''); intento.current = null; formRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }) }
  async function guardar(datos: DatosTarea, tarea: TareaDia | null) {
    if (bloqueo.current) return false
    bloqueo.current = true; setOcupado(tarea?.id ?? 'nueva'); setError(''); setMensaje('')
    try {
      if (!tarea) intento.current ??= crypto.randomUUID()
      const entrada = { ...datos, id: tarea?.id ?? intento.current, version: tarea?.version ?? null }
      validarTarea(entrada, tarea ? 'editar' : 'crear')
      const response = await fetch('/api/checklist', { method: tarea ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entrada) })
      const data = await response.json()
      if (!response.ok || !data.ok || !data.tarea) {
        if (response.status === 409) { if (editando?.id === tarea?.id) setConflicto(true); router.refresh() }
        throw new Error(data.error || 'No pudimos guardar la tarea.')
      }
      const guardada = data.tarea as TareaDia
      setLocales(prev => ({ ...prev, [guardada.id]: guardada })); if (!tarea) intento.current = null
      setMensaje(datos.archivada ? 'Tarea archivada. Podés recuperarla desde Archivadas.' : tarea?.archivada ? 'Tarea recuperada.' : datos.completada ? 'Tarea completada.' : 'Tarea guardada.')
      router.refresh()
      return true
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'No pudimos conectarnos. Tus cambios se conservan.'); return false }
    finally { setOcupado(null); bloqueo.current = false }
  }
  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (conflicto) return
    if (await guardar({ texto, categoria, fecha, completada: editando?.completada ?? false, archivada: false }, editando)) cancelar()
  }
  async function cambiar(t: TareaDia, cambios: Partial<Pick<DatosTarea, 'completada' | 'archivada'>>) {
    await guardar({ texto: t.texto, fecha: t.fecha, categoria: t.categoria, completada: t.completada, archivada: t.archivada, ...cambios }, t)
  }
  return <div className="min-h-screen bg-[#F4EFEA] text-[#211c19]">
    <header className="flex h-[76px] items-center justify-between border-b border-[#e7ddd5] px-5 sm:px-8"><Link href={admin ? '/admin' : '/inicio'}><img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto" /></Link><Link href={admin ? '/admin' : '/inicio'} className="inline-flex items-center gap-2 text-sm text-[#294A38]">{admin ? 'Panel de Flor' : 'Mi espacio'} <ArrowIcon /></Link></header>
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#294A38]">Tu agenda</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Mi día</h1><p className="mt-2 text-sm first-letter:uppercase text-[#746a64]">{nombreDia(fecha)}</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" disabled={navegacionBloqueada || !fechaDiaValida(moverDia(fecha, -1))} onClick={() => router.push(`/checklist?fecha=${moverDia(fecha, -1)}`)} aria-label="Día anterior" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e7ddd5] bg-white text-[#294A38] disabled:opacity-40"><ArrowIcon className="rotate-180" /></button><label className="sr-only" htmlFor="fecha-mi-dia">Elegir fecha</label><input id="fecha-mi-dia" type="date" min="2000-01-01" max="2099-12-31" value={fecha} disabled={navegacionBloqueada} onChange={e => { if (fechaDiaValida(e.target.value)) router.push(`/checklist?fecha=${e.target.value}`) }} className="min-w-0 rounded-full border border-[#e7ddd5] bg-white px-3 py-2 text-sm disabled:opacity-50" /><button type="button" disabled={navegacionBloqueada || !fechaDiaValida(moverDia(fecha, 1))} onClick={() => router.push(`/checklist?fecha=${moverDia(fecha, 1)}`)} aria-label="Día siguiente" className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e7ddd5] bg-white text-[#294A38] disabled:opacity-40"><ArrowIcon /></button>{fecha !== hoy && <button type="button" disabled={navegacionBloqueada} onClick={() => router.push('/checklist')} className="rounded-full px-3 py-2 text-sm font-medium text-[#294A38] disabled:opacity-50">Hoy</button>}</div></div>
      {errorCarga && <p role="alert" className="mt-5 rounded-xl border border-[#EC9BB6] bg-[#F4CAD8] p-4 text-sm">No pudimos cargar tus tareas. <button type="button" onClick={() => router.refresh()} className="underline">Reintentar</button></p>}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <form ref={formRef} onSubmit={enviar} className="scroll-mt-5 rounded-[22px] border border-[#e7ddd5] bg-white p-5">
            <fieldset disabled={Boolean(ocupado) || errorCarga}>
              <div className="flex items-center justify-between gap-3"><h2 className="text-base font-semibold">{editando ? 'Editar tarea' : '¿Qué vas a hacer?'}</h2>{(editando || texto) && <button type="button" onClick={cancelar} className="text-xs text-[#746a64] underline">Cancelar</button>}</div>
              <label className="sr-only" htmlFor="tarea-mi-dia">Tu tarea</label><input id="tarea-mi-dia" required maxLength={300} value={texto} onChange={e => { setTexto(e.target.value); intento.current = null; setError('') }} placeholder="Ej. Preparar el contenido de mañana" className={`mt-4 ${campo}`} />
              <fieldset className="mt-4"><legend className="mb-2 text-[11px] font-medium text-[#746a64]">Categoría</legend><div className="flex flex-wrap gap-2">{Object.entries(CATEGORIAS_DIA).map(([id, c]) => <button key={id} type="button" aria-pressed={categoria === id} onClick={() => { setCategoria(id as CategoriaDia); intento.current = null }} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${categoria === id ? 'border-[#294A38] bg-[#294A38] text-white' : 'border-[#e7ddd5] bg-[#FAF7F3] text-[#655B56]'}`}><NavigationIcon name={c.icono} />{c.nombre}</button>)}</div></fieldset>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#746a64]">{editando ? 'Tus cambios reemplazan esta tarea.' : `Para ${nombreDia(fecha, true)}`}</p><button type="submit" disabled={Boolean(ocupado) || !texto.trim() || conflicto} className={boton}>{ocupado === (editando?.id ?? 'nueva') ? 'Guardando…' : editando ? 'Guardar cambios' : 'Agregar tarea'} <ArrowIcon /></button></div>
            </fieldset>
          </form>
          {error && <div role="alert" className="mt-4 rounded-xl border border-[#EC9BB6] bg-[#F4CAD8] p-4 text-sm"><p>{error}</p>{conflicto && editando && <button type="button" onClick={() => { const t = listado.get(editando.id); if (t) editar(t) }} className="mt-2 font-medium underline">Descartar mis cambios y abrir la versión guardada</button>}</div>}
          {mensaje && <p role="status" className="mt-4 text-sm text-[#294A38]">{mensaje}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap gap-2" aria-label="Filtrar tareas">{[['activas', 'Todas'], ['pendientes', 'Pendientes'], ['archivadas', 'Archivadas']].map(([id, n]) => <button key={id} type="button" aria-pressed={estado === id} onClick={() => setEstado(id)} className={`rounded-full border px-3 py-2 text-xs font-medium ${estado === id ? 'border-[#EC9BB6] bg-[#F4CAD8]' : 'border-[#e7ddd5] bg-[#FAF7F3] text-[#746a64]'}`}>{n}{id === 'activas' ? ` (${activas.length})` : ''}</button>)}</div><label className="sr-only" htmlFor="categoria-filtro">Filtrar por categoría</label><select id="categoria-filtro" value={filtro} onChange={e => setFiltro(e.target.value)} className="max-w-full rounded-full border border-[#e7ddd5] bg-white px-3 py-2 text-xs"><option value="todas">Todas las categorías</option>{Object.entries(CATEGORIAS_DIA).map(([id, c]) => <option key={id} value={id}>{c.nombre}</option>)}</select></div>
          {limitado && <p className="mt-3 text-xs text-[#746a64]">Mostramos las primeras 500 tareas de esta fecha. El resumen incluye todas.</p>}
          <div className="mt-4 space-y-2">{visibles.map(t => <article key={t.id} className={`flex flex-wrap items-center gap-3 rounded-[18px] border bg-[#FAF7F3] p-4 ${t.completada ? 'border-[#294A38]/25' : 'border-[#e7ddd5]'}`}>
            {!t.archivada && <button type="button" role="checkbox" aria-checked={t.completada} aria-label={`Completar: ${t.texto}`} disabled={Boolean(ocupado) || Boolean(editando) || errorCarga} onClick={() => cambiar(t, { completada: !t.completada })} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border disabled:opacity-50 ${t.completada ? 'border-[#294A38] bg-[#294A38] text-white' : 'border-[#294A38]/40 bg-white text-[#294A38]'}`}>{t.completada ? <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg> : null}</button>}
            <div className="min-w-0 flex-1"><p className={`break-words text-sm ${t.completada ? 'text-[#746a64] line-through' : ''}`}>{t.texto}</p><p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[#746a64]"><NavigationIcon name={CATEGORIAS_DIA[t.categoria].icono} />{CATEGORIAS_DIA[t.categoria].nombre}</p></div>
            <div className="flex items-center gap-3 text-xs text-[#294A38]">{t.archivada ? <button type="button" disabled={Boolean(ocupado) || Boolean(editando) || errorCarga} onClick={() => cambiar(t, { archivada: false })} className="font-medium underline disabled:opacity-50">Recuperar</button> : <><button type="button" disabled={Boolean(ocupado) || Boolean(editando) || errorCarga} onClick={() => editar(t)} className="font-medium underline disabled:opacity-50">Editar</button><button type="button" disabled={Boolean(ocupado) || Boolean(editando) || errorCarga} onClick={() => cambiar(t, { archivada: true })} className="text-[#746a64] disabled:opacity-50">Archivar</button></>}{ocupado === t.id && <span role="status">Guardando…</span>}</div>
          </article>)}</div>
          {!errorCarga && !visibles.length && <div className="mt-4 rounded-[22px] border border-[#e7ddd5] bg-[#FAF7F3] px-5 py-8 text-center"><span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#F4CAD8] text-[#294A38]"><NavigationIcon name="checklist" /></span><p className="mt-3 text-sm font-medium">{estado === 'archivadas' ? 'No hay tareas archivadas con estos filtros.' : estado === 'pendientes' && activas.length ? 'Sin pendientes con estos filtros.' : 'Tu agenda empieza con una tarea.'}</p></div>}
        </div>
        <aside className="space-y-4" aria-label="Progreso de tu agenda">
          {!errorCarga && <><AnilloDia nombre="Mi día en general" completadas={Number(resumen.generales_completadas)} total={Number(resumen.generales)} /><AnilloDia nombre="Negocio digital" completadas={Number(resumen.negocio_completadas)} total={Number(resumen.negocio)} rosa /></>}
          <section className="rounded-[22px] border border-[#e7ddd5] bg-[#FAF7F3] p-5"><h2 className="text-sm font-semibold">Tu semana</h2><div className="mt-5 grid grid-cols-7 gap-2">{dias.map(d => { const r = d === fecha ? resumen : semana.find(s => s.fecha === d); const total = Number(r?.total ?? 0), hechas = Number(r?.completadas ?? 0); const p = progresoDia(hechas, total); return <button key={d} type="button" disabled={navegacionBloqueada || !fechaDiaValida(d)} onClick={() => router.push(`/checklist?fecha=${d}`)} aria-label={`${nombreDia(d)}: ${errorCarga ? 'no disponible' : total ? `${hechas} de ${total} completadas` : 'sin tareas'}`} aria-current={d === fecha ? 'date' : undefined} className={`min-w-0 rounded-xl px-1 py-2 disabled:opacity-50 ${d === fecha ? 'bg-[#F4CAD8]' : ''}`}><span className="block h-16 overflow-hidden rounded-full bg-[#e7ddd5]" aria-hidden="true"><span className="flex h-full flex-col justify-end"><span className="block bg-[#294A38]" style={{ height: `${errorCarga ? 0 : p ?? 0}%` }} /></span></span><span className="mt-2 block text-[10px] capitalize text-[#746a64]">{['L', 'M', 'M', 'J', 'V', 'S', 'D'][dias.indexOf(d)]}</span><span className="mt-1 block text-xs font-medium tabular-nums">{Number(d.slice(-2))}</span></button> })}</div><p className="mt-4 text-[11px] leading-5 text-[#746a64]">{navegacionBloqueada ? 'Guardá o cancelá tu tarea para cambiar de fecha.' : 'Elegí un día para revisar tu agenda.'}</p></section>
        </aside>
      </div>
    </main>
  </div>
}
