'use client'

import { useState } from 'react'

interface Clase {
  id: string
  titulo: string
  descripcion: string | null
  vimeo_url: string | null
  tiene_video_privado?: boolean
  orden: number
  plan: '27' | '97'
  modulo: string
  activo: boolean
}

interface Perfil {
  nombre: string | null
  avatar_url: string | null
  rol: string
  plan: string | null
  desafio_socias_habilitada?: boolean
}

interface Props {
  clases: Clase[]
  esAdmin: boolean
  perfil: Perfil | null
}

function vimeoEmbed(url: string) {
  const match = url.match(/vimeo\.com\/(\d+)/)
  return match ? `https://player.vimeo.com/video/${match[1]}?title=0&byline=0&portrait=0` : null
}

function Icon({ name, className = 'h-5 w-5' }: { name: 'play' | 'arrow' | 'book' | 'lock'; className?: string }) {
  const props = { className, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true as const }
  if (name === 'play') return <svg {...props}><path d="m9 6 10 6-10 6V6Z" fill="currentColor" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.5"/></svg>
  if (name === 'arrow') return <svg {...props}><path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  if (name === 'lock') return <svg {...props}><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  return <svg {...props}><path d="M5 4.5h10.5A3.5 3.5 0 0 1 19 8v12H8.5A3.5 3.5 0 0 0 5 23V4.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M5 4.5v15A3.5 3.5 0 0 1 8.5 16H19" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
}

