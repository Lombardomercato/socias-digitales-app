'use client'

import Link from 'next/link'
import { useState } from 'react'

export default function BajaEmail() {
  const [ocupada, setOcupada] = useState(false)
  const [lista, setLista] = useState(false)
  const [error, setError] = useState('')
  async function desactivar() {
    setOcupada(true); setError('')
    try {
      const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
      const res = await fetch('/api/cuenta/email/baja', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setLista(true)
    } catch(causa) { setError(causa instanceof Error ? causa.message : 'Revisá tu conexión.') }
    finally { setOcupada(false) }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#F4EFEA] px-5 text-[#171413]"><section className="w-full max-w-lg rounded-[24px] border border-[#EC9BB6]/50 bg-[#FAF7F3] p-8"><img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-auto w-44" /><h1 className="mt-8 font-serif text-3xl">{lista ? 'Preferencia guardada.' : 'Tus novedades por email.'}</h1><p role={lista ? 'status' : undefined} className="mt-4 text-sm leading-6 text-[#655B56]">{lista ? 'Dejaste de recibir avisos de clases, recordatorios y novedades por email. Tus avisos siguen en la plataforma.' : 'Podés dejar de recibir estos emails sin perder tu cuenta ni el acceso a las clases.'}</p>{!lista && <button disabled={ocupada} onClick={desactivar} className="mt-6 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{ocupada ? 'Guardando…' : 'Desactivar novedades por email'}</button>}{error && <p role="alert" className="mt-4 text-sm text-[#B01B30]">{error}</p>}<Link href="/perfil" className="mt-6 block text-sm text-[#294A38] underline underline-offset-4">Ir a mi perfil</Link></section></main>
}
