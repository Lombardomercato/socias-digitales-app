'use client'

export function soportePush() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  if (ios && !standalone) return 'instalar'
  return window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window ? 'disponible' : 'no-compatible'
}

export async function registrarPush() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) throw new Error('Las notificaciones no están disponibles.')
  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const decoded = atob((key + '='.repeat((4 - key.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  const sub = existing ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(decoded, c => c.charCodeAt(0)) })
  const response = await fetch('/api/push/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sub) })
  if (!response.ok) throw new Error('No pudimos guardar la activación. Intentá desactivar y volver a activar este dispositivo.')
  localStorage.removeItem('socias-push-desactivado')
  window.dispatchEvent(new Event('socias-push-change'))
  return sub
}
