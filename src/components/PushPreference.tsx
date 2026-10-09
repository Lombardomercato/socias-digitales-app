'use client'

import { useEffect, useState } from 'react'
import NavigationIcon from './NavigationIcon'
import { registrarPush, soportePush } from '@/lib/push-client'

export default function PushPreference() {
  const [estado, setEstado] = useState('cargando')
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    let vivo = true
    async function leer() {
      const support = soportePush()
      if (support !== 'disponible') { if (vivo) setEstado(support); return }
      if (Notification.permission === 'denied') { if (vivo) setEstado('bloqueado'); return }
      try {
        const response = await fetch('/api/push/status', { cache: 'no-store' })
        const data = await response.json()
        if (!response.ok || !data.configured) { if (vivo) setEstado('sin-configurar'); return }
        const reg = await navigator.serviceWorker.getRegistration('/sw.js')
        const sub = await reg?.pushManager.getSubscription()
        let registrada = false
        if (sub && Notification.permission === 'granted' && !localStorage.getItem('socias-push-desactivado')) {
          const estadoServidor = await fetch('/api/push/subscribe', { cache: 'no-store' })
          const servidor = await estadoServidor.json()
          if (!estadoServidor.ok) throw new Error('No pudimos consultar tus dispositivos.')
          const huella = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub.endpoint))), byte => byte.toString(16).padStart(2, '0')).join('')
          registrada = servidor.dispositivos?.includes(huella) === true
        }
        if (vivo) setEstado(registrada ? 'activo' : 'inactivo')
      } catch { if (vivo) { setEstado('error'); setError('No pudimos consultar la activación. Actualizá la página.') } }
    }
    void leer()
    window.addEventListener('socias-push-change', leer)
    return () => { vivo = false; window.removeEventListener('socias-push-change', leer) }
  }, [])

  async function actuar(accion: 'activar' | 'desactivar' | 'probar') {
    setOcupado(true); setError(''); setMensaje('')
    try {
      if (accion === 'activar') {
        const permiso = await Notification.requestPermission()
        if (permiso !== 'granted') { setEstado(permiso === 'denied' ? 'bloqueado' : 'inactivo'); throw new Error('No autorizaste las notificaciones. Podés activarlas cuando quieras.') }
        await registrarPush()
        setEstado('activo'); setMensaje('Activadas en este dispositivo.')
      } else {
        const reg = await navigator.serviceWorker.getRegistration('/sw.js')
        const sub = await reg?.pushManager.getSubscription()
        if (!sub) { setEstado('inactivo'); throw new Error('Activá primero este dispositivo.') }
        const response = await fetch(accion === 'probar' ? '/api/push/test' : '/api/push/subscribe', { method: accion === 'probar' ? 'POST' : 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'No pudimos completar el pedido.')
        if (accion === 'desactivar') {
          await sub.unsubscribe()
          localStorage.setItem('socias-push-desactivado', '1')
          setEstado('inactivo'); setMensaje('Desactivadas aquí. Tus otros dispositivos no cambian.')
          window.dispatchEvent(new Event('socias-push-change'))
        } else setMensaje(data.mensaje)
      }
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'Intentá nuevamente.') }
    finally { setOcupado(false) }
  }

  return <section className="rounded-2xl border border-[#EC9BB6]/50 bg-white p-5">
    <h2 className="flex items-center gap-2 text-sm font-semibold text-[#171413]"><NavigationIcon name="notificaciones" />Notificaciones en tus dispositivos</h2>
    <p className="mt-3 text-xs leading-5 text-[#655B56]">Activá los avisos en cada celular o computadora donde quieras recibirlos. El email se configura por separado.</p>
    <p className="mt-3 text-sm font-medium text-[#294A38]">{estado === 'activo' ? 'Activadas en este dispositivo' : estado === 'cargando' ? 'Comprobando…' : estado === 'instalar' ? 'En iPhone, agregá la plataforma al inicio' : estado === 'bloqueado' ? 'Bloqueadas por el navegador' : estado === 'sin-configurar' ? 'No disponibles por el momento' : estado === 'no-compatible' ? 'Este navegador no admite notificaciones' : 'No activadas en este dispositivo'}</p>
    {estado === 'instalar' && <ol className="mt-3 list-inside list-decimal space-y-1 text-xs leading-5 text-[#655B56]"><li>Abrí app.sociasdigitales.com en Safari.</li><li>Tocá Compartir → Agregar a pantalla de inicio.</li><li>Abrí Socias desde ese ícono y activá los avisos aquí.</li></ol>}
    {estado === 'bloqueado' && <p className="mt-2 text-xs leading-5 text-[#655B56]">Permití las notificaciones de app.sociasdigitales.com en los ajustes del navegador y del dispositivo. Después volvé a esta página.</p>}
    {(estado === 'activo' || estado === 'inactivo') && <div className="mt-4 flex flex-wrap gap-3">
      <button type="button" disabled={ocupado} onClick={() => actuar(estado === 'activo' ? 'desactivar' : 'activar')} className="rounded-full bg-[#294A38] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{ocupado ? 'Un momento…' : estado === 'activo' ? 'Desactivar aquí' : 'Activar en este dispositivo'}</button>
      {estado === 'activo' && <button type="button" disabled={ocupado} onClick={() => actuar('probar')} className="rounded-full border border-[#F4CAD8] px-4 py-2 text-xs font-semibold text-[#294A38] disabled:opacity-50">Enviar prueba</button>}
    </div>}
    {error && <p role="alert" className="mt-3 text-xs text-[#B01B30]">{error}</p>}
    {mensaje && <p role="status" className="mt-3 text-xs text-[#294A38]">{mensaje}</p>}
  </section>
}
