'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Alumna {
  id: string
  nombre: string
  avatar_url: string | null
  progreso: number
  rol: string
  estado: string
  plan: string
  whatsapp: string | null
  pais: string | null
  created_at: string
  ultimo_acceso: string | null
}

interface Stats {
  totalAlumnas: number
  activas: number
  nuevasHoy: number
  nuevasMes: number
  canceladas: number
  pausadas: number
  mrr: number
  facturacionHistorica: number
  afiliadasActivas: number
  ventasMes: number
  comisionesMes: number
  retencion: number
  solicitudesDesafioPendientes: number
}

interface Props {
  alumnas: Alumna[]
  stats: Stats
}

const ESTADO_COLOR: Record<string, string> = {
  activa: 'bg-green-100 text-green-700',
  pausada: 'bg-yellow-100 text-yellow-700',
  cancelada: 'bg-red-100 text-red-700',
}

function diasSinIngresar(ultimoAcceso: string | null) {
  if (!ultimoAcceso) return '—'
  const diff = Date.now() - new Date(ultimoAcceso).getTime()
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
  return dias === 0 ? 'Hoy' : `${dias}d`
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

export default function AdminDashboard({ alumnas, stats }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [alumnaSeleccionada, setAlumnaSeleccionada] = useState<Alumna | null>(null)
  const [editando, setEditando] = useState<Partial<Alumna>>({})
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [confirmarEliminar, setConfirmarEliminar] = useState(false)

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const alumnasFiltradas = alumnas.filter(a => {
    const coincideBusqueda =
      a.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      a.pais?.toLowerCase().includes(busqueda.toLowerCase())
    const coincideEstado = filtroEstado === 'todas' || a.estado === filtroEstado
    return coincideBusqueda && coincideEstado
  })

  function abrirFicha(alumna: Alumna) {
    setAlumnaSeleccionada(alumna)
    setEditando({ ...alumna })
  }

  async function guardarFicha() {
    if (!alumnaSeleccionada) return
    setGuardando(true)
    await supabase.from('perfiles').update(editando).eq('id', alumnaSeleccionada.id)
    setGuardando(false)
    setAlumnaSeleccionada(null)
    router.refresh()
  }

  async function eliminarAlumna() {
    if (!alumnaSeleccionada) return
    setEliminando(true)
    await fetch('/api/eliminar-alumna', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: alumnaSeleccionada.id }),
    })
    setEliminando(false)
    setConfirmarEliminar(false)
    setAlumnaSeleccionada(null)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold text-rose-600">Panel Admin</h1>
          <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-medium">Administradora</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/perfil" className="text-sm text-gray-500 hover:text-gray-800">Mi perfil</a>
          <button onClick={cerrarSesion} className="text-sm text-gray-500 hover:text-gray-800">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Acciones rápidas */}
        <div className="flex justify-end gap-3">
          <a href="/admin/desafio"
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-rose-300 text-sm font-medium text-gray-700 px-4 py-2 rounded-xl transition-all">
            Solicitudes Desafío
            <span className="rounded-full bg-[#F4CAD8] px-2 py-0.5 text-xs font-bold text-[#171413]">{stats.solicitudesDesafioPendientes}</span>
          </a>
          <a href="/admin/invitar"
            className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">
            ✉️ Invitar alumnas
          </a>
          <a href="/api/exportar-alumnas" download
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-rose-300 hover:shadow-sm text-sm font-medium text-gray-700 px-4 py-2 rounded-xl transition-all">
            📥 Descargar datos (.csv)
          </a>
        </div>

        {/* KPIs principales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { emoji: '📈', label: 'Suscriptoras activas', valor: stats.activas },
            { emoji: '💰', label: 'MRR', valor: `$${stats.mrr.toLocaleString('es-AR')}` },
            { emoji: '🔥', label: 'Afiliadas activas', valor: stats.afiliadasActivas },
            { emoji: '🎯', label: 'Ventas del mes', valor: stats.ventasMes },
            { emoji: '🏆', label: 'Comisiones del mes', valor: `$${stats.comisionesMes.toLocaleString('es-AR')}` },
          ].map(kpi => (
            <div key={kpi.label} className="bg-white rounded-xl shadow-sm p-4 text-center border border-gray-100">
              <div className="text-2xl mb-1">{kpi.emoji}</div>
              <div className="text-2xl font-bold text-gray-900">{kpi.valor}</div>
              <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Dashboard general */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Nuevas hoy</p>
            <p className="text-3xl font-bold text-rose-500">{stats.nuevasHoy}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Nuevas este mes</p>
            <p className="text-3xl font-bold text-rose-500">{stats.nuevasMes}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Tasa de retención</p>
            <p className="text-3xl font-bold text-rose-500">{stats.retencion}%</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Facturación histórica</p>
            <p className="text-3xl font-bold text-rose-500">${stats.facturacionHistorica.toLocaleString('es-AR')}</p>
          </div>
        </div>

        {/* Accesos rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { href: '/admin/classroom', emoji: '📚', label: 'Classroom' },
            { href: '/admin/productos', emoji: '🛍️', label: 'Productos' },
            { href: '/admin/comunidad', emoji: '💬', label: 'Comunidad y Q&A' },
            { href: '/admin/resultados', emoji: '🏆', label: 'Resultados' },
            { href: '/admin/notificaciones', emoji: '🔔', label: 'Notificaciones' },
            { href: '/admin/lanzamiento', emoji: '🚀', label: 'Lanzamiento' },
            { href: '/admin/configuracion', emoji: '⚙️', label: 'Configuración' },
          ].map(link => (
            <a key={link.href} href={link.href}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center hover:border-rose-200 hover:shadow-md transition-all">
              <div className="text-2xl mb-1">{link.emoji}</div>
              <p className="text-sm font-medium text-gray-700">{link.label}</p>
            </a>
          ))}
        </div>

        {/* Estados rápidos */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'Todas', valor: 'todas', count: stats.totalAlumnas },
            { label: 'Activas', valor: 'activa', count: stats.activas },
            { label: 'Pausadas', valor: 'pausada', count: stats.pausadas },
            { label: 'Canceladas', valor: 'cancelada', count: stats.canceladas },
          ].map(f => (
            <button
              key={f.valor}
              onClick={() => setFiltroEstado(f.valor)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filtroEstado === f.valor
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-rose-300'
              }`}
            >
              {f.label} <span className="ml-1 opacity-70">({f.count})</span>
            </button>
          ))}
        </div>

        {/* Tabla de alumnas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-bold text-gray-900">Gestión de Alumnas</h2>
            <input
              type="text"
              placeholder="Buscar por nombre o país..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left px-6 py-3">Alumna</th>
                  <th className="text-left px-4 py-3">Estado</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">País</th>
                  <th className="text-left px-4 py-3">Ingreso</th>
                  <th className="text-left px-4 py-3">Último acceso</th>
                  <th className="text-left px-4 py-3">Progreso</th>
                  <th className="text-left px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {alumnasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-gray-400">
                      No hay alumnas que coincidan
                    </td>
                  </tr>
                ) : alumnasFiltradas.map(alumna => (
                  <tr key={alumna.id} className="hover:bg-rose-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {alumna.avatar_url ? (
                          <img src={alumna.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-lg">🌸</div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{alumna.nombre || 'Sin nombre'}</p>
                          {alumna.whatsapp && <p className="text-xs text-gray-400">{alumna.whatsapp}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ESTADO_COLOR[alumna.estado] ?? 'bg-gray-100 text-gray-600'}`}>
                        {alumna.estado ?? 'activa'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 capitalize">{alumna.plan ?? '—'}</td>
                    <td className="px-4 py-4 text-gray-600">{alumna.pais ?? '—'}</td>
                    <td className="px-4 py-4 text-gray-500">{formatFecha(alumna.created_at)}</td>
                    <td className="px-4 py-4 text-gray-500">{diasSinIngresar(alumna.ultimo_acceso)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-rose-400 h-1.5 rounded-full" style={{ width: `${alumna.progreso ?? 0}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{alumna.progreso ?? 0}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => abrirFicha(alumna)}
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                      >
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal ficha de alumna */}
      {alumnaSeleccionada && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Ficha de alumna</h3>
              <button onClick={() => setAlumnaSeleccionada(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-4 mb-2">
                {alumnaSeleccionada.avatar_url ? (
                  <img src={alumnaSeleccionada.avatar_url} className="w-16 h-16 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center text-3xl">🌸</div>
                )}
                <div>
                  <p className="font-bold text-gray-900">{alumnaSeleccionada.nombre || 'Sin nombre'}</p>
                  <p className="text-sm text-gray-500">Desde {formatFecha(alumnaSeleccionada.created_at)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Nombre', key: 'nombre', type: 'text' },
                  { label: 'WhatsApp', key: 'whatsapp', type: 'text' },
                  { label: 'País', key: 'pais', type: 'text' },
                ].map(({ label, key, type }) => (
                  <div key={key} className={key === 'nombre' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                    <input
                      type={type}
                      value={(editando as Record<string, string>)[key] ?? ''}
                      onChange={e => setEditando(prev => ({ ...prev, [key]: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
                  <select
                    value={editando.estado ?? 'activa'}
                    onChange={e => setEditando(prev => ({ ...prev, estado: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  >
                    <option value="activa">Activa</option>
                    <option value="pausada">Pausada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
                  <select
                    value={editando.plan ?? 'basico'}
                    onChange={e => setEditando(prev => ({ ...prev, plan: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  >
                    <option value="basico">Básico</option>
                    <option value="premium">Premium</option>
                    <option value="vip">VIP</option>
                  </select>
                </div>
              </div>

              {/* Info de solo lectura */}
              <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Progreso del curso</p>
                  <p className="font-semibold text-gray-800">{alumnaSeleccionada.progreso ?? 0}%</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Último acceso</p>
                  <p className="font-semibold text-gray-800">{diasSinIngresar(alumnaSeleccionada.ultimo_acceso)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Rol</p>
                  <p className="font-semibold text-gray-800 capitalize">{alumnaSeleccionada.rol}</p>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => setAlumnaSeleccionada(null)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarFicha}
                  disabled={guardando}
                  className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white py-2.5 rounded-lg text-sm font-medium"
                >
                  {guardando ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
              {!confirmarEliminar ? (
                <button
                  onClick={() => setConfirmarEliminar(true)}
                  className="w-full border border-red-200 text-red-500 hover:bg-red-50 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  🗑️ Eliminar alumna
                </button>
              ) : (
                <div className="bg-red-50 rounded-lg p-3 space-y-2">
                  <p className="text-sm text-red-700 font-medium text-center">¿Segura? Esta acción no se puede deshacer.</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmarEliminar(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg text-sm">Cancelar</button>
                    <button onClick={eliminarAlumna} disabled={eliminando} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg text-sm font-bold">
                      {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
