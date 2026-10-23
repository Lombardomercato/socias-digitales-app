import HomeCampus from '@/components/HomeCampus'
import { leerCampusAprendizaje } from '@/lib/learning-campus-server'
import { leerResumenMiDiaInicio } from '@/lib/home-operations-server'

type Props = {
  supabase: Parameters<typeof leerCampusAprendizaje>[0]
  usuariaId: string
  perfil: Parameters<typeof leerCampusAprendizaje>[2]
  permisoMiDia: { permitido: boolean; error?: boolean }
  fecha: string
}

// Server Component: el cliente de sesión nunca cruza hacia componentes cliente.
export default async function CampusFormation({ supabase, usuariaId, perfil, permisoMiDia, fecha }: Props) {
  const [resumen, miDia] = await Promise.all([
    leerCampusAprendizaje(supabase, usuariaId, perfil),
    leerResumenMiDiaInicio(supabase, usuariaId, fecha, permisoMiDia),
  ])
  return <HomeCampus resumen={resumen} miDia={miDia} />
}
