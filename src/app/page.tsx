import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).maybeSingle()
    redirect(perfil?.rol === 'admin' ? '/admin' : '/inicio')
  } else {
    redirect('/login')
  }
}
