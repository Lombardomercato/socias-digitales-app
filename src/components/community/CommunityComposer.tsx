'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import ArrowIcon from '@/components/ArrowIcon'
import NavigationIcon from '@/components/NavigationIcon'
import { compararFotosComunidad, esFotoComunidad, esPublicacionComunidad, type FotoComunidad, type PublicacionComunidad } from '@/lib/community'
import { prepararFotoComunidad, validarArchivoFotoComunidad } from '@/lib/community-photo-client'
import CommunityAvatar from './CommunityAvatar'
import CommunityPhotoPicker, { type FotoEnEditorComunidad } from './CommunityPhotoPicker'
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
interface IntencionBase { id: string; tipo: PublicacionComunidad['tipo']; contenido: string; version?: number; accion?: 'editar' }
interface PreparacionEnvio extends IntencionBase { fotoIds: string[] }
interface Intencion extends IntencionBase { fotos: FotoComunidad[] }
interface FotoBorrador extends FotoEnEditorComunidad { archivo: Blob | null; foto: FotoComunidad | null }

class ErrorFotoComunidad extends ErrorComunidad {
  constructor(status: number | null, pendiente: boolean) {
    super(status, pendiente)
    if (status === 429) { this.message = 'Llegaste al límite de fotos de hoy. Podés quitar las fotos y compartir tu texto, o volver a intentarlo mañana.'; return }
    if (status !== 401 && status !== 403) this.message = pendiente
      ? 'No pudimos confirmar la carga de esta foto. La conservamos para reintentar sin duplicarla.'
      : 'No pudimos aceptar esta foto. Podés quitarla o reemplazarla sin perder tu texto.'
  }
}

