'use client'

import { useEffect, useRef, useState } from 'react'
import ArrowIcon from './ArrowIcon'
import NavigationIcon from './NavigationIcon'
import type { ClaseCatalogo } from '@/lib/class-access'

export default function FreeClasses({clases}: {clases:ClaseCatalogo[]}) {
  const [abierta,setAbierta]=useState<ClaseCatalogo|null>(null)
  const [url,setUrl]=useState('')
  const [cargando,setCargando]=useState<string|null>(null)
  const [error,setError]=useState('')
  const dialogo=useRef<HTMLDialogElement>(null)
  useEffect(()=>{if(abierta) dialogo.current?.showModal()},[abierta])
  async function abrir(clase:ClaseCatalogo) {
    if(!clase.puede_ver || cargando) return
    setError('');setCargando(clase.id)
    try {
      if(clase.tiene_video_privado) {
        const res=await fetch(`/api/classroom/${clase.id}/video`,{cache:'no-store'})
        const body=await res.json()
        if(!res.ok) throw new Error(body.error||'No pudimos abrir esta clase.')
        setUrl(body.url)
      } else {
        const id=clase.vimeo_url?.match(/vimeo\.com\/(\d+)/)?.[1]
        if(!id) throw new Error('Esta clase todavía no tiene video disponible.')
        setUrl(`https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0`)
      }
      setAbierta(clase)
    } catch(causa) {setError(causa instanceof Error?causa.message:'Revisá tu conexión e intentá nuevamente.')}
    finally {setCargando(null)}
  }
  return <section id="primeras-clases" className="mt-9 scroll-mt-6" aria-labelledby="clases-gratuitas-titulo">
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#294A38]">Empezá por acá</p><h2 id="clases-gratuitas-titulo" className="mt-2 text-2xl font-semibold tracking-tight">Tu primera mirada al mundo digital.</h2></div>
      <span className="rounded-full border border-[#EC9BB6]/50 bg-white px-3 py-2 text-xs text-[#294A38]">{clases.filter(c=>c.acceso_gratuito).length} clases gratuitas</span>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {clases.map((clase,index)=><article key={clase.id} className="flex overflow-hidden rounded-[22px] border border-[#EC9BB6]/45 bg-white flex-col">
        <div className={`flex h-32 items-start justify-between p-5 ${clase.acceso_gratuito?(index%2===0?'bg-[#F4CAD8]':'bg-[#EC9BB6]'):'bg-[#F4EFEA]'}`}>
          <span className="font-impact text-5xl font-medium leading-none tracking-[-0.06em] text-[#294A38]">{String(clase.orden+1).padStart(2,'0')}</span>
          <span className="rounded-full bg-[#FAF7F3] px-3 py-1.5 text-[10px] font-medium text-[#294A38]">{clase.acceso_gratuito?'Gratis para vos':'Plan Socias'}</span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h3 className="text-base font-semibold leading-snug">{clase.titulo}</h3>
          <p className="mt-2 text-xs leading-5 text-[#655B56]">{clase.descripcion && clase.descripcion!=='Clase grabada'?clase.descripcion:'Clase grabada · Florencia Schauman'}</p>
          {clase.puede_ver && (clase.tiene_video_privado || clase.vimeo_url) ? <button type="button" disabled={Boolean(cargando)} onClick={()=>void abrir(clase)} className="mt-6 inline-flex items-center justify-between gap-3 rounded-full bg-[#294A38] px-4 py-3 text-left text-xs font-semibold text-white disabled:opacity-60" aria-label={`Ver clase: ${clase.titulo}`}>{cargando===clase.id?'Preparando…':'Ver clase'}<ArrowIcon /></button>
          : <a href="#plan-socias" className="mt-6 inline-flex items-center gap-2 text-xs font-medium text-[#294A38]"><NavigationIcon name="bloqueo" />Acceso con Socias Digitales <ArrowIcon diagonal /></a>}
        </div>
      </article>)}
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl border border-[#EC9BB6] bg-white p-4 text-sm text-[#B01B30]">{error}</p>}
    <dialog ref={dialogo} onClose={()=>{setAbierta(null);setUrl('')}} aria-labelledby="clase-gratuita-reproductor" className="m-auto w-[min(94vw,1000px)] max-w-none rounded-[22px] bg-[#FAF7F3] p-4 text-[#171413] backdrop:bg-[#171413]/75 sm:p-6">
      {abierta && <><div className="mb-4 flex items-center justify-between gap-4"><h2 id="clase-gratuita-reproductor" className="text-base font-semibold">{abierta.titulo}</h2><button type="button" onClick={()=>dialogo.current?.close()} autoFocus className="shrink-0 rounded-full border border-[#EC9BB6]/50 px-4 py-2 text-xs">Cerrar</button></div>
      {abierta.tiene_video_privado?<video src={url} controls autoPlay playsInline className="aspect-video w-full rounded-xl bg-black" />:<iframe src={url} title={abierta.titulo} className="aspect-video w-full rounded-xl bg-black" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />}</>}
    </dialog>
  </section>
}
