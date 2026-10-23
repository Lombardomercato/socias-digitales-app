'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import ArrowIcon from './ArrowIcon'
import NavigationIcon from './NavigationIcon'
import { fechaDiaValida, moverDia, nombreDia, validarTarea, type DatosTarea, type TareaDia } from '@/lib/my-day'
import { tiempoClase } from '@/lib/class-progress'
import { confirmarTareaEstudioCreada, textoTareaEstudio, type PlanEstudio } from '@/lib/study-planner'

interface Props {
  plan: PlanEstudio
  fechaInicial: string
  hoy: string
  alumnaId: string
  bloqueada?: boolean
  onBorradorChange: (abierto: boolean) => void
  onGuardada: (tarea: TareaDia) => void
}
const boton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38]'
const campo = 'mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[#D8CFC8] bg-[#FFFDFA] px-3 py-3 text-base outline-none focus:border-[#294A38] disabled:opacity-60'

export default function StudyPlannerClient({ plan, fechaInicial, hoy, alumnaId, bloqueada = false, onBorradorChange, onGuardada }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [seleccion, setSeleccion] = useState(plan.opciones[0]?.id ?? '')
  const [fecha, setFecha] = useState(fechaDiaValida(fechaInicial) && fechaInicial >= hoy ? fechaInicial : hoy)
  const [texto, setTexto] = useState(plan.opciones[0] ? textoTareaEstudio(plan.opciones[0]) : '')
  const [ocupada, setOcupada] = useState(false)
  const [error, setError] = useState('')
  const [incierto, setIncierto] = useState(false)
  const [requiereRevision, setRequiereRevision] = useState(false)
  const [fechaEnviada, setFechaEnviada] = useState<string | null>(null)
  const [guardada, setGuardada] = useState<TareaDia | null>(null)
  const bloqueo = useRef(false)
  const intento = useRef<{ id: string; datos: DatosTarea } | null>(null)
  const opcion = plan.opciones.find(o => o.id === seleccion)
  const puedeEditar = !ocupada && !incierto && !bloqueada

  useEffect(() => {
    if (!abierto) return
    const salir = (evento: BeforeUnloadEvent) => { evento.preventDefault(); evento.returnValue = '' }
    window.addEventListener('beforeunload', salir)
    return () => window.removeEventListener('beforeunload', salir)
  }, [abierto])

  function abrir() {
    if (bloqueada || plan.estado !== 'listo' || !opcion) return
    setGuardada(null); setAbierto(true); onBorradorChange(true)
  }
  function cerrar() {
    if (bloqueo.current) return
    // Una respuesta perdida conserva el mismo intento al volver a abrir.
    setAbierto(false); onBorradorChange(false)
  }
  async function guardar(evento: React.FormEvent) {
    evento.preventDefault()
    if (bloqueo.current || bloqueada || requiereRevision || (!intento.current && (!opcion || plan.estado !== 'listo'))) return
    if (!intento.current) {
      try {
        // Los controles nativos y el autocompletado pueden actualizar el valor
        // visible sin emitir el mismo cambio de React que un teclado normal.
        const formulario = evento.currentTarget as HTMLFormElement | undefined
        const campoFecha = formulario?.elements.namedItem('fecha-estudio') as HTMLInputElement | null | undefined
        const campoTexto = formulario?.elements.namedItem('texto-estudio') as HTMLInputElement | null | undefined
        const fechaVisible = campoFecha?.value ?? fecha
        const textoVisible = campoTexto?.value ?? texto
        if (!fechaDiaValida(fechaVisible) || fechaVisible < hoy) throw new Error('Elegí hoy o una fecha futura para tu clase.')
        const id = crypto.randomUUID()
        const entrada = validarTarea({ id, version: null, texto: textoVisible, fecha: fechaVisible, categoria: 'negocio_digital', completada: false, archivada: false }, 'crear')
        intento.current = { id, datos: entrada.datos }
        setFechaEnviada(entrada.datos.fecha)
      } catch (causa) { setError(causa instanceof Error ? causa.message : 'Revisá tu plan.'); return }
    }
    const envio = intento.current
    bloqueo.current = true; setOcupada(true); setError('')
    const controlador = new AbortController()
    const plazo = setTimeout(() => controlador.abort(), 20_000)
    try {
      const respuesta = await fetch('/api/checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controlador.signal, body: JSON.stringify({ id: envio.id, version: null, ...envio.datos }) })
      if ([401, 403, 409].includes(respuesta.status)) setRequiereRevision(true)
      const datos = await respuesta.json()
      if (!respuesta.ok) {
        throw new Error(typeof datos.error === 'string' ? datos.error : 'No pudimos confirmar tu tarea.')
      }
      const tarea = confirmarTareaEstudioCreada(datos, { id: envio.id, alumnaId, datos: envio.datos })
      if (!tarea) throw new Error('No pudimos confirmar los datos guardados.')
      setGuardada(tarea); setAbierto(false); setIncierto(false); setFechaEnviada(null); intento.current = null
      onBorradorChange(false); onGuardada(tarea)
    } catch (causa) {
      setIncierto(true)
      const mensaje = causa instanceof Error && causa.name === 'AbortError' ? 'La confirmación tardó más de lo esperado.'
        : causa instanceof TypeError || causa instanceof SyntaxError || !(causa instanceof Error) ? 'No pudimos confirmar el guardado por un problema de conexión.' : causa.message
      setError(`${mensaje} Reintentá confirmar el mismo envío o revisá ese día en tu agenda antes de crear otra tarea.`)
    } finally { clearTimeout(plazo); bloqueo.current = false; setOcupada(false) }
  }

  return <section id="plan-de-estudio" aria-labelledby="plan-estudio-titulo" className="mb-5 min-w-0 scroll-mt-5 rounded-[24px] border border-[#EC9BB6] bg-[#F4CAD8] p-5 sm:p-6">
    <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#294A38]"><NavigationIcon name="clases" />Tu plan de estudio</p>
    <h2 id="plan-estudio-titulo" className="mt-3 text-xl font-semibold leading-snug">Hacé lugar para tu próxima clase.</h2>
    <p className="mt-2 text-sm leading-6 text-[#574D47]">Un ratito para aprender también merece su lugar en tu agenda.</p>
    {plan.estado === 'error' ? <div role="alert" className="mt-4 rounded-2xl border border-[#EC9BB6] bg-[#FFFDFA] p-4 text-sm leading-6"><p>No pudimos reunir tus próximas clases. Tus tareas siguen disponibles.</p><a href="/checklist#plan-de-estudio" className="mt-2 inline-flex min-h-11 items-center font-semibold text-[#294A38] underline underline-offset-4">Volver a cargar el plan</a></div>
      : !plan.opciones.length ? <p className="mt-4 text-sm leading-6 text-[#574D47]">No hay una próxima clase disponible para planificar. Podés repasar tu biblioteca o agregar una tarea propia.</p>
      : !abierto && !guardada ? <div className="mt-5"><p className="text-xs leading-5 text-[#574D47]">Elegí el próximo paso de uno de tus programas y reservá un día para vos.</p><button type="button" disabled={bloqueada} onClick={abrir} className={`mt-4 ${boton}`}>{incierto ? 'Revisar envío pendiente' : 'Planificar una clase'} <ArrowIcon /></button>{bloqueada && <p className="mt-2 text-xs leading-5 text-[#574D47]">Guardá o cancelá la tarea que tenés abierta para planificar.</p>}</div> : null}
    {abierto && <form onSubmit={guardar} className="mt-5">
      <fieldset disabled={!puedeEditar} className="space-y-4">
        <label className="block text-sm font-medium">Programa<select value={seleccion} onChange={e => { const siguiente = plan.opciones.find(o => o.id === e.target.value); setSeleccion(e.target.value); setTexto(siguiente ? textoTareaEstudio(siguiente) : ''); setError('') }} className={campo}>{plan.opciones.map(o => <option key={o.id} value={o.id}>{o.programa}</option>)}</select></label>
        {opcion && <div className="rounded-2xl border border-[#EC9BB6] bg-[#FFFDFA] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#746A64]">{opcion.motivo === 'continuar' ? 'Para retomar' : 'Tu siguiente clase'} · {opcion.seccion}</p><h3 className="mt-2 break-words text-base font-semibold">{opcion.titulo}</h3>{opcion.motivo === 'continuar' && <p className="mt-2 text-xs text-[#746A64]">Te espera desde {tiempoClase(opcion.posicionSeg ?? 0)}.</p>}</div>}
        <label className="block text-sm font-medium">¿Qué día vas a estudiar?<input name="fecha-estudio" type="date" required min={hoy} max="2099-12-31" value={fecha} onInput={e => { setFecha(e.currentTarget.value); setError('') }} onChange={e => { setFecha(e.target.value); setError('') }} className={campo} /></label>
        <div className="flex flex-wrap gap-2"><button type="button" aria-pressed={fecha === hoy} onClick={() => { setFecha(hoy); setError('') }} className="min-h-11 rounded-full border border-[#294A38]/25 bg-[#FFFDFA] px-4 py-2 text-sm text-[#294A38]">Hoy</button><button type="button" disabled={!fechaDiaValida(moverDia(hoy, 1))} aria-pressed={fecha === moverDia(hoy, 1)} onClick={() => { setFecha(moverDia(hoy, 1)); setError('') }} className="min-h-11 rounded-full border border-[#294A38]/25 bg-[#FFFDFA] px-4 py-2 text-sm text-[#294A38] disabled:opacity-50">Mañana</button></div>
        <label className="block text-sm font-medium">Nombre de tu tarea<input name="texto-estudio" required maxLength={300} value={texto} onChange={e => { setTexto(e.target.value); setError('') }} className={campo} /></label>
      </fieldset>
      {fechaDiaValida(fecha) && <p className="mt-3 text-sm leading-6 text-[#294A38]">Va a quedar pendiente para <strong>{nombreDia(fecha)}</strong>.</p>}
      <p className="mt-4 text-xs leading-5 text-[#574D47]">Se guarda como tarea de Negocio digital. Completarla no marca el video como visto.</p>
      {error && <p role="alert" className="mt-4 rounded-xl border border-[#B01B30]/30 bg-[#FFFDFA] p-4 text-sm leading-6 text-[#B01B30]">{error}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3"><button type="submit" disabled={ocupada || bloqueada || requiereRevision || (!incierto && (!texto.trim() || !fechaDiaValida(fecha) || fecha < hoy))} className={boton}>{ocupada ? 'Confirmando…' : incierto ? 'Reintentar confirmación' : 'Confirmar en mi agenda'} <ArrowIcon /></button><button type="button" disabled={ocupada} onClick={cerrar} className="min-h-11 px-2 text-sm font-medium text-[#574D47] underline underline-offset-4 disabled:opacity-50">{incierto ? 'Cerrar sin volver a enviar' : 'Cancelar plan'}</button></div>
      {requiereRevision && <p className="mt-2 text-sm leading-6 text-[#574D47]">Necesitamos volver a comprobar tu cuenta y el estado de ese envío desde tu agenda antes de continuar.</p>}
      {incierto && fechaEnviada && <a href={`/checklist?fecha=${fechaEnviada}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-[#294A38] underline underline-offset-4">Revisar ese día en mi agenda</a>}
    </form>}
    {guardada && <div role="status" className="mt-5 rounded-2xl border border-[#E7DDD5] bg-[#FFFDFA] p-4"><p className="text-base font-semibold text-[#294A38]">¡Buen plan, Socia!</p><p className="mt-2 break-words text-sm leading-6">{guardada.texto}</p><p className="mt-2 text-sm leading-6 text-[#746A64]">Te hiciste un lugar para {nombreDia(guardada.fecha)}. La tarea quedó pendiente.</p><Link href={`/checklist?fecha=${guardada.fecha}`} prefetch={false} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#294A38]">Ver ese día en mi agenda <ArrowIcon /></Link><button type="button" disabled={bloqueada} onClick={abrir} className="mt-2 flex min-h-11 items-center text-sm text-[#746A64] underline underline-offset-4 disabled:opacity-50">Planificar otro paso</button></div>}
  </section>
}
