'use client'

import { useEffect, useState } from 'react'
import { CLASE_LANZAMIENTO } from '@/lib/clase-lanzamiento'

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
  const minutos = Math.max(0, Math.ceil((Date.parse(CLASE_LANZAMIENTO.fecha) - ahora) / 60_000))
  const dias = Math.floor(minutos / 1440)
  const horas = Math.floor((minutos % 1440) / 60)
  const mins = minutos % 60
  const numero = dias > 0 ? dias : horas > 0 ? horas : mins
  const unidad = dias > 0 ? (dias === 1 ? 'día' : 'días') : horas > 0 ? (horas === 1 ? 'hora' : 'horas') : (mins === 1 ? 'minuto' : 'minutos')
  return <section aria-label="Clase de lanzamiento" className="rounded-[20px] bg-[#F4CAD8] p-4 text-[#171413]">
    <p className="font-serif text-lg font-semibold">Desafío Socias</p>
    {!pasada && <div className="mt-3 rounded-xl bg-[#294A38] px-3 py-3 text-center text-[#FAF7F3]" role="timer" aria-label={minutos > 0 ? `Faltan ${dias} días, ${horas} horas y ${mins} minutos` : 'Llegó la hora de la clase'}>
      {minutos > 0 ? <>
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-[#F4CAD8]">Faltan</p>
        <p className="mt-1 font-impact text-[44px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{numero}</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.16em] text-[#F4CAD8]">{unidad}</p>
        {dias > 0 && <p className="mt-2 text-[11px] tabular-nums text-[#FAF7F3]/85">{horas} hs {mins} min</p>}
        {dias === 0 && horas > 0 && <p className="mt-2 text-[11px] tabular-nums text-[#FAF7F3]/85">{mins} min</p>}
      </> : <p className="py-3 text-sm font-semibold">Llegó la hora de la clase</p>}
    </div>}
    <div className="mt-3 text-center text-[11px] leading-5 text-[#655B56]">
      <p className="font-medium text-[#171413]">Lunes 12/10</p>
      <time dateTime={CLASE_LANZAMIENTO.fecha}>20:05 hora Argentina</time>
    </div>
  </section>
}
