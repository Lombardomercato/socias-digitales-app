'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { type Aviso, fechaAviso } from '@/lib/notifications'
import ArrowIcon from '@/components/ArrowIcon'

export default function BandejaAvisos({ userId, iniciales, errorCarga }: { userId: string; iniciales: Aviso[]; errorCarga: boolean }) {
  const router = useRouter()
  const [marcados, setMarcados] = useState<string[]>([])
  const [filtro, setFiltro] = useState<'todos' | 'nuevos'>('todos')
  const [guardando, setGuardando] = useState<string | null>(null)
  const [error, setError] = useState('')
  const avisos = iniciales.map(aviso => ({ ...aviso, leido: aviso.leido || marcados.includes(aviso.id) }))
  const nuevos = avisos.filter(aviso => !aviso.leido).length

  // Se ejecuta al abrir la bandeja, no al precargar la ruta ni desde Inicio.
  // Solo los mensajes que realmente se entregaron a esta usuaria se marcan.
  useEffect(() => {
    if (errorCarga) return
    const pendientes = iniciales.filter(aviso => !aviso.leido).map(aviso => aviso.id)
    if (!pendientes.length) return
    let cancelado = false
    async function registrarApertura() {
      try {
        const { error } = await createClient().from('avisos_lecturas').upsert(
          pendientes.map(id => ({ aviso_id: id, usuaria_id: userId })),
          { onConflict: 'aviso_id,usuaria_id', ignoreDuplicates: true },
        )
        if (error) throw new Error('No pudimos registrar la lectura. Podés reintentar con “Marcar como leído”.')
        if (!cancelado) {
          setMarcados(actual => [...new Set([...actual, ...pendientes])])
          router.refresh()
        }
      } catch (causa) {
        if (!cancelado) setError(causa instanceof Error ? causa.message : 'No pudimos registrar la lectura.')
      }
    }
    void registrarApertura()
    return () => { cancelado = true }
  }, [iniciales, userId, errorCarga, router])

  async function marcarLeido(id: string) {
    setGuardando(id); setError('')
    try {
      const { error } = await createClient().from('avisos_lecturas').upsert({ aviso_id: id, usuaria_id: userId }, { onConflict: 'aviso_id,usuaria_id' })
      if (error) throw new Error('No se pudo marcar como leído.')
      setMarcados(actual => [...actual, id])
      router.refresh()
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'No pudimos conectar.') }
    finally { setGuardando(null) }
  }

  return <>
    <div className="mt-6 flex items-center gap-2">
      {(['todos','nuevos'] as const).map(valor => <button key={valor} type="button" aria-pressed={filtro === valor} onClick={() => setFiltro(valor)} className={`rounded-full px-4 py-2 text-xs font-semibold ${filtro === valor ? 'bg-[#294A38] text-white' : 'border border-[#e7ddd5] bg-[#FAF7F3]'}`}>{valor === 'todos' ? 'Todos' : `Sin leer · ${nuevos}`}</button>)}
      <button type="button" onClick={() => router.refresh()} className="ml-auto text-xs font-medium text-[#294A38]">Actualizar</button>
    </div>
    {errorCarga || error ? <p role="alert" className="mt-4 rounded-xl border border-[#EC9BB6] p-4 text-sm">{error || 'No pudimos cargar los avisos. Probá actualizar.'}</p> : null}
    <div className="mt-5 space-y-3">
      {avisos.filter(aviso => filtro === 'todos' || !aviso.leido).map(aviso => <article key={aviso.id} className={`rounded-[22px] border bg-[#FAF7F3] p-5 sm:p-6 ${aviso.leido ? 'border-[#e7ddd5]' : 'border-[#EC9BB6]'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#746a64]"><time dateTime={aviso.created_at}>{fechaAviso(aviso.created_at)}</time>{!aviso.leido && <span className="rounded-full bg-[#F4CAD8] px-3 py-1 text-[#294A38]">Nuevo</span>}</div>
        <h2 className="mt-3 text-lg font-semibold">{aviso.titulo}</h2>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#746a64]">{aviso.mensaje}</p>
        <div className="mt-5 flex flex-wrap items-center gap-4">
          {aviso.destino && <Link href={aviso.destino} className="inline-flex items-center gap-2 text-sm font-semibold text-[#294A38]">Abrir <ArrowIcon /></Link>}
          {!aviso.leido && <button disabled={guardando !== null} onClick={() => marcarLeido(aviso.id)} type="button" className="ml-auto text-xs text-[#294A38] disabled:opacity-50">{guardando === aviso.id ? 'Guardando…' : 'Marcar como leído'}</button>}
        </div>
      </article>)}
      {!errorCarga && !avisos.some(aviso => filtro === 'todos' || !aviso.leido) && <section className="rounded-[22px] border border-[#e7ddd5] bg-[#FAF7F3] p-8 text-center text-sm text-[#746a64]">{filtro === 'nuevos' ? 'Estás al día.' : 'Todavía no tenés avisos. Las novedades aparecerán acá.'}</section>}
    </div>
  </>
}
