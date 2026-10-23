'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import ArrowIcon from './ArrowIcon'
import { MaterialIcon } from './ClassMaterials'
import { esUuid } from '@/lib/class-management'
import { filtrarRecursosBiblioteca, type PaginaRecursos, type RecursoBiblioteca } from '@/lib/resource-library'

type PaginaCargada = Extract<PaginaRecursos, { offset: number }>
type EstadoBiblioteca = {
  origen: PaginaRecursos
  paginas: PaginaCargada[]
  actualizada: boolean
  accesoError: boolean
  cargando: number | null
  error: { offset: number; mensaje: string } | null
}

const foco = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38]'
const objeto = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const texto = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max
const entero = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

// La respuesta debe corresponder a la página solicitada. Los destinos de los
// adjuntos siguen siendo endpoints propios, nunca URLs que el JSON elija.
function paginaConfirmada(value: unknown, offset: number, revision: string | null): value is PaginaCargada {
  if (!objeto(value) || (value.estado !== 'listo' && value.estado !== 'parcial') || value.offset !== offset || typeof value.hayMas !== 'boolean' || typeof value.revisionCatalogo !== 'string' || !/^[a-f0-9]{64}$/.test(value.revisionCatalogo)) return false
  if (revision !== null && value.revisionCatalogo !== revision) return false
  if (value.hayMas ? !entero(value.nextOffset) || value.nextOffset <= offset : value.nextOffset !== null) return false
  if (!Array.isArray(value.recursos) || value.recursos.length > 600 || !Array.isArray(value.fallos) || value.fallos.length > 20 || !objeto(value.resumen)) return false
  for (const campo of ['clasesRevisadas', 'clasesLeidas', 'materiales', 'archivos', 'enlaces']) if (!entero(value.resumen[campo])) return false
  if (Number(value.resumen.clasesRevisadas) > 20 || Number(value.resumen.clasesLeidas) > Number(value.resumen.clasesRevisadas) || value.resumen.materiales !== value.recursos.length || Number(value.resumen.archivos) + Number(value.resumen.enlaces) !== value.recursos.length) return false
  if (value.hayMas && (Number(value.resumen.clasesRevisadas) === 0 || value.nextOffset !== offset + Number(value.resumen.clasesRevisadas))) return false
  const claves = new Set<string>(), clases = new Map<string, number>()
  let archivos = 0
  for (const recurso of value.recursos) {
    if (!objeto(recurso) || !esUuid(recurso.id) || !esUuid(recurso.claseId) || recurso.clave !== `${recurso.claseId}:${recurso.id}` || claves.has(String(recurso.clave))) return false
    if (!texto(recurso.titulo, 120) || !texto(recurso.claseTitulo, 300) || !texto(recurso.programa, 300) || (recurso.seccion !== 'Clases' && recurso.seccion !== 'Material de apoyo') || !texto(recurso.detalle, 300) || (recurso.tipo !== 'archivo' && recurso.tipo !== 'enlace')) return false
    if (recurso.href !== `/api/classroom/${recurso.claseId}/materiales/${recurso.id}`) return false
    claves.add(String(recurso.clave))
    clases.set(recurso.claseId, (clases.get(recurso.claseId) ?? 0) + 1)
    if (clases.get(recurso.claseId)! > 30) return false
    if (recurso.tipo === 'archivo') archivos++
  }
  if (value.resumen.archivos !== archivos) return false
  const fallos = new Set<string>()
  for (const fallo of value.fallos) {
    if (!objeto(fallo) || !esUuid(fallo.claseId) || fallos.has(fallo.claseId) || !texto(fallo.claseTitulo, 300) || !texto(fallo.programa, 300) || (fallo.seccion !== 'Clases' && fallo.seccion !== 'Material de apoyo')) return false
    fallos.add(fallo.claseId)
    if (clases.has(fallo.claseId)) return false
  }
  if (value.resumen.clasesRevisadas !== Number(value.resumen.clasesLeidas) + fallos.size || clases.size > Number(value.resumen.clasesLeidas)) return false
  return value.estado === 'parcial' ? value.fallos.length > 0 : value.fallos.length === 0
}

function estadoInicial(inicial: PaginaRecursos): EstadoBiblioteca {
  return {
    origen: inicial,
    paginas: 'offset' in inicial ? [inicial] : [],
    actualizada: inicial.estado === 'actualizado',
    accesoError: false,
    cargando: null,
    error: inicial.estado === 'error' ? { offset: 0, mensaje: 'No pudimos cargar la biblioteca de materiales. Volvé a intentar.' } : null,
  }
}

