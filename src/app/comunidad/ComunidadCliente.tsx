'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import ArrowIcon from '@/components/ArrowIcon'
import NavigationIcon from '@/components/NavigationIcon'
import SuccessCelebration, { useSuccessCelebration } from '@/components/SuccessCelebration'
import CommunityComposer from '@/components/community/CommunityComposer'
import CommunityPostCard from '@/components/community/CommunityPostCard'
import { controlComunidad, ErrorComunidad, errorComunidad, ordenarPublicaciones, solicitarComunidad, tiposComunidad } from '@/components/community/community-client'
import { esPaginaComunidad, type PaginaComunidad, type PublicacionComunidad, type TipoPublicacionComunidad } from '@/lib/community'

interface Props { inicial: PaginaComunidad; miPerfil: { nombre: string | null; avatar_url: null } }
type Vista = 'todas' | 'mias'

export default function ComunidadCliente({ inicial, miPerfil }: Props) {
  const [pagina, setPagina] = useState(inicial)
  const [vista, setVista] = useState<Vista>('todas')
  const [tipo, setTipo] = useState<'todos' | TipoPublicacionComunidad>('todos')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [sinAcceso, setSinAcceso] = useState(false)
  const [borradores, setBorradores] = useState<Record<string, boolean>>({})
  const [aviso, setAviso] = useState('')
  const [lecturaId, setLecturaId] = useState(0)
  const [destinoFallido, setDestinoFallido] = useState<{ vista: Vista; cursor: string | null; ampliar: boolean } | null>(null)
  const ocupada = useRef(false), viva = useRef(false)
  const abortador = useRef<AbortController | null>(null)
  const borradoresActuales = useRef<Record<string, boolean>>({})
  const { celebration, celebrate } = useSuccessCelebration()
  const hayBorrador = Object.values(borradores).some(Boolean)
  const cambiarBorrador = useCallback((clave: string, activo: boolean) => {
    borradoresActuales.current = { ...borradoresActuales.current, [clave]: activo }
    setBorradores(borradoresActuales.current)
  }, [])
  const bloquearAcceso = useCallback(() => { setSinAcceso(true); setError(''); setAviso('') }, [])

  useEffect(() => { viva.current = true; return () => { viva.current = false; abortador.current?.abort() } }, [])
  useEffect(() => {
    if (!hayBorrador) return
    const advertir = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', advertir)
    return () => window.removeEventListener('beforeunload', advertir)
  }, [hayBorrador])

  async function cargar(destino: Vista, cursor: string | null = null, ampliar = false) {
    if (ocupada.current || sinAcceso || Object.values(borradoresActuales.current).some(Boolean)) return
    ocupada.current = true; setCargando(true); setError(''); setAviso('')
    const controller = new AbortController(); abortador.current = controller
    try {
      const query = new URLSearchParams({ vista: destino })
      if (cursor) query.set('cursor', cursor)
      const response = await solicitarComunidad(`/api/comunidad?${query}`, { signal: controller.signal })
      if (!esPaginaComunidad(response) || response.estado !== 'lista' || (cursor !== null && response.siguiente === cursor) || (destino === 'mias' && response.publicaciones.some(publicacion => !publicacion.propia)) || (destino === 'todas' && response.publicaciones.some(publicacion => publicacion.retirada || publicacion.oculta))) throw new ErrorComunidad(null, false)
      if (!viva.current) return
      setPagina(prev => ({ estado: 'lista', publicaciones: ordenarPublicaciones(ampliar && prev.estado === 'lista' ? prev.publicaciones : [], response.publicaciones), siguiente: response.siguiente }))
      setVista(destino); setDestinoFallido(null)
      if (!ampliar) { setLecturaId(prev => prev + 1); setAviso('Conversaciones actualizadas.') }
    } catch (cause) {
      if (!viva.current) return
      const fallo = errorComunidad(cause)
      if (fallo.status === 401 || fallo.status === 403) bloquearAcceso()
      else { setError('No pudimos actualizar las conversaciones. Conservamos la última lectura y tus textos.'); setDestinoFallido({ vista: destino, cursor, ampliar }) }
    } finally {
      ocupada.current = false
      if (viva.current) setCargando(false)
      if (abortador.current === controller) abortador.current = null
    }
  }

  function actualizarPublicacion(publicacion: PublicacionComunidad) {
    setPagina(prev => {
      if (prev.estado !== 'lista') return prev
      const filtradas = prev.publicaciones.filter(item => item.id !== publicacion.id)
      const mostrar = vista === 'mias' ? publicacion.propia : !publicacion.retirada && !publicacion.oculta
      return { ...prev, publicaciones: ordenarPublicaciones(filtradas, mostrar ? [publicacion] : []) }
    })
  }
  function creada(publicacion: PublicacionComunidad) {
    setPagina(prev => ({ estado: 'lista', publicaciones: ordenarPublicaciones(prev.estado === 'lista' ? prev.publicaciones : [], [publicacion]), siguiente: prev.estado === 'lista' ? prev.siguiente : null }))
    setTipo('todos')
    celebrate({ key: `comunidad:${publicacion.id}`, title: '¡Gracias por compartir!', message: 'Tu experiencia también puede impulsar a otra Socia.', variant: 'gentle' })
  }
  const publicaciones = pagina.estado === 'lista' ? pagina.publicaciones : []
  const visibles = publicaciones.filter(publicacion => tipo === 'todos' || publicacion.tipo === tipo)

  return <div className="min-h-screen bg-[#F4EFEA] text-[#211C19]">
    <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-[#E7DDD5] px-5 py-3 sm:px-8"><Link href="/inicio" aria-label="Socias Digitales, mi espacio"><img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto max-w-[180px] object-contain" /></Link><Link href="/inicio" prefetch={false} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[#294A38]">Mi espacio <ArrowIcon /></Link></header>
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#294A38]">Entre Socias</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Comunidad</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#746A64]">Tus avances, tus preguntas y esas ideas que crecen cuando las compartís.</p></div>{!sinAcceso && <button type="button" onClick={() => void cargar(vista)} disabled={cargando || hayBorrador} aria-busy={cargando} className={`${controlComunidad} bg-[#FAF7F3]`}>{cargando ? 'Actualizando…' : 'Actualizar comunidad'}</button>}</div>
      {sinAcceso ? <section role="alert" className="mt-7 rounded-[24px] border border-[#EC9BB6] bg-[#FFFDFA] p-6"><h2 className="text-lg font-semibold">Volvamos a comprobar tu acceso</h2><p className="mt-3 text-sm leading-6 text-[#746A64]">No pudimos validar tu sesión o tu permiso de comunidad. No se confirma ningún envío desde esta pantalla.</p><Link href="/login?next=%2Fcomunidad" prefetch={false} className={`${controlComunidad} mt-4 bg-[#F4CAD8]`}>Volver a ingresar <ArrowIcon /></Link></section> : <div className="mt-7 grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div className="min-w-0 space-y-5"><CommunityComposer lecturaPendiente={cargando} nombre={miPerfil.nombre} onGuardada={creada} onBorrador={activo => cambiarBorrador('crear', activo)} onAcceso={bloquearAcceso} />
          <section aria-label="Conversaciones de la comunidad" className="min-w-0">
            <div role="group" aria-label="Ver publicaciones" className="flex flex-wrap gap-2">{([{ id: 'todas', nombre: 'Todas las conversaciones' }, { id: 'mias', nombre: 'Mis publicaciones' }] as const).map(opcion => <button key={opcion.id} type="button" onClick={() => { if (vista !== opcion.id || pagina.estado === 'error') void cargar(opcion.id) }} aria-pressed={vista === opcion.id} disabled={cargando || hayBorrador} className={`${controlComunidad} ${vista === opcion.id ? 'border-[#294A38] bg-[#294A38] text-white' : 'bg-[#FFFDFA]'}`}>{opcion.nombre}</button>)}</div>
            <div className="mt-3 flex flex-wrap items-center gap-2"><label htmlFor="tipo-comunidad" className="text-xs text-[#746A64]">Quiero ver</label><select id="tipo-comunidad" disabled={hayBorrador || cargando} value={tipo} onChange={event => setTipo(event.target.value as typeof tipo)} className="min-h-11 min-w-0 max-w-full rounded-[14px] border border-[#E7DDD5] bg-[#FAF7F3] px-3 text-base text-[#294A38]"><option value="todos">Todos los temas</option>{tiposComunidad.map(opcion => <option key={opcion.id} value={opcion.id}>{opcion.etiqueta === 'Pregunta' ? 'Preguntas' : opcion.etiqueta === 'Idea' ? 'Ideas' : 'Avances'}</option>)}</select><span className="text-[11px] leading-5 text-[#746A64]">Más recientes primero</span></div>
            <p className="mt-3 text-xs leading-5 text-[#746A64]">{hayBorrador ? 'Terminá o cancelá tu borrador para actualizar o cambiar de vista.' : pagina.estado === 'lista' ? `${publicaciones.length} ${publicaciones.length === 1 ? 'publicación cargada' : 'publicaciones cargadas'}. El filtro de temas se aplica a esta lista.` : 'Las conversaciones todavía no se pudieron comprobar.'}</p>
            {error && <div role="alert" className="mt-4 rounded-[18px] border border-[#EC9BB6] bg-[#F4CAD8] p-4"><p className="text-sm leading-6">{error}</p><button type="button" onClick={() => void cargar(destinoFallido?.vista ?? vista, destinoFallido?.cursor ?? null, destinoFallido?.ampliar ?? false)} disabled={cargando || hayBorrador} className={`${controlComunidad} mt-3 bg-[#FFFDFA]`}>Reintentar actualización</button></div>}
            {aviso && <p role="status" className="mt-4 text-xs leading-5 text-[#294A38]">{aviso}</p>}
            {cargando && <p role="status" className="mt-4 rounded-[18px] border border-[#E7DDD5] bg-[#FAF7F3] p-4 text-sm text-[#746A64]">Cargando conversaciones…</p>}
            {pagina.estado === 'error' && !error && <div role="alert" className="mt-4 rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-6"><h2 className="text-lg font-semibold">No pudimos cargar la comunidad</h2><p className="mt-3 text-sm leading-6 text-[#746A64]">No significa que no haya publicaciones. Podés reintentar; tu texto no se pierde.</p><button type="button" onClick={() => void cargar(vista)} disabled={cargando || hayBorrador} className={`${controlComunidad} mt-4`}>Reintentar conversaciones</button></div>}
            {pagina.estado === 'lista' && !visibles.length && <div className="mt-4 rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-6 sm:p-8"><span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#EC9BB6] bg-[#F4CAD8] text-[#294A38]"><NavigationIcon name="comunidad" /></span><h2 className="mt-4 text-lg font-semibold">{publicaciones.length ? 'Todavía no hay temas así en esta lista' : vista === 'mias' ? 'Tu próxima historia empieza acá' : 'Hagamos lugar a la primera conversación'}</h2><p className="mt-3 text-sm leading-6 text-[#746A64]">{publicaciones.length ? 'Probá otro tema o cargá más conversaciones. No estamos filtrando publicaciones que todavía no se cargaron.' : vista === 'mias' ? 'Cuando compartas un avance, una pregunta o una idea, vas a encontrarlo acá. También podés revisar lo que hayas retirado.' : 'No hace falta un gran logro: una pregunta, una decisión o un pequeño paso pueden inspirar a alguien más.'}</p>{tipo !== 'todos' && <button type="button" onClick={() => setTipo('todos')} className={`${controlComunidad} mt-4`}>Ver todos los temas</button>}</div>}
            <div className="mt-4 space-y-4">{visibles.map(publicacion => <CommunityPostCard lecturaPendiente={cargando} key={`${publicacion.id}:${lecturaId}`} publicacion={publicacion} nombre={miPerfil.nombre} onActualizada={actualizarPublicacion} onBorrador={cambiarBorrador} onAcceso={bloquearAcceso} />)}</div>
            {pagina.estado === 'lista' && pagina.siguiente && <div className="mt-5 text-center"><button type="button" onClick={() => void cargar(vista, pagina.siguiente, true)} disabled={cargando || hayBorrador} className={`${controlComunidad} bg-[#FFFDFA]`}>Cargar más conversaciones</button></div>}
          </section>
        </div>
        <aside aria-label="Nuestro espacio compartido" className="min-w-0 space-y-4"><section className="rounded-[24px] border border-[#EC9BB6] bg-[#F4CAD8] p-5"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#294A38] text-white"><NavigationIcon name="comunidad" /></span><h2 className="mt-4 text-base font-semibold">Acá avanzamos juntas.</h2><p className="mt-3 text-sm leading-6">Celebrá un paso, acompañá una pregunta y compartí lo que te está sirviendo.</p></section><section className="rounded-[24px] border border-[#E7DDD5] bg-[#FAF7F3] p-5"><h2 className="text-sm font-semibold">Cuidemos este espacio</h2><ul className="mt-3 space-y-3 text-xs leading-6 text-[#746A64]"><li>Compartí con respeto y desde tu experiencia.</li><li>Los datos de clientas y los comprobantes se quedan fuera del muro.</li><li>Tu perfil, tus tareas y tus ventas no se publican automáticamente.</li></ul><p className="mt-4 border-t border-[#E7DDD5] pt-3 text-xs leading-6 text-[#746A64]">El equipo puede ocultar contenido para cuidar la comunidad. Estos intercambios no envían email ni push.</p></section></aside>
      </div>}
    </main>
    <SuccessCelebration celebration={celebration} />
  </div>
}
