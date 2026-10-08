'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Insignia {
  id: string
  nombre: string
  descripcion: string
  emoji: string
  categoria: string
  umbral: number | null
  orden: number
}

interface InsigniaObtenida {
  insignia_id: string
  fecha_obtenida: string
}

interface Perfil {
  nombre: string
  comisiones_total: number
  ventas_total: number
  modulos_completados: number
  racha_dias: number
  racha_maxima: number
}

interface Props {
  perfil: Perfil | null
  todasInsignias: Insignia[]
  misInsignias: InsigniaObtenida[]
}

const CATEGORIAS = [
  { id: 'ventas', label: 'Insignias de ventas', emoji: '💰' },
  { id: 'actividad', label: 'Insignias de actividad', emoji: '⚡' },
  { id: 'especial', label: 'Especiales', emoji: '🏆' },
]

export default function LogrosCliente({ perfil, todasInsignias, misInsignias }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const obtenidas = new Set(misInsignias.map(i => i.insignia_id))
  const fechas = Object.fromEntries(misInsignias.map(i => [i.insignia_id, i.fecha_obtenida]))

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const totalObtenidas = misInsignias.length
  const totalInsignias = todasInsignias.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" style={{height:44,width:"auto",objectFit:"contain"}} />
        <div className="flex items-center gap-4">
          <a href="/perfil" className="text-sm text-gray-500 hover:text-gray-800">Mi perfil</a>
          <a href="/ranking" className="text-sm text-rose-600 hover:text-rose-800 font-medium">Ranking</a>
          <button onClick={cerrarSesion} className="text-sm text-gray-500 hover:text-gray-800">Cerrar sesión</button>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">

        {/* Resumen */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Mis Logros</h2>
              <p className="text-gray-500 text-sm">{perfil?.nombre ?? ''}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-rose-500">{totalObtenidas}<span className="text-lg text-gray-300">/{totalInsignias}</span></p>
              <p className="text-xs text-gray-400">insignias obtenidas</p>
            </div>
          </div>

          {/* Barra de progreso general */}
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-rose-400 to-pink-500 h-3 rounded-full transition-all"
              style={{ width: `${totalInsignias > 0 ? (totalObtenidas / totalInsignias) * 100 : 0}%` }}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-5">
            <div className="text-center bg-rose-50 rounded-xl p-3">
              <p className="text-xl font-bold text-rose-600">${(perfil?.comisiones_total ?? 0).toLocaleString('es-AR')}</p>
              <p className="text-xs text-gray-500">Comisiones totales</p>
            </div>
            <div className="text-center bg-rose-50 rounded-xl p-3">
              <p className="text-xl font-bold text-rose-600">{perfil?.modulos_completados ?? 0}</p>
              <p className="text-xs text-gray-500">Módulos completados</p>
            </div>
            <div className="text-center bg-rose-50 rounded-xl p-3">
              <p className="text-xl font-bold text-rose-600">{perfil?.racha_dias ?? 0}🔥</p>
              <p className="text-xs text-gray-500">Racha actual</p>
            </div>
          </div>
        </div>

        {/* Insignias por categoría */}
        {CATEGORIAS.map(cat => {
          const insigniasCat = todasInsignias.filter(i => i.categoria === cat.id)
          return (
            <div key={cat.id} className="bg-white rounded-2xl shadow p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span>{cat.emoji}</span> {cat.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {insigniasCat.map(insignia => {
                  const ganada = obtenidas.has(insignia.id)
                  const fecha = fechas[insignia.id]
                  return (
                    <div
                      key={insignia.id}
                      className={`rounded-xl p-4 text-center transition-all ${
                        ganada
                          ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 shadow-sm'
                          : 'bg-gray-50 border-2 border-gray-100 opacity-50'
                      }`}
                    >
                      <div className={`text-4xl mb-2 ${!ganada ? 'grayscale' : ''}`}>
                        {insignia.emoji}
                      </div>
                      <p className="text-xs font-bold text-gray-800 leading-tight">{insignia.nombre}</p>
                      {insignia.umbral && !ganada && (
                        <p className="text-xs text-gray-400 mt-1">
                          ${(insignia.umbral - (perfil?.comisiones_total ?? 0)).toLocaleString()} restantes
                        </p>
                      )}
                      {ganada && fecha && (
                        <p className="text-xs text-rose-400 mt-1">
                          {new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                      {!ganada && !insignia.umbral && (
                        <p className="text-xs text-gray-400 mt-1">Pendiente</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
