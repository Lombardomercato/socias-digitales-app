import 'server-only'
import { createClient } from '@/lib/supabase/server'

// En esta etapa solo clases y lanzamiento están operativos para las alumnas.
// La administración conserva las funciones existentes para preparar cada módulo.
export async function esAdministradora(userId: string) {
  const supabase = await createClient()
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', userId).maybeSingle()
  return perfil?.rol === 'admin'
}
