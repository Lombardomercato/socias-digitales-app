'use client'

import { useEffect, useRef, useState } from 'react'
import NavigationIcon from '@/components/NavigationIcon'
import { esPublicacionComunidad, type ComentarioComunidad, type PublicacionComunidad } from '@/lib/community'
import CommunityAvatar from './CommunityAvatar'
import CommunityComposer from './CommunityComposer'
import CommunityComments from './CommunityComments'
import CommunityPhotos from './CommunityPhotos'
import { controlComunidad, accionComunidad, ErrorComunidad, errorComunidad, esRespuestaComunidad, fechaComunidad, solicitarComunidad, tiposComunidad } from './community-client'

interface Props {
  publicacion: PublicacionComunidad
  nombre: string | null
  onActualizada: (publicacion: PublicacionComunidad) => void
  onBorrador: (clave: string, activo: boolean) => void
  onAcceso: () => void
  lecturaPendiente?: boolean
  administracion?: boolean
  onModerarPublicacion?: (publicacion: PublicacionComunidad) => void
  onModerarComentario?: (comentario: ComentarioComunidad) => void
  comentarioActualizado?: ComentarioComunidad | null
}
type AccionPendiente = { accion: 'retirar' | 'restaurar'; version: number } | { accion: 'felicitar'; activo: boolean }

