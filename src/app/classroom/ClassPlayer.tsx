'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { tiempoClase, validarProgreso, type CambioProgreso, type ProgresoClase } from '@/lib/class-progress'

interface Props {
  clase: {id:string;titulo:string;modulo:string;tiene_video_privado?:boolean;vimeo_url:string|null}
  url: string | null
  progreso?: ProgresoClase
  esAdmin: boolean
  siguiente?: string
  onSiguiente: () => void
  onCerrar: () => void
  onProgreso: (p:ProgresoClase) => void
  onError: (mensaje:string) => void
}

export default function ClassPlayer({clase,url,progreso,esAdmin,siguiente,onSiguiente,onCerrar,onProgreso,onError}:Props) {
  const dialogRef=useRef<HTMLDialogElement>(null)
  const videoRef=useRef<HTMLVideoElement>(null)
  const cadena=useRef<Promise<unknown>>(Promise.resolve())
  const ultimoGuardado=useRef(0)
  const empezo=useRef(false)
  const [posicionInicial]=useState(progreso?.completada?0:progreso?.posicion_seg??0)
  const fallido=useRef<CambioProgreso|null>(null)
  const [estado,setEstado]=useState('')
  const [error,setError]=useState('')
  const [guardando,setGuardando]=useState(false)
  const [videoFallido,setVideoFallido]=useState(false)
  const [termino,setTermino]=useState(false)

  const guardar=useCallback((cambio:CambioProgreso) => {
    if(esAdmin)return Promise.resolve()
    // Una sola cola por reproductor: una petición lenta no puede pisar una posterior.
    const trabajo=cadena.current.catch(()=>undefined).then(async()=>{
      const response=await fetch(`/api/classroom/${clase.id}/progreso`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cambio),keepalive:true,
      })
      const data=await response.json()
      if(!response.ok)throw new Error(data.error??'No pudimos guardar tu progreso.')
      onProgreso(data.progreso)
      fallido.current=null
      onError('')
      setEstado('Progreso guardado')
      setError('')
    }).catch(causa=>{
      const mensaje=causa instanceof TypeError?'No pudimos guardar tu progreso. Revisá tu conexión y reintentá.':causa instanceof Error?causa.message:'No pudimos guardar tu progreso.'
      fallido.current=cambio
      setError(mensaje);onError(mensaje)
    })
    cadena.current=trabajo
    return trabajo
  },[clase.id,esAdmin,onProgreso,onError])

  const guardarPosicion=useCallback(()=>{
    const video=videoRef.current
    if(esAdmin || !video || !empezo.current)return
    const cambio=validarProgreso({action:'posicion',posicion:video.currentTime,duracion:video.duration})
    if(cambio){ultimoGuardado.current=Date.now();void guardar(cambio)}
  },[esAdmin,guardar])

  useEffect(()=>{
    const dialog=dialogRef.current
    const anterior=document.activeElement as HTMLElement|null
    dialog?.showModal()
    const alOcultar=()=>{if(document.visibilityState==='hidden')guardarPosicion()}
    document.addEventListener('visibilitychange',alOcultar)
    return ()=>{guardarPosicion();document.removeEventListener('visibilitychange',alOcultar);anterior?.focus()}
  },[guardarPosicion])

  async function completar() {
    setGuardando(true)
    try {await guardar({action:'completada',completada:!progreso?.completada})}
    finally {setGuardando(false)}
  }
  function cerrar() {guardarPosicion();onCerrar()}
  const vimeoId=clase.vimeo_url?.match(/vimeo\.com\/(\d+)/)?.[1]

  return <dialog ref={dialogRef} onCancel={event=>{event.preventDefault();cerrar()}}
    aria-labelledby="clase-reproductor-titulo"
    className="sd-video-dialog m-auto max-h-[calc(100dvh-2rem)] w-[min(94vw,960px)] max-w-none overflow-y-auto rounded-[24px] border border-[#E7DDD5] bg-[#FAF7F3] p-4 text-[#211C19] backdrop:bg-[#171413]/80 sm:p-6">
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#294A38]">{clase.modulo}</p><h2 id="clase-reproductor-titulo" className="mt-1 text-lg font-semibold leading-snug">{clase.titulo}</h2></div>
      <button type="button" onClick={cerrar} aria-label="Cerrar reproductor" autoFocus className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#D8CFC8] text-2xl">×</button>
    </div>
    <div className="aspect-video overflow-hidden rounded-2xl bg-black">
      {clase.tiene_video_privado && url ? <video ref={videoRef} src={url} controls playsInline preload="metadata" className="h-full w-full"
        onLoadedMetadata={()=>{const v=videoRef.current;if(v && posicionInicial>0 && Number.isFinite(v.duration))v.currentTime=Math.min(posicionInicial,Math.max(0,v.duration-1))}}
        onPlay={()=>{empezo.current=true;setVideoFallido(false);guardarPosicion()}}
        onTimeUpdate={()=>{if(Date.now()-ultimoGuardado.current>=20000)guardarPosicion()}}
        onPause={guardarPosicion} onSeeked={()=>{if(empezo.current)guardarPosicion()}}
        onEnded={()=>{guardarPosicion();setTermino(true)}} onError={()=>setVideoFallido(true)} />
      : vimeoId?<iframe src={`https://player.vimeo.com/video/${vimeoId}?title=0&byline=0&portrait=0`} title={clase.titulo} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />:null}
    </div>
    {videoFallido && <div role="alert" className="mt-3 rounded-xl border border-[#EC9BB6] p-4 text-sm"><p>No pudimos reproducir este archivo. Revisá tu conexión o volvé a abrir la clase.</p><button type="button" onClick={()=>{setVideoFallido(false);videoRef.current?.load()}} className="mt-2 min-h-11 rounded-full border border-[#294A38]/30 px-4 text-[#294A38]">Reintentar reproducción</button></div>}
    {!esAdmin && <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-xs text-[#746A64]">
        <p>{progreso?.completada?'Clase completada':termino?'¿Terminaste? Marcá esta clase como completada.':posicionInicial>0?`Retomaste desde ${tiempoClase(posicionInicial)}`:'Tu avance se guarda en tu cuenta.'}</p>
        <p role="status" className="mt-1 text-[#294A38]">{estado}</p>
        {!clase.tiene_video_privado && <p className="mt-1">En Vimeo podés marcarla como completada; el minuto no se guarda.</p>}
      </div>
      <button type="button" onClick={()=>void completar()} disabled={guardando || videoFallido} aria-pressed={Boolean(progreso?.completada)} className={`min-h-11 rounded-full border px-4 py-3 text-sm font-semibold disabled:opacity-50 ${progreso?.completada?'border-[#294A38]/30 bg-[#F4EFEA] text-[#294A38]':'border-[#EC9BB6] bg-[#F4CAD8]'}`}>{guardando?'Guardando…':progreso?.completada?'✓ Completada · desmarcar':'Marcar como completada'}</button>
    </div>}
    {esAdmin && <p className="mt-4 text-xs text-[#746A64]">Vista administrativa · no registra progreso de alumna.</p>}
    {error && <div role="alert" className="mt-3 rounded-xl border border-[#EC9BB6] p-3 text-sm"><p>{error}</p><button type="button" onClick={()=>{if(fallido.current)void guardar(fallido.current)}} className="mt-2 min-h-11 rounded-full border px-4">Reintentar guardar</button></div>}
    {siguiente && <div className="mt-4 border-t border-[#E7DDD5] pt-4"><button type="button" onClick={()=>{guardarPosicion();onSiguiente()}} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-full bg-[#294A38] px-5 py-3 text-left text-sm font-medium text-white"><span className="min-w-0">Siguiente: {siguiente}</span><span aria-hidden="true">→</span></button></div>}
  </dialog>
}
