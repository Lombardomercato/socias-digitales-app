import 'server-only'
import type { User } from '@supabase/supabase-js'
import type { createAdminClient } from '@/lib/supabase/admin'

// Emails are canonical Auth data, not a column of public.perfiles. Never
// authorize using this directory or user-editable metadata.
export async function buscarCuentaEmail(
  admin: ReturnType<typeof createAdminClient>,
  email: string,
): Promise<User | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === email)
    if (found) return found
    if (data.users.length < 1000) return null
  }
  throw new Error('Directorio demasiado grande: requiere búsqueda paginada.')
}
export async function emailsDelEquipo(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[],
) {
  const pendiente = new Set(ids),
    emails = new Map<string, string>()
  for (let page = 1; page <= 20 && pendiente.size; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 1000,
    })
    if (error) throw error
    for (const user of data.users) {
      if (pendiente.has(user.id)) {
        emails.set(user.id, user.email ?? '')
        pendiente.delete(user.id)
      }
    }
    if (data.users.length < 1000) break
  }
  if (pendiente.size)
    throw new Error('No pudimos leer todas las cuentas del equipo.')
  return emails
}
