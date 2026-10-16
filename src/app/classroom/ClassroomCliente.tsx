'use client'

import { useCallback, useState } from 'react'
import ClassPlayer from './ClassPlayer'
import ClassroomProgram from './ClassroomProgram'
import { ubicacionClase, ordenarClases } from '@/lib/class-management'
import { claseParaContinuar, tiempoClase, type ProgresoClase } from '@/lib/class-progress'

export interface Clase {
  id: string
  titulo: string
  descripcion: string | null
  vimeo_url: string | null
  tiene_video_privado?: boolean
  orden: number
  plan: '27' | '97'
  modulo: string
  activo: boolean
  acceso_gratuito?: boolean
  puede_ver?: boolean
  miniatura_revision?: string
}

interface Perfil {
  nombre: string | null
  avatar_url: string | null
  rol: string
  plan: string | null
  desafio_socias_habilitada?: boolean
  tipo_usuario?: string | null
}

interface Props {
  clases: Clase[]
  esAdmin: boolean
  perfil: Perfil | null
  progresoInicial?: ProgresoClase[]
  errorProgreso?: boolean
}

function Icon({ name, className = 'h-5 w-5' }: { name: 'play' | 'arrow' | 'book' | 'lock'; className?: string }) {
  const props = { className, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const }
  if (name === 'play') return <svg {...props}><path d="m9 6 10 6-10 6V6Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5"/></svg>
  if (name === 'arrow') return <svg {...props}><path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  if (name === 'lock') return <svg {...props}><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  return <svg {...props}><path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12H8.5A3.5 3.5 0 0 0 5 23V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M5 4.5v15A3.5 3.5 0 0 1 8.5 16H19" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
}

