'use client'

export const dynamic = 'force-dynamic'

import Image from 'next/image'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [recuperando, setRecuperando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  function destinoSeguro() {
    const destino = searchParams.get('next')
    return destino?.startsWith('/') && !destino.startsWith('//') ? destino : '/'
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email o contraseña incorrectos. Verificá tus datos.')
      setLoading(false)
      return
    }

    router.push(destinoSeguro())
    router.refresh()
  }

  async function recuperarContrasena() {
    if (!email.trim()) {
      setError('Escribí tu email para recibir el enlace de recuperación.')
      return
    }
    setRecuperando(true)
    setError('')
    setMensaje('')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?flow=recovery`,
    })
    if (error) setError('No pudimos enviar el enlace. Revisá el email e intentá de nuevo.')
    else setMensaje('Si hay una cuenta asociada a ese email, vas a recibir un enlace para crear una contraseña nueva.')
    setRecuperando(false)
  }

  return (
    <main className="min-h-screen bg-[#FAF7F3] text-[#171413] lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
      <section className="relative hidden min-h-screen flex-col justify-between overflow-hidden bg-[#F4CAD8] px-12 py-10 lg:flex xl:px-20">
        <Image
          src="/academy-stacked-color.png"
          alt="Socias Digitales Academy"
          width={420}
          height={280}
          priority
          className="h-auto w-52 object-contain object-left"
        />
        <div className="relative z-10 max-w-xl pb-10">
          <p className="mb-4 font-impact text-sm font-bold uppercase tracking-[0.16em] text-[#294A38]">Tu plataforma digital</p>
          <h1 className="font-serif text-5xl leading-[1.04] tracking-[-0.04em] text-[#171413] xl:text-6xl">
            Todo para acompañarte <span className="text-[#294A38]">en cada etapa.</span>
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-[#51443F]">
            Clases, herramientas y seguimiento para tu camino digital.
          </p>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 text-center lg:hidden">
            <Image src="/academy-stacked-color.png" alt="Socias Digitales Academy" width={280} height={180} priority className="mx-auto h-auto w-44 object-contain" />
          </div>

          <div className="mb-8">
            <p className="mb-3 font-impact text-xs font-semibold uppercase tracking-[0.16em] text-[#294A38]">Tu espacio</p>
            <h2 className="font-serif text-4xl leading-tight tracking-[-0.035em] text-[#171413]">Qué lindo verte <span className="italic text-[#EC9BB6]">de nuevo.</span></h2>
            <p className="mt-3 text-sm leading-6 text-[#655B56]">Ingresá con el email que usaste al registrarte.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-medium text-[#3C332F]">Email</label>
              <input id="login-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full rounded-xl border border-[#D8CFC8] bg-white px-4 py-3.5 text-[#171413] outline-none transition focus:border-[#294A38] focus:ring-2 focus:ring-[#294A38]/10" />
            </div>

            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-[#3C332F]">Contraseña</label>
              <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Tu contraseña" className="w-full rounded-xl border border-[#D8CFC8] bg-white px-4 py-3.5 text-[#171413] outline-none transition focus:border-[#294A38] focus:ring-2 focus:ring-[#294A38]/10" />
            </div>

            {error && <p role="alert" className="rounded-xl border border-[#B01B30]/20 bg-[#F4CAD8]/35 px-4 py-3 text-sm text-[#7C1D2A]">{error}</p>}

            <button type="submit" disabled={loading} className="w-full rounded-xl bg-[#294A38] px-5 py-3.5 font-impact text-sm font-semibold text-white transition-colors hover:bg-[#203B2D] disabled:opacity-60">
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>

          {mensaje && <p role="status" className="mt-4 rounded-xl bg-[#F4EFEA] px-4 py-3 text-sm leading-6 text-[#294A38]">{mensaje}</p>}
          <button type="button" onClick={recuperarContrasena} disabled={recuperando} className="mx-auto mt-5 block text-sm text-[#294A38] underline decoration-[#EC9BB6] underline-offset-4 disabled:opacity-60">
            {recuperando ? 'Enviando enlace…' : 'Olvidé mi contraseña'}
          </button>
          <p className="mt-8 text-center text-sm text-[#655B56]">
            ¿Todavía no tenés cuenta? <a href="/registro" className="font-medium text-[#294A38] underline decoration-[#EC9BB6] underline-offset-4">Crear cuenta</a>
          </p>
          <p className="mt-5 text-center text-xs leading-5 text-[#7B716B]">¿Problemas para ingresar? Contactá a tu administradora.</p>
        </div>
      </section>
    </main>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<div className="min-h-screen bg-[#FAF7F3]" aria-busy="true" />}><LoginForm /></Suspense>
}
