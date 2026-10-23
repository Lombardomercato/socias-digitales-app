import HomeCampus from '@/components/HomeCampus'
import { leerCampusAprendizaje } from '@/lib/learning-campus-server'

type Props = {
  supabase: Parameters<typeof leerCampusAprendizaje>[0]
  usuariaId: string
  perfil: Parameters<typeof leerCampusAprendizaje>[2]
}

// Server Component: el cliente de sesión nunca cruza hacia componentes cliente.
export default async function CampusFormation({ supabase, usuariaId, perfil }: Props) {
  const resumen = await leerCampusAprendizaje(supabase, usuariaId, perfil)
  return <HomeCampus resumen={resumen} />
}
