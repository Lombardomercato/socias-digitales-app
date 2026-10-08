'use client'
import AdminSectionMenu from '@/components/AdminSectionMenu'

import { useState } from 'react'

type Resultado = { email: string; ok: boolean; mensaje: string }

export default function InvitarCliente() {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [error, setError] = useState('')

  const emails = texto
    .split(/[\n,;]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.includes('@'))

  async function enviar() {
    if (emails.length === 0) return
    setEnviando(true)
    setResultados([])
    setError('')
    try {
      const res = await fetch('/api/invitar-alumnas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails }),
    })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudieron enviar las invitaciones.')
      setResultados(data.resultados ?? [])
    } catch (causa) {
      setError(causa instanceof Error ? causa.message : 'No pudimos conectar con el servidor.')
    } finally {
      setEnviando(false)
    }
  }

  const exitosas = resultados.filter(r => r.ok).length
  const fallidas = resultados.filter(r => !r.ok).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 to-pink-100">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        <a href="/admin" className="text-sm text-rose-600 hover:text-rose-800 font-medium">← Volver al panel</a>
      </nav>
      <AdminSectionMenu />

      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Invitar al Desafío Socias</h1>
          <p className="text-gray-500 mt-1">Pegá los emails y les llegará una invitación para crear su cuenta del Desafío Socias.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Emails (uno por línea, o separados por coma)
            </label>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              rows={10}
              placeholder={"alumna1@gmail.com\nalumna2@gmail.com\nalumna3@hotmail.com"}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm font-mono text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            />
          </div>

          {emails.length > 0 && (
            <p className="text-sm text-gray-500">
              {emails.length} email{emails.length !== 1 ? 's' : ''} detectado{emails.length !== 1 ? 's' : ''}
            </p>
          )}

          <button
            onClick={enviar}
            disabled={enviando || emails.length === 0}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-colors bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300"
          >
            {enviando ? `Enviando invitaciones...` : `Enviar ${emails.length} invitación${emails.length !== 1 ? 'es' : ''}`}
          </button>
        </div>

        {error && <p role="alert" className="rounded-xl border border-[#EC9BB6] bg-[#F4CAD8] px-4 py-3 text-sm text-[#211c19]">{error}</p>}

        {resultados.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-3">
            <div className="flex gap-4 mb-2">
              {exitosas > 0 && <span className="text-sm font-bold text-green-600">✓ {exitosas} enviadas</span>}
              {fallidas > 0 && <span className="text-sm font-bold text-red-500">✗ {fallidas} con error</span>}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {resultados.map(r => (
                <div key={r.email} className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm ${r.ok ? 'bg-green-50' : 'bg-red-50'}`}>
                  <span className="font-medium text-gray-700">{r.email}</span>
                  <span className={r.ok ? 'text-green-600' : 'text-red-500'}>{r.ok ? '✓ Enviada' : `✗ ${r.mensaje}`}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
