'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface EntradaVenta {
  nombre: string
  avatar_url: string | null
  total: number
}

interface EntradaHistorico {
  id: string
  nombre: string
  avatar_url: string | null
  comisiones_total: number
  modulos_completados: number
  racha_maxima: number
}

interface EntradaActividad {
  id: string
  nombre: string
  avatar_url: string | null
  modulos_completados: number
  racha_maxima: number
  progreso: number
}

interface Props {
  ventasMes: EntradaVenta[]
  ventasHistorico: EntradaHistorico[]
  actividad: EntradaActividad[]
  userId: string
}

const TABS = [
  { id: 'mes', label: '🎯 Top ventas del mes' },
  { id: 'historico', label: '🏆 Top histórico' },
  { id: 'actividad', label: '⚡ Top actividad' },
]

const MEDALLAS = ['🥇', '🥈', '🥉']

function Avatar({ url, nombre }: { url: string | null; nombre: string }) {
  if (url) return <img src={url} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
  return <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-lg flex-shrink-0">🌸</div>
}

export default function RankingCliente({ ventasMes, ventasHistorico, actividad, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [tab, setTab] = useState('mes')

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" style={{height:44,width:"auto",objectFit:"contain"}} />
        <div className="flex items-center gap-4">
          <a href="/perfil" className="text-sm text-gray-500 hover:text-gray-800">Mi perfil</a>
          <a href="/logros" className="text-sm text-rose-600 hover:text-rose-800 font-medium">Mis logros</a>
          <button onClick={cerrarSesion} className="text-sm text-gray-500 hover:text-gray-800">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">🏆 Ranking</h2>
          <p className="text-gray-500 text-sm mt-1">Las mejores de la comunidad</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 bg-white rounded-xl p-1 shadow-sm">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                tab === t.id ? 'bg-rose-500 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Top 3 podio */}
        {tab === 'mes' && ventasMes.length > 0 && (
          <div className="flex justify-center items-end gap-4 py-4">
            {[ventasMes[1], ventasMes[0], ventasMes[2]].map((entrada, i) => {
              if (!entrada) return <div key={i} className="w-24" />
              const posReal = i === 0 ? 1 : i === 1 ? 0 : 2
              const alturas = ['h-24', 'h-32', 'h-20']
              return (
                <div key={i} className="flex flex-col items-center gap-2">
                  <Avatar url={entrada.avatar_url} nombre={entrada.nombre} />
                  <p className="text-xs font-medium text-gray-700 text-center max-w-16 truncate">{entrada.nombre}</p>
                  <p className="text-xs font-bold text-rose-600">${entrada.total.toLocaleString('es-AR')}</p>
                  <div className={`w-20 ${alturas[i]} rounded-t-xl flex items-center justify-center text-2xl ${
                    posReal === 0 ? 'bg-yellow-400' : posReal === 1 ? 'bg-gray-300' : 'bg-orange-400'
                  }`}>
                    {MEDALLAS[posReal]}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Lista */}
        <div className="bg-white rounded-2xl shadow space-y-0 overflow-hidden">
          {tab === 'mes' && (
            ventasMes.length === 0
              ? <p className="text-center py-10 text-gray-400">Aún no hay ventas este mes</p>
              : ventasMes.map((entrada, i) => (
                <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0">
                  <span className="text-xl w-8 text-center">{MEDALLAS[i] ?? `${i + 1}`}</span>
                  <Avatar url={entrada.avatar_url} nombre={entrada.nombre} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{entrada.nombre}</p>
                    <p className="text-xs text-gray-400">Comisiones del mes</p>
                  </div>
                  <p className="font-bold text-rose-600">${entrada.total.toLocaleString('es-AR')}</p>
                </div>
              ))
          )}

          {tab === 'historico' && (
            ventasHistorico.length === 0
              ? <p className="text-center py-10 text-gray-400">Aún no hay datos históricos</p>
              : ventasHistorico.map((entrada, i) => (
                <div key={entrada.id} className={`flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 ${entrada.id === userId ? 'bg-rose-50' : ''}`}>
                  <span className="text-xl w-8 text-center">{MEDALLAS[i] ?? `${i + 1}`}</span>
                  <Avatar url={entrada.avatar_url} nombre={entrada.nombre} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{entrada.nombre} {entrada.id === userId && <span className="text-xs text-rose-400">(vos)</span>}</p>
                    <p className="text-xs text-gray-400">{entrada.modulos_completados} módulos</p>
                  </div>
                  <p className="font-bold text-rose-600">${(entrada.comisiones_total ?? 0).toLocaleString('es-AR')}</p>
                </div>
              ))
          )}

          {tab === 'actividad' && (
            actividad.length === 0
              ? <p className="text-center py-10 text-gray-400">Aún no hay datos de actividad</p>
              : actividad.map((entrada, i) => (
                <div key={entrada.id} className={`flex items-center gap-4 px-6 py-4 border-b border-gray-50 last:border-0 ${entrada.id === userId ? 'bg-rose-50' : ''}`}>
                  <span className="text-xl w-8 text-center">{MEDALLAS[i] ?? `${i + 1}`}</span>
                  <Avatar url={entrada.avatar_url} nombre={entrada.nombre} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{entrada.nombre} {entrada.id === userId && <span className="text-xs text-rose-400">(vos)</span>}</p>
                    <p className="text-xs text-gray-400">Racha máx: {entrada.racha_maxima}🔥</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-rose-600">{entrada.progreso}%</p>
                    <p className="text-xs text-gray-400">{entrada.modulos_completados} módulos</p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  )
}
