import Link from 'next/link'
import Image from 'next/image'
import ArrowIcon from '@/components/ArrowIcon'
import type { ReactNode } from 'react'

const focus = 'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38]'

export default function ResourceLibraryFrame({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh bg-[#F4EFEA] text-[#211C19]">
    <header data-student-section-header="true" className="border-b border-[#E7DDD5] bg-[#FAF7F3]"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
      <Link href="/inicio" aria-label="Socias Digitales, volver a Inicio" className={`inline-flex min-h-11 items-center ${focus}`}><Image src="/academy-horizontal-color.png" alt="Socias Digitales Academy" width={3922} height={1366} sizes="130px" className="h-9 w-auto object-contain sm:h-11" /></Link>
      <Link href="/inicio" className={`inline-flex min-h-11 items-center gap-2 text-xs font-medium text-[#294A38] sm:text-sm ${focus}`}>Mi espacio <ArrowIcon /></Link>
    </div></header>
    <div className="mx-auto max-w-6xl px-5 pb-28 pt-8 sm:px-8 sm:pt-12">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Tu biblioteca</p>
      <h1 className="mt-2 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Materiales de tus clases</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746A64]">Documentos y enlaces para llevar lo que aprendés a la práctica.</p>
      <nav aria-label="Contenido del programa" className="mb-6 mt-6 flex flex-wrap gap-2">
        <Link href="/classroom" className={`inline-flex min-h-11 items-center rounded-full border border-[#E7DDD5] bg-[#FFFDFA] px-5 py-3 text-sm font-medium text-[#294A38] ${focus}`}>Clases</Link>
        <Link href="/clases/materiales" prefetch={false} aria-current="page" className={`inline-flex min-h-11 items-center rounded-full border border-[#294A38] bg-[#294A38] px-5 py-3 text-sm font-semibold text-white ${focus}`}>Materiales</Link>
      </nav>
      {children}
    </div>
  </main>
}

export function ResourceLibraryLoading() {
  return <section role="status" aria-live="polite" className="rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-6"><p className="text-sm font-semibold">Reuniendo tus materiales…</p><p className="mt-2 text-sm leading-6 text-[#746A64]">Buscando los documentos y enlaces de tus clases disponibles.</p></section>
}
