'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Session, AuthChangeEvent } from '@supabase/supabase-js'

export default function AuthCallbackPage() {
  const router = useRouter()
  const supabase = createClient()
  const [error, setError] = useState('')

  useEffect(() => {
    function irSegunTipo(esInvitacion: boolean, esRecuperacion = false) {
      router.replace(esInvitacion || esRecuperacion ? '/crear-contrasena' : '/')
    }

    async function procesar() {
      const url = new URL(window.location.href)
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')
      const flow = url.searchParams.get('flow')
      const code = url.searchParams.get('code')
      const hash = window.location.hash

      // Formato 1: token_hash + type en query params
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as 'invite' | 'recovery' | 'email' })
        if (error) {
          setError('El link expiró o ya fue usado. Pedile a tu administradora que te reenvíe la invitación.')
          return
        }
        irSegunTipo(type === 'invite', type === 'recovery' || flow === 'recovery')
        return
      }

      // Formato 2: code en query params (PKCE)
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setError('El link expiró o ya fue usado. Pedile a tu administradora que te reenvíe la invitación.')
          return
        }
        irSegunTipo(hash.includes('type=invite') || type === 'invite', flow === 'recovery' || type === 'recovery')
        return
      }

      // Formato 3: access_token y refresh_token en el hash (flujo implícito)
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.replace('#', ''))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) {
            setError('El link expiró o ya fue usado. Pedile a tu administradora que te reenvíe la invitación.')
            return
          }
          irSegunTipo(params.get('type') === 'invite' || hash.includes('type=invite'), params.get('type') === 'recovery' || flow === 'recovery')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        irSegunTipo(hash.includes('type=invite'), flow === 'recovery')
        return
      }

      setError('No pudimos verificar el link. Pedile a tu administradora que te reenvíe la invitación.')
    }

    procesar()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (event === 'SIGNED_IN' && session) {
        const callbackUrl = new URL(window.location.href)
        irSegunTipo(window.location.hash.includes('type=invite'), callbackUrl.searchParams.get('flow') === 'recovery' || window.location.hash.includes('type=recovery'))
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFDBE5' }}>
      <div className="text-center max-w-sm px-4">
        <img src="/academy-stacked-color.png" alt="Socias Digitales Academy" style={{ width: 200, height: 'auto', objectFit: 'contain', margin: '0 auto 20px' }} />
        {error ? (
          <>
            <p className="text-red-600 font-medium mb-4">{error}</p>
            <a href="/login" className="text-sm text-rose-600 underline">Volver al login</a>
          </>
        ) : (
          <p className="text-gray-600 font-medium">Verificando tu acceso...</p>
        )}
      </div>
    </div>
  )
}