export default function ClassroomCliente({ clases, esAdmin, perfil }: Props) {
  const [claseAbierta, setClaseAbierta] = useState<Clase | null>(null)
  const [videoSeguroUrl, setVideoSeguroUrl] = useState<string | null>(null)
  const [cargandoVideo, setCargandoVideo] = useState<string | null>(null)
  const [errorVideo, setErrorVideo] = useState('')

  const tieneAcceso = esAdmin || Boolean(perfil?.desafio_socias_habilitada)
  const modulos = [...new Set(clases.map(clase => clase.modulo))]

  async function abrirClase(clase: Clase) {
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
    <main className="min-h-screen bg-[#F4EFEA] text-[#211C19]">
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
            <h1 className="mt-2 max-w-3xl font-serif text-4xl leading-[1.04] tracking-[-0.04em] sm:text-5xl">Programa Socias Digitales</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-[#746A64]">Desafío Socias · Clases grabadas</p>
          </div>
          <div className="flex items-center gap-4 rounded-[22px] bg-[#294A38] p-5 text-white">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/12 text-[#F4CAD8]"><Icon name="book" className="h-6 w-6" /></span>
            <div><p className="font-impact text-3xl font-semibold leading-none">{clases.length}</p><p className="mt-1.5 text-xs text-white/65">clases disponibles</p></div>
          </div>
        </section>

        {!esAdmin && (
          <section className="mt-7 flex flex-col gap-3 rounded-[22px] bg-[#F4CAD8] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><p className="font-impact text-[10px] font-semibold uppercase tracking-[0.18em] text-[#294A38]">Acceso habilitado</p><p className="mt-1 font-semibold">Desafío Socias</p></div>
            <p className="text-sm text-[#211C19]/65">Tus clases grabadas están listas para ver.</p>
          </section>
        )}

        {clases.length === 0 ? (
          <section className="mt-8 rounded-[24px] bg-[#FAF7F3] p-8 sm:p-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4CAD8] text-[#294A38]"><Icon name="book" className="h-6 w-6" /></div>
            <h2 className="mt-5 font-serif text-2xl">Estamos preparando tus clases.</h2>
            <p className="mt-2 text-sm text-[#746A64]">Volvé pronto para empezar.</p>
          </section>
        ) : (
          <div className="mt-9 space-y-9">
            {modulos.map((modulo, moduleIndex) => {
              const clasesDelModulo = clases.filter(clase => clase.modulo === modulo)
              return (
                <section key={modulo} aria-labelledby={`modulo-${moduleIndex}`}>
                  <div className="mb-4 flex items-end justify-between gap-4">
                    <div><p className="font-impact text-[10px] font-semibold uppercase tracking-[0.18em] text-[#746A64]">Parte {String(moduleIndex + 1).padStart(2, '0')}</p><h2 id={`modulo-${moduleIndex}`} className="mt-1 font-serif text-2xl tracking-[-0.03em] sm:text-3xl">{modulo}</h2></div>
                    <span className="shrink-0 rounded-full bg-[#FAF7F3] px-3 py-1.5 text-xs text-[#746A64]">{clasesDelModulo.length} {clasesDelModulo.length === 1 ? 'clase' : 'clases'}</span>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {clasesDelModulo.map((clase, index) => {
                      const disponible = tieneAcceso && Boolean(clase.vimeo_url || clase.tiene_video_privado)
                      return (
                        <article key={clase.id} className={`flex min-h-[118px] items-center gap-4 rounded-[22px] p-4 sm:p-5 ${disponible ? 'bg-[#FAF7F3]' : 'bg-[#FAF7F3]/65'}`}>
                          <span className={`font-impact flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${disponible ? index % 2 === 0 ? 'bg-[#EC9BB6] text-[#211C19]' : 'bg-[#F4CAD8] text-[#211C19]' : 'bg-[#F4EFEA] text-[#746A64]'}`}>{String(clase.orden + 1).padStart(2, '0')}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`font-semibold leading-snug ${disponible ? 'text-[#211C19]' : 'text-[#746A64]'}`}>{clase.titulo}</p>
                            {clase.descripcion && <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#746A64]">{clase.descripcion}</p>}
                            <p className="mt-2 font-impact text-[9px] font-semibold uppercase tracking-[0.14em] text-[#294A38]">Clase grabada</p>
                          </div>
                          {disponible ? (
                            <button type="button" onClick={() => abrirClase(clase)} disabled={cargandoVideo === clase.id} aria-label={`Reproducir ${clase.titulo}`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#294A38] text-white transition hover:bg-[#203B2D] disabled:opacity-60"><Icon name="play" className="h-5 w-5" /></button>
                          ) : (
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4EFEA] text-[#746A64]" aria-label="Clase no disponible"><Icon name="lock" className="h-4 w-4" /></span>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </div>

      {errorVideo && <div role="alert" className="fixed bottom-5 left-1/2 z-[60] w-[min(92vw,32rem)] -translate-x-1/2 rounded-2xl border border-[#B01B30]/20 bg-[#FAF7F3] px-5 py-4 text-sm text-[#7C1D2A]">{errorVideo}</div>}

      {claseAbierta && (claseAbierta.vimeo_url || claseAbierta.tiene_video_privado) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171413]/85 p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="clase-reproductor-titulo" onClick={cerrarClase}>
          <div className="w-full max-w-4xl" onClick={event => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between gap-4 text-white"><div><p className="font-impact text-[10px] font-semibold uppercase tracking-[0.18em] text-[#F4CAD8]">Desafío Socias</p><h2 id="clase-reproductor-titulo" className="mt-1 text-base font-semibold sm:text-lg">{claseAbierta.titulo}</h2></div><button type="button" onClick={cerrarClase} aria-label="Cerrar reproductor" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/12 text-2xl leading-none transition hover:bg-white/20">×</button></div>
            <div className="relative overflow-hidden rounded-[20px] bg-black" style={{ paddingBottom: '56.25%' }}>
              {claseAbierta.tiene_video_privado ? (
                videoSeguroUrl ? <video src={videoSeguroUrl} className="absolute inset-0 h-full w-full bg-black" controls autoPlay playsInline /> : <div className="absolute inset-0 flex items-center justify-center text-sm text-white/70">Preparando la clase…</div>
              ) : (
                <iframe src={vimeoEmbed(claseAbierta.vimeo_url ?? '') ?? ''} title={claseAbierta.titulo} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
