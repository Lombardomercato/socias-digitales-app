'use client'

import { useEffect, useState } from 'react'
import { AGENDA_SOCIAS, cuentaRegresiva, fechaHito, proximoHito, type HitoAgenda } from '@/lib/agenda'
import ArrowIcon from '@/components/ArrowIcon'

export default function ProximaClase({ ahoraInicial, hitos = AGENDA_SOCIAS, variante = 'banner' }: { ahoraInicial: number; hitos?: readonly HitoAgenda[]; variante?: 'banner' | 'contador' }) {
  const [ahora, setAhora] = useState(ahoraInicial)
  useEffect(() => {
    const actualizar = () => setAhora(Date.now())
    const timer = window.setInterval(actualizar, 30_000)
    const alVolver = () => { if (!document.hidden) actualizar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', alVolver) }
  }, [])

  const hito = proximoHito(hitos, ahora)
  if (!hito && variante === 'contador') return null
  if (!hito) return <section aria-label="Próximo hito" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EC9BB6]/50 bg-white px-5 py-3">
    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Próximo hito</p>
    <p className="mt-2 text-sm text-[#655B56]">Flor publicará el próximo encuentro.</p>
    <a href="/clases" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#294A38]">Ver clases grabadas <ArrowIcon /></a>
  </section>

  const { minutos, dias, horas, mins } = cuentaRegresiva(hito.fecha, ahora)
  const numero = dias > 0 ? dias : horas > 0 ? horas : mins
  const unidad = dias > 0 ? (dias === 1 ? 'día' : 'días') : horas > 0 ? (horas === 1 ? 'hora' : 'horas') : (mins === 1 ? 'minuto' : 'minutos')
  const fecha = fechaHito(hito.fecha)
  const enlace = hito.enlace?.startsWith('https://') ? hito.enlace : null

  const contador = <div className="rounded-2xl bg-[#294A38] px-3 py-4 text-center text-[#FAF7F3]" role="timer" aria-label={minutos > 0 ? `Faltan ${dias} días, ${horas} horas y ${mins} minutos` : 'El encuentro es hoy'}>
      {minutos > 0 ? <>
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#F4CAD8]">Faltan</p>
        <p className="mt-2 font-impact text-[48px] font-semibold leading-none tracking-[-0.04em] tabular-nums">{numero}</p>
        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#F4CAD8]">{unidad}</p>
        {dias > 0 && <p className="mt-3 text-[11px] tabular-nums text-[#FAF7F3]/85">{horas} hs {mins} min</p>}
        {dias === 0 && horas > 0 && <p className="mt-3 text-[11px] tabular-nums text-[#FAF7F3]/85">{mins} min</p>}
      </> : <><p className="font-impact text-2xl font-semibold">Hoy</p><p className="mt-2 text-xs text-[#F4CAD8]">{fecha.hora}</p></>}
    </div>

  if (variante === 'contador') return <section aria-label="Cuenta regresiva del próximo encuentro" className="mt-7 rounded-[20px] border border-[#F4CAD8] bg-[#F4CAD8] p-3">
    <h2 className="mb-3 text-center font-serif text-lg font-bold text-[#171413]">{hito.titulo}</h2>
    {contador}
    <div className="mt-3 text-center text-[11px] leading-5 text-[#655B56]">
      <p className="font-medium text-[#171413]">{fecha.dia} {fecha.fecha}</p>
      <time dateTime={hito.fecha}>{fecha.hora} hora Argentina</time>
    </div>
  </section>

  return <section aria-label={hito.titulo + ': agendá tu clase'} className="flex items-center gap-4 rounded-2xl border border-[#EC9BB6]/45 bg-[#F4CAD8] px-4 py-3 text-[#171413] sm:px-5">
    <div className="w-[88px] shrink-0 lg:hidden">{contador}</div>
    <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-5 gap-y-2">
      <div className="min-w-0">
        <h2 className="font-serif text-xl font-semibold leading-tight">{hito.titulo} <span className="ml-1 hidden font-sans text-xs font-medium text-[#655B56] sm:inline">· Agendá tu clase</span></h2>
        <p className="mt-1 text-[11px] leading-5 text-[#51443F]">{fecha.dia} {fecha.fecha} · <time dateTime={hito.fecha}>{fecha.hora} hora Argentina</time></p>
      </div>
      <div>
        {enlace ? <a href={enlace} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#294A38] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#203B2D]">{hito.accion} <ArrowIcon /></a>
          : <button type="button" disabled title="Flor todavía no publicó el enlace" className="rounded-full border border-[#294A38]/20 bg-[#FAF7F3] px-4 py-2 text-xs font-semibold text-[#294A38]/65">{hito.accion}</button>}
        {!enlace && <p className="mt-1 text-[9px] text-[#655B56]">Enlace por confirmar.</p>}
      </div>
    </div>
  </section>
}
