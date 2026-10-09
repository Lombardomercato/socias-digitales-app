'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import NavigationIcon from '@/components/NavigationIcon'

interface Alumna {
  id: string
  nombre: string
  avatar_url: string | null
  progreso: number
  rol: string
  tipo_usuario: string | null
  desafio_socias_habilitada: boolean
  desafio_socias_estado: string
  desafio_socias_habilitada_at: string | null
  desafio_socias_habilitada_por: string | null
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
  fechaReferencia: number
}

interface Props {
  alumnas: Alumna[]
  stats: Stats
}

function diasSinIngresar(ultimoAcceso: string | null, fechaReferencia: number) {
  if (!ultimoAcceso) return '—'
  const diff = fechaReferencia - new Date(ultimoAcceso).getTime()
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
  return dias === 0 ? 'Hoy' : `${dias}d`
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function etiquetaTipoUsuario(tipo: string | null | undefined) {
  if (tipo === 'desafio') return 'Desafío Socias'
  if (tipo === 'socia') return 'Socia'
  return 'Gratuito'
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

  const consulta = busqueda.trim().toLowerCase()
  const alumnasFiltradas = alumnas.filter(a => {
    const coincideBusqueda =
      !consulta ||
      (a.nombre ?? '').toLowerCase().includes(consulta) ||
      (a.pais ?? '').toLowerCase().includes(consulta)
    const coincideEstado = filtroEstado === 'todas' || a.estado === filtroEstado
    return coincideBusqueda && coincideEstado
  })

  const inactivasMes = alumnas.filter(a => {
    if (!a.ultimo_acceso) return true
    return stats.fechaReferencia - new Date(a.ultimo_acceso).getTime() > 30 * 24 * 60 * 60 * 1000
  }).length
  const perfilesIncompletos = alumnas.filter(a => !a.nombre?.trim() || !a.pais).length
  const activasPct = stats.totalAlumnas ? Math.round((stats.activas / stats.totalAlumnas) * 100) : 0

  function abrirFicha(alumna: Alumna) {
    setAlumnaSeleccionada(alumna)
    setEditando({ ...alumna })
  }

  async function guardarFicha() {
    if (!alumnaSeleccionada) return
    setGuardando(true)
    const tipoUsuario = editando.tipo_usuario ?? alumnaSeleccionada.tipo_usuario ?? 'gratuito'
    const cambioTipo = tipoUsuario !== alumnaSeleccionada.tipo_usuario
    const patch: Record<string, unknown> = {
      nombre: editando.nombre,
      whatsapp: editando.whatsapp,
      pais: editando.pais,
      estado: editando.estado,
      plan: editando.plan,
      tipo_usuario: tipoUsuario,
    }
    if (cambioTipo) {
      patch.rol = tipoUsuario === 'socia' ? 'afiliada' : 'alumna'
      patch.desafio_socias_estado = tipoUsuario === 'desafio'
        ? alumnaSeleccionada.tipo_usuario === 'desafio' ? alumnaSeleccionada.desafio_socias_estado : 'pendiente'
        : 'no_aplica'
      patch.desafio_socias_habilitada = tipoUsuario === 'desafio' && alumnaSeleccionada.tipo_usuario === 'desafio'
        ? Boolean(alumnaSeleccionada.desafio_socias_habilitada)
        : false
      if (!patch.desafio_socias_habilitada) {
        patch.desafio_socias_habilitada_at = null
        patch.desafio_socias_habilitada_por = null
      }
    }
    const { error } = await supabase.from('perfiles').update(patch).eq('id', alumnaSeleccionada.id)
    setGuardando(false)
    if (error) {
      window.alert('No se pudieron guardar los cambios. Revisá la conexión e intentá de nuevo.')
      return
    }
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
    <div className="admin-dashboard min-h-screen bg-[#FAF7F3] text-[#211c19]">
      <header className="flex h-[76px] items-center justify-between border-b border-[#e7ddd5] bg-[#FAF7F3] px-5 sm:px-8">
        <a href="/admin" aria-label="Panel de Flor"><img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto object-contain" /></a>
        <div className="flex items-center gap-4"><span className="hidden text-xs text-[#746a64] sm:block">Administración</span><a href="/perfil" className="text-sm font-medium text-[#294A38]">Mi perfil</a><button onClick={cerrarSesion} className="text-sm text-[#746a64] hover:text-[#211c19]">Cerrar sesión</button></div>
      </header>

      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav className="col-span-full flex gap-2 overflow-x-auto border-b border-[#e7ddd5] px-4 py-2 lg:hidden" aria-label="Navegación de administración">
          {[
            { href: '/admin', label: 'Inicio' }, { href: '/admin/desafio', label: 'Solicitudes' },
            { href: '/admin/invitar', label: 'Invitaciones' },
            { href: '/admin/classroom', label: 'Clases' }, { href: '/admin/lanzamiento', label: 'Avances de alumnas' },
            { href: '/admin/productos', label: 'Productos' }, { href: '/admin/notificaciones', label: 'Avisos' },
          ].map(item => <a key={item.href} href={item.href} className={`flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold ${item.href === '/admin' ? 'bg-[#294A38] text-white' : 'bg-[#F4EFEA] text-[#746a64]'}`}><NavigationIcon name={item.href === '/admin/invitar' ? 'invitaciones' : item.href === '/admin' ? 'inicio' : item.href === '/admin/desafio' ? 'solicitudes' : item.href === '/admin/classroom' ? 'clases' : item.href === '/admin/lanzamiento' ? 'lanzamiento' : item.href === '/admin/productos' ? 'productos' : item.href === '/admin/comunidad' ? 'comunidad' : item.href === '/admin/resultados' ? 'resultados' : item.href === '/admin/notificaciones' ? 'notificaciones' : 'configuracion'} />{item.label}</a>)}
        </nav>
        <aside className="hidden min-h-[calc(100vh-76px)] border-r border-[#e7ddd5] px-5 py-7 lg:block">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#746a64]">Panel de Flor</p>
          <nav className="mt-5 space-y-1.5" aria-label="Navegación de administración">
            {[
              { href: '/admin', label: 'Vista general', active: true },
              { href: '/admin/desafio', label: 'Solicitudes del Desafío' },
              { href: '/admin/invitar', label: 'Invitaciones' },
              { href: '/admin/classroom', label: 'Clases' },
              { href: '/admin/lanzamiento', label: 'Avances de alumnas' },
              { href: '/admin/productos', label: 'Productos' },
              { href: '/admin/comunidad', label: 'Comunidad' },
              { href: '/admin/resultados', label: 'Resultados' },
              { href: '/admin/notificaciones', label: 'Notificaciones' },
              { href: '/admin/configuracion', label: 'Configuración' },
            ].map(item => <a key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined} className={`flex items-center justify-between rounded-xl px-3 py-3 text-sm transition ${item.active ? 'bg-[#F4CAD8] font-semibold' : 'text-[#746a64] hover:bg-[#F4EFEA] hover:text-[#211c19]'}`}><span className="flex items-center gap-3"><NavigationIcon name={item.href === '/admin/invitar' ? 'invitaciones' : item.href === '/admin' ? 'inicio' : item.href === '/admin/desafio' ? 'solicitudes' : item.href === '/admin/classroom' ? 'clases' : item.href === '/admin/lanzamiento' ? 'lanzamiento' : item.href === '/admin/productos' ? 'productos' : item.href === '/admin/comunidad' ? 'comunidad' : item.href === '/admin/resultados' ? 'resultados' : item.href === '/admin/notificaciones' ? 'notificaciones' : 'configuracion'} />{item.label}</span>{item.href === '/admin/desafio' && stats.solicitudesDesafioPendientes > 0 ? <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#211c19]">{stats.solicitudesDesafioPendientes}</span> : null}</a>)}
          </nav>
        </aside>

        <main className="min-w-0 space-y-4 px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#294A38]">Vista general</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Panel de Flor</h1></div>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Usuarias', value: stats.totalAlumnas, note: `+${stats.nuevasMes} este mes`, tone: 'bg-[#F4CAD8] border-transparent' },
              { label: 'Alumnas activas', value: stats.activas, note: `${activasPct}% del total`, tone: 'bg-[#EC9BB6] border-transparent' },
              { label: 'Solicitudes pendientes', value: stats.solicitudesDesafioPendientes, note: 'Desafío Socias', tone: 'bg-[#F4EFEA] border-[#EC9BB6]/55' },
              { label: 'Ventas del mes', value: stats.ventasMes, note: 'Registradas en la plataforma', tone: 'bg-[#294A38] text-white border-transparent' },
            ].map(kpi => <article key={kpi.label} className={`rounded-[22px] border p-5 ${kpi.tone}`}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-65">{kpi.label}</p><p className="mt-3 font-impact text-4xl font-semibold tracking-[-0.04em]">{kpi.value}</p><p className="mt-2 text-xs font-medium opacity-65">{kpi.note}</p></article>)}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[24px] border border-[#EC9BB6]/55 bg-[#F4EFEA] p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#746a64]">Estado de la comunidad</p><h2 className="mt-1.5 font-serif text-2xl font-semibold">Actividad de alumnas</h2></div><span className="font-impact text-sm font-semibold text-[#294A38]">{stats.totalAlumnas}</span></div>
              <div className="mt-6 flex h-5 overflow-hidden rounded-full bg-white"><div className="bg-[#294A38] transition-all" style={{ width: `${activasPct}%` }} /><div className="bg-[#EC9BB6] transition-all" style={{ width: `${100 - activasPct}%` }} /></div>
              <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white px-4 py-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#294A38]"/><span className="text-xs font-semibold">Activas</span></div><p className="mt-2 font-impact text-2xl font-semibold">{stats.activas}</p></div><div className="rounded-xl bg-white px-4 py-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#EC9BB6]"/><span className="text-xs font-semibold">Otras</span></div><p className="mt-2 font-impact text-2xl font-semibold">{Math.max(stats.totalAlumnas - stats.activas, 0)}</p></div></div>
            </article>
            <article className="rounded-[24px] bg-[#F4CAD8] p-5 sm:p-6">
              <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#746a64]">Requieren atención</p><p className="mt-2 font-impact text-4xl font-semibold">{inactivasMes + stats.solicitudesDesafioPendientes}</p></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF7F3] text-[#294A38]" aria-hidden="true">!</span></div>
              <div className="mt-5 space-y-2 text-sm"><a href="/admin/desafio" className="flex items-center justify-between rounded-xl bg-[#FAF7F3]/75 px-4 py-3"><span>Solicitudes pendientes</span><strong className="font-impact">{stats.solicitudesDesafioPendientes}</strong></a><div className="flex items-center justify-between rounded-xl bg-[#FAF7F3]/75 px-4 py-3"><span>Sin ingreso reciente</span><strong className="font-impact">{inactivasMes}</strong></div><div className="flex items-center justify-between rounded-xl bg-[#FAF7F3]/75 px-4 py-3"><span>Perfil por completar</span><strong className="font-impact">{perfilesIncompletos}</strong></div></div>
            </article>
          </section>

          <section className="rounded-[24px] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#746a64]">Usuarias</p><h2 className="mt-1 font-serif text-2xl font-semibold">Acceso y actividad</h2></div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <a href="/api/exportar-alumnas" download className="text-sm font-medium text-[#294A38]">Descargar lista&nbsp; ↓</a>
                <input type="text" aria-label="Buscar alumnas" placeholder="Buscar por nombre o país" value={busqueda} onChange={e => setBusqueda(e.target.value)} className="min-w-[220px] rounded-full border-0 bg-[#F4EFEA] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#EC9BB6]" />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5 rounded-full bg-[#F4EFEA] p-1 sm:w-fit">
          {[
            { label: 'Todas', valor: 'todas', count: stats.totalAlumnas },
            { label: 'Activas', valor: 'activa', count: stats.activas },
            { label: 'Pausadas', valor: 'pausada', count: stats.pausadas },
            { label: 'Canceladas', valor: 'cancelada', count: stats.canceladas },
          ].map(f => (
            <button
              key={f.valor}
              onClick={() => setFiltroEstado(f.valor)}
              className={`rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${
                filtroEstado === f.valor
                  ? 'bg-[#294A38] text-white'
                  : 'text-[#746a64] hover:bg-white'
              }`}
            >
              {f.label} <span className="ml-1 opacity-70">({f.count})</span>
            </button>
          ))}
            </div>

            <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[860px] text-sm"><thead><tr className="border-b border-[#e7ddd5] text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#746a64]"><th className="pb-3">Alumna</th><th className="pb-3">Estado</th><th className="pb-3">Tipo</th><th className="pb-3">País</th><th className="pb-3">Ingreso</th><th className="pb-3">Actividad</th><th className="pb-3">Progreso</th><th className="pb-3"></th></tr></thead><tbody className="divide-y divide-[#e7ddd5]">
                {alumnasFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#746a64]">
                      No hay alumnas que coincidan
                    </td>
                  </tr>
                ) : alumnasFiltradas.map(alumna => (
                  <tr key={alumna.id} className="bg-white transition-colors hover:bg-[#F4CAD8]/20">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        {alumna.avatar_url ? (
                          <img src={alumna.avatar_url} className="h-9 w-9 rounded-full object-cover" alt="" />
                        ) : (
                          <div className="font-impact flex h-9 w-9 items-center justify-center rounded-full bg-[#F4CAD8] text-xs font-semibold">{(alumna.nombre || 'SD').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}</div>
                        )}
                        <div>
                          <p className="font-semibold text-[#211c19]">{alumna.nombre || 'Sin nombre'}</p>
                          {alumna.whatsapp && <p className="mt-0.5 text-xs text-[#746a64]">{alumna.whatsapp}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5"><span className="flex items-center gap-2 text-xs font-medium text-[#211c19]"><span className={`h-2 w-2 rounded-full ${alumna.estado === 'activa' ? 'bg-[#294A38]' : alumna.estado === 'pausada' ? 'bg-[#EC9BB6]' : 'bg-[#211c19]/25'}`} />
                        {alumna.estado ?? 'activa'}</span>
                    </td>
                    <td className="py-3.5"><span className="rounded-full bg-[#F4EFEA] px-2.5 py-1 text-xs font-medium">{etiquetaTipoUsuario(alumna.tipo_usuario)}</span></td>
                    <td className="py-3.5 text-xs text-[#746a64]">{alumna.pais ?? '—'}</td>
                    <td className="py-3.5 text-xs text-[#746a64]">{formatFecha(alumna.created_at)}</td>
                    <td className="py-3.5 text-xs text-[#746a64]">{diasSinIngresar(alumna.ultimo_acceso, stats.fechaReferencia)}</td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[#F4EFEA]">
                          <div className="h-full rounded-full bg-[#294A38]" style={{ width: `${Math.max(0, Math.min(Number(alumna.progreso ?? 0), 100))}%` }} />
                        </div>
                        <span className="font-impact text-xs font-semibold">{alumna.progreso ?? 0}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => abrirFicha(alumna)}
                        className="text-xs font-semibold text-[#294A38] hover:underline"
                      >
                        Ver ficha
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody></table></div>
          </section>
        </main>
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
                  <select value={editando.plan ?? 'basico'} onChange={e => setEditando(prev => ({ ...prev, plan: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                    <option value="basico">Básico</option><option value="premium">Premium</option><option value="vip">VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de usuaria</label>
                  <select
                    value={editando.tipo_usuario ?? 'gratuito'}
                    onChange={e => setEditando(prev => ({ ...prev, tipo_usuario: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                  >
                    <option value="gratuito">Gratuito</option>
                    <option value="desafio">Desafío Socias</option>
                    <option value="socia">Socia</option>
                  </select>
                  {editando.tipo_usuario === 'desafio' && !alumnaSeleccionada.desafio_socias_habilitada && <p className="mt-2 text-xs leading-5 text-[#746a64]">Quedará pendiente. Flor habilita el acceso y envía la bienvenida desde Solicitudes del Desafío.</p>}
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
                  <p className="font-semibold text-gray-800">{diasSinIngresar(alumnaSeleccionada.ultimo_acceso, stats.fechaReferencia)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Rol</p>
                  <p className="font-semibold text-gray-800">{etiquetaTipoUsuario(alumnaSeleccionada.tipo_usuario)}</p>
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
