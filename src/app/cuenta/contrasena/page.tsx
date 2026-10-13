import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CrearContrasenaCliente from '@/app/crear-contrasena/CrearContrasenaCliente'

export default async function CambiarContrasenaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fcuenta%2Fcontrasena')
  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
  return <CrearContrasenaCliente cambiar esAdmin={perfil?.rol === 'admin'} />
}
