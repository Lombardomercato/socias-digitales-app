import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ModuloPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  // Los enlaces históricos llevan a la biblioteca actual. No leer ni modificar
  // modulos/lecciones/progreso_lecciones, que conservan sus datos originales.
  redirect('/classroom')
}