async function cargarFoto(postId: string, fotoId: string, archivo: Blob, signal: AbortSignal): Promise<FotoComunidad> {
  const controller = new AbortController(), cancelar = () => controller.abort()
  signal.addEventListener('abort', cancelar, { once: true })
  if (signal.aborted) controller.abort()
  const timeout = setTimeout(cancelar, 60_000)
  try {
    const response = await fetch(`/api/comunidad/${postId}/fotos/${fotoId}`, { method: 'PUT', body: archivo, headers: { 'Content-Type': archivo.type }, credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
    if (!response.ok) throw new ErrorFotoComunidad(response.status, ![400, 401, 403, 404, 409, 413, 415, 422, 429].includes(response.status))
    let data: unknown
    try { data = await response.json() } catch { throw new ErrorFotoComunidad(null, true) }
    if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== 1 || !('foto' in data) || !esFotoComunidad(data.foto) || data.foto.id !== fotoId) throw new ErrorFotoComunidad(null, true)
    return data.foto
  } catch (cause) {
    if (cause instanceof ErrorFotoComunidad) throw cause
    throw new ErrorFotoComunidad(null, true)
  } finally { clearTimeout(timeout); signal.removeEventListener('abort', cancelar) }
}

export default function CommunityComposer({ nombre, publicacion, onGuardada, onBorrador, onAcceso, onCancelar, lecturaPendiente = false }: Props) {
  const [contenido, setContenido] = useState(publicacion?.contenido ?? '')
  const [tipo, setTipo] = useState<PublicacionComunidad['tipo']>(publicacion?.tipo ?? 'avance')
  const [fotos, setFotos] = useState<FotoBorrador[]>(() => (publicacion?.fotos ?? []).map((foto, indice) => ({ id: foto.id, nombre: `Foto ${indice + 1}`, preview: `/api/comunidad/${publicacion!.id}/fotos/${foto.id}`, estado: 'cargada', error: '', archivo: null, foto })))
  const [preparando, setPreparando] = useState(false)
  const [preEnvio, setPreEnvio] = useState<PreparacionEnvio | null>(null)
  const [intencion, setIntencion] = useState<Intencion | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [estadoCarga, setEstadoCarga] = useState('')
  const [error, setError] = useState('')
  const [bloqueada, setBloqueada] = useState(false)
  const ocupada = useRef(false), viva = useRef(false), preparandoActual = useRef(false)
  const idBorrador = useRef<string | null>(publicacion?.id ?? null)
  const fotosActuales = useRef<FotoBorrador[]>(fotos)
  const urls = useRef(new Set<string>()), preparadores = useRef(new Set<AbortController>())
  const abortador = useRef<AbortController | null>(null)
  const hayBorrador = Boolean(contenido.trim() || fotos.length || intencion || preEnvio)
  const congelada = enviando || Boolean(intencion || preEnvio) || bloqueada || lecturaPendiente
  const formularioId = publicacion ? `editar-${publicacion.id}` : 'crear-publicacion'

  useEffect(() => {
    viva.current = true
    const creadas = urls.current, procesos = preparadores.current
    return () => {
      viva.current = false; abortador.current?.abort()
      for (const controller of procesos) controller.abort()
      for (const url of creadas) URL.revokeObjectURL(url)
      creadas.clear(); procesos.clear()
    }
  }, [])
  useEffect(() => {
    if (!hayBorrador) return
    const advertir = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', advertir)
    return () => window.removeEventListener('beforeunload', advertir)
  }, [hayBorrador])

  function cambiarFotos(cambio: (actuales: FotoBorrador[]) => FotoBorrador[]) {
    fotosActuales.current = cambio(fotosActuales.current)
    setFotos(fotosActuales.current)
  }
  function liberarPreview(foto: FotoBorrador) {
    if (foto.preview && urls.current.delete(foto.preview)) URL.revokeObjectURL(foto.preview)
  }
  function limpiarFotos() { for (const foto of fotosActuales.current) liberarPreview(foto); cambiarFotos(() => []) }
  function cambiarTexto(value: string) { setContenido(value); setError(''); onBorrador(Boolean(value.trim()) || Boolean(fotosActuales.current.length) || Boolean(publicacion)) }

  async function seleccionarFotos(archivos: File[], reemplazarId?: string) {
    if (ocupada.current || preparandoActual.current || congelada || !archivos.length) return
    const anteriores = fotosActuales.current
    if ((reemplazarId && (!anteriores.some(foto => foto.id === reemplazarId) || archivos.length !== 1)) || anteriores.length - (reemplazarId ? 1 : 0) + archivos.length > 4) { setError('Podés compartir hasta 4 fotos por publicación.'); return }
    try { for (const archivo of archivos) validarArchivoFotoComunidad(archivo) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Elegí fotos JPG, PNG o WebP de hasta 20 MB.'); return }
    idBorrador.current ??= crypto.randomUUID()
    preparandoActual.current = true; setPreparando(true); setError(''); onBorrador(true)
    const seleccionadas = archivos.map(archivo => ({ archivo, id: crypto.randomUUID() }))
    const nuevas: FotoBorrador[] = seleccionadas.map(({ archivo, id }) => ({ id, nombre: archivo.name, preview: null, estado: 'preparando', error: '', archivo: null, foto: null }))
    if (reemplazarId) {
      const anterior = anteriores.find(foto => foto.id === reemplazarId)!
      liberarPreview(anterior)
      cambiarFotos(actuales => actuales.map(foto => foto.id === reemplazarId ? nuevas[0] : foto))
    } else cambiarFotos(actuales => [...actuales, ...nuevas])
    try {
      // At most one decoded original is held at a time on mobile.
      for (const seleccion of seleccionadas) {
        const controller = new AbortController(); preparadores.current.add(controller)
        try {
          const preparada = await prepararFotoComunidad(seleccion.archivo, controller.signal)
          if (!viva.current || controller.signal.aborted) return
          const preview = URL.createObjectURL(preparada.archivo); urls.current.add(preview)
          cambiarFotos(actuales => actuales.map(foto => foto.id === seleccion.id ? { ...foto, preview, archivo: preparada.archivo, estado: 'lista', error: '' } : foto))
        } catch (cause) {
          if (!viva.current || controller.signal.aborted) return
          const mensaje = cause instanceof Error ? cause.message : 'No pudimos preparar esta foto. Probá con otra imagen.'
          cambiarFotos(actuales => actuales.map(foto => foto.id === seleccion.id ? { ...foto, estado: 'error', error: mensaje } : foto))
        } finally { preparadores.current.delete(controller) }
      }
    } finally { preparandoActual.current = false; if (viva.current) setPreparando(false) }
  }
  function quitarFoto(id: string) {
    if (ocupada.current || preparandoActual.current || congelada) return
    const anterior = fotosActuales.current.find(foto => foto.id === id)
    if (!anterior) return
    liberarPreview(anterior); cambiarFotos(actuales => actuales.filter(foto => foto.id !== id)); setError('')
    onBorrador(Boolean(contenido.trim()) || Boolean(fotosActuales.current.length) || Boolean(publicacion))
  }

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (ocupada.current || preparandoActual.current || bloqueada || lecturaPendiente) return
    const visible = event.currentTarget.elements.namedItem('contenido') as HTMLTextAreaElement | null
    const texto = textoComunidad(visible?.value ?? contenido)
    if (!intencion && !preEnvio) {
      if ((!texto && !fotosActuales.current.length) || [...texto].length > 2000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(texto)) { setError('Escribí un mensaje de hasta 2.000 caracteres o agregá una foto para compartir.'); return }
      if (fotosActuales.current.some(foto => !foto.foto && !foto.archivo)) { setError('Quitá o reemplazá las fotos que no se pudieron preparar. Tu texto sigue acá.'); return }
    }
    idBorrador.current ??= crypto.randomUUID()
    const base = preEnvio ?? { id: idBorrador.current, tipo, contenido: texto, fotoIds: fotosActuales.current.map(foto => foto.id), ...(publicacion ? { version: publicacion.version, accion: 'editar' as const } : {}) }
    ocupada.current = true; setEnviando(true); setError(''); setPreEnvio(base); onBorrador(true)
    const controller = new AbortController(); abortador.current = controller
    try {
      let envio = intencion
      if (!envio) {
        const confirmadas: FotoComunidad[] = []
        for (const [indice, id] of base.fotoIds.entries()) {
          let foto = fotosActuales.current.find(item => item.id === id)
          if (!foto) throw new ErrorFotoComunidad(null, true)
          if (!foto.foto) {
            if (!foto.archivo) throw new ErrorFotoComunidad(400, false)
            setEstadoCarga(`Cargando foto ${indice + 1} de ${base.fotoIds.length}…`)
            cambiarFotos(actuales => actuales.map(item => item.id === id ? { ...item, estado: 'subiendo', error: '' } : item))
            try {
              const confirmada = await cargarFoto(base.id, id, foto.archivo, controller.signal)
              if (!viva.current) return
              cambiarFotos(actuales => actuales.map(item => item.id === id ? { ...item, estado: 'cargada', error: '', foto: confirmada } : item))
              foto = fotosActuales.current.find(item => item.id === id)!
            } catch (cause) {
              if (viva.current) cambiarFotos(actuales => actuales.map(item => item.id === id ? { ...item, estado: 'error', error: errorComunidad(cause).message } : item))
              throw cause
            }
          }
          confirmadas.push(foto.foto!)
        }
        const { fotoIds, ...datos } = base
        void fotoIds
        envio = { ...datos, fotos: confirmadas }
        setIntencion(envio)
      }
      setEstadoCarga(publicacion ? 'Guardando tu publicación…' : 'Publicando…')
      const { id, ...edicion } = envio
      const response = await solicitarComunidad(publicacion ? `/api/comunidad/${id}` : '/api/comunidad', { method: publicacion ? 'PATCH' : 'POST', body: JSON.stringify(publicacion ? edicion : envio), signal: controller.signal })
      if (!esRespuestaComunidad(response) || !esPublicacionComunidad(response.publicacion)) throw new ErrorComunidad(null, true)
      const guardada = response.publicacion
      if (guardada.id !== envio.id || guardada.contenido !== envio.contenido || guardada.tipo !== envio.tipo || !compararFotosComunidad(guardada.fotos, envio.fotos) || !guardada.propia || guardada.retirada || guardada.oculta || (envio.version !== undefined && guardada.version <= envio.version)) throw new ErrorComunidad(null, true)
      if (!viva.current) return
      setIntencion(null); setPreEnvio(null); setContenido(''); setTipo('avance'); idBorrador.current = null; limpiarFotos(); onBorrador(false); onGuardada(guardada)
    } catch (cause) {
      if (!viva.current) return
      const fallo = errorComunidad(cause)
      setError(fallo.message)
      if (!fallo.pendiente) {
        setIntencion(null); setPreEnvio(null)
        if (fallo instanceof ErrorFotoComunidad) { if (fallo.status === 401 || fallo.status === 403) setBloqueada(true) }
        else if (fallo.status !== 400 && fallo.status !== 422) setBloqueada(true)
      }
      if (fallo.status === 401 || fallo.status === 403) onAcceso()
    } finally {
      ocupada.current = false
      if (viva.current) { setEnviando(false); setEstadoCarga('') }
      if (abortador.current === controller) abortador.current = null
    }
  }

  return <form onSubmit={event => void enviar(event)} aria-label={publicacion ? 'Editar publicación' : 'Compartir con las Socias'} className={`min-w-0 rounded-[24px] border p-4 sm:p-6 ${publicacion ? 'border-[#E7DDD5] bg-[#FAF7F3]' : 'border-[#EC9BB6] bg-[#FFFDFA]'}`}>
    {!publicacion && <div className="mb-5 flex items-center gap-3"><CommunityAvatar nombre={nombre} /><div className="min-w-0"><h2 className="text-base font-semibold">¿Qué querés compartir hoy?</h2><p className="mt-1 text-xs leading-5 text-[#746A64]">Un paso, una duda o una idea. Este es tu espacio.</p></div></div>}
    <fieldset disabled={congelada} className="min-w-0 disabled:opacity-80">
      <legend className="sr-only">Tipo y texto de la publicación</legend>
      <div role="group" aria-label="Tipo de publicación" className="mb-4 flex flex-wrap gap-2">{tiposComunidad.map(opcion => <button key={opcion.id} type="button" onClick={() => setTipo(opcion.id)} aria-pressed={tipo === opcion.id} className={`${controlComunidad} px-3 ${tipo === opcion.id ? 'border-[#294A38] bg-[#294A38] text-white' : 'bg-[#FAF7F3]'}`}><NavigationIcon name={opcion.icono} />{opcion.nombre}</button>)}</div>
      <label htmlFor={formularioId} className="sr-only">{publicacion ? 'Texto de tu publicación' : 'Tu publicación'}</label>
      <textarea id={formularioId} name="contenido" value={contenido} onChange={event => cambiarTexto(event.target.value)} maxLength={2000} rows={publicacion ? 4 : 3} placeholder={tipo === 'pregunta' ? '¿En qué te gustaría que te acompañemos?' : tipo === 'idea' ? 'Esa idea que puede inspirar a otra Socia…' : 'Hoy avancé en…'} aria-describedby={`${formularioId}-ayuda ${formularioId}-contador${error ? ` ${formularioId}-error` : ''}`} className={campoComunidad} />
    </fieldset>
    <CommunityPhotoPicker fotos={fotos} bloqueada={congelada} preparando={preparando} onSeleccion={(archivos, id) => void seleccionarFotos(archivos, id)} onQuitar={quitarFoto} />
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p id={`${formularioId}-ayuda`} className="max-w-md text-xs leading-5 text-[#746A64]">Visible para las Socias con acceso. No incluyas datos de clientas, comprobantes ni información privada.{fotos.length > 0 ? ' Con fotos, el texto es opcional.' : ''}</p><p id={`${formularioId}-contador`} className="text-xs tabular-nums text-[#746A64]">{[...contenido].length.toLocaleString('es-AR')} / 2.000</p></div>
    {estadoCarga && <p role="status" aria-live="polite" className="mt-4 rounded-[14px] border border-[#E7DDD5] bg-[#FAF7F3] p-3 text-sm leading-6 text-[#294A38]">{estadoCarga}</p>}
    {error && <p id={`${formularioId}-error`} role="alert" className="mt-4 rounded-[14px] border border-[#EC9BB6] bg-[#F4CAD8] p-3 text-sm leading-6">{error}</p>}
    <div className="mt-4 flex flex-wrap justify-end gap-2">
      {onCancelar && <button type="button" onClick={onCancelar} disabled={enviando || Boolean(intencion || preEnvio)} className={controlComunidad}>Cancelar edición</button>}
      {!publicacion && bloqueada && <button type="button" onClick={() => { if (!window.confirm('¿Cerrar este borrador sin reenviar? Actualizá la comunidad antes de empezar otro.')) return; setContenido(''); setIntencion(null); setPreEnvio(null); setBloqueada(false); setError(''); limpiarFotos(); idBorrador.current = null; onBorrador(false) }} className={controlComunidad}>Cerrar sin reenviar</button>}
      <button type="submit" disabled={enviando || preparando || bloqueada || lecturaPendiente || (!intencion && !preEnvio && !contenido.trim() && !fotos.length)} aria-busy={enviando} className={accionComunidad}>{enviando ? 'Confirmando…' : intencion || preEnvio ? 'Reintentar el mismo envío' : publicacion ? 'Guardar cambios' : 'Compartir'}{!enviando && <ArrowIcon />}</button>
    </div>
    {(intencion || preEnvio) && !enviando && !bloqueada && <p className="mt-3 text-xs leading-5 text-[#746A64]">El texto y las fotos quedan protegidos hasta confirmar el envío. Reintentá desde este botón sin volver a elegir las fotos.</p>}
  </form>
}
