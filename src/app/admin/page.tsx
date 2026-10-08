import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol')
    .eq('id', user.id)
    .single()

  if (perfil?.rol !== 'admin') redirect('/perfil')

  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

  const [
    { data: alumnas },
    { data: pagosDelMes },
    { data: todosLosPagos },
    { data: ventasAfiliadas },
  ] = await Promise.all([
    supabase.from('perfiles').select('*').order('created_at', { ascending: false }),
    supabase.from('pagos').select('monto').gte('fecha', inicioMes).eq('estado', 'completado'),
    supabase.from('pagos').select('monto').eq('estado', 'completado'),
    supabase.from('ventas_afiliadas').select('*').gte('fecha', inicioMes),
  ])

  const stats = {
    totalAlumnas: alumnas?.length ?? 0,
    activas: alumnas?.filter(a => a.estado === 'activa').length ?? 0,
    nuevasHoy: alumnas?.filter(a => a.created_at >= inicioHoy).length ?? 0,
    nuevasMes: alumnas?.filter(a => a.created_at >= inicioMes).length ?? 0,
    canceladas: alumnas?.filter(a => a.estado === 'cancelada').length ?? 0,
    pausadas: alumnas?.filter(a => a.estado === 'pausada').length ?? 0,
    mrr: pagosDelMes?.reduce((acc, p) => acc + Number(p.monto), 0) ?? 0,
    facturacionHistorica: todosLosPagos?.reduce((acc, p) => acc + Number(p.monto), 0) ?? 0,
    afiliadasActivas: alumnas?.filter(a => a.rol === 'afiliada').length ?? 0,
    ventasMes: ventasAfiliadas?.length ?? 0,
    comisionesMes: ventasAfiliadas?.reduce((acc, v) => acc + Number(v.comision), 0) ?? 0,
    solicitudesDesafioPendientes: alumnas?.filter(a => a.rol !== 'admin' && a.tipo_usuario === 'desafio' && a.desafio_socias_estado === 'pendiente' && !a.desafio_socias_habilitada).length ?? 0,
  }

  const retencion = stats.totalAlumnas > 0
    ? Math.round((stats.activas / stats.totalAlumnas) * 100)
    : 0

  return <AdminDashboard alumnas={alumnas ?? []} stats={{ ...stats, retencion }} />
}
