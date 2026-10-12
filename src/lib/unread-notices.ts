import 'server-only'
import type { createClient } from './supabase/server'

export interface ResumenAvisos {
  cantidad: number
  ultimoTitulo: string | null
  errorCarga: boolean
}

// El cliente de la sesión aplica RLS a avisos y lecturas. No usa service_role.
export async function leerAvisosSinLeer(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<ResumenAvisos> {
  const { data, count, error } = await supabase.from('avisos')
    .select('id,titulo,avisos_lecturas()', { count: 'exact' })
    .eq('publicado', true).eq('archivado', false)
    .eq('avisos_lecturas.usuaria_id', userId).is('avisos_lecturas', null)
    .order('created_at', { ascending: false }).limit(1)
  if (error) return { cantidad: 0, ultimoTitulo: null, errorCarga: true }
  return { cantidad: count ?? 0, ultimoTitulo: data?.[0]?.titulo ?? null, errorCarga: false }
}
