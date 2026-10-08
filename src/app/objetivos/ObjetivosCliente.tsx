'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Programa {
  id: string
  nombre: string
  precio: number
  comisionPct: number
}

interface ObjetivoDB {
  id: string
  alumna_id: string
  monto_objetivo: number
  productos: Programa[]
}

interface Props {
  userId: string
  objetivoGuardado: ObjetivoDB | null
  esAdmin: boolean
}

export default function ObjetivosCliente({ userId, objetivoGuardado, esAdmin }: Props) {
  const PRESET: Omit<Programa, 'id'> = { nombre: 'Socias Digitales', precio: 597, comisionPct: esAdmin ? 100 : 50 }
  const supabase = createClient()

  const [montoObjetivo, setMontoObjetivo] = useState<string>(
    objetivoGuardado ? String(objetivoGuardado.monto_objetivo) : ''
  )
  const [programas, setProgramas] = useState<Programa[]>(
    objetivoGuardado?.productos ?? []
  )
  const [modo, setModo] = useState<'preset' | 'manual'>('preset')
  const [nombreManual, setNombreManual] = useState('')
  const [precioManual, setPrecioManual] = useState('')
  const [comisionManual, setComisionManual] = useState('')
  const [agregando, setAgregando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [guardado, setGuardado] = useState(false)

  const objetivo = parseFloat(montoObjetivo) || 0

  function comisionPorVenta(p: Programa) {
    return p.precio * (p.comisionPct / 100)
  }

  function ventasNecesarias(p: Programa, montoTarget: number) {
    const c = comisionPorVenta(p)
    return c > 0 ? Math.ceil(montoTarget / c) : null
  }

  function agregarPrograma() {
    const base = modo === 'preset'
      ? { ...PRESET }
      : { nombre: nombreManual.trim() || 'Mi programa', precio: parseFloat(precioManual) || 0, comisionPct: parseFloat(comisionManual) || 0 }
    if (base.precio <= 0 || base.comisionPct <= 0) return
    setProgramas(prev => [...prev, { id: crypto.randomUUID(), ...base }])
    setNombreManual(''); setPrecioManual(''); setComisionManual('')
    setAgregando(false)
  }

  async function guardar() {
    if (!objetivo || programas.length === 0) return
    setGuardando(true)
    const datos = { alumna_id: userId, monto_objetivo: objetivo, productos: programas }
    if (objetivoGuardado) {
      await supabase.from('objetivos').update(datos).eq('id', objetivoGuardado.id)
    } else {
      await supabase.from('objetivos').insert(datos)
    }
    setGuardando(false); setGuardado(true)
    setTimeout(() => setGuardado(false), 3000)
  }

  // Combinación en partes iguales
  const montoPartes = programas.length > 1 ? objetivo / programas.length : 0

  return (
    <div className="min-h-screen" style={{ background: '#f5f0eb' }}>
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        <a href="/perfil" className="text-sm text-gray-500 hover:text-gray-800">← Mi perfil</a>
      </nav>

      {/* Banner */}
      <div className="w-full overflow-hidden" style={{ height: 315, marginTop: 32 }}>
        <img src="/banner.objetivos.png" alt="Mis objetivos" className="w-full h-full object-cover" />
      </div>

      <div className="max-w-xl mx-auto px-4 py-10 space-y-6">

        <div>
          <h1 className="text-3xl font-black" style={{ color: '#1a1a1a' }}>Mis objetivos</h1>
          <p className="text-sm text-gray-500 mt-1">¿Cuánto querés ganar? Te decimos cuánto tenés que vender.</p>
        </div>

        {/* Objetivo */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">Mi objetivo de ganancia</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-300 text-2xl">$</span>
            <input
              type="number" min={0}
              value={montoObjetivo}
              onChange={e => setMontoObjetivo(e.target.value)}
              placeholder="0"
              className="w-full rounded-2xl pl-10 pr-16 py-4 text-3xl font-black text-gray-900 focus:outline-none border-2 transition-colors"
              style={{ borderColor: objetivo ? '#E27396' : '#f3f4f6' }}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">USD</span>
          </div>
        </div>

        {/* Programas */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Mis programas</p>
            {!agregando && (
              <button onClick={() => setAgregando(true)}
                className="text-sm font-bold px-4 py-1.5 rounded-full transition-colors"
                style={{ background: '#fff0f4', color: '#E27396', border: '2px solid #E27396' }}>
                + Agregar
              </button>
            )}
          </div>

          {programas.length === 0 && !agregando && (
            <div className="text-center py-8 text-gray-300">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-sm">Agregá al menos un programa</p>
            </div>
          )}

          {programas.map(p => (
            <div key={p.id} className="rounded-xl p-4 flex items-center justify-between gap-3"
              style={{ background: '#fafafa', border: '1.5px solid #f3f4f6' }}>
              <div>
                <p className="font-bold text-gray-800">{p.nombre}</p>
                <p className="text-xs text-gray-400">${p.precio} USD · {p.comisionPct}% comisión</p>
                <p className="text-sm font-black mt-0.5" style={{ color: '#337357' }}>
                  ${comisionPorVenta(p).toFixed(0)} por venta
                </p>
              </div>
              <button onClick={() => setProgramas(prev => prev.filter(x => x.id !== p.id))}
                className="text-gray-300 hover:text-red-400 transition-colors text-2xl">×</button>
            </div>
          ))}

          {/* Formulario */}
          {agregando && (
            <div className="rounded-xl p-4 space-y-3" style={{ border: '2px dashed #E27396' }}>
              <div className="flex rounded-xl overflow-hidden border border-gray-200">
                <button onClick={() => setModo('preset')}
                  className="flex-1 py-2 text-sm font-semibold"
                  style={{ background: modo === 'preset' ? '#E27396' : 'white', color: modo === 'preset' ? 'white' : '#9ca3af' }}>
                  📋 Lista
                </button>
                <button onClick={() => setModo('manual')}
                  className="flex-1 py-2 text-sm font-semibold"
                  style={{ background: modo === 'manual' ? '#E27396' : 'white', color: modo === 'manual' ? 'white' : '#9ca3af' }}>
                  ✏️ Manual
                </button>
              </div>

              {modo === 'preset' && (
                <div className="rounded-xl p-3 flex justify-between items-center"
                  style={{ background: '#fff5f8', border: '2px solid #E27396' }}>
                  <div>
                    <p className="font-bold text-gray-800">{PRESET.nombre}</p>
                    <p className="text-xs text-gray-500">${PRESET.precio} USD · {PRESET.comisionPct}%</p>
                  </div>
                  <p className="font-black text-lg" style={{ color: '#337357' }}>
                    ${(PRESET.precio * PRESET.comisionPct / 100).toFixed(0)}/venta
                  </p>
                </div>
              )}

              {modo === 'manual' && (
                <div className="space-y-2">
                  <input type="text" value={nombreManual} onChange={e => setNombreManual(e.target.value)}
                    placeholder="Nombre del programa"
                    className="w-full border-2 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none"
                    style={{ borderColor: '#e5e7eb' }} />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">$</span>
                      <input type="number" min={0} value={precioManual} onChange={e => setPrecioManual(e.target.value)}
                        placeholder="Precio USD"
                        className="w-full border-2 rounded-xl pl-7 pr-3 py-2.5 text-sm text-gray-900 focus:outline-none"
                        style={{ borderColor: '#e5e7eb' }} />
                    </div>
                    <div className="relative flex-1">
                      <input type="number" min={0} max={100} value={comisionManual} onChange={e => setComisionManual(e.target.value)}
                        placeholder="Comisión %"
                        className="w-full border-2 rounded-xl px-3 pr-8 py-2.5 text-sm text-gray-900 focus:outline-none"
                        style={{ borderColor: '#e5e7eb' }} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">%</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={agregarPrograma}
                  className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm"
                  style={{ background: '#E27396' }}>
                  Agregar
                </button>
                <button onClick={() => setAgregando(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-400 border-2 border-gray-200">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resultados */}
        {objetivo > 0 && programas.length > 0 && (
          <div className="space-y-3">

            {/* Cada programa por separado */}
            {programas.map(p => {
              const ventas = ventasNecesarias(p, objetivo)
              const gananciaReal = ventas !== null ? ventas * comisionPorVenta(p) : 0
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Vendiendo solo</p>
                  <p className="font-black text-gray-800 text-base mb-3">{p.nombre}</p>
                  <div className="flex items-end gap-3">
                    <div>
                      <p className="text-6xl font-black leading-none" style={{ color: '#E27396' }}>{ventas ?? '—'}</p>
                      <p className="text-sm text-gray-400 mt-1">{ventas === 1 ? 'venta' : 'ventas'}</p>
                    </div>
                    <div className="pb-1 text-sm text-gray-500 space-y-0.5">
                      <p>× ${comisionPorVenta(p).toFixed(0)} por venta</p>
                      <p className="font-semibold" style={{ color: '#337357' }}>= ${gananciaReal.toFixed(0)} USD</p>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Combinación 50/50 */}
            {programas.length > 1 && (
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'linear-gradient(135deg, #337357, #4a9970)' }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>Combinando en partes iguales</p>
                  <p className="text-white font-black text-base mt-0.5">
                    {programas.length === 2 ? '50% de cada programa' : `${Math.round(100/programas.length)}% de cada programa`}
                  </p>
                </div>

                <div className="space-y-3">
                  {programas.map((p, i) => {
                    const ventas = ventasNecesarias(p, montoPartes)
                    const ganancia = ventas !== null ? ventas * comisionPorVenta(p) : 0
                    return (
                      <div key={p.id} className="rounded-xl p-3 flex items-center justify-between"
                        style={{ background: 'rgba(255,255,255,0.18)' }}>
                        <div>
                          <p className="font-bold text-sm" style={{ color: '#fff' }}>{p.nombre}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
                            Meta parcial: ${montoPartes.toFixed(0)} USD
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-3xl" style={{ color: '#fff' }}>{ventas ?? '—'}</p>
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                            {ventas === 1 ? 'venta' : 'ventas'} · ${ganancia.toFixed(0)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.75)' }}>Total combinado</p>
                  <p className="font-black text-xl mt-0.5" style={{ color: '#fff' }}>
                    ${programas.reduce((acc, p) => {
                      const v = ventasNecesarias(p, montoPartes)
                      return acc + (v !== null ? v * comisionPorVenta(p) : 0)
                    }, 0).toFixed(0)} USD
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guardar */}
        {objetivo > 0 && programas.length > 0 && (
          <button onClick={guardar} disabled={guardando}
            className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-60 transition-all"
            style={{ background: guardado ? '#337357' : 'linear-gradient(135deg, #E27396, #337357)' }}>
            {guardando ? 'Guardando...' : guardado ? '✓ Guardado' : 'Guardar mi objetivo'}
          </button>
        )}

      </div>
    </div>
  )
}
