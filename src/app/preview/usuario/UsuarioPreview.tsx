'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

type Acceso = 'gratuita' | 'socia'
type Icono = 'home' | 'launch' | 'academy' | 'community' | 'results' | 'profile' | 'goals' | 'products' | 'calendar' | 'arrow' | 'lock'

interface Modulo {
  icon: Icono
  title: string
  text: string
  tone: string
  href?: string
}

interface UsuarioPreviewProps {
  accesoInicial?: Acceso
  permiteCambiarAcceso?: boolean
  modoDemo?: boolean
  nombre?: string
  avatarUrl?: string | null
  progreso?: number
  ventas?: number
  comisiones?: number
  modulosCompletados?: number
  accesoLanzamiento?: boolean
  estadisticas?: Array<{ label: string; value: string }>
  siguientePaso?: { titulo: string; descripcion: string; boton: string; href: string }
  mostrarSeccionFormacion?: boolean
}

function Icon({ name, className = 'h-5 w-5' }: { name: Icono; className?: string }) {
  const props = { className, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true }
  if (name === 'home') return <svg {...props}><path d="M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4v-9.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
  if (name === 'launch') return <svg {...props}><path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="5" cy="7" r="2" fill="currentColor"/><circle cx="12" cy="3" r="2" fill="currentColor"/><circle cx="19" cy="10" r="2" fill="currentColor"/></svg>
  if (name === 'academy') return <svg {...props}><path d="m3 8.5 9-4 9 4-9 4-9-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M6.5 10.2V15c3.4 2.3 7.6 2.3 11 0v-4.8M21 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'community') return <svg {...props}><path d="M5 5h14v11H9l-4 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'results') return <svg {...props}><path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  if (name === 'profile') return <svg {...props}><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8"/><path d="M5 20c.5-4 2.8-6 7-6s6.5 2 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'goals') return <svg {...props}><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="m14 10 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'products') return <svg {...props}><path d="M5 8h14l-1 12H6L5 8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 9V6a3 3 0 0 1 6 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'calendar') return <svg {...props}><rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 3v4m8-4v4M4 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'arrow') return <svg {...props}><path d="M5 12h13m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
  return <svg {...props}><rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeWidth="1.8"/></svg>
}

const navegacion = [
  { id: 'inicio', label: 'Inicio', icon: 'home' as Icono },
  { id: 'lanzamiento', label: 'Mi lanzamiento', icon: 'launch' as Icono },
  { id: 'academy', label: 'Programa', icon: 'academy' as Icono },
  { id: 'comunidad', label: 'Comunidad', icon: 'community' as Icono },
  { id: 'resultados', label: 'Resultados', icon: 'results' as Icono },
]

