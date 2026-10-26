import Link from 'next/link'
import ModuleLocked from '@/components/ModuleLocked'
import { autorizarComunidad, leerComunidad } from '@/lib/community-server'
import { redirect } from 'next/navigation'
import ComunidadCliente from './ComunidadCliente'

export default async function ComunidadPage() {
  const acceso = await autorizarComunidad()
  if ('error' in acceso) {
    if (acceso.error.status === 401) redirect('/login')
    if (acceso.error.status === 403) return <ModuleLocked id="comunidad" />
    return <main className="min-h-screen bg-[#F4EFEA] px-5 py-12"><section className="mx-auto max-w-xl rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-6"><h1 className="font-serif text-3xl">No pudimos comprobar tu acceso.</h1><p role="alert" className="mt-4 text-sm leading-6">{acceso.error.mensaje}</p><Link href="/inicio" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#294A38] px-5 text-sm font-semibold text-white">Volver a Inicio</Link></section></main>
  }
  if (acceso.admin) redirect('/admin/comunidad')
  return <ComunidadCliente inicial={await leerComunidad(acceso)} miPerfil={{ nombre: acceso.perfil.nombre, avatar_url: null }} />
}
