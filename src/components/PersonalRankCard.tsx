'use client'

import { useEffect, useRef, useState } from 'react'
import type { DatosLogros } from '@/lib/achievements'
import { ETAPAS_PERSONALES, rangoPersonal, datosImagenRango, dibujarImagenRango, fechaRango, type ImagenRangoPersonal } from '@/lib/personal-rank'

const boton = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D8CFC8] bg-[#FFFDFA] px-5 py-3 text-sm font-semibold text-[#294A38] disabled:cursor-not-allowed disabled:opacity-50'
function LazoPersonal() {
  return <svg aria-hidden="true" viewBox="0 0 80 64" className="h-12 w-16 shrink-0 text-[#294A38]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M40 28C19 0 2 22 16 32c9 6 19-1 24-4Zm0 0C61 0 78 22 64 32c-9 6-19-1-24-4Zm-2 3L25 55l12-5m5-19 13 24-12-5" /><circle cx="40" cy="29" r="3" fill="#EC9BB6" /></svg>
}
export default function PersonalRankCard({ datos }: { datos: DatosLogros }) {
  const [abierta, setAbierta] = useState(false)
  const rango = rangoPersonal(datos), imagen = datosImagenRango(datos)
  if (rango.estado !== 'listo') return <section className="mt-6 rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-5 sm:p-7" aria-labelledby="nivel-personal-titulo"><h2 id="nivel-personal-titulo" className="text-xl font-semibold">Tu nivel personal</h2><p role={rango.estado === 'error' ? 'alert' : 'status'} className="mt-3 text-sm leading-6 text-[#746A64]">{rango.estado === 'error' ? 'No pudimos actualizar tu nivel. Necesitamos tus clases y tu actividad de Mi día; no mostramos un nivel menor como si fuera real.' : 'Tu nivel necesita acceso a Clases y Mi día. Flor habilita estos espacios; no los contamos como cero ni cambiamos tus permisos.'}</p><a href={rango.estado === 'error' ? '/logros' : '/inicio#plan-socias'} className={`${boton} mt-4`}>{rango.estado === 'error' ? 'Volver a consultar mis avances' : 'Ver mi acceso'}</a></section>
  const pendientes = rango.proximo?.requisitos.filter(r => r.actual < r.meta) ?? []
  return <section className="mt-6 space-y-5 rounded-[26px] border border-[#EC9BB6]/70 bg-[#FAF7F3] p-5 sm:p-7" aria-labelledby="nivel-personal-titulo">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#294A38]">Tu recorrido, a tu ritmo</p><h2 id="nivel-personal-titulo" className="mt-2 font-serif text-3xl font-semibold tracking-[-.035em]">Cada paso te transforma.</h2></div><LazoPersonal /></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)]">
      <div className="min-w-0 rounded-[22px] border border-[#294A38] bg-[#294A38] p-6 text-[#FAF7F3]"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#F4CAD8]">Mi nivel actual</p><p className="mt-4 break-words font-impact text-4xl font-semibold tracking-[-.035em] sm:text-5xl">{rango.etapa.etiqueta}</p><p className="mt-4 text-sm leading-6 text-[#FAF7F3]">{rango.indice === 0 ? 'Tu próximo capítulo empieza con un primer paso. Estamos para acompañarte.' : rango.indice === 4 ? '¡Qué lindo todo lo que estás construyendo! Seguí aprendiendo y haciendo espacio para vos.' : '¡Bien ahí, Socia! Estás haciendo lugar para aprender, accionar y seguir creciendo.'}</p><div className="mt-5 flex gap-2" aria-label={`Etapa ${rango.indice + 1} de ${ETAPAS_PERSONALES.length}`}>{ETAPAS_PERSONALES.map((e, i) => <span key={e.id} aria-hidden="true" className={`h-1.5 flex-1 rounded-full ${i <= rango.indice ? 'bg-[#F4CAD8]' : 'bg-[#FAF7F3]/25'}`} />)}</div></div>
      <div className="min-w-0 rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-5"><h3 className="text-base font-semibold">{rango.proximo ? `Tu próximo nivel: ${rango.proximo.etapa.etiqueta}` : 'Llegaste a Socia TOP'}</h3>{rango.proximo ? <><p className="mt-2 text-xs leading-5 text-[#746A64]">Estos son tus pasos concretos. Cada clase y tarea cuenta una vez.</p><progress value={rango.proximo.progreso} max={100} aria-label={`Avance hacia ${rango.proximo.etapa.etiqueta}`} className="mt-4 block h-2 w-full overflow-hidden rounded-full [&::-webkit-progress-bar]:bg-[#E7DDD5] [&::-webkit-progress-value]:bg-[#294A38] [&::-moz-progress-bar]:bg-[#294A38]" /><ul className="mt-4 space-y-3">{rango.proximo.requisitos.map(r => <li key={r.id} className="flex items-start justify-between gap-4 text-sm"><span className="min-w-0 leading-6 text-[#746A64]">{r.texto}</span><span className="shrink-0 rounded-full bg-[#F4CAD8]/60 px-2.5 py-1 font-impact text-xs font-semibold tabular-nums text-[#294A38]">{Math.min(r.actual, r.meta)} / {r.meta}</span></li>)}</ul>{pendientes[0] && <a href={pendientes[0].href} className={`${boton} mt-5 w-full`}>{pendientes[0].accion} <span aria-hidden="true">→</span></a>}</> : <p className="mt-3 text-sm leading-6 text-[#746A64]">Un programa completo, tres clases, diez tareas y actividad en tres días distintos. Es tu avance personal, no una competencia con otras socias.</p>}</div>
    </div>
    <div className="flex flex-col gap-3 border-t border-[#E7DDD5] pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold">Tu avance también merece celebrarse.</p><p className="mt-1 text-xs leading-5 text-[#746A64]">Una imagen para tu historia, sin nombres ni datos privados.</p></div><button type="button" disabled={!imagen} aria-expanded={abierta && Boolean(imagen)} onClick={() => setAbierta(v => !v)} className={`${boton} shrink-0`}>{abierta && imagen ? 'Cerrar imagen' : 'Preparar mi historia'}</button></div>
    {!imagen && <p className="text-xs text-[#746A64]">Completá tu primera clase o tarea para preparar tu historia.</p>}
    {abierta && imagen && <HistoriaRango key={JSON.stringify(imagen)} data={imagen} />}
    <p className="text-[11px] leading-6 text-[#746A64]">Nivel actual al {fechaRango(rango.fecha)}. Mi día: {fechaRango(rango.desde)} al {fechaRango(rango.fecha)}, hora Argentina. Las clases usan tu progreso actual; tareas y días, los últimos 30 días. Se recalcula con tus registros, sin puntos permanentes. Desmarcar, reprogramar o cambiar el contenido puede modificarlo. No es un certificado ni un ranking de alumnas.</p>
  </section>
}

export function HistoriaRango({ data }: { data: ImagenRangoPersonal }) {
  const canvas = useRef<HTMLCanvasElement>(null), compartiendoAhora = useRef(false)
  const [archivo, setArchivo] = useState<{ key: string; blob: Blob } | null>(null)
  const [error, setError] = useState(''), [mensaje, setMensaje] = useState(''), [intento, setIntento] = useState(0), [compartiendo, setCompartiendo] = useState(false)
  const key = JSON.stringify(data), listo = archivo?.key === key
  useEffect(() => {
    let cancelado = false
    const elemento = canvas.current
    if (!elemento) return
    async function preparar() {
      try {
        await document.fonts.ready
        if (cancelado || !elemento) return
        const ctx = elemento.getContext('2d')
        if (!ctx) throw new Error('canvas')
        elemento.width = 1080; elemento.height = 1920
        const fuente = getComputedStyle(elemento).fontFamily
        const editorial = getComputedStyle(document.documentElement).getPropertyValue('--font-playfair').trim() || fuente
        dibujarImagenRango(ctx, data, { fuente, editorial })
        elemento.toBlob(blob => { if (!cancelado) { if (blob) setArchivo({ key, blob }); else setError('No pudimos generar el PNG. Volvé a intentarlo.') } }, 'image/png')
      } catch { if (!cancelado) setError('No pudimos preparar tu historia. Podés volver a intentarlo.') }
    }
    void preparar()
    return () => { cancelado = true }
  }, [data, key, intento])
  function descargar() {
    if (!listo || !archivo || compartiendoAhora.current) return
    let url: string | null = null
    try {
      url = URL.createObjectURL(archivo.blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'mi-nivel-socias-digitales.png'; a.click()
      setMensaje('Historia descargada. Elegí vos dónde compartirla.')
    } catch { setError('No pudimos descargar la historia. Podés volver a intentarlo.') }
    finally { if (url) { const temporal = url; setTimeout(() => URL.revokeObjectURL(temporal), 30_000) } }
  }
  async function compartir() {
    if (!listo || !archivo || compartiendoAhora.current) return
    setError(''); setMensaje('')
    try {
      const file = new File([archivo.blob], 'mi-nivel-socias-digitales.png', { type: 'image/png' })
      if (!navigator.canShare?.({ files: [file] }) || !navigator.share) { descargar(); return }
      compartiendoAhora.current = true; setCompartiendo(true)
      await navigator.share({ files: [file], title: 'Mi nivel actual · Socias Digitales' })
      setMensaje('Usaste el selector de tu dispositivo. No publicamos nada automáticamente.')
    } catch (cause) { if (!(cause instanceof DOMException && cause.name === 'AbortError')) setError('No pudimos abrir Compartir. Podés usar Descargar PNG.') }
    finally { compartiendoAhora.current = false; setCompartiendo(false) }
  }
  return <section aria-label="Historia de mi nivel personal" className="rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-4 sm:p-5"><div className="grid gap-5 sm:grid-cols-[minmax(0,280px)_minmax(0,1fr)]"><canvas ref={canvas} width={1080} height={1920} aria-label={`Vista previa: nivel ${data.etiqueta}, ${data.clases} clases, ${data.programas} programas y ${data.tareas} tareas`} className="mx-auto block w-full max-w-[280px] rounded-2xl border border-[#E7DDD5] font-impact" /><div className="min-w-0"><h3 className="text-lg font-semibold">Tu historia, a tu manera.</h3><p className="mt-3 text-sm leading-6 text-[#746A64]">Historia vertical · 1080 × 1920. Revisala antes de publicarla. Solo muestra tu nivel, conteos y fechas; nunca incluye nombres, tareas, emails ni datos de ventas.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={!listo || compartiendo} onClick={descargar} className={boton}>Descargar PNG</button><button type="button" disabled={!listo || compartiendo} onClick={() => void compartir()} className={boton}>{compartiendo ? 'Abriendo…' : 'Compartir imagen'}</button></div>{!listo && !error && <p role="status" className="mt-4 text-sm text-[#746A64]">Preparando tu historia…</p>}{error && <div role="alert" className="mt-4 text-sm text-[#746A64]"><p>{error}</p><button type="button" className={`${boton} mt-3`} onClick={() => { setError(''); setMensaje(''); setArchivo(null); setIntento(n => n + 1) }}>Reintentar imagen</button></div>}{mensaje && <p role="status" className="mt-4 text-sm text-[#294A38]">{mensaje}</p>}</div></div></section>
}
