import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { claseParaCatalogo, type PerfilClases } from '@/lib/class-access'
import { revisionMiniatura } from '@/lib/class-poster'

// Llamar solo después de getUser y de obtener su perfil. El catálogo nunca
// serializa claves privadas ni enlaces de reproducción de clases bloqueadas.
export async function leerCatalogoClases(perfil: PerfilClases) {
  const { data,error } = await createAdminClient().from('clases')
    .select('id,titulo,descripcion,orden,modulo,activo,acceso_gratuito,plan,video_key,vimeo_url')
    .eq('activo',true).order('orden')
  if(error) throw new Error('No pudimos cargar las clases. Volvé a intentar.')
  return (data??[]).map(clase=>{
    const catalogo = claseParaCatalogo(clase,perfil)
    return { ...catalogo, miniatura_revision: catalogo.puede_ver && clase.video_key ? revisionMiniatura(clase.video_key) : '' }
  })
}
