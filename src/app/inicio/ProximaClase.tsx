'use client'

import { useEffect, useState } from 'react'
import { AGENDA_SOCIAS, cuentaRegresiva, fechaHito, proximoHito, type HitoAgenda } from '@/lib/agenda'
import ArrowIcon from '@/components/ArrowIcon'

export default function ProximaClase({ ahoraInicial, hitos = AGENDA_SOCIAS }: { ahoraInicial: number; hitos?: readonly HitoAgenda[] }) {
  const [ahora, setAhora] = useState(ahoraInicial)
  useEffect(() => {
    const actualizar = () => setAhora(Date.now())
    const timer = window.setInterval(actualizar, 30_000)
    const alVolver = () => { if (!document.hidden) actualizar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', alVolver) }
  }, [])

  const hito = proximoHito(hitos, ahora)
  if (!hito) return <section aria-label="Próximo hito" className="rounded-[24px] border border-[#EC9BB6]/50 bg-white px-6 py-5">
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Próximo hito</p>
    <p className="mt-2 text-sm text-[#655B56]">Flor publicará el próximo encuentro.</p>
    <a href="/clases" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#294A38]">Ver clases grabadas <ArrowIcon /></a>
  </section>

  const { minutos, dias, horas, mins } = cuentaRegresiva(hito.fecha, ahora)
  const numero = dias > 0 ? dias : horas > 0 ? horas : mins
  const unidad = dias > 0 ? (dias === 1 ? 'día' : 'días') : horas > 0 ? (horas === 1 ? 'hora' : 'horas') : (mins === 1 ? 'minuto' : 'minutos')
  const fecha = fechaHito(hito.fecha)
  const enlace = hito.enlace?.startsWith('https://') ? hito.enlace : null

  return <section aria-labelledby="proximo-hito-titulo" className="grid grid-cols-[minmax(0,1fr)_108px] items-center gap-4 rounded-[24px] bg-[#F4CAD8] p-5 text-[#171413] sm:grid-cols-[minmax(0,1fr)_148px] sm:gap-7 sm:px-7 sm:py-6">
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Próximo hito</p>
      <h2 id="proximo-hito-titulo" className="mt-2 font-serif text-[26px] font-bold leading-tight tracking-[-0.025em] sm:text-3xl">{hito.titulo}</h2>
      <div className="mt-3 text-xs leading-5 text-[#655B56] sm:text-sm sm:leading-6">
        <p className="font-medium text-[#171413]">{fecha.dia} {fecha.fecha}</p>
        <time dateTime={hito.fecha}>{fecha.hora} hora Argentina</time>
      </div>
      {enlace ? <a href={enlace} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#294A38]/20 bg-[#FAF7F3] px-4 py-2.5 text-xs font-semibold text-[#294A38] transition hover:bg-white">{hito.accion} <ArrowIcon /></a>
        : <button type="button" disabled title="Flor todavía no publicó el enlace" className="mt-4 rounded-full border border-[#294A38]/20 bg-[#FAF7F3] px-4 py-2.5 text-xs font-semibold text-[#294A38]/65">{hito.accion}</button>}
      {!enlace && <p className="mt-1.5 text-[10px] leading-4 text-[#655B56]">Enlace disponible próximamente.</p>}
    </div>
    <div className="rounded-2xl bg-[#294A38] px-3 py-5 text-center text-[#FAF7F3] sm:py-6" role="timer" aria-label={minutos > 0 ? `Faltan ${dias} días, ${horas} horas y ${mins} minutos` : 'El encuentro es hoy'}>
      {minutos > 0 ? <>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F4CAD8]">Faltan</p>
        <p className="mt-2 font-impact text-[48px] font-semibold leading-none tracking-[-0.04em] tabular-nums sm:text-[60px]">{numero}</p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F4CAD8]">{unidad}</p>
        {dias > 0 && <p className="mt-3 text-[11px] tabular-nums text-[#FAF7F3]/85">{horas} hs {mins} min</p>}
        {dias === 0 && horas > 0 && <p className="mt-3 text-[11px] tabular-nums text-[#FAF7F3]/85">{mins} min</p>}
      </> : <><p className="font-impact text-2xl font-semibold">Hoy</p><p className="mt-2 text-xs text-[#F4CAD8]">{fecha.hora}</p></>}
    </div>
  </section>
}