export default function ClassroomCliente({ clases, esAdmin, perfil, progresoInicial = [], errorProgreso = false }: Props) {
  const [claseAbierta, setClaseAbierta] = useState<Clase | null>(null)
  const [videoSeguroUrl, setVideoSeguroUrl] = useState<string | null>(null)
  const [cargandoVideo, setCargandoVideo] = useState<string | null>(null)
  const [errorVideo, setErrorVideo] = useState('')
  const [progreso,setProgreso]=useState(progresoInicial)
  const [filtro,setFiltro]=useState('Todos')
  const [buscar,setBuscar]=useState('')
  const onProgreso=useCallback((p:ProgresoClase)=>{setProgreso(prev=>[...prev.filter(v=>v.clase_id!==p.clase_id),p])},[])
  const onError=useCallback((mensaje:string)=>setErrorVideo(mensaje),[])

  const tieneAcceso = esAdmin || Boolean(perfil?.desafio_socias_habilitada) || perfil?.tipo_usuario === 'socia'
  const modulos = [...new Set(clases.map(clase => ubicacionClase(clase.modulo).programa))].sort((a,b) => a === 'Bienvenida' ? -1 : b === 'Bienvenida' ? 1 : a.localeCompare(b, 'es'))
  const continuar = esAdmin ? null : claseParaContinuar(clases,progreso)
  const disponibles = ordenarClases(clases.filter(c => (c.puede_ver ?? tieneAcceso) && (c.tiene_video_privado || c.vimeo_url)))
  const siguientes = claseAbierta ? disponibles.filter(c=>ubicacionClase(c.modulo).programa===ubicacionClase(claseAbierta.modulo).programa && ubicacionClase(c.modulo).seccion===ubicacionClase(claseAbierta.modulo).seccion) : []
  const siguiente = claseAbierta ? siguientes[siguientes.findIndex(c=>c.id===claseAbierta.id)+1] : undefined

  async function abrirClase(clase: Clase) {
    if (!(clase.puede_ver ?? tieneAcceso) || cargandoVideo) return
    setErrorVideo('')
    setVideoSeguroUrl(null)
    if (clase.tiene_video_privado) {
      setCargandoVideo(clase.id)
      try {
        const response = await fetch(`/api/classroom/${clase.id}/video`, { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'No se pudo abrir la clase.')
        setVideoSeguroUrl(data.url)
        setClaseAbierta(clase)
      } catch (error) {
        setErrorVideo(error instanceof Error ? error.message : 'No se pudo abrir la clase.')
      } finally {
        setCargandoVideo(null)
      }
      return
    }
    if (clase.vimeo_url) setClaseAbierta(clase)
  }

  function cerrarClase() {
    setClaseAbierta(null)
    setVideoSeguroUrl(null)
  }

  return (
    <main className="min-h-screen bg-[#F4EFEA] text-[#211C19]" data-platform-role={esAdmin ? 'admin' : 'member'}>
      <header className="border-b border-[#211C19]/8 bg-[#FAF7F3]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href={esAdmin ? '/admin' : '/inicio'} aria-label={esAdmin ? 'Volver al panel de Flor' : 'Volver a mi espacio'} className="flex items-center gap-3">
            <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-9 w-auto object-contain sm:h-11" />
          </a>
          <div className="flex items-center gap-3">
            {esAdmin && <a href="/admin/classroom" className="rounded-full bg-[#F4CAD8] px-4 py-2.5 text-xs font-semibold text-[#211C19] transition hover:bg-[#EC9BB6] sm:text-sm">Gestionar clases</a>}
            <a href={esAdmin ? '/admin' : '/inicio'} className="hidden items-center gap-2 text-sm font-medium text-[#746A64] transition hover:text-[#294A38] sm:flex">{esAdmin ? 'Panel de Flor' : 'Mi espacio'} <Icon name="arrow" className="h-4 w-4" /></a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <section className="grid gap-5 md:grid-cols-[minmax(0,1fr)_260px] md:items-end">
          <div>
            <p className="font-impact text-[10px] font-semibold uppercase tracking-[0.22em] text-[#294A38]">Tu programa</p>
            <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-[1.04] tracking-[-0.04em] sm:text-5xl">Tus clases</h1>
            {!tieneAcceso && <p className="mt-3 max-w-xl text-sm leading-6 text-[#746A64]">Empezá con las clases gratuitas y explorá el plan Socias.</p>}
          </div>
          <div className="flex items-center gap-4 rounded-[22px] bg-[#294A38] p-5 text-white">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/12 text-[#F4CAD8]"><Icon name="book" className="h-6 w-6" /></span>
            <div><p className="font-impact text-3xl font-semibold leading-none">{clases.filter(c=>(c.puede_ver??tieneAcceso) && (c.tiene_video_privado||c.vimeo_url)).length}</p><p className="mt-1.5 text-xs text-white/65">clases disponibles</p></div>
          </div>
        </section>

        {errorProgreso && <p role="alert" className="mt-5 rounded-2xl border border-[#EC9BB6] bg-[#FAF7F3] p-4 text-sm">No pudimos cargar tu progreso. Recargá para retomarlo; las clases siguen disponibles.</p>}
        {continuar && <section className="mt-6 flex flex-col gap-4 rounded-[22px] border border-[#EC9BB6] bg-[#F4CAD8] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#294A38]">Continuar viendo</p><h2 className="mt-2 text-lg font-semibold">{continuar.clase.titulo}</h2><p className="mt-1 text-xs text-[#746A64]">{ubicacionClase(continuar.clase.modulo).programa} · Desde {tiempoClase(continuar.progreso.posicion_seg)}</p></div>
          <button type="button" onClick={()=>void abrirClase(continuar.clase)} disabled={Boolean(cargandoVideo)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-3 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Retomar clase <Icon name="arrow" /></button>
        </section>}
        {clases.length>0 && <div className="mt-7 grid gap-3 sm:grid-cols-2"><label className="text-xs text-[#746A64]">Programa<select value={filtro} onChange={e=>setFiltro(e.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[#D8CFC8] bg-[#FAF7F3] px-3 py-3 text-base text-[#211C19]"><option>Todos</option>{modulos.map(m=><option key={m}>{m}</option>)}</select></label><label className="text-xs text-[#746A64]">Buscar clase<input type="search" value={buscar} onChange={e=>setBuscar(e.target.value)} maxLength={120} placeholder="Nombre de la clase" className="mt-2 min-h-11 w-full rounded-xl border border-[#D8CFC8] bg-[#FAF7F3] px-3 py-3 text-base text-[#211C19]" /></label></div>}

        {clases.length === 0 ? (
          <section className="mt-8 rounded-[24px] bg-[#FAF7F3] p-8 sm:p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4CAD8] text-[#294A38]"><Icon name="book" className="h-6 w-6" /></div>
            <h2 className="mt-5 font-serif text-2xl">Estamos preparando tus clases.</h2>
            <p className="mt-2 text-sm text-[#746A64]">Volvé pronto para empezar.</p>
          </section>
        ) : (
          <div className="mt-7 space-y-4">
            {modulos.filter(m=>filtro==='Todos'||filtro===m).map((modulo) => {
              const clasesDelModulo = clases.filter(clase => ubicacionClase(clase.modulo).programa === modulo)
              const visibles=clasesDelModulo.filter(c=>c.titulo.toLocaleLowerCase('es').includes(buscar.toLocaleLowerCase('es')))
              if(!visibles.length)return null
              return (
                <ClassroomProgram key={modulo} programa={modulo} clases={clasesDelModulo} progreso={progreso} buscar={buscar} esAdmin={esAdmin} tieneAcceso={tieneAcceso} cargando={Boolean(cargandoVideo)} abierto={Boolean(continuar && ubicacionClase(continuar.clase.modulo).programa === modulo)} onAbrir={clase => void abrirClase(clase)} />
              )
            })}
          </div>
        )}
        {clases.length>0 && !clases.some(c=>(filtro==='Todos'||ubicacionClase(c.modulo).programa===filtro) && c.titulo.toLocaleLowerCase('es').includes(buscar.toLocaleLowerCase('es'))) && <p className="mt-6 rounded-2xl border border-[#E7DDD5] bg-[#FAF7F3] p-6 text-sm text-[#746A64]">No encontramos clases con esa búsqueda.</p>}
      </div>

      {errorVideo && <div role="alert" className="sd-mobile-toast fixed bottom-5 left-1/2 z-[60] w-[min(92vw,32rem)] -translate-x-1/2 rounded-2xl border border-[#B01B30]/20 bg-[#FAF7F3] px-5 py-4 text-sm text-[#7C1D2A]">{errorVideo}</div>}

      {claseAbierta && <ClassPlayer key={claseAbierta.id} clase={claseAbierta} url={videoSeguroUrl} progreso={progreso.find(p=>p.clase_id===claseAbierta.id)} esAdmin={esAdmin} siguiente={siguiente?.titulo} onSiguiente={()=>{if(siguiente)void abrirClase(siguiente)}} onCerrar={cerrarClase} onProgreso={onProgreso} onError={onError} />}
    </main>
  )
}
