import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { esAdministradora } from '@/lib/module-guard'
import { redirect } from 'next/navigation'
import ProductosCliente from './ProductosCliente'

export default async function ProductosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await esAdministradora(user.id)) return <ModuleLocked id="productos" />

  const [{ data: productos }, { data: misLinks }, { data: config }] = await Promise.all([
    supabase.from('productos').select('*').eq('activo', true).order('orden'),
    supabase.from('links_afiliadas').select('*').eq('afiliada_id', user.id),
    supabase.from('configuracion').select('*'),
  ])

  const cotizacion = Number(config?.find(c => c.clave === 'cotizacion_dolar')?.valor ?? 1000)

  return <ProductosCliente productos={productos ?? []} misLinks={misLinks ?? []} userId={user.id} cotizacion={cotizacion} />
}
