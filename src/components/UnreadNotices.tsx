'use client'

import Link from 'next/link'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import NavigationIcon from './NavigationIcon'
import ArrowIcon from './ArrowIcon'
import type { ResumenAvisos } from '@/lib/unread-notices'

const AvisosContext = createContext<ResumenAvisos | null>(null)

export function UnreadNoticesProvider({ inicial, children }: { inicial: ResumenAvisos; children: ReactNode }) {
  const [actualizacion, setActualizacion] = useState<{ origen: ResumenAvisos; resumen: ResumenAvisos } | null>(null)
  const resumen = actualizacion?.origen === inicial ? actualizacion.resumen : inicial
  useEffect(() => {
    let cancelado = false
    let enCurso = false
    let controller: AbortController | null = null
    async function refrescar() {
      if (document.visibilityState !== 'visible' || enCurso) return
      enCurso = true
      controller = new AbortController()
      const limite = window.setTimeout(() => controller?.abort(), 8000)
      try {
        const response = await fetch('/api/cuenta/avisos', { cache: 'no-store', signal: controller.signal })
        if (!response.ok) return // Una falla temporal no borra un aviso pendiente.
        const data: ResumenAvisos = await response.json()
        if (!cancelado && Number.isSafeInteger(data.cantidad) && data.cantidad >= 0 && !data.errorCarga
          && (data.ultimoTitulo === null || typeof data.ultimoTitulo === 'string')) {
          setActualizacion({ origen: inicial, resumen: data })
        }
      } catch { /* Conserva el último dato confirmado. */ }
      finally { window.clearTimeout(limite); enCurso = false }
    }
    const intervalo = window.setInterval(refrescar, 60_000)
    window.addEventListener('focus', refrescar)
    document.addEventListener('visibilitychange', refrescar)
    return () => {
      cancelado = true; controller?.abort(); window.clearInterval(intervalo)
      window.removeEventListener('focus', refrescar)
      document.removeEventListener('visibilitychange', refrescar)
    }
  }, [inicial])
  return <AvisosContext.Provider value={resumen}>{children}</AvisosContext.Provider>
}

export function UnreadNoticeLink({ variante }: { variante: 'header' | 'menu' | 'banner' | 'tarjeta' | 'resumen' }) {
  const resumen = useContext(AvisosContext)
  if (!resumen) return null
  const { cantidad, ultimoTitulo, errorCarga } = resumen
  const pendientes = cantidad > 0
  const texto = cantidad === 1 ? '1 comunicado sin leer' : `${cantidad} comunicados sin leer`
  const badge = pendientes ? <span aria-hidden="true" className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#294A38] px-1.5 text-xs font-bold tabular-nums text-white">{cantidad > 99 ? '99+' : cantidad}</span> : null
  const foco = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38]'

  if (variante === 'resumen') return <Link href="/notificaciones" aria-label={`Notificaciones${errorCarga ? ': sin comprobar' : pendientes ? `: ${texto}` : ': al día'}`} className={`mt-4 flex min-h-20 items-center justify-between gap-3 rounded-[20px] border px-5 py-4 ${pendientes ? 'border-[#EC9BB6] bg-[#F4CAD8]' : 'border-[#E7DDD5] bg-[#FFFDFA]'} ${foco}`}>
    <span className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4EFEA] text-[#294A38]"><NavigationIcon name="notificaciones" /></span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2 text-sm font-semibold">{errorCarga ? 'Revisá tus avisos' : pendientes ? texto : 'Tus avisos, al día'}{badge}</span><span className="mt-1 block break-words text-xs leading-5 text-[#746A64]">{errorCarga ? 'No pudimos comprobar si hay comunicados nuevos.' : pendientes ? ultimoTitulo : 'No tenés comunicados sin leer.'}</span></span></span><ArrowIcon />
  </Link>

  if (variante === 'banner') {
    if (!pendientes && !errorCarga) return null
    return <div role="status" aria-live="polite" className="mt-5">
      <Link href="/notificaciones" className={`flex flex-col gap-3 rounded-[20px] border border-l-4 border-[#EC9BB6] border-l-[#294A38] bg-[#F4CAD8] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${foco}`}>
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#294A38] text-white"><NavigationIcon name="notificaciones" /></span>
          <span className="min-w-0"><span className="block text-sm font-semibold text-[#211c19]">{errorCarga ? 'Revisá tus comunicados' : `Tenés ${texto}`}</span>
            <span className="mt-1 block break-words text-xs leading-5 text-[#211c19]/80">{errorCarga ? 'No pudimos comprobar los mensajes nuevos. Abrí la bandeja.' : ultimoTitulo}</span>
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full bg-[#294A38] px-4 py-2.5 text-xs font-semibold text-white sm:self-auto">{cantidad === 1 ? 'Leer comunicado' : 'Ver comunicados'}<ArrowIcon /></span>
      </Link>
    </div>
  }
  const label = `Notificaciones${pendientes ? `: ${texto}` : ''}`
  if (variante === 'header') return <Link href="/notificaciones" aria-label={label} className={`flex min-h-11 items-center gap-2 rounded-full border px-3 py-2 text-sm ${pendientes ? 'border-[#EC9BB6] bg-[#EC9BB6] font-semibold text-[#211c19]' : 'border-transparent text-[#294A38]'} ${foco}`}><NavigationIcon name="notificaciones" /><span className="hidden sm:inline">Avisos</span>{badge}</Link>
  if (variante === 'menu') return <Link href="/notificaciones" aria-label={label} className={`relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm ${pendientes ? 'border border-[#EC9BB6] bg-[#F4CAD8] font-semibold text-[#211c19]' : 'text-[#746a64] hover:bg-[#F4EFEA]'} ${foco}`}><NavigationIcon name="notificaciones" /><span className="flex-1">Notificaciones</span>{badge && <span className="absolute -right-1 -top-1">{badge}</span>}</Link>
  return <Link href="/notificaciones" aria-label={label} className={`mt-5 flex items-center justify-between gap-4 rounded-[20px] border p-5 ${pendientes ? 'border-[#EC9BB6] bg-[#F4CAD8]/50' : 'border-[#e7ddd5] bg-[#FAF7F3]'} ${foco}`}><span className="flex items-center gap-3 text-sm font-semibold"><NavigationIcon name="notificaciones" />Mis notificaciones{badge}</span><ArrowIcon /></Link>
}
