import { redirect } from 'next/navigation'
import { autorizarAdmin } from '@/lib/admin-auth'
import AgendaAdmin from './AgendaAdmin'

export default async function AgendaPage() {
  const auth = await autorizarAdmin()
  if (auth.error) redirect('/login')
  return <AgendaAdmin />
}
