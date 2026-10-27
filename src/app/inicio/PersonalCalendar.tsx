import HomeCalendar from '@/components/HomeCalendar'
import { leerCalendarioPersonal, type PermisoCalendario } from '@/lib/home-calendar-server'
import type { HitoAgenda } from '@/lib/agenda'

interface Props {
  supabase: Parameters<typeof leerCalendarioPersonal>[0]
  usuariaId: string
  perfil: { rol?: string }
  permisoMiDia: PermisoCalendario
  hoy: string
  mes?: unknown
  hitos: readonly HitoAgenda[]
  errorAgenda: boolean
}

export default async function PersonalCalendar({ supabase, usuariaId, perfil, permisoMiDia, hoy, mes, hitos, errorAgenda }: Props) {
  if (perfil?.rol === 'admin' || permisoMiDia?.admin === true) return null
  const datos = await leerCalendarioPersonal(supabase, usuariaId, perfil, permisoMiDia, mes, hoy, hitos, errorAgenda)
  return <HomeCalendar key={datos.estado === 'listo' ? datos.rango.mes : 'error'} datos={datos} />
}
