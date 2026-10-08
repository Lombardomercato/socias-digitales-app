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
  return <section aria-label="Clase de lanzamiento" className="rounded-[22px] bg-[#F4CAD8] p-5 text-[#171413]">
    <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#294A38]">{pasada ? 'Clase de lanzamiento' : 'Próxima clase'}</p>
    <p className="mt-3 font-serif text-xl font-semibold">{CLASE_LANZAMIENTO.etiqueta}</p>
    <time dateTime={CLASE_LANZAMIENTO.fecha} className="mt-1 block text-sm text-[#655B56]">{CLASE_LANZAMIENTO.hora}</time>
    {!pasada && <div className="mt-4 rounded-2xl bg-[#294A38] px-4 py-4 text-center text-[#FAF7F3]" role="timer" aria-label={minutos > 0 ? `Faltan ${dias} días, ${horas} horas y ${mins} minutos` : 'Llegó la hora de la clase'}>
      {minutos > 0 ? <>
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#F4CAD8]">Faltan</p>
        <p className="mt-1 font-impact text-6xl font-semibold leading-none tracking-[-0.04em] tabular-nums">{numero}</p>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#F4CAD8]">{unidad}</p>
        {dias > 0 && <p className="mt-3 text-xs tabular-nums text-[#FAF7F3]/85">{horas} h · {mins} min</p>}
        {dias === 0 && horas > 0 && <p className="mt-3 text-xs tabular-nums text-[#FAF7F3]/85">{mins} min</p>}
      </> : <p className="py-3 text-sm font-semibold">Llegó la hora de la clase</p>}
    </div>}
  </section>
}
