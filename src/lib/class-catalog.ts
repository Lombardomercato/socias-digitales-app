import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { claseParaCatalogo, type PerfilClases } from '@/lib/class-access'

// Llamar solo después de getUser y de obtener su perfil. El catálogo nunca
// serializa claves privadas ni enlaces de reproducción de clases bloqueadas.
export async function leerCatalogoClases(perfil: PerfilClases) {
  const { data,error } = await createAdminClient().from('clases')
    .select('id,titulo,descripcion,orden,modulo,activo,acceso_gratuito,plan,video_key,vimeo_url')
    .eq('activo',true).order('orden')
  if(error) throw new Error('No pudimos cargar las clases. Volvé a intentar.')
  return (data??[]).map(clase=>claseParaCatalogo(clase,perfil))
}
