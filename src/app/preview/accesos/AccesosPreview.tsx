'use client'

import Image from 'next/image'
import { useState } from 'react'
import { ACCESOS, type NivelAcceso } from '@/lib/access'

const NIVELES: NivelAcceso[] = ['gratuito', 'desafio', 'socia', 'admin']

function RoleIcon({ nivel }: { nivel: NivelAcceso }) {
  if (nivel === 'admin') return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 20 7v5c0 4.7-3.2 7.8-8 9-4.8-1.2-8-4.3-8-9V7l8-4Z" stroke="currentColor" strokeWidth="1.8" /><path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
  if (nivel === 'socia') return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><circle cx="17" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 19c.5-3.5 2.4-5.2 5.5-5.2s5 1.7 5.5 5.2M14.5 14.3c2.9-.8 5.2.7 5.8 3.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" /><path d="M5.5 20c.6-4.4 2.8-6.5 6.5-6.5s5.9 2.1 6.5 6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

function ModuleIcon({ id }: { id: string }) {
  const common = 'h-5 w-5'
  if (id === 'lanzamiento') return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 19V9m7 10V5m7 14v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /><circle cx="5" cy="7" r="2" fill="currentColor" /><circle cx="12" cy="3" r="2" fill="currentColor" /><circle cx="19" cy="10" r="2" fill="currentColor" /></svg>
  if (['resultados', 'objetivos'].includes(id)) return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" /><path d="m14 10 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  if (['comunidad', 'socias'].includes(id)) return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" /><circle cx="17" cy="9" r="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3.5 19c.5-3.5 2.4-5.2 5.5-5.2s5 1.7 5.5 5.2M15 14.5c2.7-.5 4.6.9 5.2 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  if (['programa', 'contenido'].includes(id)) return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v16H7.5A2.5 2.5 0 0 0 5 21.5v-16Z" stroke="currentColor" strokeWidth="1.8" /><path d="M5 18.5A2.5 2.5 0 0 1 7.5 16H20" stroke="currentColor" strokeWidth="1.8" /></svg>
  if (id === 'avisos') return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 5 2 5 2 7H4.5c0-2 2-2 2-7Z" stroke="currentColor" strokeWidth="1.8" /><path d="M10 20h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
  return <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" /><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}

export default function AccesosPreview() {
  const [nivel, setNivel] = useState<NivelAcceso>('gratuito')
  const acceso = ACCESOS[nivel]

  return (
    <div className="min-h-screen bg-[#FAF7F3] text-[#171413]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Image src="/academy-horizontal-color.png" alt="Socias Digitales Academy" width={220} height={77} className="h-12 w-auto object-contain sm:h-14" priority />
        <a href="/preview/lanzamiento" className="rounded-full bg-[#F4EFEA] px-4 py-2 text-xs font-medium transition hover:bg-[#F4CAD8]">Ver lanzamiento</a>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-12 pt-6 sm:px-8 sm:pt-10">
        <div className="mb-4 text-[10px] uppercase tracking-[0.18em] text-[#171413]/45">Vista de arquitectura · datos de muestra</div>

        <section className="grid overflow-hidden rounded-[30px] bg-[#294A38] text-[#FAF7F3] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="flex min-h-[330px] flex-col justify-between px-7 py-8 sm:px-10 sm:py-10">
            <p className="text-[10px] uppercase tracking-[0.26em] text-[#F4CAD8]">Accesos</p>
            <h1 className="max-w-xl font-serif text-5xl leading-[0.94] tracking-[-0.045em] sm:text-6xl">Tres formas de vivir <span className="italic text-[#F4CAD8]">Socias Digitales.</span></h1>
          </div>
          <div className="relative min-h-[300px] overflow-hidden lg:min-h-full"><img src="/banner-midia.jpeg" alt="Mujer trabajando en su negocio digital" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-r from-[#294A38]/35 via-transparent to-transparent" /></div>
        </section>

        <section className="mt-5 rounded-[26px] bg-[#F4EFEA] p-3" aria-label="Elegir nivel de acceso">
          <div className="grid gap-2 sm:grid-cols-3">
            {NIVELES.map(item => {
              const activa = item === nivel
              const data = ACCESOS[item]
              return <button key={item} type="button" onClick={() => setNivel(item)} aria-pressed={activa} className={`flex min-h-20 items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${activa ? 'bg-[#EC9BB6] text-[#171413]' : 'hover:bg-[#FAF7F3] text-[#171413]/60'}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${activa ? 'bg-[#FAF7F3]/75' : 'bg-[#FAF7F3]'}`}><span className="h-6 w-6"><RoleIcon nivel={item} /></span></span><span><span className="block text-sm font-medium">{data.nombre}</span><span className="mt-1 block text-[10px] uppercase tracking-[0.13em] opacity-55">{data.etiqueta}</span></span></button>
            })}
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-[26px] bg-white p-5 sm:p-7">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-serif text-4xl tracking-[-0.04em]">{acceso.nombre}</h2><p className="mt-2 text-sm text-[#171413]/48">{acceso.resumen}</p></div><span className="w-fit rounded-full bg-[#F4CAD8] px-3 py-1.5 text-[10px] uppercase tracking-[0.14em]">{acceso.etiqueta}</span></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {acceso.modulos.map(modulo => <div key={modulo.id} className="group rounded-2xl bg-[#FAF7F3] p-4 transition hover:bg-[#F4CAD8]/55"><div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4CAD8] text-[#294A38]"><ModuleIcon id={modulo.id} /></span><div><h3 className="text-sm font-medium">{modulo.nombre}</h3><p className="mt-1 text-xs leading-5 text-[#171413]/48">{modulo.descripcion}</p></div></div></div>)}
            </div>
          </div>

          <aside className="relative min-h-[300px] overflow-hidden rounded-[26px] bg-[#F4CAD8]">
            <img src="/banner-comunidad.png" alt="Comunidad Socias Digitales" className="absolute inset-0 h-full w-full object-cover object-[42%_center]" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#171413]/80 to-transparent px-6 pb-6 pt-20 text-white"><p className="font-serif text-3xl italic">Tu espacio.</p><p className="mt-1 text-xs tracking-[0.08em] text-white/70">Personal, simple, propio.</p></div>
          </aside>
        </section>
      </main>
    </div>
  )
}
