'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Metrica {
  id: string
  estrategia: string
  comision_producto: number
  inversion: number
  mensajes_recibidos: number
  personas_grupo: number
  reservas: number
  ventas: number
  created_at: string
}

interface Props {
  userId: string
  historial: Metrica[]
}

export default function MetricasCliente({ userId, historial }: Props) {
  const supabase = createClient()
  const [estrategia, setEstrategia] = useState<'lanzamiento' | 'automatica'>('lanzamiento')
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const [form, setForm] = useState({
    comision_producto: '',
    inversion_total: '',
    inversion_por_dia: '',
    dias_captacion: '',
    gastado_hoy: '',
    mensajes_recibidos: '',
    personas_grupo: '',
    reservas: '',
    ventas: '',
  })

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const n = (v: string) => parseFloat(v) || 0

  // Inversión base para los cálculos: lo gastado hasta hoy si existe, sino la inversión total
  const inversionBase = n(form.gastado_hoy) > 0 ? n(form.gastado_hoy) : n(form.inversion_total)

  // Cálculos automáticos
  const costoPorMensaje = inversionBase > 0 && n(form.mensajes_recibidos) > 0
    ? inversionBase / n(form.mensajes_recibidos) : null

  const pctAGrupo = n(form.mensajes_recibidos) > 0
    ? (n(form.personas_grupo) / n(form.mensajes_recibidos)) * 100 : null

  const pctVenta = n(form.reservas) > 0
    ? (n(form.ventas) / n(form.reservas)) * 100 : null

  const gananciaNeta = n(form.comision_producto) * n(form.ventas) - inversionBase
  const roi = inversionBase > 0 ? (gananciaNeta / inversionBase) * 100 : null

  // Ventas necesarias para recuperar inversión total
  const ventasParaRecuperar = n(form.comision_producto) > 0 && n(form.inversion_total) > 0
    ? Math.ceil(n(form.inversion_total) / n(form.comision_producto)) : null

  // Presupuesto restante del día
  const presupuestoRestante = n(form.inversion_por_dia) > 0 && n(form.gastado_hoy) > 0
    ? n(form.inversion_por_dia) - n(form.gastado_hoy) : null

  // Días restantes según lo gastado por día
  const diasRestantes = n(form.inversion_por_dia) > 0 && n(form.dias_captacion) > 0 && n(form.gastado_hoy) > 0
    ? Math.floor((n(form.inversion_total) - n(form.gastado_hoy)) / n(form.inversion_por_dia)) : null

  async function guardar() {
    setGuardando(true)
    await supabase.from('metricas').insert({
      alumna_id: userId,
      estrategia,
      comision_producto: n(form.comision_producto),
      inversion: n(form.inversion_total),
      mensajes_recibidos: n(form.mensajes_recibidos),
      personas_grupo: n(form.personas_grupo),
      reservas: n(form.reservas),
      ventas: n(form.ventas),
    })
    setGuardando(false)
    setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
    setForm({ comision_producto: '', inversion_total: '', inversion_por_dia: '', dias_captacion: '', gastado_hoy: '', mensajes_recibidos: '', personas_grupo: '', reservas: '', ventas: '' })
  }

  const fmt = (v: number, prefix = 'USD ') => `${prefix}${v.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const inputClass = "flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm"

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        <a href="/perfil" className="text-sm text-gray-500 hover:text-gray-800">← Volver al perfil</a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* Header editorial */}
        <div className="bg-[#f5f0eb] rounded-3xl overflow-hidden relative px-8 pt-8 pb-6" style={{minHeight: 220}}>
          {/* Círculo rosa decorativo */}
          <div className="absolute top-4 right-8 w-16 h-16 rounded-full flex items-center justify-center text-white font-black text-2xl" style={{background:'#E27396'}}>
            📊
          </div>
          {/* Mancha oval rosa */}
          <div className="absolute bottom-0 left-0 w-32 h-16 rounded-full opacity-30" style={{background:'#E27396', transform:'translate(-20%, 30%)'}} />
          {/* Punto decorativo */}
          <div className="absolute top-12 left-1/2 w-3 h-3 rounded-full" style={{background:'#337357'}} />

          <p className="text-lg font-medium text-gray-600 mb-0">Analizá tus</p>
          <h1 className="font-black uppercase leading-none mb-1" style={{fontSize:'clamp(2.5rem,8vw,4rem)', color:'#1a1a1a', letterSpacing:'-0.02em'}}>
            MÉTRICAS
          </h1>
          <p className="font-bold italic mb-4" style={{fontSize:'1.4rem', color:'#E27396', fontFamily:'Georgia, serif'}}>
            de lanzamiento
          </p>
          <div className="inline-block bg-black text-white text-xs font-bold px-4 py-2 rounded-full tracking-wider uppercase">
            🚀 Estrategia Lanzamiento
          </div>
          <p className="text-xs text-gray-400 mt-4 max-w-xs">
            Cargá tus números y calculamos tus resultados automáticamente ✨
          </p>
        </div>

        {true && (
          <>
            {/* Formulario */}
            <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
              <h2 className="font-bold text-gray-900 mb-2">Datos del lanzamiento</h2>

              {/* Comisión */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Comisión por producto vendido</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-10">USD</span>
                  <input type="number" min={0} placeholder="Ej: 97" value={form.comision_producto} onChange={set('comision_producto')} className={inputClass} />
                </div>
              </div>

              {/* Inversión total */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Inversión total del lanzamiento</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-10">USD</span>
                  <input type="number" min={0} placeholder="Ej: 200" value={form.inversion_total} onChange={set('inversion_total')} className={inputClass} />
                </div>
              </div>

              {/* Inversión por día */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Inversión por día</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-10">USD</span>
                  <input type="number" min={0} placeholder="Ej: 20" value={form.inversion_por_dia} onChange={set('inversion_por_dia')} className={inputClass} />
                </div>
              </div>

              {/* Días totales de captación */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Días totales de captación</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-10">#</span>
                  <input type="number" min={0} placeholder="Ej: 10" value={form.dias_captacion} onChange={set('dias_captacion')} className={inputClass} />
                </div>
              </div>

              {/* Gastado hasta hoy */}
              <div className="border-t border-gray-100 pt-4">
                <label className="block text-xs font-semibold text-rose-500 uppercase tracking-wide mb-1">💡 ¿Cuánto llevás gastado hasta hoy?</label>
                <p className="text-xs text-gray-400 mb-2">Los resultados se calculan sobre este número para darte la realidad del día</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 w-10">USD</span>
                  <input type="number" min={0} placeholder="Ej: 40" value={form.gastado_hoy} onChange={set('gastado_hoy')} className="flex-1 border-2 border-rose-200 rounded-lg px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-300 text-sm bg-rose-50" />
                </div>
              </div>

              {/* Métricas de campaña */}
              {[
                { key: 'mensajes_recibidos', label: 'Mensajes recibidos (WhatsApp)', placeholder: 'Ej: 150' },
                { key: 'personas_grupo', label: 'Personas que entraron al grupo', placeholder: 'Ej: 80' },
                { key: 'reservas', label: 'Reservas realizadas', placeholder: 'Ej: 30' },
                { key: 'ventas', label: 'Ventas concretadas', placeholder: 'Ej: 15' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-10">#</span>
                    <input type="number" min={0} placeholder={placeholder} value={form[key as keyof typeof form]} onChange={set(key as keyof typeof form)} className={inputClass} />
                  </div>
                </div>
              ))}
            </div>

            {/* Resultados automáticos */}
            <div style={{ background: '#f5f0eb' }} className="rounded-3xl p-6 space-y-4">
              <div className="mb-2">
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#E27396' }}>Tus</p>
                <p className="text-4xl font-black leading-none" style={{ color: '#1a1a1a' }}>RESULTADOS</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div style={{ background: '#E27396' }} className="rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/80">Costo por mensaje</p>
                  <p className="text-2xl font-black text-white mt-1">{costoPorMensaje !== null ? fmt(costoPorMensaje) : '—'}</p>
                  <p className="text-xs text-white/60 mt-1">Inversión ÷ mensajes</p>
                </div>

                <div className="bg-white rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#E27396' }}>% al grupo</p>
                  <p className="text-2xl font-black mt-1" style={{ color: '#1a1a1a' }}>{pctAGrupo !== null ? `${pctAGrupo.toFixed(1)}%` : '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">Grupo ÷ mensajes</p>
                </div>

                <div className="bg-white rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#337357' }}>% de cierre</p>
                  <p className="text-2xl font-black mt-1" style={{ color: '#1a1a1a' }}>{pctVenta !== null ? `${pctVenta.toFixed(1)}%` : '—'}</p>
                  <p className="text-xs text-gray-400 mt-1">Ventas ÷ reservas</p>
                </div>

                <div style={{ background: gananciaNeta >= 0 ? '#337357' : '#1a1a1a' }} className="rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-white/80">Ganancia neta</p>
                  <p className="text-2xl font-black text-white mt-1">
                    {n(form.comision_producto) > 0 || n(form.ventas) > 0 ? fmt(gananciaNeta) : '—'}
                  </p>
                  <p className="text-xs text-white/60 mt-1">Comisiones − inversión</p>
                </div>
              </div>

              {ventasParaRecuperar !== null && (
                <div style={{ background: '#1a1a1a' }} className="rounded-2xl p-5 flex items-center gap-4">
                  <div className="text-3xl">🎯</div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#E27396' }}>Ventas para recuperar la inversión</p>
                    <p className="text-3xl font-black text-white">{ventasParaRecuperar} ventas</p>
                    <p className="text-xs text-white/50 mt-0.5">Inversión total ÷ comisión por venta</p>
                  </div>
                </div>
              )}

              {diasRestantes !== null && (
                <div style={{ background: '#EA9AB2' }} className="rounded-2xl p-5 flex items-center gap-4">
                  <div className="text-3xl">📅</div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-white/80">Días de presupuesto restante</p>
                    <p className="text-3xl font-black text-white">{diasRestantes} días</p>
                    <p className="text-xs text-white/60 mt-0.5">Basado en tu gasto diario promedio</p>
                  </div>
                </div>
              )}

            </div>

            <button onClick={guardar} disabled={guardando}
              className={`w-full py-3.5 rounded-xl text-sm font-bold transition-colors ${guardado ? 'bg-green-500 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white disabled:bg-rose-300'}`}>
              {guardado ? '✓ Análisis guardado' : guardando ? 'Guardando...' : 'Guardar análisis'}
            </button>
          </>
        )}

        {/* Historial */}
        {historial.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-bold text-gray-900 mb-4">Historial de análisis</h2>
            <div className="space-y-3">
              {historial.map(m => {
                const ganancia = m.comision_producto * m.ventas - m.inversion
                return (
                  <div key={m.id} className="border border-gray-100 rounded-xl p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">{new Date(m.created_at).toLocaleDateString('es-AR')}</p>
                      <p className="text-sm font-medium text-gray-700 mt-0.5">{m.ventas} ventas · {m.mensajes_recibidos} mensajes</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>USD {ganancia.toFixed(0)}</p>
                      <p className="text-xs text-gray-400">ganancia neta</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
