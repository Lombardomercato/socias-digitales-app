'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Metricas {
  id?: string
  tipo_trafico: string
  inversion: number
  personas_grupo: number
  personas_seguimiento: number
  ventas_realizadas: number
  objetivo_septiembre: number
}

interface Props {
  nombre: string
  userId: string
  metricasGuardadas: Metricas | null
  modoDemo?: boolean
}

interface Etapa {
  id: string
  numero: string
  nombre: string
  contexto: string
  descripcion: string
  tareas: string[]
  tareasInstagram?: string[]
  tareasTiktok?: string[]
  material: Array<{ label: string; url?: string }>
}

const ETAPAS: Etapa[] = [
  {
    id: 'preparacion', numero: '01', nombre: 'Preparación', contexto: 'Base del lanzamiento',
    descripcion: 'Dejá listo el terreno, los canales y el mensaje antes de invitar personas.',
    tareas: ['Crear y configurar el grupo de WhatsApp', 'Actualizar perfiles y enlaces de afiliada', 'Preparar el mensaje de bienvenida', 'Ordenar el calendario de contenidos'],
    tareasInstagram: ['Actualizar la bio con tu enlace de afiliada', 'Preparar stories para presentar el lanzamiento', 'Diseñar las publicaciones del feed', 'Definir el calendario de posteos en Instagram'],
    tareasTiktok: ['Optimizar el perfil con tu enlace de afiliada', 'Preparar ideas de videos para el lanzamiento', 'Grabar videos de contenido de valor', 'Definir el calendario de publicaciones en TikTok'],
    material: [
      { label: 'Oferta, avatar y embudo', url: 'https://drive.google.com/drive/folders/1SIoQX_uTgnUNo25OFCHUFkoOJrsRnXrZ?usp=drive_link' },
      { label: 'Clases de lanzamiento' },
    ],
  },
  {
    id: 'captacion', numero: '02', nombre: 'Captación', contexto: 'Sumar personas correctas',
    descripcion: 'Atraé interesadas, llevá conversaciones al grupo y detectá quién necesita seguimiento.',
    tareas: ['Publicar el contenido previsto para hoy', 'Responder mensajes y consultas nuevas', 'Invitar interesadas al grupo de WhatsApp', 'Registrar personas que requieren seguimiento'],
    material: [
      { label: 'Anuncios y creatividades', url: 'https://drive.google.com/drive/folders/1EeDF0DbScMvz1VdK-wx3Jy3E40Q2ar7M?usp=drive_link' },
      { label: 'Guía de captación' },
    ],
  },
  {
    id: 'evento', numero: '03', nombre: 'Evento', contexto: 'Confianza y decisión',
    descripcion: 'Acompañá a tu comunidad, aumentá la asistencia y mantené activas las conversaciones.',
    tareas: ['Enviar el recordatorio del evento', 'Confirmar que todas tengan el enlace correcto', 'Compartir el vivo en historias y estados', 'Anotar preguntas y objeciones frecuentes'],
    material: [{ label: 'Enlace del evento' }, { label: 'Mensajes y recordatorios' }],
  },
  {
    id: 'ventas', numero: '04', nombre: 'Ventas', contexto: 'Seguimiento y cierre',
    descripcion: 'Priorizá conversaciones reales, resolvé objeciones y registrá cada resultado.',
    tareas: ['Contactar a las interesadas prioritarias', 'Responder objeciones pendientes', 'Compartir casos y testimonios', 'Registrar ventas y próximos seguimientos'],
    material: [{ label: 'Enlace de venta' }, { label: 'Respuestas a objeciones' }],
  },
]

const METRICAS_INICIALES: Metricas = {
  tipo_trafico: 'organico', inversion: 0, personas_grupo: 0, personas_seguimiento: 0,
  ventas_realizadas: 0, objetivo_septiembre: 0,
}

const PRECIO_PRODUCTO = 597
const COMISION_REFERENCIA = PRECIO_PRODUCTO * 0.5

