'use client'

import { useEffect, useState } from 'react'

export default function EmailPreference() {
  const [acepta, setAcepta] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  useEffect(() => {
    let activa = true
    fetch('/api/cuenta/email', { cache: 'no-store' }).then(async res => {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (activa) setAcepta(data.acepta_email === true)
    }).catch(() => { if (activa) setError('No pudimos leer tu preferencia. Actualizá la página.') }).finally(() => { if (activa) setCargando(false) })
    return () => { activa = false }
  }, [])
  async function guardar() {
    setGuardando(true); setError(''); setMensaje('')
    try {
      const res = await fetch('/api/cuenta/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ acepta_email: acepta }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No pudimos guardar.')
      setMensaje(acepta ? 'Email activado para clases, recordatorios y novedades.' : 'Novedades por email desactivadas. Tus avisos siguen en la plataforma.')
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'Revisá tu conexión.') }
    finally { setGuardando(false) }
  }
  return <section className="rounded-2xl border border-[#EC9BB6]/50 bg-[#FAF7F3] p-5">
    <h2 className="text-sm font-semibold">Cómo querés recibir las novedades</h2>
    <label className="mt-4 flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={acepta} disabled={cargando || guardando} onChange={e => setAcepta(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#294A38]" /><span>Recibir por email avisos de clases, recordatorios y novedades de Socias Digitales.</span></label>
    <p className="mt-3 text-xs leading-5 text-[#655B56]">Es opcional. Los avisos dentro de la plataforma y los correos de acceso a tu cuenta no dependen de esta elección.</p>
    <button type="button" disabled={cargando || guardando} onClick={guardar} className="mt-4 rounded-full bg-[#294A38] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{guardando ? 'Guardando…' : cargando ? 'Cargando…' : 'Guardar preferencia'}</button>
    {error && <p role="alert" className="mt-3 text-xs text-[#B01B30]">{error}</p>}{mensaje && <p role="status" className="mt-3 text-xs text-[#294A38]">{mensaje}</p>}
  </section>
}
