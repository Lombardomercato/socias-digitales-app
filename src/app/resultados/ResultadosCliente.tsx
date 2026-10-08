'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Resultado {
  id: string
  tipo: string
  descripcion: string | null
  archivo_url: string | null
  monto: number | null
  mes: string | null
  producto_id: string | null
  estado: string
  created_at: string
}

interface Producto {
  id: string
  nombre: string
  tipo: string
}

interface Props {
  misResultados: Resultado[]
  productos: Producto[]
  userId: string
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const ESTADO_STYLE: Record<string, string> = {
  pendiente: 'bg-amber-100 text-amber-700',
  aprobado: 'bg-green-100 text-green-700',
  rechazado: 'bg-red-100 text-red-700',
}

const ESTADO_LABEL: Record<string, string> = {
  pendiente: '⏳ En revisión',
  aprobado: '✅ Aprobado',
  rechazado: '❌ Rechazado',
}

const anioActual = new Date().getFullYear()
const ANIOS = [anioActual - 1, anioActual, anioActual + 1]

const RANGOS = [
  { id: 1, nombre: 'Primera venta', emoji: '🌱', descripcion: 'Primera comisión', minMonto: 0, minVentas: 1, color: '#E27396', bg: '#fce7f3' },
  { id: 2, nombre: '100 USD', emoji: '⭐', descripcion: 'USD $100', minMonto: 100, minVentas: 0, color: '#d97706', bg: '#fef3c7' },
  { id: 3, nombre: '500 USD', emoji: '🔥', descripcion: 'USD $500', minMonto: 500, minVentas: 0, color: '#7c3aed', bg: '#ede9fe' },
  { id: 4, nombre: '1.000 USD', emoji: '💎', descripcion: 'USD $1.000', minMonto: 1000, minVentas: 0, color: '#0ea5e9', bg: '#e0f2fe' },
  { id: 5, nombre: 'Socia Select', emoji: '🥉', descripcion: 'USD $5.000', minMonto: 5000, minVentas: 0, color: '#92400e', bg: '#fef3c7' },
  { id: 6, nombre: 'Socia Pro', emoji: '🥈', descripcion: 'USD $10.000', minMonto: 10000, minVentas: 0, color: '#475569', bg: '#f1f5f9' },
  { id: 7, nombre: 'Socia Elite', emoji: '🥇', descripcion: 'USD $20.000', minMonto: 20000, minVentas: 0, color: '#b45309', bg: '#fffbeb' },
]

function calcularRango(total: number, cantidadVentas: number) {
  let rangoActual = null
  for (const r of RANGOS) {
    const cumpleMonto = r.minMonto === 0 || total >= r.minMonto
    const cumpleVentas = r.minVentas === 0 || cantidadVentas >= r.minVentas
    if (cumpleMonto && cumpleVentas) rangoActual = r
  }
  return rangoActual
}

export default function ResultadosCliente({ misResultados, productos, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [mostrarForm, setMostrarForm] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [exito, setExito] = useState(false)
  const [error, setError] = useState('')

  const [foto, setFoto] = useState<string>('')
  const [comentario, setComentario] = useState('')
  const [monto, setMonto] = useState('')
  const [mes, setMes] = useState(MESES[new Date().getMonth()])
  const [anio, setAnio] = useState(anioActual)
  const [productoId, setProductoId] = useState('')

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setSubiendo(true)
    const nombre = `resultado-${userId}-${Date.now()}.${archivo.name.split('.').pop()}`
    const { error } = await supabase.storage.from('resultados').upload(nombre, archivo, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('resultados').getPublicUrl(nombre)
      setFoto(data.publicUrl)
    }
    setSubiendo(false)
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!comentario.trim()) return setError('Escribí un comentario sobre tu resultado.')
    setEnviando(true)

    const { error } = await supabase.from('resultados').insert({
      alumna_id: userId,
      tipo: foto ? 'captura' : 'testimonio',
      descripcion: comentario.trim(),
      archivo_url: foto || null,
      monto: monto ? parseFloat(monto) : null,
      mes: `${mes} ${anio}`,
      producto_id: productoId || null,
      estado: 'pendiente',
    })

    if (error) {
      setError('Hubo un error al enviar. Intentá de nuevo.')
    } else {
      setExito(true)
      setTimeout(() => {
        setExito(false)
        setMostrarForm(false)
        setFoto('')
        setComentario('')
        setMonto('')
        setProductoId('')
        router.refresh()
      }, 2500)
    }
    setEnviando(false)
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
        <img src="/resultados.jpeg" alt="Mis resultados" className="w-full h-full object-cover" style={{ display: 'block' }} />
        <div className="absolute inset-0 flex flex-col justify-end px-8 pb-8"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%)' }}>
          <h1 className="text-4xl font-black text-white">Mis resultados</h1>
          <p className="text-base text-white/80 mt-1">Compartí tus logros y comisiones ganadas</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Total acumulado + rangos */}
        {(() => {
          const aprobados = misResultados.filter(r => r.estado === 'aprobado')
          const total = aprobados.reduce((acc, r) => acc + (r.monto ?? 0), 0)
          const cantVentas = aprobados.filter(r => r.monto && r.monto > 0).length
          const rangoActual = calcularRango(total, cantVentas)
          const proximoRango = RANGOS.find(r => r.id === (rangoActual ? rangoActual.id + 1 : 1))

          return (
            <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5">
              {/* Total */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total acumulado</p>
                  <p className="text-4xl font-black mt-1" style={{ color: '#337357' }}>
                    ${total.toLocaleString('es-AR')} <span className="text-lg font-bold text-gray-400">USD</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{cantVentas} venta{cantVentas !== 1 ? 's' : ''} aprobada{cantVentas !== 1 ? 's' : ''}</p>
                </div>
                {rangoActual && (
                  <div className="text-center px-4 py-3 rounded-2xl" style={{ background: rangoActual.bg }}>
                    <p className="text-3xl">{rangoActual.emoji}</p>
                    <p className="text-xs font-bold mt-1" style={{ color: rangoActual.color }}>{rangoActual.nombre}</p>
                  </div>
                )}
              </div>

              {/* Barra de progreso al próximo rango */}
              {proximoRango && proximoRango.minMonto > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Progreso hacia {proximoRango.emoji} {proximoRango.nombre}</span>
                    <span>${total.toLocaleString('es-AR')} / ${proximoRango.minMonto.toLocaleString('es-AR')}</span>
                  </div>
                  <div className="w-full rounded-full h-2.5" style={{ background: '#f3f4f6' }}>
                    <div className="h-2.5 rounded-full transition-all"
                      style={{ width: `${Math.min((total / proximoRango.minMonto) * 100, 100)}%`, background: '#E27396' }} />
                  </div>
                </div>
              )}

              {/* Hitos */}
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                {RANGOS.map(r => {
                  const cumpleMonto = r.minMonto === 0 ? cantVentas >= r.minVentas : total >= r.minMonto
                  const esCurrent = rangoActual?.id === r.id
                  return (
                    <div key={r.id} className={`rounded-2xl p-3 text-center transition-all ${cumpleMonto ? '' : 'opacity-40'}`}
                      style={{ background: cumpleMonto ? r.bg : '#f9fafb', border: esCurrent ? `2px solid ${r.color}` : '2px solid transparent' }}>
                      <p className="text-2xl">{cumpleMonto ? r.emoji : '🔒'}</p>
                      <p className="text-xs font-bold mt-1 leading-tight" style={{ color: cumpleMonto ? r.color : '#9ca3af' }}>{r.nombre}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-tight">{r.descripcion}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        <div className="flex justify-end">
          {!mostrarForm && (
            <button onClick={() => setMostrarForm(true)}
              className="text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors"
              style={{ background: '#E27396' }}>
              + Cargar resultado
            </button>
          )}
        </div>

        {/* Formulario */}
        {mostrarForm && (
          <div className="bg-white rounded-3xl shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">Nuevo resultado</h2>
              {!exito && (
                <button onClick={() => setMostrarForm(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              )}
            </div>

            {exito ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">🎉</p>
                <p className="font-bold text-green-700 text-lg">¡Resultado enviado!</p>
                <p className="text-sm text-gray-500 mt-1">Lo vamos a revisar y aprobar pronto.</p>
              </div>
            ) : (
              <form onSubmit={enviar} className="space-y-4">

                {/* Foto */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">FOTO (opcional)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden">
                    {foto ? (
                      <div className="relative">
                        <img src={foto} className="w-full max-h-64 object-cover" alt="" />
                        <button type="button" onClick={() => setFoto('')}
                          className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-lg">
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center py-8 cursor-pointer hover:bg-gray-50 transition-colors">
                        <span className="text-3xl mb-2">📸</span>
                        <span className="text-sm font-medium text-gray-600">
                          {subiendo ? 'Subiendo...' : 'Subir captura de pantalla'}
                        </span>
                        <span className="text-xs text-gray-400 mt-1">JPG, PNG o WEBP</span>
                        <input type="file" accept="image/*" onChange={subirFoto} className="hidden" disabled={subiendo} />
                      </label>
                    )}
                  </div>
                </div>

                {/* Comentario */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-2">TU COMENTARIO *</label>
                  <textarea
                    value={comentario}
                    onChange={e => setComentario(e.target.value)}
                    placeholder="Contanos cómo fue tu experiencia, qué lograste, cómo te sentiste..."
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 resize-none"
                    style={{ '--tw-ring-color': '#E27396' } as React.CSSProperties}
                  />
                </div>

                {/* Monto y mes */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">COMISIÓN GANADA (USD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        placeholder="0.00"
                        value={monto}
                        onChange={e => setMonto(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl pl-7 pr-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">MES</label>
                    <div className="flex gap-2">
                      <select value={mes} onChange={e => setMes(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2">
                        {MESES.map(m => <option key={m}>{m}</option>)}
                      </select>
                      <select value={anio} onChange={e => setAnio(Number(e.target.value))}
                        className="w-24 border border-gray-200 rounded-xl px-2 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2">
                        {ANIOS.map(a => <option key={a}>{a}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Producto */}
                {productos.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-2">PRODUCTO (opcional)</label>
                    <select value={productoId} onChange={e => setProductoId(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2">
                      <option value="">— Sin especificar —</option>
                      {productos.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.tipo === 'fisico' ? '📦' : '💻'} {p.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

                <button type="submit" disabled={enviando || subiendo}
                  className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-colors disabled:opacity-60"
                  style={{ background: '#E27396' }}>
                  {enviando ? 'Enviando...' : 'Enviar resultado'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Mis resultados anteriores */}
        {misResultados.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Mis envíos</h2>
            {misResultados.map(r => (
              <div key={r.id} className="bg-white rounded-2xl p-4 flex gap-4 items-start shadow-sm">
                {r.archivo_url ? (
                  <img src={r.archivo_url} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" alt="" />
                ) : (
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{ background: '#f5f0eb' }}>💬</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {r.mes && <span className="text-xs text-gray-400 font-medium">{r.mes}</span>}
                    {r.monto && (
                      <span className="text-xs font-bold" style={{ color: '#337357' }}>
                        +${r.monto.toLocaleString('es-AR')} USD
                      </span>
                    )}
                  </div>
                  {r.descripcion && <p className="text-sm text-gray-700 line-clamp-2">{r.descripcion}</p>}
                  <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-2 ${ESTADO_STYLE[r.estado]}`}>
                    {ESTADO_LABEL[r.estado]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          !mostrarForm && (
            <div className="bg-white rounded-3xl p-10 text-center shadow-sm">
              <p className="text-4xl mb-3">🏆</p>
              <p className="font-bold text-gray-800">¡Todavía no cargaste ningún resultado!</p>
              <p className="text-sm text-gray-400 mt-2">Compartí tu primera comisión o testimonio.</p>
              <button onClick={() => setMostrarForm(true)}
                className="mt-5 text-white text-sm font-bold px-6 py-3 rounded-xl"
                style={{ background: '#E27396' }}>
                + Cargar mi primer resultado
              </button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
