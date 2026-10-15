'use client'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { HitoAgenda } from '@/lib/agenda'

const Contexto = createContext<{ hitos: readonly HitoAgenda[]; error: boolean } | null>(null)
export function AgendaProvider({ inicial, errorInicial, children }: { inicial: HitoAgenda[]; errorInicial: boolean; children: ReactNode }) {
  const [agenda, setAgenda] = useState({ hitos: inicial, error: errorInicial })
  useEffect(() => {
    const controller = new AbortController()
    let enCurso = false
    async function actualizar() {
      if (document.hidden || enCurso) return
      enCurso = true
      try {
        const r = await fetch('/api/agenda', { cache: 'no-store', signal: controller.signal }), data = await r.json()
        if (!r.ok || !Array.isArray(data.hitos)) throw new Error('Agenda no disponible')
        setAgenda({ hitos: data.hitos, error: false })
      } catch { if (!controller.signal.aborted) setAgenda(x => ({ ...x, error: true })) }
      finally { enCurso = false }
    }
    const timer = window.setInterval(() => void actualizar(), 60_000)
    const alVolver = () => { void actualizar() }
    document.addEventListener('visibilitychange', alVolver)
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener('visibilitychange', alVolver) }
  }, [])
  return <Contexto.Provider value={agenda}>{children}</Contexto.Provider>
}
export const useAgenda = () => useContext(Contexto)
