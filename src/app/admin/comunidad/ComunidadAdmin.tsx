'use client'
import AdminSectionMenu from '@/components/AdminSectionMenu'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Respuesta {
  id: string
  contenido: string
  es_oficial: boolean
  created_at: string
  perfiles: { nombre: string } | null
}

interface Pregunta {
  id: string
  titulo: string
  contenido: string
  estado: string
  created_at: string
  perfiles: { nombre: string; avatar_url: string | null } | null
  respuestas: Respuesta[]
}

interface Publicacion {
  id: string
  contenido: string
  imagen_url: string | null
  created_at: string
  perfiles: { nombre: string; avatar_url: string | null } | null
  comentarios: { id: string }[]
  reacciones: { id: string }[]
}

interface Stats {
  totalPreguntas: number
  sinResponder: number
  publicacionesMes: number
  comentariosMes: number
  reaccionesMes: number
}

interface Props {
  preguntas: Pregunta[]
  publicaciones: Publicacion[]
  stats: Stats
  adminId: string
}

function Avatar({ url, nombre }: { url?: string | null; nombre?: string | null }) {
  if (url) return <img src={url} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
  return <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-lg flex-shrink-0">🌸</div>
}

function formatFecha(f: string) {
  return new Date(f).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ComunidadAdmin({ preguntas, publicaciones, stats, adminId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState<'qa' | 'comunidad'>('qa')
  const [preguntaAbierta, setPreguntaAbierta] = useState<Pregunta | null>(null)
  const [respuesta, setRespuesta] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [filtroPregunta, setFiltroPregunta] = useState('todas')

  async function responderPregunta(preguntaId: string) {
    if (!respuesta.trim()) return
    setEnviando(true)
    await supabase.from('respuestas').insert({
      pregunta_id: preguntaId,
      autor_id: adminId,
      contenido: respuesta,
      es_oficial: true,
    })
    await supabase.from('preguntas').update({ estado: 'respondida' }).eq('id', preguntaId)
    setRespuesta('')
    setEnviando(false)
    setPreguntaAbierta(null)
    router.refresh()
  }

  async function eliminarPublicacion(id: string) {
    await supabase.from('publicaciones').delete().eq('id', id)
    router.refresh()
  }

  const preguntasFiltradas = preguntas.filter(p =>
    filtroPregunta === 'todas' ? true : p.estado === filtroPregunta
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
          <h1 className="text-lg font-bold text-rose-600">Comunidad</h1>
        </div>
      </nav>
      <AdminSectionMenu />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Métricas */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { label: 'Total preguntas', valor: stats.totalPreguntas, emoji: '❓' },
            { label: 'Sin responder', valor: stats.sinResponder, emoji: '⏳', alerta: stats.sinResponder > 0 },
            { label: 'Posts este mes', valor: stats.publicacionesMes, emoji: '📝' },
            { label: 'Comentarios', valor: stats.comentariosMes, emoji: '💬' },
            { label: 'Reacciones', valor: stats.reaccionesMes, emoji: '❤️' },
          ].map(m => (
            <div key={m.label} className={`bg-white rounded-xl shadow-sm p-4 text-center border ${m.alerta ? 'border-red-200' : 'border-gray-100'}`}>
              <div className="text-xl mb-1">{m.emoji}</div>
              <div className={`text-2xl font-bold ${m.alerta ? 'text-red-500' : 'text-gray-900'}`}>{m.valor}</div>
              <div className="text-xs text-gray-400 mt-1">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm w-fit">
          {[{ id: 'qa', label: '❓ Preguntas y respuestas' }, { id: 'comunidad', label: '📝 Publicaciones' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as 'qa' | 'comunidad')}
              className={`py-2 px-5 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-rose-500 text-white' : 'text-gray-500 hover:text-gray-800'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Q&A */}
        {tab === 'qa' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              {['todas', 'abierta', 'respondida'].map(f => (
                <button key={f} onClick={() => setFiltroPregunta(f)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filtroPregunta === f ? 'bg-rose-500 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                  {f}
                </button>
              ))}
            </div>

            {preguntasFiltradas.length === 0
              ? <div className="bg-white rounded-xl p-10 text-center text-gray-400">No hay preguntas</div>
              : preguntasFiltradas.map(p => (
                <div key={p.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start gap-3">
                    <Avatar url={p.perfiles?.avatar_url} nombre={p.perfiles?.nombre} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-800">{p.perfiles?.nombre ?? 'Alumna'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.estado === 'abierta' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {p.estado}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{formatFecha(p.created_at)}</span>
                      </div>
                      <p className="font-semibold text-gray-900">{p.titulo}</p>
                      <p className="text-sm text-gray-600 mt-1">{p.contenido}</p>

                      {/* Respuestas existentes */}
                      {p.respuestas.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {p.respuestas.map(r => (
                            <div key={r.id} className={`rounded-lg p-3 text-sm ${r.es_oficial ? 'bg-rose-50 border border-rose-100' : 'bg-gray-50'}`}>
                              <div className="flex items-center gap-1 mb-1">
                                {r.es_oficial && <span className="text-xs bg-rose-500 text-white px-1.5 py-0.5 rounded font-medium">Oficial</span>}
                                <span className="text-xs text-gray-500">{r.perfiles?.nombre}</span>
                              </div>
                              <p className="text-gray-700">{r.contenido}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Responder */}
                      {p.estado === 'abierta' && (
                        <div className="mt-3">
                          {preguntaAbierta?.id === p.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={respuesta}
                                onChange={e => setRespuesta(e.target.value)}
                                placeholder="Escribí tu respuesta oficial..."
                                rows={3}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                              />
                              <div className="flex gap-2">
                                <button onClick={() => setPreguntaAbierta(null)} className="text-sm text-gray-500 px-3 py-1.5 border border-gray-200 rounded-lg">Cancelar</button>
                                <button onClick={() => responderPregunta(p.id)} disabled={enviando}
                                  className="text-sm bg-rose-500 text-white px-4 py-1.5 rounded-lg hover:bg-rose-600 disabled:bg-rose-300">
                                  {enviando ? 'Enviando...' : 'Responder oficialmente'}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => setPreguntaAbierta(p)} className="text-xs text-rose-600 hover:text-rose-800 font-medium mt-1">
                              + Responder
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}

        {/* Publicaciones */}
        {tab === 'comunidad' && (
          <div className="space-y-4">
            {publicaciones.length === 0
              ? <div className="bg-white rounded-xl p-10 text-center text-gray-400">No hay publicaciones</div>
              : publicaciones.map(pub => (
                <div key={pub.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-start gap-3">
                    <Avatar url={pub.perfiles?.avatar_url} nombre={pub.perfiles?.nombre} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-800">{pub.perfiles?.nombre ?? 'Alumna'}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-400">{formatFecha(pub.created_at)}</span>
                          <button onClick={() => eliminarPublicacion(pub.id)} className="text-xs text-red-400 hover:text-red-600">Eliminar</button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{pub.contenido}</p>
                      {pub.imagen_url && <img src={pub.imagen_url} className="mt-2 rounded-lg max-h-40 object-cover" alt="" />}
                      <div className="flex gap-4 mt-2 text-xs text-gray-400">
                        <span>💬 {pub.comentarios.length} comentarios</span>
                        <span>❤️ {pub.reacciones.length} reacciones</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
