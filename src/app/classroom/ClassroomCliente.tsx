'use client'

import { useState } from 'react'

interface Clase {
  id: string
  titulo: string
  descripcion: string | null
  vimeo_url: string | null
  video_key?: string | null
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

export default function ClassroomCliente({ clases, esAdmin, perfil }: Props) {
  const [claseAbierta, setClaseAbierta] = useState<Clase | null>(null)
  const [videoSeguroUrl, setVideoSeguroUrl] = useState<string | null>(null)
  const [cargandoVideo, setCargandoVideo] = useState<string | null>(null)
  const [errorVideo, setErrorVideo] = useState('')

  const tieneAcceso = () => esAdmin || Boolean(perfil?.desafio_socias_habilitada)

  // Agrupar por módulo
  const modulos = [...new Set(clases.map(c => c.modulo))]
  const totalDesbloqueadas = clases.filter(() => tieneAcceso()).length
  const total = clases.length

  async function abrirClase(clase: Clase) {
    setErrorVideo('')
    setVideoSeguroUrl(null)
    if (clase.video_key) {
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

  return (
    <div className="min-h-screen" style={{ background: '#f5f0eb' }}>
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        <div className="flex items-center gap-4">
          <a href="/inicio" className="text-sm text-gray-500 hover:text-gray-800">← Mi espacio</a>
          {esAdmin && <a href="/admin/classroom" className="text-sm text-rose-600 font-medium">Gestionar clases</a>}
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-3xl font-black" style={{ color: '#1a1a1a' }}>Programa Socias Digitales</h1>
          <p className="text-sm text-gray-500 mt-2">
            {totalDesbloqueadas} de {total} clases disponibles
          </p>
        </div>

        {/* Acceso al desafío */}
        {!esAdmin && (
          <div className="rounded-2xl px-5 py-4 flex items-center justify-between bg-white">
            <div>
              <p className="text-xs text-gray-400 font-medium">Acceso habilitado</p>
              <p className="text-lg font-bold mt-0.5" style={{ color: '#294A38' }}>Desafío Socias</p>
            </div>
            <p className="text-xs font-semibold" style={{ color: '#294A38' }}>{totalDesbloqueadas} clases disponibles ✓</p>
          </div>
        )}

        {/* Clases por módulo */}
        {modulos.map(modulo => {
          const clasesDelModulo = clases.filter(c => c.modulo === modulo)
          return (
            <div key={modulo} className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">{modulo}</h2>
              <div className="space-y-2">
                {clasesDelModulo.map(clase => {
                  const desbloqueada = tieneAcceso()
                  return (
                    <div key={clase.id}
                      onClick={() => desbloqueada && (clase.vimeo_url || clase.video_key) && abrirClase(clase)}
                      className={`bg-white rounded-2xl p-4 flex items-center gap-4 transition-all ${desbloqueada && (clase.vimeo_url || clase.video_key) ? 'cursor-pointer hover:shadow-md hover:border-rose-200 border border-transparent' : 'opacity-70 cursor-not-allowed border border-transparent'}`}>

                      {/* Número / candado */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm"
                        style={{ background: desbloqueada ? '#fce7f3' : '#f3f4f6', color: desbloqueada ? '#E27396' : '#9ca3af' }}>
                        {desbloqueada ? clase.orden + 1 : '🔒'}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-bold text-sm ${desbloqueada ? 'text-gray-900' : 'text-gray-400'}`}>
                          {clase.titulo}
                        </p>
                        {clase.descripcion && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{clase.descripcion}</p>
                        )}
                      </div>

                      {/* Play si desbloqueada */}
                      {desbloqueada && (clase.vimeo_url || clase.video_key) && (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: '#E27396' }}>
                          <span className="text-white text-xs">{cargandoVideo === clase.id ? '…' : '▶'}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}

        {clases.length === 0 && (
          <div className="bg-white rounded-3xl p-12 text-center">
            <p className="text-4xl mb-3">📚</p>
            <p className="font-bold text-gray-700">Las clases se están preparando</p>
            <p className="text-sm text-gray-400 mt-1">Muy pronto vas a poder empezar</p>
          </div>
        )}
      </div>

      {/* Modal reproductor */}
      {errorVideo && <div role="alert" className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-white px-5 py-3 text-sm text-red-700 shadow-lg">{errorVideo}</div>}
      {claseAbierta && (claseAbierta.vimeo_url || claseAbierta.video_key) && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4"
          onClick={() => { setClaseAbierta(null); setVideoSeguroUrl(null) }}>
          <div className="w-full max-w-3xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-white font-bold">{claseAbierta.titulo}</p>
              <button onClick={() => { setClaseAbierta(null); setVideoSeguroUrl(null) }} className="text-white/70 hover:text-white text-2xl">✕</button>
            </div>
            <div className="relative rounded-2xl overflow-hidden" style={{ paddingBottom: '56.25%' }}>
              {claseAbierta.video_key ? (
                videoSeguroUrl ? <video src={videoSeguroUrl} className="absolute inset-0 h-full w-full bg-black" controls autoPlay playsInline /> : <div className="absolute inset-0 flex items-center justify-center text-white">Preparando la clase…</div>
              ) : (
                <iframe src={vimeoEmbed(claseAbierta.vimeo_url ?? '') ?? ''} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
