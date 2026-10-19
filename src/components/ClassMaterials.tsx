'use client'
import { useEffect, useState } from 'react'
import type { MaterialVisible } from '@/lib/class-materials'

export function MaterialIcon({ enlace = false }: { enlace?: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{enlace ? <><path d="M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2" /><path d="M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2" /></> : <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 14h8M8 17h5" /></>}</svg>
}
export function MaterialsList({ materiales }: { materiales: MaterialVisible[] }) {
  return <ul className="mt-3 space-y-2">{materiales.map(m => <li key={m.id}>
    <a href={m.href} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 rounded-xl border border-[#E7DDD5] bg-[#FFFDFA] px-3 py-3 text-[#294A38] transition-colors hover:border-[#EC9BB6] focus-visible:outline-2 focus-visible:outline-offset-2">
      <MaterialIcon enlace={m.tipo === 'enlace'} /><span className="min-w-0 flex-1"><span className="block break-words text-sm font-semibold text-[#211C19]">{m.titulo}</span><span className="mt-1 block break-words text-xs text-[#746A64]">{m.detalle} · {m.tipo === 'enlace' ? 'Abrir enlace' : 'Descargar'}</span></span>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{m.tipo === 'enlace' ? <path d="M7 17 17 7M7 7h10v10" /> : <><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" /></>}</svg>
    </a>
  </li>)}</ul>
}
export default function ClassMaterials({ claseId }: { claseId: string }) {
  const [materiales, setMateriales] = useState<MaterialVisible[] | null>(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    async function cargar() {
      try {
        const response = await fetch(`/api/classroom/${claseId}/materiales`, { cache: 'no-store', signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error ?? 'No pudimos cargar los materiales.')
        setMateriales(data.materiales); setError('')
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No pudimos cargar los materiales.')
      }
    }
    void cargar()
    return () => controller.abort()
  }, [claseId, intento])
  return <section aria-label="Materiales de la clase" className="mt-5 rounded-2xl border border-[#E7DDD5] bg-[#F4EFEA]/50 p-4">
    <h3 className="font-impact text-base font-semibold text-[#211C19]">Materiales de la clase</h3>
    {error ? <div role="alert" className="mt-2 text-sm text-[#746A64]"><p>{error}</p><button type="button" onClick={() => { setError(''); setIntento(i => i + 1) }} className="mt-2 min-h-11 rounded-full border border-[#D8CFC8] px-4 text-[#294A38]">Reintentar materiales</button></div>
      : materiales === null ? <p role="status" className="mt-2 text-sm text-[#746A64]">Cargando materiales…</p>
        : materiales.length ? <MaterialsList materiales={materiales} /> : <p className="mt-2 text-sm text-[#746A64]">Todavía no hay materiales para esta clase.</p>}
  </section>
}
