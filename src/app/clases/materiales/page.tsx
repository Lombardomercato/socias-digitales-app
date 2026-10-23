import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { autorizarBibliotecaRecursos } from '@/lib/resource-library-access'
import { leerBibliotecaRecursos } from '@/lib/resource-library-server'
import ResourceLibraryClient from '@/components/ResourceLibraryClient'
import ResourceLibraryFrame, { ResourceLibraryLoading } from './ResourceLibraryFrame'
import type { PerfilClases } from '@/lib/class-access'

async function Biblioteca({ perfil }: { perfil: PerfilClases }) {
  const inicial = await leerBibliotecaRecursos(perfil)
  return <ResourceLibraryClient inicial={inicial} />
}

export default async function ResourceLibraryPage() {
  const auth = await autorizarBibliotecaRecursos()
  if ('error' in auth) {
    if (auth.error.status === 401) redirect('/login?next=%2Fclases%2Fmateriales')
    if (auth.error.status === 403) redirect('/admin/classroom')
    return <ResourceLibraryFrame><section role="alert" className="rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-6"><p className="text-sm leading-6">{auth.error.mensaje}</p><Link href="/clases/materiales" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white">Reintentar</Link></section></ResourceLibraryFrame>
  }
  return <ResourceLibraryFrame><Suspense fallback={<ResourceLibraryLoading />}><Biblioteca perfil={auth.perfil} /></Suspense></ResourceLibraryFrame>
}