export default function CommunityPostCard({ publicacion, nombre, onActualizada, onBorrador, onAcceso, lecturaPendiente = false, administracion = false, onModerarPublicacion, onModerarComentario, comentarioActualizado }: Props) {
  const [acciones, setAcciones] = useState(false)
  const [editando, setEditando] = useState(false)
  const [comentarios, setComentarios] = useState(false)
  const [confirmar, setConfirmar] = useState<'retirar' | 'restaurar' | null>(null)
  const [pendiente, setPendiente] = useState<AccionPendiente | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [bloqueada, setBloqueada] = useState(false)
  const [borradorComentarios, setBorradorComentarios] = useState(false)
  const ocupada = useRef(false), viva = useRef(false), abortador = useRef<AbortController | null>(null)
  const tipo = tiposComunidad.find(item => item.id === publicacion.tipo)!
  const visible = !publicacion.retirada && !publicacion.oculta
  const mostrarConversacion = visible || administracion
  const clave = `publicacion:${publicacion.id}`

  useEffect(() => { viva.current = true; return () => { viva.current = false; abortador.current?.abort() } }, [])

  async function ejecutar(accion: AccionPendiente) {
    if (ocupada.current || bloqueada || editando || lecturaPendiente || borradorComentarios) return
    const envio = pendiente ?? accion
    ocupada.current = true; setEnviando(true); setError(''); setPendiente(envio); onBorrador(clave, true)
    const controller = new AbortController(); abortador.current = controller
    try {
      if (envio.accion === 'felicitar') {
        const response = await solicitarComunidad(`/api/comunidad/${publicacion.id}/felicitar`, { method: 'PUT', body: JSON.stringify({ activo: envio.activo }), signal: controller.signal })
        if (!esRespuestaComunidad(response) || response.activo !== envio.activo || !Number.isSafeInteger(response.total) || (response.total as number) < (envio.activo ? 1 : 0)) throw new ErrorComunidad(null, true)
        if (!viva.current) return
        onActualizada({ ...publicacion, felicitada: response.activo as boolean, total_felicitaciones: response.total as number })
      } else {
        const response = await solicitarComunidad(`/api/comunidad/${publicacion.id}`, { method: 'PATCH', body: JSON.stringify(envio), signal: controller.signal })
        if (!esRespuestaComunidad(response) || !esPublicacionComunidad(response.publicacion)) throw new ErrorComunidad(null, true)
        const guardada = response.publicacion
        if (guardada.id !== publicacion.id || !guardada.propia || guardada.version <= envio.version || guardada.retirada !== (envio.accion === 'retirar')) throw new ErrorComunidad(null, true)
        if (!viva.current) return
        onActualizada(guardada)
      }
      setPendiente(null); setConfirmar(null); setAcciones(false); onBorrador(clave, false)
    } catch (cause) {
      if (!viva.current) return
      const fallo = errorComunidad(cause); setError(fallo.message)
      if (!fallo.pendiente) { setPendiente(null); onBorrador(clave, false); if (![400, 422].includes(fallo.status ?? 0)) setBloqueada(true) }
      if (fallo.status === 401 || fallo.status === 403) onAcceso()
    } finally {
      ocupada.current = false
      if (viva.current) setEnviando(false)
      if (abortador.current === controller) abortador.current = null
    }
  }

  return <article aria-label={`Publicación de ${publicacion.autor.nombre ?? 'Socia'}`} className="min-w-0 rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-4 sm:p-6">
    <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><CommunityAvatar nombre={publicacion.autor.nombre} /><div className="min-w-0"><p className="break-words text-sm font-semibold leading-6">{publicacion.autor.nombre ?? 'Socia'}{publicacion.propia && <span className="ml-1 font-normal text-[#746A64]">· Vos</span>}</p><div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-5 text-[#746A64]"><time dateTime={publicacion.created_at}>{fechaComunidad(publicacion.created_at)}</time>{publicacion.actualizado_at !== publicacion.created_at && <span>Editada</span>}{publicacion.autor.es_admin && <span className="rounded-full border border-[#E7DDD5] px-2 text-[#294A38]">Equipo Socias</span>}</div></div></div>{publicacion.propia && <button type="button" aria-label={`Opciones de tu publicación de ${fechaComunidad(publicacion.created_at)}`} aria-expanded={acciones} aria-controls={`acciones-${publicacion.id}`} onClick={() => setAcciones(!acciones)} disabled={enviando || editando || Boolean(pendiente) || lecturaPendiente || borradorComentarios} className={`${controlComunidad} h-11 w-11 shrink-0 px-0`}><span aria-hidden="true" className="text-xl leading-none">⋯</span></button>}</div>
    <div className="mt-4 flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold ${publicacion.tipo === 'avance' ? 'bg-[#F4CAD8] text-[#294A38]' : 'border border-[#E7DDD5] bg-[#FAF7F3] text-[#294A38]'}`}><NavigationIcon name={tipo.icono} />{tipo.etiqueta}</span>{publicacion.retirada && <span className="text-xs font-medium text-[#746A64]">{publicacion.propia ? "Retirada por vos" : "Retirada por su autora"}</span>}{publicacion.oculta && <span className="text-xs font-medium text-[#746A64]">Oculta por moderación</span>}</div>
    {acciones && !editando && <div id={`acciones-${publicacion.id}`} role="group" aria-label="Gestionar mi publicación" className="mt-4 flex flex-wrap gap-2 rounded-[18px] border border-[#E7DDD5] bg-[#FAF7F3] p-3">{visible && <button type="button" onClick={() => { setEditando(true); setAcciones(false); onBorrador(clave, true) }} disabled={enviando || bloqueada || lecturaPendiente || borradorComentarios} className={controlComunidad}>Editar publicación</button>}<button type="button" onClick={() => { setConfirmar(publicacion.retirada ? 'restaurar' : 'retirar'); setAcciones(false) }} disabled={enviando || bloqueada || lecturaPendiente || borradorComentarios} className={controlComunidad}>{publicacion.retirada ? 'Restaurar publicación' : 'Retirar publicación'}</button></div>}
    {editando ? <div className="mt-4"><CommunityComposer nombre={nombre} publicacion={publicacion} lecturaPendiente={lecturaPendiente} onGuardada={guardada => { setEditando(false); onBorrador(clave, false); onActualizada(guardada) }} onBorrador={activo => onBorrador(clave, activo)} onAcceso={onAcceso} onCancelar={() => { if (!window.confirm('¿Descartar la edición sin guardarla?')) return; setEditando(false); onBorrador(clave, false) }} /></div> : publicacion.contenido ? <p className={`mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 [overflow-wrap:anywhere] ${visible ? 'text-[#211C19]' : 'text-[#746A64]'}`}>{publicacion.contenido}</p> : null}
    {!editando && (visible || publicacion.propia || administracion) && <CommunityPhotos publicacionId={publicacion.id} fotos={publicacion.fotos} />}
    {!visible && <p className="mt-4 rounded-[14px] border border-[#E7DDD5] bg-[#FAF7F3] p-3 text-xs leading-5 text-[#746A64]">{administracion ? "Esta publicación no aparece en las conversaciones de las Socias. El equipo conserva su contenido para revisión." : publicacion.oculta ? 'Solo vos y el equipo pueden ver esta publicación. Restaurar un retiro no elimina una decisión de moderación.' : 'Ya no aparece en las conversaciones de las demás Socias. Podés restaurarla desde sus opciones.'}</p>}
    {confirmar && <div role="group" aria-label={confirmar === 'retirar' ? 'Confirmar retiro de publicación' : 'Confirmar restauración de publicación'} className="mt-4 rounded-[18px] border border-[#EC9BB6] bg-[#F4CAD8] p-4"><p className="text-sm leading-6">{confirmar === 'retirar' ? '¿Retirar esta publicación de la comunidad? Queda guardada en Mis publicaciones, sin borrar sus comentarios.' : '¿Restaurar esta publicación? Volverá a las conversaciones, salvo que esté oculta por moderación.'}</p><div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => void ejecutar({ accion: confirmar, version: publicacion.version })} disabled={enviando || bloqueada || lecturaPendiente || borradorComentarios} className={accionComunidad}>{enviando ? 'Confirmando…' : pendiente ? 'Reintentar el mismo cambio' : confirmar === 'retirar' ? 'Confirmar retiro' : 'Confirmar restauración'}</button><button type="button" onClick={() => setConfirmar(null)} disabled={enviando || Boolean(pendiente)} className={`${controlComunidad} bg-[#FFFDFA]`}>Cancelar</button></div></div>}
    {administracion && onModerarPublicacion && <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#E7DDD5] pt-3"><button type="button" onClick={() => onModerarPublicacion(publicacion)} disabled={enviando || bloqueada || lecturaPendiente || borradorComentarios || editando} className={controlComunidad}>{publicacion.oculta ? 'Mostrar publicación' : 'Ocultar publicación'}</button><span className="text-xs leading-5 text-[#746A64]">La moderación no borra el contenido de la autora.</span></div>}
    {error && <p role="alert" className="mt-4 rounded-[14px] border border-[#EC9BB6] bg-[#F4CAD8] p-3 text-sm leading-6">{error}</p>}
    {mostrarConversacion && !editando && <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#E7DDD5] pt-3"><button type="button" onClick={() => void ejecutar({ accion: 'felicitar', activo: !publicacion.felicitada })} disabled={!visible || enviando || bloqueada || lecturaPendiente || borradorComentarios || Boolean(confirmar) || (Boolean(pendiente) && pendiente?.accion !== 'felicitar')} aria-pressed={publicacion.felicitada} aria-busy={enviando && pendiente?.accion === 'felicitar'} className={`${controlComunidad} ${publicacion.felicitada ? 'border-[#EC9BB6] bg-[#F4CAD8]' : 'bg-[#FAF7F3]'}`}><NavigationIcon name="logros" />{pendiente?.accion === 'felicitar' ? enviando ? 'Confirmando…' : 'Reintentar felicitación' : publicacion.felicitada ? 'Felicitaste' : 'Felicitar'}<span className="rounded-full border border-[#E7DDD5] bg-[#FFFDFA] px-2 py-0.5 text-xs tabular-nums">{publicacion.total_felicitaciones}</span></button><button type="button" onClick={() => setComentarios(!comentarios)} disabled={borradorComentarios || enviando || Boolean(pendiente)} aria-expanded={comentarios} aria-controls={`comentarios-${publicacion.id}`} className={controlComunidad}><NavigationIcon name="comunidad" />{comentarios ? 'Ocultar comentarios' : 'Comentarios'}<span className="text-xs tabular-nums">{publicacion.total_comentarios}</span></button></div>}
    {mostrarConversacion && <div id={`comentarios-${publicacion.id}`} hidden={!comentarios}>{comentarios && <CommunityComments administracion={administracion} onModerarComentario={onModerarComentario} comentarioActualizado={comentarioActualizado} lecturaPendiente={!visible || lecturaPendiente || enviando || Boolean(pendiente) || editando} publicacionId={publicacion.id} nombre={nombre} onBorrador={activo => { setBorradorComentarios(activo); onBorrador(`comentarios:${publicacion.id}`, activo) }} onAcceso={onAcceso} onCantidad={cantidad => onActualizada({ ...publicacion, total_comentarios: cantidad })} cantidadInicial={publicacion.total_comentarios} />}</div>}
  </article>
}