export default function UsuarioPreview({
  accesoInicial = 'socia',
  permiteCambiarAcceso = true,
  modoDemo = true,
  nombre = 'Lucía',
  avatarUrl = null,
  progreso,
  ventas = 7,
  comisiones = 298,
  modulosCompletados = 2,
  accesoLanzamiento = true,
  estadisticas,
  siguientePaso,
  mostrarSeccionFormacion = true,
}: UsuarioPreviewProps = {}) {
  const [acceso, setAcceso] = useState<Acceso>(accesoInicial)
  const [seccion, setSeccion] = useState('inicio')
  const rutas: Record<string, string> = {
    inicio: '/inicio',
    lanzamiento: '/lanzamiento',
    academy: '/classroom',
    comunidad: '/comunidad',
    resultados: '/resultados',
  }
  const navegacionVisible = acceso === 'gratuita'
    ? [navegacion[0], { id: 'academy', label: 'Primeros pasos', icon: 'academy' as Icono }, navegacion[3]]
    : navegacion.filter(item => item.id !== 'lanzamiento' || accesoLanzamiento)

  const datos = useMemo(() => acceso === 'socia' ? {
    nombre, etiqueta: 'Socia', progreso: progreso ?? 72,
    titulo: 'Tu lanzamiento está en captación',
    bajada: 'Hoy tenés 2 pasos para mantener el ritmo.',
    accion: 'Continuar lanzamiento', href: modoDemo ? '/preview/lanzamiento' : '/lanzamiento',
    metricas: [
      { label: 'Personas en grupo', value: '184' },
      { label: 'En seguimiento', value: '26' },
      { label: 'Ventas', value: String(ventas) },
    ],
  } : {
    nombre, etiqueta: 'Acceso gratuito', progreso: progreso ?? 24,
    titulo: 'Empezá por tu perfil digital',
    bajada: 'Un primer paso simple para ordenar tu camino.',
    accion: 'Completar mi perfil', href: '#modulos',
    metricas: [
      { label: 'Perfil completo', value: '60%' },
      { label: 'Clases vistas', value: String(modulosCompletados) },
      { label: 'Logros guardados', value: '1' },
    ],
  }, [acceso, modulosCompletados, modoDemo, nombre, progreso, ventas])

  const modulosSocia: Modulo[] = [
    ...(accesoLanzamiento ? [{ icon: 'launch' as Icono, title: 'Mi lanzamiento', text: 'Etapas, tareas y números', tone: 'bg-[#EC9BB6]', href: modoDemo ? '/preview/lanzamiento' : '/lanzamiento' }] : []),
    { icon: 'academy' as Icono, title: 'Programa', text: 'Clases y recursos', tone: 'bg-[#F4CAD8]', href: modoDemo ? undefined : '/classroom' },
    { icon: 'results' as Icono, title: 'Mis resultados', text: 'Comisiones y logros', tone: 'bg-[#294A38] text-white', href: modoDemo ? undefined : '/resultados' },
    { icon: 'goals' as Icono, title: 'Mis objetivos', text: 'Metas y plan de ventas', tone: 'bg-[#F4EFEA]', href: modoDemo ? undefined : '/objetivos' },
    { icon: 'community' as Icono, title: 'Comunidad', text: 'Compartí y celebrá', tone: 'bg-white', href: modoDemo ? undefined : '/comunidad' },
    { icon: 'products' as Icono, title: 'Mis productos', text: 'Links para vender', tone: 'bg-[#F4CAD8]', href: modoDemo ? undefined : '/productos' },
  ]

  const modulosGratis: Modulo[] = [
    { icon: 'profile' as Icono, title: 'Mi perfil digital', text: 'Completá tu punto de partida', tone: 'bg-[#EC9BB6]', href: modoDemo ? undefined : '/perfil' },
    { icon: 'academy' as Icono, title: 'Primeros pasos', text: 'Contenido para comenzar', tone: 'bg-[#F4CAD8]', href: modoDemo ? undefined : '/perfil' },
    { icon: 'community' as Icono, title: 'Comunidad', text: 'Historias que inspiran', tone: 'bg-[#294A38] text-white', href: modoDemo ? undefined : '/comunidad' },
  ]

  const modulos = acceso === 'socia' ? modulosSocia : modulosGratis

  return (
    <div className="min-h-screen bg-[#FAF7F3] text-[#171413]">
      <header className="border-b border-[#171413]/6 bg-[#FAF7F3]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-8">
          <Image src="/academy-horizontal-color.png" alt="Socias Digitales Academy" width={220} height={77} className="h-10 w-auto object-contain sm:h-11" priority />
          <div className="flex items-center gap-2">
            {permiteCambiarAcceso ? <div className="hidden rounded-full bg-[#F4EFEA] p-1 sm:flex" aria-label="Cambiar tipo de usuaria">
              {(['gratuita', 'socia'] as Acceso[]).map(item => <button key={item} type="button" onClick={() => setAcceso(item)} className={`rounded-full px-4 py-2 text-xs font-semibold transition ${acceso === item ? 'bg-[#294A38] text-white' : 'text-[#171413]/55'}`}>{item === 'gratuita' ? 'Gratuita' : 'Socia'}</button>)}
            </div> : null}
            {/* La URL del avatar viene del perfil y puede pertenecer al storage configurado por cada instalación. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {avatarUrl ? <img src={avatarUrl} alt="Tu foto de perfil" className="h-10 w-10 rounded-full object-cover"/> : <span className="font-impact flex h-10 w-10 items-center justify-center rounded-full bg-[#F4CAD8] text-xs font-semibold">{nombre.split(' ').map(parte => parte[0]).slice(0, 2).join('').toUpperCase()}</span>}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-73px)] border-r border-[#171413]/6 px-5 py-7 lg:block">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#171413]/38">Mi espacio</p>
          <nav className="mt-5 space-y-1.5">{navegacionVisible.map(item => {
            const bloqueado = acceso === 'gratuita' && ['lanzamiento', 'resultados'].includes(item.id)
            const destino = item.id === 'academy' && acceso === 'gratuita' ? '/perfil' : rutas[item.id]
            return <button key={item.id} type="button" onClick={() => { if (bloqueado) return; if (!modoDemo) window.location.href = destino; else setSeccion(item.id) }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${seccion === item.id ? 'bg-[#F4CAD8] font-semibold' : bloqueado ? 'cursor-default text-[#171413]/24' : 'text-[#171413]/56 hover:bg-[#F4EFEA] hover:text-[#171413]'}`}><Icon name={bloqueado ? 'lock' : item.icon}/><span>{item.label}</span></button>
          })}</nav>
          <a href={modoDemo ? '#' : '/perfil'} className="mt-8 flex items-center gap-3 rounded-[20px] bg-[#294A38] p-4 text-white"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><Icon name="profile"/></span><span><span className="block text-sm font-semibold">Mi perfil</span><span className="mt-0.5 block text-xs text-white/60">Datos y preferencias</span></span></a>
        </aside>

        <main className="min-w-0 px-5 pb-24 pt-6 sm:px-8 sm:pt-8 lg:pb-10">
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#294A38]">{datos.etiqueta}</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Hola, {datos.nombre}.</h1></div>
            {modoDemo ? <a href="/preview/admin" className="hidden rounded-full bg-[#F4EFEA] px-4 py-2 text-xs font-semibold text-[#171413]/55 transition hover:bg-[#F4CAD8] md:block">Vista de Flor</a> : <a href="/perfil" className="hidden rounded-full bg-[#F4EFEA] px-4 py-2 text-xs font-semibold text-[#171413]/55 transition hover:bg-[#F4CAD8] md:block">Editar perfil</a>}
          </div>

          {permiteCambiarAcceso ? <div className="mt-5 flex rounded-full bg-[#F4EFEA] p-1 sm:hidden">
            {(['gratuita', 'socia'] as Acceso[]).map(item => <button key={item} type="button" onClick={() => { setAcceso(item); setSeccion('inicio') }} className={`flex-1 rounded-full px-4 py-2.5 text-xs font-semibold transition ${acceso === item ? 'bg-[#294A38] text-white' : 'text-[#171413]/55'}`}>{item === 'gratuita' ? 'Acceso gratuito' : 'Socia'}</button>)}
          </div> : null}

          <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
            <article className="relative overflow-hidden rounded-[28px] bg-[#F4CAD8] p-6 sm:p-8">
              <div className="relative z-10 max-w-xl"><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#171413]/48">Tu próximo paso</p><h2 className="mt-3 max-w-[540px] font-serif text-3xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-4xl">{siguientePaso?.titulo ?? datos.titulo}</h2><p className="mt-3 text-sm leading-6 text-[#171413]/58">{siguientePaso?.descripcion ?? datos.bajada}</p><a href={siguientePaso?.href ?? datos.href} className="mt-6 inline-flex items-center gap-3 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#203b2d]">{siguientePaso?.boton ?? datos.accion}<Icon name="arrow" className="h-4 w-4"/></a></div>
              <div className="absolute -bottom-16 -right-10 h-48 w-48 rounded-full border-[26px] border-[#EC9BB6]/65" aria-hidden="true"/>
            </article>

            <article className="rounded-[28px] bg-[#294A38] p-6 text-white sm:p-7">
              <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/52">Tu avance</p><p className="font-impact mt-3 text-5xl font-semibold tracking-[-0.05em]">{datos.progreso}%</p></div><div className="relative flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `conic-gradient(#EC9BB6 ${datos.progreso * 3.6}deg, rgba(255,255,255,.14) 0deg)` }}><span className="h-14 w-14 rounded-full bg-[#294A38]"/></div></div>
              <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#EC9BB6]" style={{ width: `${datos.progreso}%` }}/></div>
              <p className="mt-3 text-xs text-white/56">{acceso === 'socia' ? 'Progreso general de tu recorrido' : 'Tu perfil y primeros pasos'}</p>
            </article>
          </section>

          <section className="mt-4 grid grid-cols-3 gap-2.5 sm:gap-4">{(estadisticas ?? datos.metricas).map((metrica, index) => <article key={metrica.label} className={`rounded-[20px] p-4 sm:p-5 ${index === 1 ? 'bg-[#EC9BB6]' : 'bg-[#F4EFEA]'}`}><p className="text-[9px] font-semibold uppercase leading-4 tracking-[0.1em] text-[#171413]/45 sm:text-[10px]">{metrica.label}</p><p className="font-impact mt-2 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">{metrica.value}</p></article>)}</section>

          {acceso === 'socia' && mostrarSeccionFormacion ? <section className="mt-4 grid gap-4 overflow-hidden rounded-[26px] bg-white md:grid-cols-[.72fr_1.28fr]">
            <div className="relative min-h-[220px] overflow-hidden"><Image src="/banner-midia.jpeg" alt="Tu formación en Socias Digitales" fill unoptimized sizes="(min-width: 768px) 32vw, 100vw" className="object-cover"/></div>
            <div className="flex flex-col justify-center p-6 sm:p-8"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Seguí por acá</p><h2 className="mt-2 font-serif text-3xl font-semibold tracking-[-0.035em]">Tu negocio, un paso a la vez.</h2><div className="mt-5 flex flex-wrap gap-2"><a href={modoDemo ? '#' : '/classroom'} className="inline-flex items-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white">Continuar programa <Icon name="arrow" className="h-4 w-4"/></a><a href={modoDemo ? '#' : '/resultados'} className="inline-flex items-center gap-2 rounded-full bg-[#F4EFEA] px-5 py-3 text-sm font-semibold">Cargar resultado</a></div><p className="mt-4 text-xs text-[#171413]/45">{modulosCompletados} módulos completos · USD {comisiones.toLocaleString('es-AR')} en comisiones</p></div>
          </section> : null}

          <section id="modulos" className="mt-9">
            <div className="flex items-end justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#294A38]">Tu espacio</p><h2 className="mt-1.5 font-serif text-3xl font-semibold tracking-[-0.035em]">Todo en su lugar</h2></div><span className="hidden text-xs text-[#171413]/42 sm:block">{modulos.length} accesos</span></div>
            <div className={`mt-5 grid gap-3 sm:grid-cols-2 ${acceso === 'socia' ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>{modulos.map(modulo => <a key={modulo.title} href={modulo.href ?? '#'} onClick={event => { if (!modulo.href) event.preventDefault() }} className={`group min-h-[155px] rounded-[24px] p-5 transition hover:-translate-y-0.5 ${modulo.tone}`}><div className="flex items-start justify-between"><span className={`flex h-11 w-11 items-center justify-center rounded-full ${modulo.tone.includes('text-white') ? 'bg-white/14' : 'bg-[#FAF7F3]/80'}`}><Icon name={modulo.icon}/></span><Icon name="arrow" className="h-4 w-4 opacity-35 transition group-hover:translate-x-1"/></div><h3 className="font-impact mt-5 text-lg font-semibold tracking-[-0.02em]">{modulo.title}</h3><p className="mt-1 text-xs opacity-55">{modulo.text}</p></a>)}</div>
          </section>

          <section className={`mt-9 grid gap-4 ${modoDemo ? 'xl:grid-cols-[1.15fr_.85fr]' : ''}`}>
            <article className="overflow-hidden rounded-[26px] bg-white">
              <div className="grid min-h-[230px] sm:grid-cols-[.8fr_1.2fr]"><div className="relative min-h-[175px] overflow-hidden"><Image src="/banner-comunidad.png" alt="Comunidad Socias Digitales" fill unoptimized sizes="(min-width: 640px) 32vw, 100vw" className="object-cover"/></div><div className="p-6"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Comunidad</p><h2 className="mt-2 font-serif text-2xl font-semibold">Los logros se comparten</h2><p className="mt-3 text-sm leading-6 text-[#171413]/55">Celebrá tus avances y descubrí lo que están construyendo otras socias.</p><a href={modoDemo ? '#' : '/comunidad'} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#294A38]">Ir al muro <Icon name="arrow" className="h-4 w-4"/></a></div></div>
            </article>
            {modoDemo ? <article className="rounded-[26px] bg-[#F4EFEA] p-6">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#171413]/42">Esta semana</p><h2 className="mt-2 font-serif text-2xl font-semibold">Tu agenda</h2></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#294A38]"><Icon name="calendar"/></span></div>
              <div className="mt-5 space-y-2"><div className="rounded-xl bg-white px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Sala de acompañamiento</span><strong className="font-impact text-xs">JUE 19:00</strong></div></div><div className="rounded-xl bg-white/60 px-4 py-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Revisar avance semanal</span><strong className="font-impact text-xs">VIE</strong></div></div></div>
            </article> : null}
          </section>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#171413]/8 bg-[#FAF7F3]/95 px-3 pb-[max(.6rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" aria-label="Navegación principal">
        <div className="mx-auto flex max-w-md justify-around">{navegacionVisible.slice(0, 4).map(item => { const bloqueado = acceso === 'gratuita' && item.id === 'lanzamiento'; const destino = item.id === 'academy' && acceso === 'gratuita' ? '/perfil' : rutas[item.id]; return <button key={item.id} type="button" onClick={() => { if (bloqueado) return; if (!modoDemo) window.location.href = destino; else setSeccion(item.id) }} className={`flex min-w-[68px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[9px] font-semibold ${seccion === item.id ? 'text-[#294A38]' : bloqueado ? 'text-[#171413]/20' : 'text-[#171413]/42'}`}><Icon name={bloqueado ? 'lock' : item.icon} className="h-5 w-5"/><span>{item.label === 'Mi lanzamiento' ? 'Lanzamiento' : item.label}</span></button> })}</div>
      </nav>
    </div>
  )
}
