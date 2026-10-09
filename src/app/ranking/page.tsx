import { createClient } from '@/lib/supabase/server'
import ModuleLocked from '@/components/ModuleLocked'
import { esAdministradora } from '@/lib/module-guard'
import { redirect } from 'next/navigation'
import RankingCliente from './RankingCliente'

export default async function RankingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!await esAdministradora(user.id)) return <ModuleLocked id="ranking" />

  const mes = new Date()
  const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1).toISOString()

  const [{ data: topVentasMes }, { data: topVentasHistorico }, { data: topActividad }] = await Promise.all([
    supabase
      .from('ventas_afiliadas')
      .select('afiliada_id, comision, perfiles(nombre, avatar_url)')
      .gte('fecha', inicioMes)
      .eq('estado', 'aprobada'),
    supabase
      .from('perfiles')
      .select('id, nombre, avatar_url, comisiones_total, modulos_completados, racha_maxima')
      .gt('comisiones_total', 0)
      .order('comisiones_total', { ascending: false })
      .limit(10),
    supabase
      .from('perfiles')
      .select('id, nombre, avatar_url, modulos_completados, racha_maxima, progreso')
      .order('progreso', { ascending: false })
      .limit(10),
  ])

  // Agrupar ventas del mes por afiliada
  const ventasMesAgrupadas = Object.values(
    (topVentasMes ?? []).reduce((acc: Record<string, { nombre: string; avatar_url: string | null; total: number }>, v) => {
      const id = v.afiliada_id
      const perfil = v.perfiles as unknown as { nombre: string; avatar_url: string | null } | null
      if (!acc[id]) acc[id] = { nombre: perfil?.nombre ?? 'Sin nombre', avatar_url: perfil?.avatar_url ?? null, total: 0 }
      acc[id].total += Number(v.comision)
      return acc
    }, {})
  ).sort((a, b) => b.total - a.total).slice(0, 10)

  return (
    <RankingCliente
      ventasMes={ventasMesAgrupadas}
      ventasHistorico={topVentasHistorico ?? []}
      actividad={topActividad ?? []}
      userId={user.id}
    />
  )
}
