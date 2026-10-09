import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdminSupabaseConfigured } from '@/lib/supabase/admin'
import AdminDesafio from './AdminDesafio'

export default async function AdminDesafioPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol !== 'admin') redirect('/inicio')
  if (!isAdminSupabaseConfigured()) return <main className="p-8">Falta configurar el acceso seguro del panel.</main>

  const admin = createAdminClient()
  const [{ data: perfiles }, { data: users }, { data: accesos, error: accesosError }] = await Promise.all([
    admin.from('perfiles').select('id, nombre, rol, tipo_usuario, desafio_socias_estado, created_at, desafio_socias_habilitada, desafio_socias_bienvenida_enviada_at').eq('tipo_usuario', 'desafio').order('created_at', { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from('accesos_estrategia').select('usuaria_id, habilitada'),
  ])
  if (accesosError) return <main className="p-8">No pudimos consultar los accesos a Estrategia. Intentá nuevamente.</main>
  const estrategias = new Map((accesos ?? []).map(item => [item.usuaria_id, item.habilitada]))
  const emails = new Map((users?.users ?? []).map(item => [item.id, item.email ?? '']))
  const inscriptas = (perfiles ?? []).map(item => ({ ...item, email: emails.get(item.id) ?? '', estrategia_habilitada: estrategias.get(item.id) ?? false }))

  return <AdminDesafio inscriptas={inscriptas} />
}
