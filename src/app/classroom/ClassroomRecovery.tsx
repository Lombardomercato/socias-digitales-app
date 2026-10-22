'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

export default function ClassroomRecovery({ esAdmin }: { esAdmin: boolean }) {
  const router = useRouter()
  const [pendiente, reintentar] = useTransition()
  return <main data-platform-role={esAdmin ? 'admin' : 'member'} className="min-h-screen bg-[#F4EFEA] px-5 py-10 text-[#211C19] sm:px-8 sm:py-16">
    <section role="alert" aria-busy={pendiente} className="mx-auto max-w-2xl rounded-[24px] border border-[#E7DDD5] bg-[#FAF7F3] p-6 sm:p-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#294A38]">Tus clases</p>
      <h1 className="mt-3 font-serif text-3xl font-semibold leading-tight tracking-[-0.035em] sm:text-4xl">No pudimos abrir la biblioteca.</h1>
      <p className="mt-4 text-sm leading-6 text-[#746A64]">Intentá nuevamente para ver tus clases y materiales. Tu avance sigue guardado en tu cuenta.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" disabled={pendiente} onClick={() => reintentar(() => router.refresh())} className="min-h-11 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{pendiente ? 'Cargando clases…' : 'Reintentar'}</button>
        <Link href={esAdmin ? '/admin' : '/inicio'} className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#D8CFC8] px-5 py-3 text-sm font-semibold text-[#294A38]">{esAdmin ? 'Volver al panel de Flor' : 'Volver a mi espacio'}</Link>
      </div>
      {pendiente && <p role="status" className="mt-3 text-sm text-[#746A64]">Estamos consultando tu biblioteca.</p>}
    </section>
  </main>
}
