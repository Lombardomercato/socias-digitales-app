import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavigationIcon from '@/components/NavigationIcon'
import BandejaAvisos from './BandejaAvisos'

export default async function NotificacionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fnotificaciones')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  if (perfil?.rol === 'admin') redirect('/admin/notificaciones')
  const [{ data: avisos, error }, { data: lecturas, error: errorLecturas }] = await Promise.all([
    supabase.from('avisos').select('id,titulo,mensaje,destino,audiencias,publicado,archivado,created_at').eq('publicado', true).eq('archivado', false).order('created_at', { ascending: false }).limit(100),
    supabase.from('avisos_lecturas').select('aviso_id').eq('usuaria_id', user.id),
  ])
  const leidos = new Set((lecturas ?? []).map(item => item.aviso_id))
  return <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
    <Link href="/inicio" className="text-sm font-medium text-[#294A38]">← Mi espacio</Link>
    <div className="mt-7 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#F4CAD8] text-[#294A38]"><NavigationIcon name="notificaciones" /></span><h1 className="text-4xl">Tus notificaciones</h1></div>
    <BandejaAvisos userId={user.id} iniciales={(avisos ?? []).map(aviso => ({ ...aviso, leido: leidos.has(aviso.id) }))} errorCarga={Boolean(error || errorLecturas)} />
  </main>
}
