export function esEndpointPushValido(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 2048) return false
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return false
    return ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'].includes(url.hostname)
      || url.hostname.endsWith('.notify.windows.com')
  } catch { return false }
}

export function esSuscripcionPushValida(input: unknown): input is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!input || typeof input !== 'object') return false
  const sub = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } }
  return esEndpointPushValido(sub.endpoint)
    && typeof sub.keys?.p256dh === 'string' && /^[A-Za-z0-9_-]{80,100}={0,2}$/.test(sub.keys.p256dh)
    && typeof sub.keys?.auth === 'string' && /^[A-Za-z0-9_-]{20,30}={0,2}$/.test(sub.keys.auth)
}
