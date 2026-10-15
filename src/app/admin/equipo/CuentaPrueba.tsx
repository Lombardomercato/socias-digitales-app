'use client'
import { useEffect, useState } from 'react'

interface EstadoPrueba { nombre: string; rol: string; plan: string; activa: boolean; desafio: boolean; modulos: { nombre: string; habilitada: boolean }[] }
export default function CuentaPrueba() {
  const [estado, setEstado] = useState<EstadoPrueba | null>(null), [ocupado, setOcupado] = useState(true)
  const [aviso, setAviso] = useState(''), [error, setError] = useState('')
  async function consultar(habilitar = false) {
    setOcupado(true); setError(''); setAviso('')
    try {
      const r = await fetch('/api/admin/prueba/accesos', habilitar ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ habilitar: true }) } : { cache: 'no-store' })
      const data = await r.json()
      if (!r.ok) throw new Error(data.error)
      setEstado(data)
      if (habilitar) setAviso('Todos los módulos desarrollados están habilitados. La cuenta sigue siendo alumna, sin permisos de administración.')
    } catch (e) { setError(e instanceof Error ? e.message : 'No pudimos comprobar el acceso.') }
    finally { setOcupado(false) }
  }
  useEffect(() => {
    const controller = new AbortController()
    void fetch('/api/admin/prueba/accesos', { cache: 'no-store', signal: controller.signal })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); return data })
      .then(data => { if (!controller.signal.aborted) setEstado(data) })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'No pudimos comprobar el acceso.') })
      .finally(() => { if (!controller.signal.aborted) setOcupado(false) })
    return () => controller.abort()
  }, [])
  const completo = estado?.plan === 'socia' && estado.activa && estado.desafio && estado.modulos.every(m => m.habilitada)
  return <section className="rounded-3xl border border-[#E7DDD5] bg-[#FAF7F3] p-5 sm:p-7">
    <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#746A64]">Pruebas internas</p>
    <h2 className="mt-2 text-lg font-semibold">Cuenta de alumna de prueba</h2>
    <p className="mt-3 text-sm leading-6 text-[#746A64]">Conserva sus datos y queda fuera de los resultados y estadísticas de alumnas.</p>
    {estado && <><p className="mt-4 text-sm font-medium">{estado.nombre} · {completo ? 'Acceso completo de alumna' : 'Accesos por completar'}</p><ul className="mt-3 flex flex-wrap gap-2">{[{ nombre: 'Clases del Desafío', habilitada: estado.desafio }, ...estado.modulos].map(m => <li key={m.nombre} className={`rounded-full border px-3 py-2 text-xs ${m.habilitada ? 'border-[#294A38]/25 bg-white text-[#294A38]' : 'border-[#EC9BB6] bg-[#F4CAD8] text-[#211C19]'}`}>{m.nombre} · {m.habilitada ? 'Habilitado' : 'Bloqueado'}</li>)}</ul></>}
    {error && <p role="alert" className="mt-4 text-sm text-[#B01B30]">{error}</p>}
    {aviso && <p role="status" className="mt-4 text-sm text-[#294A38]">{aviso}</p>}
    <div className="mt-5 flex flex-wrap gap-3"><button disabled={ocupado || Boolean(completo)} type="button" onClick={() => void consultar(true)} className="min-h-11 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{ocupado ? 'Comprobando…' : completo ? 'Módulos habilitados' : 'Habilitar todos los módulos de prueba'}</button><button type="button" disabled={ocupado} onClick={() => void consultar()} className="min-h-11 px-2 text-sm text-[#294A38] underline underline-offset-4">Revisar accesos</button></div>
  </section>
}
