import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { permisoResultados } from '@/lib/results-server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import ResultadosCliente from './ResultadosCliente'

export default async function ResultadosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const acceso = await permisoResultados(supabase, user.id)
  if (acceso.error) return <main className="min-h-screen bg-[#F4EFEA] p-8"><p role="alert">No pudimos comprobar tu acceso. Intentá nuevamente.</p><a href="/inicio">Volver a mi espacio</a></main>
  if (!acceso.permitido) return <ModuleLocked id="resultados" />
  if (acceso.admin) redirect('/admin/resultados')

  const [{ data: misResultados, error: errorResultados, count: totalResultados }, { data: productos, error: errorProductos }] = await Promise.all([
    supabase
      .from('resultados')
      .select('*', { count: 'exact' })
      .eq('alumna_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000),
    isAdminSupabaseConfigured() ? createAdminClient()
      .from('productos')
      .select('id, nombre, tipo')
      .eq('activo', true)
      .order('nombre') : Promise.resolve({ data: [], error: new Error('Servicio no configurado') }),
  ])

  // El cliente recibe presencia de captura, nunca una URL pública antigua.
  const resultados = (misResultados ?? []).map(r => ({ ...r, archivo_url: r.archivo_url ? 'privada' : null }))
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const periodoInicial = `${partes.find(p => p.type === 'year')?.value}-${partes.find(p => p.type === 'month')?.value}`
  return <ResultadosCliente misResultados={resultados} productos={productos ?? []} periodoInicial={periodoInicial} errorCarga={Boolean(errorResultados || errorProductos || totalResultados === null || (totalResultados ?? 0) > resultados.length)} />
}
