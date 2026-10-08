'use client'

import { useCallback, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const POSPONER_NOTIFICACIONES = 'notificaciones-pospuestas-hasta'
const RUTAS_SIN_AVISO = ['/preview', '/login', '/registro', '/auth', '/crear-contrasena']

export default function PushNotifications() {
  const pathname = usePathname()
  const [mostrar, setMostrar] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  const registrar = useCallback(async (mostrarError = true) => {
    try {
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) throw new Error('Las notificaciones todavía no están configuradas.')

      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      const existente = await reg.pushManager.getSubscription()
      const sub = existente ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
      const respuesta = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      })
      if (!respuesta.ok) throw new Error('No pudimos guardar la activación.')
      setError('')
      return true
    } catch (causa) {
      if (mostrarError) setError(causa instanceof Error ? causa.message : 'No pudimos activar las notificaciones.')
      return false
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    if (!('Notification' in window)) return
    if (RUTAS_SIN_AVISO.some(ruta => pathname.startsWith(ruta))) return

    let cancelado = false
    let temporizador: ReturnType<typeof setTimeout> | undefined

    async function preparar() {
      try {
        const estado = await fetch('/api/push/status', { cache: 'no-store' })
        const configuracion = estado.ok ? await estado.json() : null
        if (cancelado || !configuracion?.configured || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return
      } catch {
        return
      }

      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelado || Notification.permission === 'denied') return

      const { data: perfil } = await supabase
        .from('perfiles')
        .select('rol, desafio_socias_habilitada')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelado || (!perfil?.desafio_socias_habilitada && perfil?.rol !== 'admin')) return

      if (Notification.permission === 'granted') {
        await registrar(false)
        return
      }

      const pospuestoHasta = Number(localStorage.getItem(POSPONER_NOTIFICACIONES) || 0)
      if (pospuestoHasta > Date.now()) return
      temporizador = setTimeout(() => {
        if (!cancelado) setMostrar(true)
      }, 3000)
    }

    void preparar()
    return () => {
      cancelado = true
      if (temporizador) clearTimeout(temporizador)
    }
  }, [pathname, registrar])

  async function activar() {
    setCargando(true)
    setError('')
    const permiso = await Notification.requestPermission()
    if (permiso === 'granted') {
      const registrada = await registrar()
      if (registrada) setMostrar(false)
    } else {
      setError('El navegador no autorizó las notificaciones.')
    }
    setCargando(false)
  }

  function posponer() {
    localStorage.setItem(POSPONER_NOTIFICACIONES, String(Date.now() + 7 * 24 * 60 * 60 * 1000))
    setMostrar(false)
  }

  if (!mostrar) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-sm">
      <div className="flex items-start gap-3 rounded-2xl bg-[#FAF7F3] p-4 shadow-xl">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4CAD8] text-[#171413]"><BellIcon /></span>
        <div className="flex-1">
          <p className="text-sm font-bold text-[#171413]">Activá las notificaciones</p>
          <p className="mt-0.5 text-xs leading-5 text-[#171413]/60">Recibí avisos de clases nuevas y novedades importantes.</p>
          {error ? <p className="mt-2 text-xs font-semibold text-[#B01B30]" role="alert">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={activar} disabled={cargando}
              className="flex-1 rounded-xl bg-[#294A38] py-2 text-xs font-bold text-white disabled:opacity-60">
              {cargando ? 'Activando...' : 'Activar'}
            </button>
            <button type="button" onClick={posponer}
              className="rounded-xl bg-[#F4EFEA] px-3 py-2 text-xs text-[#171413]/55">
              Ahora no
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BellIcon() {
  return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M6.7 15.2h6.6M8.3 17a2 2 0 0 0 3.4 0M4.8 14c1-1 1.3-2.3 1.3-4.4 0-2.5 1.6-4.3 3.9-4.3s3.9 1.8 3.9 4.3c0 2.1.3 3.4 1.3 4.4H4.8ZM10 3.2V2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}
