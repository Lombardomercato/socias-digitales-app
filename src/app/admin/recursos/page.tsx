import { redirect } from 'next/navigation'
import { autorizarRecursosCrm, leerCatalogoCrm, leerContactosCrm } from '@/lib/resource-crm-server'
import RecursosCrmPanel from './RecursosCrmPanel'
export default async function RecursosPage() {
  const auth = await autorizarRecursosCrm()
  if ('error' in auth) {
    if (auth.error.status === 401) redirect('/login?next=%2Fadmin%2Frecursos')
    if (auth.error.status === 403) redirect('/inicio')
    return <main className="mx-auto max-w-4xl p-5"><h1 className="text-3xl">Recursos y contactos</h1><p role="alert" className="mt-4">{auth.error.mensaje}</p><a href="/admin/recursos" className="mt-4 inline-flex min-h-11 items-center underline">Reintentar</a></main>
  }
  const [catalogo, contactos] = await Promise.all([leerCatalogoCrm(auth), leerContactosCrm(auth)])
  return <RecursosCrmPanel catalogoInicial={catalogo} contactosIniciales={contactos} />
}
