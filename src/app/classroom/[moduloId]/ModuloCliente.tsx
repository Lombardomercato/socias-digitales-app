'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

interface Leccion {
  id: string
  titulo: string
  descripcion: string | null
  video_url: string | null
  contenido: string | null
  duracion_min: number
  orden: number
}

interface Modulo {
  id: string
  titulo: string
  descripcion: string | null
  imagen_url: string | null
  lecciones: Leccion[]
}

interface Props {
  modulo: Modulo
  leccionesCompletadas: Set<string>
  userId: string
}

function getVideoEmbed(url: string | null) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/)
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`
  return url
}

export default function ModuloCliente({ modulo, leccionesCompletadas, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [completadas, setCompletadas] = useState(new Set(leccionesCompletadas))
  const [leccionActiva, setLeccionActiva] = useState<Leccion | null>(modulo.lecciones[0] ?? null)
  const [marcando, setMarcando] = useState(false)

  const progreso = modulo.lecciones.length
    ? Math.round((completadas.size / modulo.lecciones.length) * 100)
    : 0

  async function toggleCompletada(leccionId: string) {
    setMarcando(true)
    const yaCompletada = completadas.has(leccionId)

    if (yaCompletada) {
      await supabase.from('progreso_lecciones').update({ completada: false, fecha_completado: null })
        .eq('alumna_id', userId).eq('leccion_id', leccionId)
      setCompletadas(prev => { const s = new Set(prev); s.delete(leccionId); return s })
    } else {
      await supabase.from('progreso_lecciones').upsert({
        alumna_id: userId, leccion_id: leccionId, completada: true, fecha_completado: new Date().toISOString()
      })
      setCompletadas(prev => new Set([...prev, leccionId]))
    }
    setMarcando(false)
  }

  const embedUrl = getVideoEmbed(leccionActiva?.video_url ?? null)

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 flex items-center gap-4 h-14">
          <Link href="/classroom" className="text-gray-400 hover:text-gray-700 text-sm flex items-center gap-1">
            ← Classroom
          </Link>
          <span className="text-gray-300">|</span>
          <h1 className="font-semibold text-gray-900 text-sm truncate">{modulo.titulo}</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-24 bg-gray-100 rounded-full h-1.5">
                <div className="bg-rose-500 h-1.5 rounded-full transition-all" style={{ width: `${progreso}%` }} />
              </div>
              <span className="text-xs text-gray-500">{progreso}%</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar lecciones */}
        <aside className="w-72 flex-shrink-0 hidden md:block">
          <div className="bg-gray-50 rounded-2xl p-4 sticky top-20">
            <h2 className="font-bold text-gray-900 text-sm mb-4">
              Lecciones
              <span className="ml-2 text-gray-400 font-normal">{completadas.size}/{modulo.lecciones.length}</span>
            </h2>

            <div className="space-y-1">
              {modulo.lecciones.map((leccion, i) => {
                const completada = completadas.has(leccion.id)
                const activa = leccionActiva?.id === leccion.id
                return (
                  <button
                    key={leccion.id}
                    onClick={() => setLeccionActiva(leccion)}
                    className={`w-full text-left px-3 py-3 rounded-xl transition-colors flex items-start gap-3 ${
                      activa ? 'bg-white shadow-sm' : 'hover:bg-white/70'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5 ${
                      completada ? 'bg-green-500 text-white' : activa ? 'bg-rose-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {completada ? '✓' : i + 1}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium leading-snug ${activa ? 'text-gray-900' : 'text-gray-600'}`}>
                        {leccion.titulo}
                      </p>
                      {leccion.duracion_min > 0 && (
                        <p className="text-xs text-gray-400 mt-0.5">{leccion.duracion_min} min</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        {/* Contenido principal */}
        <main className="flex-1 min-w-0">
          {leccionActiva ? (
            <div className="space-y-6">
              {/* Video */}
              {embedUrl && (
                <div className="aspect-video bg-black rounded-2xl overflow-hidden">
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

              {/* Info de la lección */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{leccionActiva.titulo}</h2>
                  {leccionActiva.descripcion && (
                    <p className="text-gray-500 mt-1">{leccionActiva.descripcion}</p>
                  )}
                </div>
                <button
                  onClick={() => toggleCompletada(leccionActiva.id)}
                  disabled={marcando}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    completadas.has(leccionActiva.id)
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-rose-500 text-white hover:bg-rose-600'
                  }`}
                >
                  {completadas.has(leccionActiva.id) ? '✓ Completada' : 'Marcar como completada'}
                </button>
              </div>

              {/* Contenido de texto */}
              {leccionActiva.contenido && (
                <div className="bg-gray-50 rounded-2xl p-6 prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                  {leccionActiva.contenido}
                </div>
              )}

              {/* Navegación entre lecciones */}
              <div className="flex justify-between pt-4 border-t border-gray-100">
                {(() => {
                  const idx = modulo.lecciones.findIndex(l => l.id === leccionActiva.id)
                  const anterior = modulo.lecciones[idx - 1]
                  const siguiente = modulo.lecciones[idx + 1]
                  return (
                    <>
                      <button
                        onClick={() => anterior && setLeccionActiva(anterior)}
                        disabled={!anterior}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-30"
                      >
                        ← Anterior
                      </button>
                      <button
                        onClick={() => siguiente ? setLeccionActiva(siguiente) : router.push('/classroom')}
                        className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium rounded-xl"
                      >
                        {siguiente ? 'Siguiente →' : 'Finalizar módulo ✓'}
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">📖</p>
              <p>Seleccioná una lección para empezar</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
