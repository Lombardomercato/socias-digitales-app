'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Resultado {
  id: string
  descripcion: string | null
  archivo_url: string | null
  monto: number | null
  mes: string | null
  created_at: string
  perfiles: { nombre: string; avatar_url: string | null } | null
  productos: { nombre: string } | null
}

interface Reaccion {
  resultado_id: string
  alumna_id: string
}

interface Comentario {
  id: string
  resultado_id: string
  contenido: string
  created_at: string
  alumna_id: string
  perfiles: { nombre: string; avatar_url: string | null } | null
}

interface MiPerfil {
  nombre: string
  avatar_url: string | null
}

interface Props {
  resultados: Resultado[]
  reacciones: Reaccion[]
  comentarios: Comentario[]
  userId: string
  miPerfil: MiPerfil | null
}

function Avatar({ url, nombre }: { url?: string | null; nombre?: string | null }) {
  if (url) return <img src={url} className="rounded-full object-cover flex-shrink-0" style={{ width: 40, height: 40 }} alt="" />
  return (
    <div className="rounded-full flex-shrink-0 flex items-center justify-center text-lg"
      style={{ width: 40, height: 40, background: '#fce7f3' }}>🌸</div>
  )
}

function AvatarSm({ url }: { url?: string | null }) {
  if (url) return <img src={url} className="rounded-full object-cover flex-shrink-0" style={{ width: 28, height: 28 }} alt="" />
  return (
    <div className="rounded-full flex-shrink-0 flex items-center justify-center text-sm"
      style={{ width: 28, height: 28, background: '#fce7f3' }}>🌸</div>
  )
}

