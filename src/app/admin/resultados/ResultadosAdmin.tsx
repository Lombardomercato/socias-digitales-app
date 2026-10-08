'use client'
import AdminSectionMenu from '@/components/AdminSectionMenu'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Resultado {
  id: string
  tipo: string
  titulo: string | null
  descripcion: string | null
  archivo_url: string | null
  monto: number | null
  mes: string | null
  producto_id: string | null
  pais: string | null
  estrategia: string | null
  estado: string
  created_at: string
  perfiles: { nombre: string; avatar_url: string | null } | null
}

interface Props {
  resultados: Resultado[]
}

const TIPO_EMOJI: Record<string, string> = {
  captura: '📸',
  testimonio: '💬',
  video: '🎥',
  caso_exito: '🏆',
}

const ESTADO_COLOR: Record<string, string> = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  aprobado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
}

function Avatar({ url, nombre }: { url?: string | null; nombre?: string | null }) {
  if (url) return <img src={url} className="w-9 h-9 rounded-full object-cover flex-shrink-0" alt="" />
  return <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-lg flex-shrink-0">🌸</div>
}

export default function ResultadosAdmin({ resultados }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [filtroPais, setFiltroPais] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [resultadoAbierto, setResultadoAbierto] = useState<Resultado | null>(null)

  const paises = [...new Set(resultados.map(r => r.pais).filter(Boolean))] as string[]

  const filtrados = resultados.filter(r => {
    const okPais = filtroPais === '' || r.pais === filtroPais
    const okTipo = filtroTipo === 'todos' || r.tipo === filtroTipo
    const okEstado = filtroEstado === 'todos' || r.estado === filtroEstado
    return okPais && okTipo && okEstado
  })

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('resultados').update({ estado }).eq('id', id)
    setResultadoAbierto(null)
    router.refresh()
  }

  const pendientes = resultados.filter(r => r.estado === 'pendiente').length
  const aprobados = resultados.filter(r => r.estado === 'aprobado').length
  const montoTotal = resultados.filter(r => r.estado === 'aprobado').reduce((acc, r) => acc + (r.monto ?? 0), 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
          <h1 className="text-lg font-bold text-rose-600">Resultados y Testimonios</h1>
        </div>
      </nav>
      <AdminSectionMenu />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 text-center border border-gray-100">
            <p className="text-3xl font-bold text-amber-500">{pendientes}</p>
            <p className="text-xs text-gray-400 mt-1">Pendientes de revisión</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 text-center border border-gray-100">
            <p className="text-3xl font-bold text-green-500">{aprobados}</p>
            <p className="text-xs text-gray-400 mt-1">Resultados aprobados</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 text-center border border-gray-100">
            <p className="text-3xl font-bold text-rose-500">${montoTotal.toLocaleString('es-AR')}</p>
            <p className="text-xs text-gray-400 mt-1">Monto total reportado</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex flex-wrap gap-3 items-center border border-gray-100">
          <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="aprobado">Aprobado</option>
            <option value="rechazado">Rechazado</option>
          </select>

          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
            <option value="todos">Todos los tipos</option>
            <option value="captura">📸 Captura</option>
            <option value="testimonio">💬 Testimonio</option>
            <option value="video">🎥 Video</option>
            <option value="caso_exito">🏆 Caso de éxito</option>
          </select>

          <select value={filtroPais} onChange={e => setFiltroPais(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
            <option value="">Todos los países</option>
            {paises.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <span className="text-xs text-gray-400 ml-auto">{filtrados.length} resultados</span>
        </div>

        {/* Grid de resultados */}
        {filtrados.length === 0
          ? <div className="bg-white rounded-xl p-10 text-center text-gray-400">No hay resultados que coincidan</div>
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map(r => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setResultadoAbierto(r)}>
                {/* Imagen/preview */}
                <div className="h-40 bg-gradient-to-br from-rose-50 to-pink-100 flex items-center justify-center relative">
                  {r.archivo_url && (r.tipo === 'captura' || r.tipo === 'caso_exito') ? (
                    <img src={r.archivo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-5xl">{TIPO_EMOJI[r.tipo] ?? '📄'}</span>
                  )}
                  <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLOR[r.estado]}`}>
                    {r.estado}
                  </span>
                </div>

                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar url={r.perfiles?.avatar_url} nombre={r.perfiles?.nombre} />
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.perfiles?.nombre ?? 'Alumna'}</p>
                      {r.pais && <p className="text-xs text-gray-400">{r.pais}</p>}
                    </div>
                  </div>
                  {r.titulo && <p className="text-sm font-semibold text-gray-900 mb-1">{r.titulo}</p>}
                  {r.monto && <p className="text-sm text-rose-600 font-bold">${r.monto.toLocaleString('es-AR')}</p>}
                  {r.estrategia && <p className="text-xs text-gray-400 mt-1">{r.estrategia}</p>}
                </div>
              </div>
            ))}
          </div>
        }
      </div>

      {/* Modal detalle */}
      {resultadoAbierto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{TIPO_EMOJI[resultadoAbierto.tipo]} {resultadoAbierto.titulo ?? 'Resultado'}</h3>
              <button onClick={() => setResultadoAbierto(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar url={resultadoAbierto.perfiles?.avatar_url} />
                <div>
                  <p className="font-medium text-gray-900">{resultadoAbierto.perfiles?.nombre}</p>
                  <p className="text-xs text-gray-400">{resultadoAbierto.pais} · {new Date(resultadoAbierto.created_at).toLocaleDateString('es-AR')}</p>
                </div>
              </div>

              {resultadoAbierto.archivo_url && (
                <img src={resultadoAbierto.archivo_url} className="w-full rounded-xl object-cover max-h-64" alt="" />
              )}

              {resultadoAbierto.descripcion && (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4">{resultadoAbierto.descripcion}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                {resultadoAbierto.monto && (
                  <div className="bg-rose-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Comisión ganada</p>
                    <p className="font-bold text-rose-600">${resultadoAbierto.monto.toLocaleString('es-AR')} USD</p>
                  </div>
                )}
                {resultadoAbierto.mes && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Mes</p>
                    <p className="font-medium text-gray-800">{resultadoAbierto.mes}</p>
                  </div>
                )}
                {resultadoAbierto.estrategia && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-xs text-gray-400">Estrategia</p>
                    <p className="font-medium text-gray-800">{resultadoAbierto.estrategia}</p>
                  </div>
                )}
              </div>
            </div>

            {resultadoAbierto.estado === 'pendiente' && (
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <button onClick={() => cambiarEstado(resultadoAbierto.id, 'rechazado')}
                  className="flex-1 border border-red-200 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50">
                  Rechazar
                </button>
                <button onClick={() => cambiarEstado(resultadoAbierto.id, 'aprobado')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium">
                  Aprobar ✓
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