function TarjetaRecurso({ recurso }: { recurso: RecursoBiblioteca }) {
  return <li className="flex min-w-0 flex-col rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-5">
    <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#F4CAD8] text-[#294A38]"><MaterialIcon enlace={recurso.tipo === 'enlace'} /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#746A64]">{recurso.tipo === 'enlace' ? 'Enlace' : 'Archivo'}</p><h2 className="mt-1 break-words text-base font-semibold leading-snug">{recurso.titulo}</h2></div></div>
    <p className="mt-4 break-words text-xs leading-5 text-[#746A64]">{recurso.programa} <span aria-hidden="true">·</span> {recurso.seccion}</p>
    <p className="mt-1 break-words text-sm leading-6 text-[#574D47]">{recurso.claseTitulo}</p>
    <p className="mt-2 break-words text-xs text-[#746A64]">{recurso.detalle}</p>
    <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-5">
      <a href={recurso.href} target="_blank" rel="noopener noreferrer" aria-label={`${recurso.tipo === 'enlace' ? 'Abrir' : 'Descargar'}: ${recurso.titulo} (se abre en otra pestaña)`} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white ${foco}`}>{recurso.tipo === 'enlace' ? 'Abrir enlace' : 'Descargar'}<ArrowIcon diagonal /></a>
      <Link href={`/classroom?clase=${encodeURIComponent(recurso.claseId)}`} className={`inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-[#294A38] ${foco}`}>Ver clase <ArrowIcon /></Link>
    </div>
  </li>
}

export default function ResourceLibraryClient({ inicial }: { inicial: PaginaRecursos }) {
  const [guardado, setGuardado] = useState<EstadoBiblioteca>(() => estadoInicial(inicial))
  const [buscar, setBuscar] = useState('')
  const [programa, setPrograma] = useState('')
  const [tipo, setTipo] = useState<'todos' | 'archivo' | 'enlace'>('todos')
  const solicitud = useRef<{ controller: AbortController; numero: number } | null>(null)
  const secuencia = useRef(0)
  const montado = useRef(true)
  const estado = guardado.origen === inicial ? guardado : estadoInicial(inicial)

  useEffect(() => {
    montado.current = true
    return () => { montado.current = false; solicitud.current?.controller.abort(); solicitud.current = null }
  }, [inicial])

  const paginas = [...estado.paginas].sort((a, b) => a.offset - b.offset)
  const recursosPorClave = new Map<string, RecursoBiblioteca>()
  for (const pagina of paginas) for (const recurso of pagina.recursos) recursosPorClave.set(recurso.clave, recurso)
  const recursos = estado.actualizada ? [] : [...recursosPorClave.values()]
  const visibles = filtrarRecursosBiblioteca(recursos, { buscar, programa, tipo })
  const programas = [...new Set([...recursos.map(recurso => recurso.programa), ...(programa ? [programa] : [])])].sort((a, b) => a.localeCompare(b, 'es'))
  const ultima = paginas.at(-1)
  const nextOffset = ultima?.hayMas ? ultima.nextOffset : null
  const fallos = estado.actualizada ? [] : paginas.filter(pagina => pagina.fallos.length > 0)
  const parcial = paginas.length === 0 || estado.actualizada || nextOffset !== null || fallos.length > 0
  const filtrosActivos = buscar.trim() !== '' || programa !== '' || tipo !== 'todos'
  const archivos = recursos.filter(recurso => recurso.tipo === 'archivo').length
  const bloqueado = estado.cargando !== null

  async function cargar(offset: number, reiniciar = false) {
    if (solicitud.current || !entero(offset)) return
    const controller = new AbortController(), numero = ++secuencia.current
    solicitud.current = { controller, numero }
    const revision = reiniciar ? null : paginas[0]?.revisionCatalogo ?? null
    setGuardado(previo => ({ ...(previo.origen === inicial ? previo : estadoInicial(inicial)), cargando: offset, error: null }))
    const limite = setTimeout(() => {
      if (controller.signal.aborted) return
      controller.abort()
      if (montado.current && secuencia.current === numero) {
        secuencia.current++
        solicitud.current = null
        setGuardado(previo => ({ ...(previo.origen === inicial ? previo : estadoInicial(inicial)), error: { offset, mensaje: 'La carga está tardando más de lo esperado. Volvé a intentar; tus filtros se conservan.' }, cargando: null }))
      }
    }, 90_000)
    try {
      const response = await fetch(`/api/classroom/recursos?offset=${offset}${revision ? `&revision=${encodeURIComponent(revision)}` : ''}`, { cache: 'no-store', signal: controller.signal })
      if (!montado.current || secuencia.current !== numero || controller.signal.aborted) return
      if (response.status === 401 || response.status === 403) {
        setGuardado({ origen: inicial, paginas: [], actualizada: false, accesoError: true, error: null, cargando: null })
        return
      }
      const data: unknown = await response.json()
      if (!montado.current || secuencia.current !== numero || controller.signal.aborted) return
      if (response.ok && objeto(data) && data.estado === 'actualizado') {
        setGuardado(previo => ({ ...(previo.origen === inicial ? previo : estadoInicial(inicial)), paginas: [], actualizada: true, error: null, cargando: null }))
        return
      }
      if (!response.ok || !paginaConfirmada(data, offset, revision)) throw new Error('No pudimos confirmar los materiales de esta página. Volvé a intentar; tus filtros se conservan.')
      setGuardado(previo => {
        const actual = previo.origen === inicial ? previo : estadoInicial(inicial)
        return { ...actual, paginas: [...(reiniciar ? [] : actual.paginas.filter(pagina => pagina.offset !== offset)), data], actualizada: false, error: null, cargando: null }
      })
    } catch {
      if (montado.current && secuencia.current === numero && !controller.signal.aborted) setGuardado(previo => ({ ...(previo.origen === inicial ? previo : estadoInicial(inicial)), error: { offset, mensaje: 'No pudimos cargar estos materiales. Volvé a intentar; tus filtros se conservan.' }, cargando: null }))
    } finally {
      clearTimeout(limite)
      if (solicitud.current?.numero === numero) solicitud.current = null
    }
  }

  function limpiarFiltros() { setBuscar(''); setPrograma(''); setTipo('todos') }

  return <section aria-label="Explorar materiales" className="min-w-0">
    <div className="rounded-[24px] border border-[#E7DDD5] bg-[#FAF7F3] p-4 sm:p-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,.75fr)]">
        <label className="min-w-0 text-xs text-[#746A64]">Buscar material<input type="search" value={buscar} onChange={event => setBuscar(event.target.value)} maxLength={120} placeholder="Nombre, clase o programa" aria-describedby="alcance-busqueda-materiales" className={`mt-2 min-h-11 w-full rounded-xl border border-[#D8CFC8] bg-[#FFFDFA] px-3 py-3 text-base text-[#211C19] ${foco}`} /></label>
        <label className="min-w-0 text-xs text-[#746A64]">Programa<select value={programa} onChange={event => setPrograma(event.target.value)} className={`mt-2 min-h-11 w-full rounded-xl border border-[#D8CFC8] bg-[#FFFDFA] px-3 py-3 text-base text-[#211C19] ${foco}`}><option value="">Todos los programas</option>{programas.map(nombre => <option key={nombre} value={nombre}>{nombre}</option>)}</select></label>
        <label className="min-w-0 text-xs text-[#746A64]">Tipo<select value={tipo} onChange={event => setTipo(event.target.value as typeof tipo)} className={`mt-2 min-h-11 w-full rounded-xl border border-[#D8CFC8] bg-[#FFFDFA] px-3 py-3 text-base text-[#211C19] ${foco}`}><option value="todos">Todos</option><option value="archivo">Archivos</option><option value="enlace">Enlaces</option></select></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1"><p id="alcance-busqueda-materiales" className="text-xs leading-5 text-[#746A64]">{parcial ? `Búsqueda en los materiales cargados.${nextOffset !== null ? ' Cargá más para ampliar los resultados.' : fallos.length > 0 ? ' Reintentá las clases pendientes para completar la consulta.' : ''}` : 'Buscá entre los materiales disponibles para tu cuenta.'}</p>{filtrosActivos && <button type="button" onClick={limpiarFiltros} className={`min-h-11 rounded-lg px-2 text-xs font-semibold text-[#294A38] underline underline-offset-4 ${foco}`}>Limpiar filtros</button>}</div>
    </div>

    {estado.actualizada ? <div role="alert" className="mt-5 rounded-[22px] border border-[#EC9BB6] bg-[#F4CAD8] p-5"><h2 className="text-base font-semibold">Tu biblioteca cambió.</h2><p className="mt-2 text-sm leading-6 text-[#574D47]">Actualizá para consultar los materiales vigentes. Tus filtros se conservan.</p><button type="button" disabled={bloqueado} onClick={() => void cargar(0, true)} className={`mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 ${foco}`}>Actualizar biblioteca <ArrowIcon /></button></div> : <>
      {estado.accesoError && <div role="alert" className="mt-5 rounded-[22px] border border-[#EC9BB6] bg-[#FFFDFA] p-5"><h2 className="text-base font-semibold">No pudimos comprobar tu acceso.</h2><p className="mt-2 text-sm leading-6 text-[#746A64]">Volvé a ingresar para consultar los materiales disponibles para tu cuenta.</p><Link href="/login" className={`mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white ${foco}`}>Volver a ingresar <ArrowIcon /></Link></div>}
      {paginas.length > 0 && <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><p role="status" aria-live="polite" className="text-sm text-[#574D47]">{visibles.length} {visibles.length === 1 ? 'material visible' : 'materiales visibles'} <span className="text-xs text-[#746A64]">de {recursos.length} cargados</span></p><p className="text-xs text-[#746A64]">Cargados: {archivos} {archivos === 1 ? 'archivo' : 'archivos'} · {recursos.length - archivos} {recursos.length - archivos === 1 ? 'enlace' : 'enlaces'}</p></div>}
      {fallos.map(pagina => <div key={pagina.offset} role="alert" className="mt-4 rounded-[20px] border border-[#EC9BB6] bg-[#FFFDFA] p-4"><p className="text-sm font-semibold">Quedaron materiales sin comprobar.</p><p className="mt-2 text-xs leading-5 text-[#746A64]">No pudimos revisar {pagina.fallos.length === 1 ? 'una clase' : `${pagina.fallos.length} clases`}. Los materiales cargados siguen disponibles.</p><ul className="mt-2 space-y-1 text-xs leading-5 text-[#746A64]">{pagina.fallos.map(fallo => <li key={fallo.claseId} className="break-words">{fallo.claseTitulo}</li>)}</ul><button type="button" disabled={bloqueado} onClick={() => void cargar(pagina.offset)} className={`mt-3 min-h-11 rounded-full border border-[#D8CFC8] px-4 text-xs font-semibold text-[#294A38] disabled:opacity-60 ${foco}`}>Reintentar estas clases</button></div>)}
      {recursos.length > 0 && visibles.length === 0 ? <div className="mt-5 rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-6"><h2 className="text-base font-semibold">No hay coincidencias en los materiales cargados.</h2><p className="mt-2 text-sm leading-6 text-[#746A64]">Probá otra búsqueda o limpiá los filtros.{nextOffset !== null ? ' También podés cargar más materiales.' : ''}</p></div>
        : visibles.length > 0 ? <ul className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visibles.map(recurso => <TarjetaRecurso key={recurso.clave} recurso={recurso} />)}</ul>
          : paginas.length > 0 && !estado.error && <div className="mt-5 rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-6"><h2 className="text-base font-semibold">{parcial ? 'Todavía no se cargaron materiales.' : 'Todavía no hay materiales disponibles.'}</h2><p className="mt-2 text-sm leading-6 text-[#746A64]">{parcial ? 'Podés cargar más clases o reintentar las que faltan.' : 'Cuando Flor agregue archivos o enlaces a tus clases, van a aparecer acá.'}</p></div>}
    </>}

    {estado.error && <div role="alert" className="mt-4 rounded-[20px] border border-[#EC9BB6] bg-[#FFFDFA] p-5"><p className="text-sm leading-6 text-[#574D47]">{estado.error.mensaje}</p><button type="button" disabled={bloqueado} onClick={() => void cargar(estado.error!.offset, estado.actualizada)} className={`mt-3 min-h-11 rounded-full border border-[#D8CFC8] px-4 text-sm font-semibold text-[#294A38] disabled:opacity-60 ${foco}`}>Reintentar materiales</button></div>}
    {bloqueado && <p role="status" aria-live="polite" className="mt-5 text-sm text-[#746A64]">Cargando materiales…</p>}
    {!estado.actualizada && nextOffset !== null && <div className="mt-6 flex justify-center"><button type="button" disabled={bloqueado} onClick={() => void cargar(nextOffset)} className={`inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-[#294A38] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60 ${foco}`}>Cargar más materiales <ArrowIcon /></button></div>}
  </section>
}
