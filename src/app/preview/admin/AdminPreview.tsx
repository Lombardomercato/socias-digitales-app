'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'

type Nivel = 'gratuita' | 'socia' | 'admin'
type Estado = 'activa' | 'pendiente' | 'inactiva'

interface UsuarioDemo {
  id: number
  nombre: string
  email: string
  pais: string
  nivel: Nivel
  estado: Estado
  actividad: string
  progreso: number
  ventas: number
}

const USUARIAS: UsuarioDemo[] = [
  { id: 1, nombre: 'Lucía Fernández', email: 'lucia@ejemplo.com', pais: 'Argentina', nivel: 'socia', estado: 'activa', actividad: 'Hoy', progreso: 72, ventas: 8 },
  { id: 2, nombre: 'Mariana Costa', email: 'mariana@ejemplo.com', pais: 'Uruguay', nivel: 'gratuita', estado: 'activa', actividad: 'Ayer', progreso: 24, ventas: 0 },
  { id: 3, nombre: 'Camila Rojas', email: 'camila@ejemplo.com', pais: 'Chile', nivel: 'socia', estado: 'pendiente', actividad: 'Hace 4 días', progreso: 48, ventas: 3 },
  { id: 4, nombre: 'Valeria Gómez', email: 'valeria@ejemplo.com', pais: 'Argentina', nivel: 'socia', estado: 'activa', actividad: 'Hoy', progreso: 91, ventas: 14 },
  { id: 5, nombre: 'Paula Méndez', email: 'paula@ejemplo.com', pais: 'México', nivel: 'gratuita', estado: 'inactiva', actividad: 'Hace 32 días', progreso: 12, ventas: 0 },
  { id: 6, nombre: 'Sofía Benítez', email: 'sofia@ejemplo.com', pais: 'Argentina', nivel: 'gratuita', estado: 'pendiente', actividad: 'Hace 7 días', progreso: 8, ventas: 0 },
]

const NIVEL_LABEL: Record<Nivel, string> = { gratuita: 'Gratuita', socia: 'Socia', admin: 'Admin' }
const ESTADO_LABEL: Record<Estado, string> = { activa: 'Activa', pendiente: 'Pendiente', inactiva: 'Inactiva' }

function Icon({ name, className = 'h-5 w-5' }: { name: string; className?: string }) {
  if (name === 'users') return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8"/><circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.8"/><path d="M3.5 19c.5-3.5 2.4-5.2 5.5-5.2s5 1.7 5.5 5.2M14.5 14.3c2.9-.8 5.2.7 5.8 3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'launch') return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="5" cy="7" r="2" fill="currentColor"/><circle cx="12" cy="3" r="2" fill="currentColor"/><circle cx="19" cy="10" r="2" fill="currentColor"/></svg>
  if (name === 'community') return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5h14v11H9l-4 3V5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 9h6M9 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'content') return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" stroke="currentColor" strokeWidth="1.8"/><path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H20" stroke="currentColor" strokeWidth="1.8"/></svg>
  if (name === 'results') return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="m14 10 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'search') return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  if (name === 'alert') return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4 21 20H3L12 4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 9v5m0 3v.1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
  return <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 13h6V4H4v9Zm10 7h6v-9h-6v9ZM4 20h6v-3H4v3Zm10-13h6V4h-6v3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
}

function iniciales(nombre: string) {
  return nombre.split(' ').map(p => p[0]).slice(0, 2).join('')
}

