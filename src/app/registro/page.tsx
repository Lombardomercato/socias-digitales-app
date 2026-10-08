'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function RegistroPage() {
  const router = useRouter()
  const supabase = createClient()
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMensaje('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      }
    })

    if (signUpError) {
      setError('No pudimos crear la cuenta. Revisá tus datos e intentá nuevamente.')
      setLoading(false)
      return
    }

    if (!data.session) {
      setMensaje('Si es tu primer registro, revisá tu correo y la carpeta de spam para confirmar la cuenta. Si ya te habías registrado, ingresá o recuperá tu contraseña. El acceso al Desafío Socias se activa cuando Flor habilita tu inscripción.')
      setLoading(false)
      return
    }

    router.push('/inicio')
    router.refresh()
  }

  return (
    <main className="min-h-screen bg-[#FAF7F3] text-[#171413] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#F4CAD8] px-12 py-10 lg:flex xl:px-20">
        <Image src="/academy-stacked-color.png" alt="Socias Digitales Academy" width={420} height={280} priority className="h-auto w-52 object-contain object-left" />
        <div className="relative z-10 max-w-xl pb-10">
          <p className="mb-4 font-impact text-xs font-semibold uppercase tracking-[0.18em] text-[#294A38]">Desafío Socias</p>
          <h1 className="font-serif text-5xl leading-[1.04] tracking-[-0.04em] text-[#171413] xl:text-6xl">
            Un paso a la vez. <span className="text-[#294A38]">A tu manera.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#51443F]">
            Creá tu cuenta para participar del Desafío Socias.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-9 text-center lg:hidden">
            <Image src="/academy-stacked-color.png" alt="Socias Digitales Academy" width={280} height={180} priority className="mx-auto h-auto w-44 object-contain" />
          </div>

          <div className="mb-8">
            <p className="mb-3 font-impact text-xs font-semibold uppercase tracking-[0.16em] text-[#294A38]">Tu lugar empieza acá</p>
            <h2 className="font-serif text-4xl leading-tight tracking-[-0.035em] text-[#171413]">Crear <span className="italic text-[#B01B30]">cuenta.</span></h2>
            <p className="mt-3 text-sm leading-6 text-[#655B56]">Completá tus datos para registrarte.</p>
          </div>

          <form onSubmit={handleRegistro} className="space-y-4">
            <div>
              <label htmlFor="signup-name" className="mb-2 block text-sm font-medium text-[#3C332F]">Nombre completo</label>
              <input id="signup-name" type="text" required autoComplete="name" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" className="w-full rounded-xl border border-[#D8CFC8] bg-white px-4 py-3.5 text-[#171413] outline-none transition focus:border-[#294A38] focus:ring-2 focus:ring-[#294A38]/10" />
            </div>

            <div>
              <label htmlFor="signup-email" className="mb-2 block text-sm font-medium text-[#3C332F]">Email</label>
              <input id="signup-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full rounded-xl border border-[#D8CFC8] bg-white px-4 py-3.5 text-[#171413] outline-none transition focus:border-[#294A38] focus:ring-2 focus:ring-[#294A38]/10" />
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-2 block text-sm font-medium text-[#3C332F]">Contraseña</label>
              <input id="signup-password" type="password" required minLength={6} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full rounded-xl border border-[#D8CFC8] bg-white px-4 py-3.5 text-[#171413] outline-none transition focus:border-[#294A38] focus:ring-2 focus:ring-[#294A38]/10" />
            </div>

            {error && <p role="alert" className="rounded-xl border border-[#B01B30]/20 bg-[#F4CAD8]/35 px-4 py-3 text-sm text-[#7C1D2A]">{error}</p>}
            {mensaje && <p role="status" className="rounded-xl border border-[#294A38]/15 bg-[#F4EFEA] px-4 py-3 text-sm leading-6 text-[#294A38]">{mensaje}</p>}

            <button type="submit" disabled={loading} className="mt-2 w-full rounded-xl bg-[#294A38] px-5 py-3.5 font-impact text-sm font-semibold text-white transition-colors hover:bg-[#203B2D] disabled:opacity-60">
              {loading ? 'Creando cuenta…' : 'Crear mi cuenta'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#655B56]">
            ¿Ya tenés cuenta? <a href="/login" className="font-medium text-[#294A38] underline decoration-[#EC9BB6] underline-offset-4">Ingresá acá</a>
          </p>
        </div>
      </section>
    </main>
  )
}
