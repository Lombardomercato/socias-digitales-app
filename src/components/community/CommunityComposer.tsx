'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import ArrowIcon from '@/components/ArrowIcon'
import NavigationIcon from '@/components/NavigationIcon'
import { esPublicacionComunidad, type PublicacionComunidad } from '@/lib/community'
import CommunityAvatar from './CommunityAvatar'
import { accionComunidad, campoComunidad, controlComunidad, ErrorComunidad, errorComunidad, esRespuestaComunidad, solicitarComunidad, textoComunidad, tiposComunidad } from './community-client'

interface Props {
  nombre: string | null
  publicacion?: PublicacionComunidad
  onGuardada: (publicacion: PublicacionComunidad) => void
  onBorrador: (activo: boolean) => void
  onAcceso: () => void
  onCancelar?: () => void
  lecturaPendiente?: boolean
}
interface Intencion { id: string; tipo: PublicacionComunidad['tipo']; contenido: string; version?: number; accion?: 'editar' }

export default function CommunityComposer({ nombre, publicacion, onGuardada, onBorrador, onAcceso, onCancelar, lecturaPendiente = false }: Props) {
  const [contenido, setContenido] = useState(publicacion?.contenido ?? '')
  const [tipo, setTipo] = useState<PublicacionComunidad['tipo']>(publicacion?.tipo ?? 'avance')
  const [intencion, setIntencion] = useState<Intencion | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [bloqueada, setBloqueada] = useState(false)
  const ocupada = useRef(false), viva = useRef(false)
  const abortador = useRef<AbortController | null>(null)
  const hayBorrador = Boolean(contenido.trim() || intencion)
  const formularioId = publicacion ? `editar-${publicacion.id}` : 'crear-publicacion'

  useEffect(() => {
    viva.current = true
    return () => { viva.current = false; abortador.current?.abort() }
  }, [])
  useEffect(() => {
    if (!hayBorrador) return
    const advertir = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', advertir)
    return () => window.removeEventListener('beforeunload', advertir)
  }, [hayBorrador])

  function cambiarTexto(value: string) { setContenido(value); setError(''); onBorrador(Boolean(value.trim()) || Boolean(publicacion)) }
  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (ocupada.current || bloqueada || lecturaPendiente) return
    const visible = event.currentTarget.elements.namedItem('contenido') as HTMLTextAreaElement | null
    const texto = textoComunidad(visible?.value ?? contenido)
    if (!intencion && (!texto || texto.length > 2000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(texto))) { setError('Escribí entre 1 y 2.000 caracteres, sin caracteres de control.'); return }
    const envio = intencion ?? { id: publicacion?.id ?? crypto.randomUUID(), tipo, contenido: texto, ...(publicacion ? { version: publicacion.version, accion: 'editar' as const } : {}) }
    ocupada.current = true; setEnviando(true); setError(''); setIntencion(envio); onBorrador(true)
    const controller = new AbortController(); abortador.current = controller
    try {
      const { id, ...edicion } = envio
      const response = await solicitarComunidad(publicacion ? `/api/comunidad/${id}` : '/api/comunidad', { method: publicacion ? 'PATCH' : 'POST', body: JSON.stringify(publicacion ? edicion : envio), signal: controller.signal })
      if (!esRespuestaComunidad(response) || !esPublicacionComunidad(response.publicacion)) throw new ErrorComunidad(null, true)
      const guardada = response.publicacion
      if (guardada.id !== envio.id || guardada.contenido !== envio.contenido || guardada.tipo !== envio.tipo || !guardada.propia || guardada.retirada || guardada.oculta || (envio.version !== undefined && guardada.version <= envio.version)) throw new ErrorComunidad(null, true)
      if (!viva.current) return
      setIntencion(null); setContenido(''); setTipo('avance'); onBorrador(false); onGuardada(guardada)
    } catch (cause) {
      if (!viva.current) return
      const fallo = errorComunidad(cause)
      setError(fallo.message)
      if (!fallo.pendiente) { setIntencion(null); if (fallo.status !== 400 && fallo.status !== 422) setBloqueada(true) }
      if (fallo.status === 401 || fallo.status === 403) onAcceso()
    } finally {
      ocupada.current = false
      if (viva.current) setEnviando(false)
      if (abortador.current === controller) abortador.current = null
    }
  }

  return <form onSubmit={event => void enviar(event)} aria-label={publicacion ? 'Editar publicación' : 'Compartir con las Socias'} className={`min-w-0 rounded-[24px] border p-4 sm:p-6 ${publicacion ? 'border-[#E7DDD5] bg-[#FAF7F3]' : 'border-[#EC9BB6] bg-[#FFFDFA]'}`}>
    {!publicacion && <div className="mb-5 flex items-center gap-3"><CommunityAvatar nombre={nombre} /><div className="min-w-0"><h2 className="text-base font-semibold">¿Qué querés compartir hoy?</h2><p className="mt-1 text-xs leading-5 text-[#746A64]">Un paso, una duda o una idea. Este es tu espacio.</p></div></div>}
    <fieldset disabled={enviando || Boolean(intencion) || bloqueada || lecturaPendiente} className="min-w-0 disabled:opacity-80">
      <legend className="sr-only">Tipo y texto de la publicación</legend>
      <div role="group" aria-label="Tipo de publicación" className="mb-4 flex flex-wrap gap-2">{tiposComunidad.map(opcion => <button key={opcion.id} type="button" onClick={() => setTipo(opcion.id)} aria-pressed={tipo === opcion.id} className={`${controlComunidad} px-3 ${tipo === opcion.id ? 'border-[#294A38] bg-[#294A38] text-white' : 'bg-[#FAF7F3]'}`}><NavigationIcon name={opcion.icono} />{opcion.nombre}</button>)}</div>
      <label htmlFor={formularioId} className="sr-only">{publicacion ? 'Texto de tu publicación' : 'Tu publicación'}</label>
      <textarea id={formularioId} name="contenido" value={contenido} onChange={event => cambiarTexto(event.target.value)} maxLength={2000} rows={publicacion ? 4 : 3} placeholder={tipo === 'pregunta' ? '¿En qué te gustaría que te acompañemos?' : tipo === 'idea' ? 'Esa idea que puede inspirar a otra Socia…' : 'Hoy avancé en…'} aria-describedby={`${formularioId}-ayuda ${formularioId}-contador${error ? ` ${formularioId}-error` : ''}`} className={campoComunidad} />
    </fieldset>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p id={`${formularioId}-ayuda`} className="max-w-md text-xs leading-5 text-[#746A64]">Visible para las Socias con acceso. No incluyas datos de clientas, comprobantes ni información privada.</p><p id={`${formularioId}-contador`} className="text-xs tabular-nums text-[#746A64]">{contenido.length.toLocaleString('es-AR')} / 2.000</p></div>
    {error && <p id={`${formularioId}-error`} role="alert" className="mt-4 rounded-[14px] border border-[#EC9BB6] bg-[#F4CAD8] p-3 text-sm leading-6">{error}</p>}
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      {onCancelar && <button type="button" onClick={onCancelar} disabled={enviando || Boolean(intencion)} className={controlComunidad}>Cancelar edición</button>}
      {!publicacion && bloqueada && <button type="button" onClick={() => { if (!window.confirm('¿Cerrar este borrador sin reenviar? Actualizá la comunidad antes de empezar otro.')) return; setContenido(''); setIntencion(null); setBloqueada(false); setError(''); onBorrador(false) }} className={controlComunidad}>Cerrar sin reenviar</button>}
      <button type="submit" disabled={enviando || bloqueada || lecturaPendiente || (!intencion && !contenido.trim())} aria-busy={enviando} className={accionComunidad}>{enviando ? 'Confirmando…' : intencion ? 'Reintentar el mismo envío' : publicacion ? 'Guardar cambios' : 'Compartir'}{!enviando && <ArrowIcon />}</button>
    </div>
    {intencion && !enviando && !bloqueada && <p className="mt-3 text-xs leading-5 text-[#746A64]">El texto queda protegido hasta confirmar si se publicó. Reintentar no crea otra publicación.</p>}
  </form>
}