export default function AdminPreview() {
  const [seccion, setSeccion] = useState('inicio')
  const [busqueda, setBusqueda] = useState('')
  const [nivel, setNivel] = useState<'todas' | Nivel>('todas')
  const [seleccionada, setSeleccionada] = useState<UsuarioDemo | null>(null)
  const [usuarios, setUsuarios] = useState(USUARIAS)

  const filtradas = useMemo(() => usuarios.filter(usuario => {
    const texto = `${usuario.nombre} ${usuario.email} ${usuario.pais}`.toLowerCase()
    return texto.includes(busqueda.toLowerCase()) && (nivel === 'todas' || usuario.nivel === nivel)
  }), [busqueda, nivel, usuarios])

  function cambiarNivel(nuevoNivel: Nivel) {
    if (!seleccionada) return
    setUsuarios(actuales => actuales.map(item => item.id === seleccionada.id ? { ...item, nivel: nuevoNivel } : item))
    setSeleccionada(actual => actual ? { ...actual, nivel: nuevoNivel } : null)
  }

  const navegacion = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'usuarios', label: 'Usuarias', icon: 'users' },
    { id: 'lanzamientos', label: 'Lanzamientos', icon: 'launch' },
    { id: 'comunidad', label: 'Comunidad', icon: 'community' },
    { id: 'contenido', label: 'Contenido', icon: 'content' },
    { id: 'resultados', label: 'Resultados', icon: 'results' },
  ]

  return (
    <div className="min-h-screen bg-[#FAF7F3] text-[#171413]">
      <header className="border-b border-[#171413]/6 bg-[#FAF7F3]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 sm:px-8">
          <Image src="/academy-horizontal-color.png" alt="Socias Digitales Academy" width={220} height={77} className="h-11 w-auto object-contain" priority />
          <div className="flex items-center gap-3"><span className="hidden text-xs text-[#171413]/48 sm:block">Vista de aprobación</span><a href="/preview/lanzamiento" className="rounded-full bg-[#F4EFEA] px-4 py-2 text-xs font-semibold transition hover:bg-[#F4CAD8]">Ver lanzamiento</a></div>
        </div>
      </header>

      <nav className="overflow-x-auto border-b border-[#171413]/6 px-5 py-2 lg:hidden" aria-label="Secciones del panel">
        <div className="flex min-w-max gap-1.5">{navegacion.map(item => <button key={item.id} type="button" onClick={() => setSeccion(item.id)} className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition ${seccion === item.id ? 'bg-[#294A38] text-white' : 'bg-[#F4EFEA] text-[#171413]/60'}`}><Icon name={item.icon} className="h-4 w-4"/><span>{item.label}</span></button>)}</div>
      </nav>

      <div className="mx-auto grid max-w-[1400px] lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="hidden min-h-[calc(100vh-76px)] border-r border-[#171413]/6 px-5 py-7 lg:block">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#171413]/40">Panel de Flor</p>
          <nav className="mt-5 space-y-1.5">{navegacion.map(item => <button key={item.id} type="button" onClick={() => setSeccion(item.id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${seccion === item.id ? 'bg-[#F4CAD8] font-semibold' : 'text-[#171413]/58 hover:bg-[#F4EFEA] hover:text-[#171413]'}`}><Icon name={item.icon} /><span>{item.label}</span></button>)}</nav>
        </aside>

        <main className="min-w-0 px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#294A38]">Vista general</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Hola, Flor.</h1></div>
            <button type="button" className="w-fit rounded-full bg-[#294A38] px-5 py-2.5 text-sm font-semibold text-white">Invitar usuaria</button>
          </div>

          <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Usuarias', value: '286', note: '+18 este mes', tone: 'bg-[#F4CAD8]' },
              { label: 'Socias activas', value: '74', note: '26% del total', tone: 'bg-[#EC9BB6]' },
              { label: 'Acceso gratuito', value: '212', note: '34 listas para avanzar', tone: 'bg-[#F4EFEA]' },
              { label: 'Actividad 7 días', value: '61%', note: '+6 puntos', tone: 'bg-[#294A38] text-white' },
            ].map(kpi => <article key={kpi.label} className={`rounded-[22px] p-5 ${kpi.tone}`}><p className="text-[10px] font-semibold uppercase tracking-[0.16em] opacity-55">{kpi.label}</p><p className="font-impact mt-3 text-4xl font-bold tracking-[-0.04em]">{kpi.value}</p><p className="mt-2 text-xs font-medium opacity-55">{kpi.note}</p></article>)}
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[24px] bg-[#F4EFEA] p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#171413]/45">Accesos</p><h2 className="mt-1.5 font-serif text-2xl font-semibold">Composición de la comunidad</h2></div><span className="font-impact text-sm font-semibold text-[#294A38]">286</span></div>
              <div className="mt-6 flex h-5 overflow-hidden rounded-full bg-white"><div className="bg-[#294A38]" style={{ width: '26%' }} /><div className="bg-[#EC9BB6]" style={{ width: '74%' }} /></div>
              <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-white px-4 py-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#294A38]"/><span className="text-xs font-semibold">Socias</span></div><p className="font-impact mt-2 text-2xl font-bold">74</p></div><div className="rounded-xl bg-white px-4 py-3"><div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-[#EC9BB6]"/><span className="text-xs font-semibold">Gratuitas</span></div><p className="font-impact mt-2 text-2xl font-bold">212</p></div></div>
            </div>

            <div className="rounded-[24px] bg-[#F4CAD8] p-5 sm:p-6">
              <div className="flex items-start justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#171413]/50">Requieren atención</p><p className="font-impact mt-2 text-4xl font-bold">12</p></div><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#FAF7F3]/75 text-[#294A38]"><Icon name="alert" /></span></div>
              <div className="mt-5 space-y-2 text-sm"><div className="flex items-center justify-between rounded-xl bg-[#FAF7F3]/70 px-4 py-3"><span>Sin actividad +30 días</span><strong className="font-impact">8</strong></div><div className="flex items-center justify-between rounded-xl bg-[#FAF7F3]/70 px-4 py-3"><span>Perfil incompleto</span><strong className="font-impact">4</strong></div></div>
            </div>
          </section>

          <section className="mt-4 rounded-[24px] bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#171413]/45">Usuarias</p><h2 className="mt-1 font-serif text-2xl font-semibold">Acceso y actividad</h2></div>
              <div className="flex flex-col gap-2 sm:flex-row"><label className="flex min-w-[240px] items-center gap-2 rounded-full bg-[#F4EFEA] px-4 py-2.5 text-[#171413]/45"><Icon name="search" className="h-4 w-4"/><input value={busqueda} onChange={event => setBusqueda(event.target.value)} placeholder="Buscar nombre, email o país" className="w-full bg-transparent text-sm text-[#171413] outline-none placeholder:text-[#171413]/38"/></label><div className="flex rounded-full bg-[#F4EFEA] p-1">{(['todas', 'gratuita', 'socia'] as const).map(item => <button key={item} type="button" onClick={() => setNivel(item)} className={`rounded-full px-3 py-2 text-xs font-semibold capitalize transition ${nivel === item ? 'bg-[#294A38] text-white' : 'text-[#171413]/55'}`}>{item === 'todas' ? 'Todas' : NIVEL_LABEL[item]}</button>)}</div></div>
            </div>

            <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="text-left text-[10px] font-semibold uppercase tracking-[0.14em] text-[#171413]/40"><th className="pb-3">Usuaria</th><th className="pb-3">Acceso</th><th className="pb-3">Estado</th><th className="pb-3">Actividad</th><th className="pb-3">Progreso</th><th className="pb-3 text-right">Ventas</th></tr></thead><tbody className="divide-y divide-[#171413]/6">{filtradas.map(usuario => <tr key={usuario.id} onClick={() => setSeleccionada(usuario)} className="cursor-pointer transition hover:bg-[#F4CAD8]/25"><td className="py-3.5 pr-4"><div className="flex items-center gap-3"><span className="font-impact flex h-9 w-9 items-center justify-center rounded-full bg-[#F4CAD8] text-xs font-semibold">{iniciales(usuario.nombre)}</span><div><p className="font-semibold">{usuario.nombre}</p><p className="mt-0.5 text-xs text-[#171413]/42">{usuario.email}</p></div></div></td><td className="py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${usuario.nivel === 'socia' ? 'bg-[#EC9BB6]/55' : 'bg-[#F4EFEA]'}`}>{NIVEL_LABEL[usuario.nivel]}</span></td><td className="py-3.5"><span className="flex items-center gap-2 text-xs font-medium"><span className={`h-2 w-2 rounded-full ${usuario.estado === 'activa' ? 'bg-[#294A38]' : usuario.estado === 'pendiente' ? 'bg-[#EC9BB6]' : 'bg-[#171413]/20'}`}/>{ESTADO_LABEL[usuario.estado]}</span></td><td className="py-3.5 text-xs text-[#171413]/55">{usuario.actividad}</td><td className="py-3.5"><div className="flex items-center gap-2"><div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#F4EFEA]"><div className="h-full rounded-full bg-[#294A38]" style={{ width: `${usuario.progreso}%` }}/></div><span className="font-impact text-xs font-semibold">{usuario.progreso}%</span></div></td><td className="py-3.5 text-right font-impact font-semibold">{usuario.ventas}</td></tr>)}</tbody></table></div>
            {filtradas.length === 0 ? <p className="py-10 text-center text-sm text-[#171413]/45">No hay resultados.</p> : null}
          </section>
        </main>
      </div>

      {seleccionada ? <div className="fixed inset-0 z-50 flex justify-end bg-[#171413]/32" onClick={() => setSeleccionada(null)}><aside className="h-full w-full max-w-md overflow-y-auto bg-[#FAF7F3] p-6 shadow-2xl" onClick={event => event.stopPropagation()}><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#171413]/45">Ficha de usuaria</p><button type="button" onClick={() => setSeleccionada(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4EFEA] text-xl">×</button></div><div className="mt-7 flex items-center gap-4"><span className="font-impact flex h-16 w-16 items-center justify-center rounded-full bg-[#EC9BB6] text-lg font-bold">{iniciales(seleccionada.nombre)}</span><div><h2 className="font-serif text-3xl font-semibold">{seleccionada.nombre}</h2><p className="mt-1 text-sm text-[#171413]/48">{seleccionada.email}</p></div></div><div className="mt-7 grid grid-cols-3 gap-2">{[{label:'Progreso',value:`${seleccionada.progreso}%`},{label:'Ventas',value:seleccionada.ventas},{label:'Actividad',value:seleccionada.actividad}].map(item => <div key={item.label} className="rounded-xl bg-[#F4EFEA] p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-[#171413]/42">{item.label}</p><p className="font-impact mt-2 text-lg font-bold">{item.value}</p></div>)}</div><div className="mt-7"><p className="text-xs font-semibold">Nivel de acceso</p><div className="mt-3 grid grid-cols-3 gap-2">{(['gratuita','socia','admin'] as Nivel[]).map(item => <button key={item} type="button" onClick={() => cambiarNivel(item)} className={`rounded-xl px-3 py-3 text-xs font-semibold transition ${seleccionada.nivel === item ? 'bg-[#294A38] text-white' : 'bg-[#F4EFEA]'}`}>{NIVEL_LABEL[item]}</button>)}</div><p className="mt-3 text-xs leading-5 text-[#171413]/45">En esta vista de aprobación el cambio es solamente visual.</p></div><div className="mt-7 rounded-[20px] bg-[#F4CAD8] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#171413]/45">Próximo paso</p><p className="mt-2 text-sm font-semibold">{seleccionada.estado === 'inactiva' ? 'Revisar por qué dejó de ingresar.' : seleccionada.nivel === 'gratuita' ? 'Lista para conocer la propuesta de Socia.' : 'Acompañar su avance y sus resultados.'}</p></div></aside></div> : null}
    </div>
  )
}