function CheckIcon() {
  return <svg width="12" height="10" viewBox="0 0 12 10" fill="none" aria-hidden="true"><path d="M1 5.2 4.4 8.5 11 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function ArrowIcon() {
  return <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M4 10h12m-4-4 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

function SocialIcon({ red, activo }: { red: 'instagram' | 'tiktok'; activo: boolean }) {
  if (red === 'instagram') {
    return <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${activo ? 'bg-white/14 text-white' : 'bg-[#F4CAD8] text-[#9C365C]'}`}><svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" /><circle cx="17.4" cy="6.7" r="1.1" fill="currentColor" /></svg></span>
  }

  return <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${activo ? 'bg-white/14 text-white' : 'bg-[#EAE5E0] text-[#171413]'}`}><svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94a8.16 8.16 0 0 1-5.65 3.47c-1.41.08-2.84-.03-4.19-.45a8.19 8.19 0 0 1-4.73-3.83c-1.49-2.57-1.69-5.86-.51-8.59a8.16 8.16 0 0 1 4.37-4.3c1.69-.82 3.69-1.03 5.52-.68.02 1.49-.04 2.98-.04 4.47-.84-.27-1.78-.2-2.6.09a3.93 3.93 0 0 0-2.29 2.01c-.57.99-.41 2.27.16 3.24.63 1.02 1.79 1.67 3 1.65.8-.02 1.59-.29 2.21-.81.72-.6 1.19-1.52 1.21-2.47.07-4.61.01-9.21.03-13.82z" /></svg></span>
}

export default function LanzamientoCliente({ nombre, userId, metricasGuardadas, modoDemo = false }: Props) {
  const supabase = createClient()
  const [etapaActiva, setEtapaActiva] = useState(modoDemo ? 1 : 0)
  const [redSocial, setRedSocial] = useState<'instagram' | 'tiktok'>('instagram')
  const [tareasCheck, setTareasCheck] = useState<Record<string, boolean>>({})
  const [metricas, setMetricas] = useState<Metricas>(metricasGuardadas ?? METRICAS_INICIALES)
  const [metricaId, setMetricaId] = useState(metricasGuardadas?.id ?? null)
  const [guardandoMetricas, setGuardandoMetricas] = useState(false)
  const [estadoGuardado, setEstadoGuardado] = useState<'idle' | 'ok' | 'error'>('idle')

  const etapa = ETAPAS[etapaActiva]
  const storageKey = `lanzamiento-tareas-v2-${userId}`
  const redStorageKey = `lanzamiento-red-${userId}`

  useEffect(() => {
    let frame: number | undefined
    try {
      const guardada = localStorage.getItem(redStorageKey)
      if (guardada === 'instagram' || guardada === 'tiktok') {
        frame = requestAnimationFrame(() => setRedSocial(guardada))
      }
    } catch {}
    return () => {
      if (frame) cancelAnimationFrame(frame)
    }
  }, [redStorageKey])

  useEffect(() => {
    let frame: number | undefined
    try {
      const guardado = localStorage.getItem(storageKey)
      if (guardado) frame = requestAnimationFrame(() => setTareasCheck(JSON.parse(guardado)))
    } catch {}
    return () => {
      if (frame) cancelAnimationFrame(frame)
    }
  }, [storageKey])

  const tareasEtapa = useMemo(() => {
    if (etapa.id !== 'preparacion') return etapa.tareas
    const tareasDeRed = redSocial === 'instagram' ? etapa.tareasInstagram : etapa.tareasTiktok
    return [...etapa.tareas, ...(tareasDeRed ?? [])]
  }, [etapa, redSocial])

  function claveTarea(index: number) {
    if (etapa.id === 'preparacion' && index >= etapa.tareas.length) {
      return `${etapa.id}-${redSocial}-${index - etapa.tareas.length}`
    }
    return `${etapa.id}-${index}`
  }

  const tareasHechas = tareasEtapa.reduce((total, _tarea, index) => total + (tareasCheck[claveTarea(index)] ? 1 : 0), 0)
  const resumen = { hechas: tareasHechas, total: tareasEtapa.length, porcentaje: Math.round((tareasHechas / tareasEtapa.length) * 100) }

  const ventasNecesarias = metricas.objetivo_septiembre > 0 ? Math.ceil(metricas.objetivo_septiembre / COMISION_REFERENCIA) : 0
  const progresoObjetivo = ventasNecesarias > 0 ? Math.min(Math.round((metricas.ventas_realizadas / ventasNecesarias) * 100), 100) : 0
  const pulsoItems = [
    { label: 'Grupo', value: metricas.personas_grupo },
    { label: 'Seguimiento', value: metricas.personas_seguimiento },
    { label: 'Ventas', value: metricas.ventas_realizadas },
  ]
  const mayorPulso = Math.max(...pulsoItems.map(item => item.value), 1)

  function toggleTarea(index: number) {
    const key = claveTarea(index)
    setTareasCheck(prev => {
      const siguiente = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(storageKey, JSON.stringify(siguiente)) } catch {}
      return siguiente
    })
  }

  function cambiarRed(red: 'instagram' | 'tiktok') {
    setRedSocial(red)
    try { localStorage.setItem(redStorageKey, red) } catch {}
  }

  async function guardarMetricas() {
    setGuardandoMetricas(true)
    setEstadoGuardado('idle')
    if (modoDemo) {
      await new Promise(resolve => setTimeout(resolve, 350))
      setGuardandoMetricas(false)
      setEstadoGuardado('ok')
      return
    }
    const datos = { alumna_id: userId, ...metricas, actualizado_en: new Date().toISOString() }
    const respuesta = metricaId
      ? await supabase.from('metricas_lanzamiento').update(datos).eq('id', metricaId)
      : await supabase.from('metricas_lanzamiento').insert(datos).select('id').single()
    if (!respuesta.error && 'data' in respuesta && respuesta.data?.id) setMetricaId(respuesta.data.id)
    setGuardandoMetricas(false)
    setEstadoGuardado(respuesta.error ? 'error' : 'ok')
  }

  return (
    <div className="min-h-screen bg-[#FAF7F3] text-[#171413]">
      <header className="bg-[#FAF7F3]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Image src="/academy-horizontal-color.png" alt="Socias Digitales Academy" width={220} height={77} className="h-12 w-auto object-contain sm:h-14" priority />
          <a href="/inicio" className="rounded-full bg-[#F4EFEA] px-4 py-2 text-xs font-medium text-[#171413] transition hover:bg-[#F4CAD8]">Volver a mi espacio</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-5 sm:px-8 sm:py-7">
        {modoDemo ? <div className="mb-4 text-[10px] uppercase tracking-[0.18em] text-[#171413]/45">Vista de aprobación · datos de muestra</div> : null}

        <section className="rounded-[26px] bg-[#F4CAD8] px-6 py-7 text-[#171413] sm:px-9 sm:py-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_300px] lg:items-center">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#294A38]">Tu hoja de ruta</p>
              <h1 className="mt-5 max-w-3xl font-serif text-[2.55rem] leading-[0.96] tracking-[-0.045em] sm:text-[3.7rem]">{nombre ? <><span className="italic">{nombre},</span>{' estás en '}</> : 'Estás en '}<span className="font-impact font-bold not-italic text-[#294A38]">{etapa.nombre.toLowerCase()}</span></h1>
            </div>
            <div className="rounded-2xl bg-[#FAF7F3]/80 p-5">
              <div className="flex items-end justify-between gap-4">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#171413]/55">Progreso</p><p className="font-impact mt-2 text-4xl font-bold tracking-[-0.04em]">{resumen.porcentaje}%</p></div>
                <p className="pb-1 text-xs font-medium text-[#171413]/55">{resumen.hechas} de {resumen.total}</p>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[#EC9BB6]/45"><div className="h-full rounded-full bg-[#294A38] transition-all duration-500" style={{ width: `${resumen.porcentaje}%` }} /></div>
            </div>
          </div>
        </section>

        <section aria-label="Etapas del lanzamiento" className="mt-4 rounded-[22px] bg-[#F4EFEA] p-2.5 sm:p-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {ETAPAS.map((item, index) => {
              const activa = index === etapaActiva
              const anterior = index < etapaActiva
              return <button key={item.id} type="button" onClick={() => setEtapaActiva(index)} aria-current={activa ? 'step' : undefined} className={`group rounded-2xl px-3 py-2.5 text-left transition sm:px-4 ${activa ? 'bg-[#F4CAD8]' : 'hover:bg-[#FAF7F3]'}`}><div className="flex items-center gap-2.5"><span className={`font-impact flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold ${activa ? 'bg-[#EC9BB6] text-[#171413]' : anterior ? 'bg-[#294A38] text-white' : 'bg-[#FAF7F3] text-[#171413]/45'}`}>{anterior ? <CheckIcon /> : item.numero}</span><span className={`font-impact text-xs font-semibold sm:text-sm ${activa ? 'text-[#171413]' : 'text-[#171413]/60'}`}>{item.nombre}</span></div><p className="mt-1.5 hidden pl-[38px] text-[10px] leading-4 text-[#171413]/45 sm:block">{item.contexto}</p></button>
            })}
          </div>
        </section>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
          <section className="rounded-[24px] bg-[#F4EFEA] p-5 sm:p-6">
            <div className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#171413]/50">Qué hacer ahora</p><h2 className="mt-1.5 font-serif text-3xl font-semibold tracking-[-0.03em] text-[#171413]">{etapa.nombre}</h2></div><span className="w-fit rounded-full bg-[#294A38]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#294A38]">{etapa.contexto}</span></div>
            {etapa.id === 'preparacion' ? <div className="mt-5 flex w-fit rounded-full bg-[#FAF7F3] p-1.5" aria-label="Red social principal">{(['instagram', 'tiktok'] as const).map(red => { const activa = redSocial === red; return <button key={red} type="button" onClick={() => cambiarRed(red)} aria-pressed={activa} className={`flex min-h-11 items-center gap-2.5 rounded-full px-3.5 pr-5 text-[13px] font-bold transition ${activa ? 'bg-[#294A38] text-white shadow-sm' : 'text-[#171413]/65 hover:bg-[#F4CAD8]/45 hover:text-[#171413]'}`}><SocialIcon red={red} activo={activa} /><span>{red === 'instagram' ? 'Instagram' : 'TikTok'}</span></button> })}</div> : null}
            <div className="mt-4 space-y-2">
              {tareasEtapa.map((tarea, index) => {
                const hecha = Boolean(tareasCheck[claveTarea(index)])
                return <button key={tarea} type="button" onClick={() => toggleTarea(index)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${hecha ? 'bg-[#294A38]/10' : 'bg-[#FAF7F3] hover:bg-[#F4CAD8]/55'}`}><span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${hecha ? 'bg-[#294A38] text-white' : 'bg-[#F4CAD8] text-transparent'}`}><CheckIcon /></span><span className={`text-sm font-semibold ${hecha ? 'text-[#294A38]/65 line-through' : 'text-[#171413]'}`}>{tarea}</span></button>
              })}
            </div>
            <div className="mt-6"><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.22em] text-[#171413]/50">Material de esta etapa</p><div className="grid gap-2 sm:grid-cols-2">{etapa.material.map(item => item.url ? <a key={item.label} href={item.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl bg-[#FAF7F3] px-4 py-3 text-sm font-bold text-[#171413] transition hover:bg-[#F4CAD8]/55"><span>{item.label}</span><ArrowIcon /></a> : <div key={item.label} className="flex items-center justify-between rounded-2xl bg-[#FAF7F3] px-4 py-3 text-sm font-semibold text-[#171413]/45"><span>{item.label}</span><span className="text-[9px] font-bold uppercase tracking-[0.12em]">Próximamente</span></div>)}</div></div>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[24px] bg-[#EC9BB6] p-5 text-[#171413]"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#171413]/60">Tu meta de venta</p><div className="mt-4 flex items-center gap-4"><div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#294A38 ${progresoObjetivo * 3.6}deg, rgba(250,247,243,.58) 0deg)` }}><div className="flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#EC9BB6]"><span className="font-impact text-xl font-bold">{progresoObjetivo}%</span></div></div><div><p className="font-impact text-3xl font-bold tracking-[-0.04em]">{metricas.ventas_realizadas}<span className="text-base font-medium opacity-55">/{ventasNecesarias || '—'}</span></p><p className="mt-1 text-xs font-medium leading-5 text-[#171413]/65">ventas realizadas</p></div></div><label className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#171413]/65" htmlFor="objetivo">¿Cuánto querés ganar?</label><div className="mt-2 flex items-center rounded-xl bg-[#FAF7F3]/80 px-4 ring-1 ring-[#171413]/10 focus-within:ring-2 focus-within:ring-[#294A38]"><span className="font-impact text-sm font-semibold">$</span><input id="objetivo" type="number" min={0} value={metricas.objetivo_septiembre || ''} onChange={event => setMetricas(actual => ({ ...actual, objetivo_septiembre: Number(event.target.value) || 0 }))} placeholder="Ej. 3.000" className="font-impact w-full bg-transparent px-2 py-3 text-xl font-semibold outline-none" /><span className="text-xs font-medium opacity-55">USD</span></div>{ventasNecesarias > 0 ? <p className="mt-3 text-xs font-medium text-[#171413]/65">Necesitás {ventasNecesarias} ventas · comisión USD {COMISION_REFERENCIA.toLocaleString('es-AR')}.</p> : <p className="mt-3 text-xs font-medium text-[#171413]/55">USD {PRECIO_PRODUCTO} · 50% de comisión.</p>}</section>
            <section className="rounded-[24px] bg-[#F4EFEA] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#171413]/50">Pulso del lanzamiento</p><div className="mt-4 space-y-3">{pulsoItems.map(item => <div key={item.label}><div className="flex items-baseline justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#171413]/50">{item.label}</p><p className="font-impact text-lg font-bold tracking-[-0.03em] text-[#171413]">{item.value}</p></div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#F4CAD8]/55"><div className="h-full rounded-full bg-[#294A38]" style={{ width: `${Math.max((item.value / mayorPulso) * 100, item.value > 0 ? 5 : 0)}%` }} /></div></div>)}</div></section>
          </aside>
        </div>

        <section className="mt-4 rounded-[24px] bg-[#F4EFEA] p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#171413]/50">Carga rápida</p><h2 className="mt-2 text-2xl leading-tight tracking-[-0.03em] text-[#171413]"><span className="font-serif font-semibold">Los números</span>{' '}<span className="font-impact text-[1.12em] font-bold text-[#EC9BB6]">que sí importan</span></h2></div><div className="flex gap-2" aria-label="Tipo de tráfico">{(['organico', 'pago'] as const).map(tipo => <button key={tipo} type="button" onClick={() => setMetricas(actual => ({ ...actual, tipo_trafico: tipo }))} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition ${metricas.tipo_trafico === tipo ? 'bg-[#294A38] text-white' : 'bg-[#FAF7F3] text-[#171413]/60'}`}>{tipo === 'organico' ? 'Orgánico' : 'Pago'}</button>)}</div></div>
          <div className={`mt-4 grid gap-3 ${metricas.tipo_trafico === 'pago' ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>{metricas.tipo_trafico === 'pago' ? <CampoMetrica label="Inversión USD" value={metricas.inversion} onChange={value => setMetricas(actual => ({ ...actual, inversion: value }))} /> : null}<CampoMetrica label="Personas en grupo" value={metricas.personas_grupo} onChange={value => setMetricas(actual => ({ ...actual, personas_grupo: value }))} /><CampoMetrica label="En seguimiento" value={metricas.personas_seguimiento} onChange={value => setMetricas(actual => ({ ...actual, personas_seguimiento: value }))} /><CampoMetrica label="Ventas realizadas" value={metricas.ventas_realizadas} onChange={value => setMetricas(actual => ({ ...actual, ventas_realizadas: value }))} /></div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className={`text-xs font-medium ${estadoGuardado === 'error' ? 'text-[#B01B30]' : 'text-[#294A38]'}`} aria-live="polite">{estadoGuardado === 'ok' ? 'Datos guardados.' : estadoGuardado === 'error' ? 'No pudimos guardar. Probá nuevamente.' : ''}</p><button type="button" onClick={guardarMetricas} disabled={guardandoMetricas} className="font-impact rounded-full bg-[#294A38] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">{guardandoMetricas ? 'Guardando…' : 'Guardar avance'}</button></div>
        </section>
      </main>
    </div>
  )
}

function CampoMetrica({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="rounded-xl bg-[#FAF7F3]/90 px-4 py-3"><span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#171413]/50">{label}</span><input type="number" min={0} value={value || ''} onChange={event => onChange(Number(event.target.value) || 0)} placeholder="0" className="font-impact mt-1 w-full bg-transparent text-2xl font-bold tracking-[-0.03em] text-[#171413] outline-none" /></label>
}