export default function ComunidadCliente({ resultados, reacciones, comentarios, userId, miPerfil }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [reaccionesLocales, setReaccionesLocales] = useState<Reaccion[]>(reacciones)
  const [comentariosLocales, setComentariosLocales] = useState<Comentario[]>(comentarios)
  const [textos, setTextos] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState<string | null>(null)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  function misReacciones(resultadoId: string) {
    return reaccionesLocales.some(r => r.resultado_id === resultadoId && r.alumna_id === userId)
  }

  function contarReacciones(resultadoId: string) {
    return reaccionesLocales.filter(r => r.resultado_id === resultadoId).length
  }

  async function toggleReaccion(resultadoId: string) {
    const yoReaccioné = misReacciones(resultadoId)
    if (yoReaccioné) {
      setReaccionesLocales(prev => prev.filter(r => !(r.resultado_id === resultadoId && r.alumna_id === userId)))
      await supabase.from('reacciones').delete().eq('resultado_id', resultadoId).eq('alumna_id', userId)
    } else {
      setReaccionesLocales(prev => [...prev, { resultado_id: resultadoId, alumna_id: userId }])
      await supabase.from('reacciones').insert({ resultado_id: resultadoId, alumna_id: userId })
    }
  }

  async function enviarComentario(resultadoId: string) {
    const texto = textos[resultadoId]?.trim()
    if (!texto) return
    setEnviando(resultadoId)

    const nuevoComentario: Comentario = {
      id: crypto.randomUUID(),
      resultado_id: resultadoId,
      contenido: texto,
      created_at: new Date().toISOString(),
      alumna_id: userId,
      perfiles: miPerfil ? { nombre: miPerfil.nombre, avatar_url: miPerfil.avatar_url } : null,
    }

    setComentariosLocales(prev => [...prev, nuevoComentario])
    setTextos(prev => ({ ...prev, [resultadoId]: '' }))

    await supabase.from('comentarios_resultados').insert({
      resultado_id: resultadoId,
      alumna_id: userId,
      contenido: texto,
    })

    setEnviando(null)
  }

  function toggleExpandido(id: string) {
    setExpandidos(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="min-h-screen" style={{ background: '#f5f0eb' }}>
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        <div className="flex items-center gap-4">
          <a href="/perfil" className="text-sm text-gray-500 hover:text-gray-800">← Mi perfil</a>
        </div>
      </nav>

      {/* Portada */}
      <div className="relative w-full overflow-hidden" style={{ height: 315 }}>
        <img src="/banner-comunidad.png" alt="Muro de resultados" className="w-full h-full object-cover" style={{ display: 'block' }} />
        <div className="absolute inset-0 flex flex-col justify-end px-8 pb-8"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }}>
          <h1 className="text-4xl font-black text-white">Muro de resultados</h1>
          <p className="text-base text-white/80 mt-1">Los logros de toda la comunidad Socias Digitales 🏆</p>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-10 space-y-4">

        {resultados.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
            <p className="text-4xl mb-3">✨</p>
            <p className="font-bold text-gray-700">¡Todavía no hay resultados publicados!</p>
            <p className="text-sm text-gray-400 mt-2">Sé la primera en compartir tu logro.</p>
            <a href="/resultados"
              className="inline-block mt-5 text-white text-sm font-bold px-6 py-3 rounded-xl"
              style={{ background: '#E27396' }}>
              Cargar mi resultado
            </a>
          </div>
        ) : (
          resultados.map(r => {
            const miReaccion = misReacciones(r.id)
            const totalReacciones = contarReacciones(r.id)
            const comsDeEste = comentariosLocales.filter(c => c.resultado_id === r.id)
            const expandido = expandidos.has(r.id)

            return (
              <div key={r.id} className="bg-white rounded-3xl shadow-sm overflow-hidden">

                {/* Card horizontal */}
                <div className="flex gap-0">
                  {/* Foto izquierda */}
                  {r.archivo_url && (
                    <div className="flex-shrink-0" style={{ width: 160 }}>
                      <img src={r.archivo_url} className="h-full w-full object-cover" style={{ minHeight: 160, maxHeight: 220 }} alt="" />
                    </div>
                  )}

                  {/* Contenido derecha */}
                  <div className="flex-1 flex flex-col justify-between p-4 min-w-0">
                    {/* Nombre y fecha */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar url={r.perfiles?.avatar_url} nombre={r.perfiles?.nombre} />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-sm truncate">{r.perfiles?.nombre ?? 'Socia'}</p>
                          <p className="text-xs text-gray-400">
                            {r.mes ?? new Date(r.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      {r.monto && (
                        <div className="text-right px-3 py-2 rounded-2xl flex-shrink-0" style={{ background: '#edf7f2' }}>
                          <p className="text-xs font-medium" style={{ color: '#337357' }}>Comisión</p>
                          <p className="font-black text-xl leading-tight" style={{ color: '#337357' }}>
                            +${r.monto.toLocaleString('es-AR')}
                          </p>
                          <p className="text-xs font-bold" style={{ color: '#337357' }}>USD</p>
                        </div>
                      )}
                    </div>

                    {/* Descripción */}
                    {r.descripcion && (
                      <p className="text-sm text-gray-700 leading-relaxed mt-3 line-clamp-3">{r.descripcion}</p>
                    )}

                    {/* Producto */}
                    {r.productos && (
                      <div className="mt-2">
                        <span className="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-medium">
                          🛍️ {r.productos.nombre}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-4">
                  <button onClick={() => toggleReaccion(r.id)}
                    className="flex items-center gap-1.5 text-sm font-medium transition-all"
                    style={{ color: miReaccion ? '#E27396' : '#9ca3af' }}>
                    <span className="text-lg">{miReaccion ? '🎉' : '🎊'}</span>
                    <span>{miReaccion ? 'Felicitaste' : 'Felicitar'}</span>
                    {totalReacciones > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                        style={{ background: miReaccion ? '#fce7f3' : '#f3f4f6', color: miReaccion ? '#E27396' : '#6b7280' }}>
                        {totalReacciones}
                      </span>
                    )}
                  </button>
                  <button onClick={() => toggleExpandido(r.id)}
                    className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors">
                    <span className="text-lg">💬</span>
                    <span>{comsDeEste.length > 0 ? `${comsDeEste.length} comentario${comsDeEste.length > 1 ? 's' : ''}` : 'Comentar'}</span>
                  </button>
                </div>

                {/* Comentarios */}
                {(expandido || comsDeEste.length > 0) && (
                  <div className="px-5 pb-4 space-y-3" style={{ borderTop: '1px solid #f3f4f6' }}>

                    {comsDeEste.length > 0 && (
                      <div className="space-y-3 pt-3">
                        {comsDeEste.map(c => (
                          <div key={c.id} className="flex gap-2.5">
                            <AvatarSm url={c.perfiles?.avatar_url} />
                            <div className="flex-1">
                              <div className="rounded-2xl px-3 py-2" style={{ background: '#f5f0eb' }}>
                                <p className="text-xs font-bold text-gray-800">{c.perfiles?.nombre ?? 'Socia'}</p>
                                <p className="text-sm text-gray-700 mt-0.5">{c.contenido}</p>
                              </div>
                              <p className="text-xs text-gray-400 mt-1 ml-2">
                                {new Date(c.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Input comentario */}
                    <div className="flex gap-2 pt-1">
                      <AvatarSm url={miPerfil?.avatar_url} />
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Escribí un mensaje..."
                          value={textos[r.id] ?? ''}
                          onChange={e => setTextos(prev => ({ ...prev, [r.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && enviarComentario(r.id)}
                          className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2"
                          style={{ background: '#f9fafb' }}
                        />
                        <button
                          onClick={() => enviarComentario(r.id)}
                          disabled={!textos[r.id]?.trim() || enviando === r.id}
                          className="px-3 py-2 rounded-xl text-white text-sm font-bold disabled:opacity-40 transition-colors"
                          style={{ background: '#E27396' }}>
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
