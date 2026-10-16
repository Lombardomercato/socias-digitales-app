'use client'

// Una captura pequeña de un fotograma real, nunca una portada generada.
export function extraerMiniatura(src: string, signal?: AbortSignal): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    let terminado = false
    const timer = setTimeout(() => finish(undefined, new Error('No pudimos capturar este video.')), 25_000)
    const abort = () => finish(undefined, new Error('Captura cancelada.'))
    function finish(blob?: Blob, error?: Error) {
      if (terminado) return
      terminado = true
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      video.onloadedmetadata = video.onseeked = video.onerror = null
      video.removeAttribute('src')
      video.load()
      if (blob) resolve(blob)
      else reject(error ?? new Error('No pudimos capturar este video.'))
    }
    video.onloadedmetadata = () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return finish(undefined, new Error('Video no disponible.'))
      video.currentTime = Math.min(10, video.duration / 10)
    }
    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = 280
        canvas.height = Math.max(1, Math.min(280, Math.round(280 * video.videoHeight / video.videoWidth)))
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Captura no disponible.')
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(blob => {
          if (blob && blob.size <= 20_000) finish(blob)
          else finish(undefined, new Error('Miniatura demasiado grande.'))
        }, 'image/jpeg', 0.55)
      } catch { finish(undefined, new Error('Captura no disponible.')) }
    }
    video.onerror = () => finish(undefined, new Error('Captura no disponible.'))
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) return abort()
    video.src = src
  })
}

let cola: Promise<unknown> = Promise.resolve()
export function generarMiniaturaExistente(id: string, revision: string, signal: AbortSignal) {
  const tarea = cola.catch(() => {}).then(async () => {
    if (signal.aborted) return
    const response = await fetch(`/api/classroom/${id}/video`, { cache: 'no-store', signal })
    if (!response.ok) throw new Error('Video no disponible.')
    const { url } = await response.json()
    const blob = await extraerMiniatura(url, signal)
    const saved = await fetch(`/api/admin/clases/${id}/miniatura?revision=${encodeURIComponent(revision)}`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob, signal })
    if (!saved.ok) throw new Error('No pudimos guardar la miniatura.')
  })
  cola = tarea
  return tarea
}
