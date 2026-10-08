'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function CrearContrasenaCliente({ cambiar = false }: { cambiar?: boolean }) {
  const router = useRouter()
  const [contrasena, setContrasena] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [listo, setListo] = useState(false)

  const supabase = createClient()

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (contrasena.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (contrasena !== confirmar) return setError('Las contraseñas no coinciden.')
    setGuardando(true)
    try {
    const { error } = await supabase.auth.updateUser({ password: contrasena, data: { password_set: true } })
    if (error) {
      setError('Error al guardar. Intentá de nuevo.')
    } else {
      setListo(true)
      setContrasena('')
      setConfirmar('')
      setTimeout(() => router.push(cambiar ? '/perfil' : '/inicio'), 1200)
    }
    } catch {
      setError('No se pudo conectar. Intentá de nuevo.')
    } finally {
    setGuardando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F3] text-[#171413]">
      <div className="bg-[#F4EFEA] rounded-3xl p-8 sm:p-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <img src="/academy-stacked-color.png" alt="Socias Digitales Academy" style={{ width: 200, height: 'auto', objectFit: 'contain', margin: '0 auto 16px' }} />
          <h1 className="font-serif text-3xl font-semibold">{cambiar ? 'Cambiar contraseña' : 'Creá tu contraseña'}</h1>
          <p className="text-sm text-[#655B56] mt-2">Elegí una contraseña para acceder a Socias Digitales</p>
        </div>

        {listo ? (
          <div className="text-center py-6">
            <p role="status" className="font-semibold text-[#294A38]">{cambiar ? 'Contraseña actualizada.' : '¡Contraseña creada!'}</p>
            <p className="text-sm text-gray-500 mt-1">Entrando a la plataforma...</p>
          </div>
        ) : (
          <form onSubmit={guardar} className="space-y-4">
            <div>
              <label htmlFor="nueva-contrasena" className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
              <input
                id="nueva-contrasena" autoComplete="new-password" required minLength={6} maxLength={128}
                type="password"
                value={contrasena}
                onChange={e => setContrasena(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div>
              <label htmlFor="confirmar-contrasena" className="block text-sm font-medium text-gray-700 mb-1">Confirmá tu contraseña</label>
              <input
                id="confirmar-contrasena" autoComplete="new-password" required minLength={6} maxLength={128}
                type="password"
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repetí la contraseña"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            {error && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={guardando}
              className="w-full py-3.5 rounded-xl text-[#171413] font-semibold text-sm transition-colors bg-[#EC9BB6] hover:bg-[#F4CAD8] disabled:opacity-60">
              {guardando ? 'Guardando...' : cambiar ? 'Guardar contraseña' : 'Crear contraseña y entrar'}
            </button>
            {cambiar && <Link href="/perfil" className="block text-center text-sm text-[#655B56] underline underline-offset-4">Volver a mi perfil</Link>}
          </form>
        )}
      </div>
    </div>
  )
}
