'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminSectionMenu from '@/components/AdminSectionMenu'
import NavigationIcon from '@/components/NavigationIcon'
import { AUDIENCIAS, type Audiencia, type Aviso, fechaAviso } from '@/lib/notifications'

export default function NotificacionesAdmin({ historial, cantidades, errorCarga, emailEstados, emailListo }: { historial: Aviso[]; cantidades: Record<string, number>; errorCarga: boolean; emailEstados: Record<string, Record<string, number>>; emailListo: boolean }) {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [destino, setDestino] = useState('')
  const [audiencias, setAudiencias] = useState<Audiencia[]>(['desafio'])
  const [push, setPush] = useState(false)
  const [email, setEmail] = useState(false)
  const [pushListo, setPushListo] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [resultado, setResultado] = useState('')
  const [error, setError] = useState('')
  const intento = useRef<string | null>(null)
  const enCurso = useRef(false)
  const total = audiencias.reduce((suma, a) => suma + (cantidades[a] ?? 0), 0)

  useEffect(() => {
    let cancelado = false
    fetch('/api/push/status', { cache: 'no-store' }).then(res => res.ok ? res.json() : null).then(data => { if (!cancelado) setPushListo(Boolean(data?.configured)) }).catch(() => {})
    return () => { cancelado = true }
  }, [])

  async function enviarPush(id: string) {
    const response = await fetch('/api/push/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avisoId: id }) })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'No se pudo enviar el aviso al teléfono.')
    return `${data.enviadas} dispositivos notificados${data.fallidas ? `; ${data.fallidas} envíos fallaron` : ''}.`
  }

  async function guardar(publicado: boolean) {
    if (enCurso.current) return
    enCurso.current = true; setOcupado(true); setError(''); setResultado('')
    const id = intento.current ?? crypto.randomUUID()
    intento.current = id
    try {
      const response = await fetch('/api/admin/avisos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, titulo, mensaje, destino: destino || null, audiencias, publicado, email_solicitado: email }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar.')
      setResultado(publicado ? `Aviso publicado para ${total} cuentas actuales. ${email ? 'Se inició el primer lote de emails autorizados; revisá los pendientes en el historial.' : 'No se enviaron emails.'}` : 'Borrador guardado. Nadie lo recibió.')
      intento.current = null; setTitulo(''); setMensaje(''); setDestino('')
      router.refresh()
      if (publicado && push) {
        try { const texto = await enviarPush(id); setResultado(actual => `${actual} ${texto}`) }
        catch (causa) { setError(`El aviso quedó publicado en la bandeja, pero ${causa instanceof Error ? causa.message : 'falló el envío al teléfono.'}`) }
      }
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'No pudimos conectar. Reintentá.') }
    finally { enCurso.current = false; setOcupado(false) }
  }

  async function cambiarEstado(aviso: Aviso, accion: 'archivar' | 'publicar') {
    if (enCurso.current) return
    enCurso.current = true; setOcupado(true); setError(''); setResultado('')
    try {
      const response = await fetch('/api/admin/avisos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: aviso.id, accion }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar.')
      setResultado(accion === 'publicar' ? 'Aviso publicado en la bandeja.' : 'Aviso archivado. Ya no aparece en la bandeja de las alumnas.')
      router.refresh()
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'No pudimos conectar.') }
    finally { enCurso.current = false; setOcupado(false) }
  }

  const valido = titulo.trim() && mensaje.trim() && audiencias.length && !errorCarga
  async function procesarEmail(id: string) {
    if (enCurso.current) return
    enCurso.current = true; setOcupado(true); setError(''); setResultado('')
    try {
      const response = await fetch('/api/admin/avisos/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ avisoId: id }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo procesar el lote.')
      setResultado(data.mensaje); router.refresh()
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'No pudimos conectar.') }
    finally { enCurso.current = false; setOcupado(false) }
  }
  return <main className="min-h-screen px-5 py-8 sm:px-8">
    <div className="mx-auto max-w-6xl">
      <Link href="/admin" className="text-sm font-medium text-[#294A38]">← Panel de Flor</Link>
      <div className="mt-5"><AdminSectionMenu /></div>
      <header className="mt-7"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Comunicación</p><h1 className="mt-2 text-4xl sm:text-5xl">Notificaciones</h1></header>
      {errorCarga && <p role="alert" className="mt-5 rounded-xl border border-[#EC9BB6] p-4 text-sm">No pudimos cargar los avisos o destinatarias. Actualizá antes de publicar.</p>}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-[24px] border border-[#e7ddd5] bg-[#FAF7F3] p-5 sm:p-6">
          <h2 className="text-xl font-semibold">Nuevo aviso</h2>
          <fieldset disabled={ocupado} className="mt-5 space-y-5">
            <fieldset><legend className="mb-2 text-sm font-semibold">¿Quiénes lo reciben?</legend><div className="flex flex-wrap gap-2">{AUDIENCIAS.map(a => <label key={a.id} className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-xs ${audiencias.includes(a.id) ? 'border-[#EC9BB6] bg-[#F4CAD8]/50' : 'border-[#e7ddd5]'}`}><input type="checkbox" checked={audiencias.includes(a.id)} onChange={e => { intento.current = null; setAudiencias(actual => e.target.checked ? [...actual, a.id] : actual.filter(x => x !== a.id)) }} />{a.nombre} · {cantidades[a.id] ?? 0}</label>)}</div><p className="mt-2 text-xs text-[#746a64]">Desafío Socias: solo alumnas habilitadas por Flor.</p></fieldset>
            <label className="block text-sm font-semibold" htmlFor="aviso-titulo">Título<input id="aviso-titulo" maxLength={120} value={titulo} onChange={e => { intento.current = null; setTitulo(e.target.value) }} placeholder="Título del aviso" className="mt-2 w-full border px-4 py-3 text-sm font-normal" /></label>
            <label className="block text-sm font-semibold" htmlFor="aviso-mensaje">Mensaje<textarea id="aviso-mensaje" maxLength={4000} rows={6} value={mensaje} onChange={e => { intento.current = null; setMensaje(e.target.value) }} placeholder="Escribí lo que querés contarles…" className="mt-2 w-full resize-y border px-4 py-3 text-sm font-normal" /></label>
            <label className="block text-sm font-semibold" htmlFor="aviso-destino">Botón del aviso<select id="aviso-destino" value={destino} onChange={e => { intento.current = null; setDestino(e.target.value) }} className="mt-2 w-full border px-4 py-3 text-sm font-normal"><option value="">Sin botón</option><option value="/inicio">Inicio</option><option value="/clases">Clases</option><option value="/lanzamiento">Mi lanzamiento</option><option value="/perfil">Mi perfil</option></select></label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={push} disabled={!pushListo} onChange={e => setPush(e.target.checked)} className="mt-1" /><span>Avisar también al teléfono<span className="mt-1 block text-xs text-[#746a64]">{pushListo ? 'Solo a quienes activaron las notificaciones.' : 'No disponible hasta completar la configuración push. La bandeja sí funciona.'}</span></span></label>
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={email} disabled={!emailListo} onChange={e => { intento.current = null; setEmail(e.target.checked) }} className="mt-1" /><span>Enviar también por email<span className="mt-1 block text-xs text-[#746a64]">{emailListo ? 'Solo a quienes aceptaron recibir emails. Lotes de hasta 20; continuá los pendientes desde el historial.' : 'El envío por email no está configurado.'}</span></span></label>
          </fieldset>
          <div className="mt-6 flex flex-wrap gap-3"><button type="button" disabled={!valido || ocupado} onClick={() => guardar(true)} className="rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{ocupado ? 'Guardando…' : 'Publicar aviso'}</button><button type="button" disabled={!valido || ocupado} onClick={() => guardar(false)} className="rounded-full border border-[#e7ddd5] px-5 py-3 text-sm disabled:opacity-50">Guardar borrador</button></div>
          <p className="mt-3 text-xs leading-5 text-[#746a64]">Siempre queda en la bandeja de la app. El email y el aviso al teléfono son opcionales.</p>
          {resultado && <p role="status" className="mt-4 text-sm text-[#294A38]">{resultado}</p>}{error && <p role="alert" className="mt-4 text-sm text-[#B01B30]">{error}</p>}
        </section>
        <section className="rounded-[24px] border border-[#e7ddd5] bg-[#FAF7F3] p-5 sm:p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#746a64]">Vista previa</p><div className="mt-4 rounded-[20px] border border-[#EC9BB6]/60 bg-[#F4CAD8]/25 p-5"><div className="flex items-center gap-2 text-[#294A38]"><NavigationIcon name="notificaciones" /><span className="text-xs">Socias Digitales</span></div><h2 className="mt-4 text-lg font-semibold">{titulo || 'Título del aviso'}</h2><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#746a64]">{mensaje || 'Tu mensaje aparecerá acá.'}</p>{destino && <span className="mt-5 inline-block text-sm font-semibold text-[#294A38]">Abrir →</span>}</div></section>
      </div>
      <section className="mt-8">
        <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Historial</h2><button type="button" disabled={ocupado} onClick={() => router.refresh()} className="text-xs font-medium text-[#294A38]">Actualizar historial</button></div>
        <div className="mt-4 space-y-3">{historial.map(aviso => {
          const estados = emailEstados[aviso.id] ?? {}
          const pendientes = (estados.pendiente ?? 0) + (estados.enviando ?? 0) + (estados.error ?? 0)
          return <article key={aviso.id} className="flex flex-col gap-3 rounded-[20px] border border-[#e7ddd5] bg-[#FAF7F3] p-5 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{aviso.titulo}</h3><p className="mt-1 text-xs text-[#746a64]">{fechaAviso(aviso.created_at)} · {aviso.audiencias.map(a => AUDIENCIAS.find(x => x.id === a)?.nombre).join(', ')}</p><p className="mt-2 whitespace-pre-wrap break-words text-sm text-[#746a64]">{aviso.mensaje}</p>
              {aviso.email_solicitado && <p className="mt-3 text-xs leading-5 text-[#746a64]">{aviso.publicado ? `Email: ${estados.aceptado ?? 0} aceptados por el proveedor · ${pendientes} pendientes/en proceso · ${estados.omitido ?? 0} omitidos · ${estados.revision ?? 0} requieren revisión. Aceptado no confirma entrega en la casilla.` : 'Email autorizado al publicar, solo para usuarias con consentimiento.'}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-3"><span className="rounded-full bg-[#F4CAD8]/50 px-3 py-1 text-xs">{aviso.archivado ? 'Archivado' : aviso.publicado ? 'Publicado' : 'Borrador'}</span>{!aviso.archivado && <>
              {!aviso.publicado && <button disabled={ocupado} onClick={() => cambiarEstado(aviso, 'publicar')} className="text-xs font-semibold text-[#294A38]">Publicar</button>}
              {aviso.publicado && aviso.email_solicitado && pendientes > 0 && <button disabled={ocupado || !emailListo} onClick={() => procesarEmail(aviso.id)} className="text-xs font-semibold text-[#294A38]">Procesar pendientes</button>}
              <button disabled={ocupado} onClick={() => cambiarEstado(aviso, 'archivar')} className="text-xs text-[#746a64]">Archivar</button>
            </>}</div>
          </article>
        })}{!historial.length && <div className="rounded-[20px] border border-[#e7ddd5] bg-[#FAF7F3] p-6 text-sm text-[#746a64]">Todavía no hay avisos.</div>}</div>
      </section>
    </div>
  </main>
}
