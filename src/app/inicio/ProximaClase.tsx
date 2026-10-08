'use client'

import { useEffect, useState } from 'react'
import { CLASE_LANZAMIENTO, tiempoHastaClase } from '@/lib/clase-lanzamiento'

export default function ProximaClase({ ahoraInicial }: { ahoraInicial: number }) {
  const [ahora, setAhora] = useState(ahoraInicial)
  useEffect(() => {
    const actualizar = () => setAhora(Date.now())
    const timer = window.setInterval(actualizar, 30_000)
    const alVolver = () => { if (!document.hidden) actualizar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', alVolver) }
  }, [])

  const pasada = ahora >= Date.parse(CLASE_LANZAMIENTO.fecha) + 24 * 60 * 60_000
  return <section aria-label="Clase de lanzamiento" className="rounded-[22px] bg-[#F4CAD8] p-5 text-[#171413]">
    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#294A38]">{pasada ? 'Clase de lanzamiento' : 'Próxima clase'}</p>
    <p className="mt-3 font-serif text-xl font-semibold">{CLASE_LANZAMIENTO.etiqueta}</p>
    <time dateTime={CLASE_LANZAMIENTO.fecha} className="mt-1 block text-sm text-[#655B56]">{CLASE_LANZAMIENTO.hora}</time>
    {!pasada && <p className="mt-4 font-impact text-sm font-semibold text-[#294A38]" role="timer">{tiempoHastaClase(ahora)}</p>}
  </section>
}
