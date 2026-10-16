'use client'
import { useEffect, useRef, useState } from 'react'
import { generarMiniaturaExistente } from '@/lib/video-thumbnail-client'

export default function ClassVideoThumbnail({ id, titulo, disponible, esAdmin = false, revision = '' }: { id: string; titulo: string; disponible: boolean; esAdmin?: boolean; revision?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [imagen, setImagen] = useState('')
  useEffect(() => {
    if (!disponible || !ref.current) return
    const controller = new AbortController()
    let objectUrl = '', iniciado = false
    async function cargar() {
      try {
        const url = `/api/classroom/${id}/miniatura`
        let response = await fetch(url, { cache: 'no-store', signal: controller.signal })
        if (response.ok && response.headers.get('content-type')?.includes('application/json') && esAdmin) {
          const data = await response.json()
          if (data.pendiente && data.revision) await generarMiniaturaExistente(id, data.revision, controller.signal)
          response = await fetch(url, { cache: 'no-store', signal: controller.signal })
        }
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) return
        const blob = await response.blob()
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(blob)
        setImagen(objectUrl)
      } catch { /* Una miniatura no bloquea la reproducción ni modifica el video. */ }
    }
    const observer = new IntersectionObserver(entries => {
      if (iniciado || !entries.some(entry => entry.isIntersecting)) return
      iniciado = true
      observer.disconnect()
      void cargar()
    })
    observer.observe(ref.current)
    return () => { observer.disconnect(); controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl) }
  }, [id, disponible, esAdmin, revision])
  return <div ref={ref} className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#E7DDD5] bg-[#F4EFEA]">
    {imagen ? <img src={imagen} alt={`Miniatura de ${titulo}`} onError={() => setImagen('')} className="h-full w-full object-cover" /> : <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center text-[#294A38]"><svg viewBox="0 0 24 24" className="h-7 w-7" fill="none"><rect x="3" y="5" width="18" height="14" rx="3" stroke="currentColor" strokeWidth="1.3"/><path d="m10 9 5 3-5 3V9Z" fill="currentColor"/></svg></span>}
  </div>
}
