'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function CrearContrasenaForm() {
  const router = useRouter()
  const [contrasena, setContrasena] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    // La sesión ya fue establecida por /auth/callback
  }, [])

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (contrasena.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (contrasena !== confirmar) return setError('Las contraseñas no coinciden.')
    setGuardando(true)
    const { error } = await supabase.auth.updateUser({ password: contrasena, data: { password_set: true } })
    if (error) {
      setError('Error al guardar. Intentá de nuevo.')
    } else {
      setListo(true)
      setTimeout(() => router.push('/inicio'), 1200)
    }
    setGuardando(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFDBE5' }}>
      <div className="bg-white rounded-3xl shadow-lg p-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <img src="/academy-stacked-color.png" alt="Socias Digitales Academy" style={{ width: 200, height: 'auto', objectFit: 'contain', margin: '0 auto 16px' }} />
          <h1 className="text-2xl font-black text-gray-900">Creá tu contraseña</h1>
          <p className="text-sm text-gray-500 mt-2">Elegí una contraseña para acceder a Socias Digitales</p>
        </div>

        {listo ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-3">🎉</p>
            <p className="font-bold text-green-700">¡Contraseña creada!</p>
            <p className="text-sm text-gray-500 mt-1">Entrando a la plataforma...</p>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                type="password"
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmá tu contraseña</label>
              <input
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repetí la contraseña"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={guardando}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-colors bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300">
              {guardando ? 'Guardando...' : 'Crear contraseña y entrar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function CrearContrasenaCliente() {
  return (
    <Suspense>
      <CrearContrasenaForm />
    </Suspense>
  )
}
