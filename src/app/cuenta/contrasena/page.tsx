import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CrearContrasenaCliente from '@/app/crear-contrasena/CrearContrasenaCliente'

export default async function CambiarContrasenaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=%2Fcuenta%2Fcontrasena')
  return <CrearContrasenaCliente cambiar />
}
