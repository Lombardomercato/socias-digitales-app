'use client'
import AdminSectionMenu from '@/components/AdminSectionMenu'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Clase {
  id: string
  titulo: string
  descripcion: string | null
  vimeo_url: string | null
  video_key: string | null
  orden: number
  plan: '27' | '97'
  modulo: string
  activo: boolean
  acceso_gratuito: boolean
}

interface Alumna {
  id: string
  nombre: string
  plan: string | null
}

interface Props {
  clases: Clase[]
  alumnas: Alumna[]
}

const CLASE_VACIA = {
  titulo: '',
  descripcion: '',
  vimeo_url: '',
  video_key: '',
  plan: '27' as '27' | '97',
  modulo: 'Módulo 1',
  activo: true,
  acceso_gratuito: false,
  orden: 0,
}

export default function ClassroomAdmin({ clases, alumnas }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab] = useState<'clases' | 'alumnas'>('clases')
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<typeof CLASE_VACIA & { id?: string }>(CLASE_VACIA)
  const [guardando, setGuardando] = useState(false)
  const [asignando, setAsignando] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')

  const modulos = [...new Set(clases.map(c => c.modulo))]

  async function guardarClase() {
    if (!editando.titulo.trim()) {
      setAviso('Escribí el título de la clase antes de guardar.')
      return
    }
    setGuardando(true)
    setAviso('')
    const datos = { ...editando, orden: Number(editando.orden) }
    const resultado = editando.id
      ? await supabase.from('clases').update(datos).eq('id', editando.id)
      : await supabase.from('clases').insert({ ...datos, orden: clases.length })
    if (resultado.error) {
      setAviso('No se pudo guardar la clase. Revisá tu conexión e intentá de nuevo.')
      setGuardando(false)
      return
    }
    setModal(false)
    setEditando(CLASE_VACIA)
    setGuardando(false)
    router.refresh()
  }

  async function eliminarClase(id: string) {
    if (!confirm('¿Eliminar esta clase?')) return
    setAviso('')
    const { error } = await supabase.from('clases').delete().eq('id', id)
    if (error) {
      setAviso('No se pudo eliminar la clase. Intentá de nuevo.')
      return
    }
    router.refresh()
  }

  async function asignarPlan(alumnaId: string, plan: string | null) {
    setAsignando(alumnaId)
    setAviso('')
    const { error } = await supabase.from('perfiles').update({ plan }).eq('id', alumnaId)
    if (error) setAviso('No se pudo actualizar el plan. Intentá de nuevo.')
    setAsignando(null)
    if (!error) router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F4EFEA] text-[#211C19]">
      <nav className="flex items-center justify-between gap-4 border-b border-[#211C19]/8 bg-[#FAF7F3] px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-sm font-medium text-[#746A64] transition hover:text-[#294A38]">← Panel de Flor</a>
          <span className="hidden text-[#211C19]/20 sm:block">/</span>
          <h1 className="font-serif text-xl tracking-[-0.03em] text-[#211C19] sm:text-2xl">Clases</h1>
        </div>
        {tab === 'clases' && (
          <button onClick={() => { setEditando({ ...CLASE_VACIA, orden: clases.length }); setModal(true) }}
            className="rounded-full bg-[#294A38] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#203B2D] sm:text-sm">
            + Nueva clase
          </button>
        )}
      </nav>
      <AdminSectionMenu />

      <div className="border-b border-[#211C19]/8 bg-[#FAF7F3] px-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl gap-2">
          {(['clases', 'alumnas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`my-2 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'bg-[#F4CAD8] text-[#211C19]' : 'text-[#746A64] hover:bg-[#F4EFEA]'}`}>
              {t === 'clases' ? `Clases · ${clases.length}` : `Alumnas y planes · ${alumnas.length}`}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">

        {aviso && <p role="status" className="mb-5 rounded-2xl border border-[#B01B30]/15 bg-[#F4CAD8]/50 px-4 py-3 text-sm text-[#7C1D2A]">{aviso}</p>}

        {tab === 'clases' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-[20px] bg-[#294A38] p-4 text-center text-white sm:p-5">
                <p className="font-impact text-2xl font-semibold sm:text-3xl">{clases.length}</p>
                <p className="mt-1 text-[10px] text-white/60 sm:text-xs">Clases cargadas</p>
              </div>
              <div className="rounded-[20px] bg-[#F4CAD8] p-4 text-center sm:p-5">
                <p className="font-impact text-2xl font-semibold sm:text-3xl">{clases.filter(c => c.acceso_gratuito).length}</p>
                <p className="mt-1 text-[10px] text-[#211C19]/55 sm:text-xs">Acceso gratuito</p>
              </div>
              <div className="rounded-[20px] bg-[#EC9BB6] p-4 text-center sm:p-5">
                <p className="font-impact text-2xl font-semibold sm:text-3xl">{clases.filter(c => !c.acceso_gratuito).length}</p>
                <p className="mt-1 text-[10px] text-[#211C19]/55 sm:text-xs">Acceso Socias / Desafío</p>
              </div>
            </div>

            {modulos.length === 0 ? (
              <div className="rounded-[24px] bg-[#FAF7F3] p-8 text-center text-[#746A64] sm:p-12">
                <p className="font-serif text-2xl text-[#211C19]">Tu biblioteca empieza acá.</p>
                <p className="mt-2 text-sm">Creá la primera clase cuando estés lista.</p>
              </div>
            ) : (
              modulos.map(modulo => (
                <div key={modulo}>
                  <h2 className="mb-3 font-serif text-2xl tracking-[-0.03em] text-[#211C19]">{modulo}</h2>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {clases.filter(c => c.modulo === modulo).map(clase => (
                      <div key={clase.id} className={`flex items-center gap-3 rounded-[22px] bg-[#FAF7F3] p-4 sm:gap-4 sm:p-5 ${clase.activo ? '' : 'opacity-55'}`}>
                        <div className="font-impact flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F4CAD8] text-sm font-semibold text-[#211C19]">{String(clase.orden + 1).padStart(2, '0')}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm leading-snug text-[#211C19]">{clase.titulo}</p>
                          {clase.descripcion && <p className="mt-1 truncate text-xs text-[#746A64]">{clase.descripcion}</p>}
                          <p className="mt-2 font-impact text-[9px] font-semibold uppercase tracking-[0.14em] text-[#294A38]">{clase.video_key ? 'Video privado conectado' : clase.vimeo_url ? 'Vimeo conectado' : 'Sin video'}</p>
                        </div>
                        <span className="hidden shrink-0 rounded-full bg-[#F4EFEA] px-3 py-1.5 text-xs font-medium text-[#746A64] sm:inline-flex">
                          {clase.acceso_gratuito?'Gratuita':'Socias / Desafío'}
                        </span>
                        <div className="flex shrink-0 gap-1.5 sm:gap-2">
                          <button onClick={() => {
                            setEditando({ titulo: clase.titulo, descripcion: clase.descripcion ?? '', vimeo_url: clase.vimeo_url ?? '', video_key: clase.video_key ?? '', plan: clase.plan, modulo: clase.modulo, activo: clase.activo, acceso_gratuito:clase.acceso_gratuito, orden: clase.orden, id: clase.id })
                            setModal(true)
                          }} className="rounded-full border border-[#294A38]/25 px-3 py-2 text-xs font-medium text-[#294A38] transition hover:bg-[#F4CAD8]">Editar</button>
                          <button onClick={() => eliminarClase(clase.id)}
                            aria-label={`Eliminar ${clase.titulo}`} className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[#746A64] transition hover:bg-[#F4CAD8] hover:text-[#B01B30]">×</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'alumnas' && (
          <div className="space-y-3">
            <p className="mb-4 text-sm text-[#746A64]">Asigná el plan de acceso a cada alumna.</p>
            {alumnas.map(alumna => (
              <div key={alumna.id} className="flex items-center gap-4 rounded-[22px] bg-[#FAF7F3] p-4">
                <div className="font-impact flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F4CAD8] text-sm font-semibold text-[#294A38]">{(alumna.nombre || 'A').trim().charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#211C19]">{alumna.nombre || 'Sin nombre'}</p>
                  <p className="mt-1 text-xs text-[#746A64]">{alumna.plan ? `Plan $${alumna.plan} activo` : 'Sin plan asignado'}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => asignarPlan(alumna.id, '27')} disabled={asignando === alumna.id}
                    aria-pressed={alumna.plan === '27'} className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${alumna.plan === '27' ? 'border-[#EC9BB6] bg-[#F4CAD8] text-[#211C19]' : 'border-[#D8CFC8] text-[#746A64] hover:bg-[#F4EFEA]'}`}>
                    $27
                  </button>
                  <button onClick={() => asignarPlan(alumna.id, '97')} disabled={asignando === alumna.id}
                    aria-pressed={alumna.plan === '97'} className={`rounded-full border px-3 py-2 text-xs font-medium transition-colors ${alumna.plan === '97' ? 'border-[#294A38] bg-[#294A38] text-white' : 'border-[#D8CFC8] text-[#746A64] hover:bg-[#F4EFEA]'}`}>
                    $97
                  </button>
                  {alumna.plan && (
                    <button onClick={() => asignarPlan(alumna.id, null)} disabled={asignando === alumna.id}
                      aria-label={`Quitar plan de ${alumna.nombre || 'alumna'}`} className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[#746A64] transition hover:bg-[#F4CAD8] hover:text-[#B01B30]">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#171413]/55 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-[26px] bg-[#FAF7F3]">
            <div className="flex items-center justify-between border-b border-[#E7DDD5] p-6">
              <div><p className="font-impact text-[9px] font-semibold uppercase tracking-[0.16em] text-[#294A38]">Biblioteca</p><h3 className="mt-1 text-lg font-semibold text-[#211C19]">{editando.id ? 'Editar clase' : 'Nueva clase'}</h3></div>
              <button onClick={() => setModal(false)} aria-label="Cerrar" className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4EFEA] text-xl text-[#746A64] transition hover:bg-[#F4CAD8]">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
                <input type="text" placeholder="Ej: Cómo encontrar tu primer producto"
                  value={editando.titulo}
                  onChange={e => setEditando(p => ({ ...p, titulo: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción (opcional)</label>
                <textarea rows={2} placeholder="De qué trata esta clase..."
                  value={editando.descripcion ?? ''}
                  onChange={e => setEditando(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Link de Vimeo</label>
                <input type="url" placeholder="https://vimeo.com/123456789"
                  value={editando.vimeo_url ?? ''}
                  onChange={e => setEditando(p => ({ ...p, vimeo_url: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Clave del video privado (opcional)</label>
                <input type="text" placeholder="desafio-socias/clase-01.mp4"
                  value={editando.video_key ?? ''}
                  onChange={e => setEditando(p => ({ ...p, video_key: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Módulo</label>
                  <input type="text" placeholder="Módulo 1"
                    value={editando.modulo}
                    onChange={e => setEditando(p => ({ ...p, modulo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Plan requerido</label>
                  <select value={editando.plan}
                    onChange={e => setEditando(p => ({ ...p, plan: e.target.value as '27' | '97' }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                    <option value="27">$27 — Básico</option>
                    <option value="97">$97 — Completo</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="acceso-gratuito" checked={editando.acceso_gratuito} onChange={e=>setEditando(p=>({...p,acceso_gratuito:e.target.checked}))} className="rounded" />
                <label htmlFor="acceso-gratuito" className="text-sm text-[#655B56]">Disponible en acceso gratuito, sin aprobación</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="activo" checked={editando.activo}
                  onChange={e => setEditando(p => ({ ...p, activo: e.target.checked }))} className="rounded" />
                <label htmlFor="activo" className="text-sm text-gray-600">Clase activa (visible para alumnas)</label>
              </div>
            </div>
            <div className="flex gap-3 border-t border-[#E7DDD5] p-6">
              <button onClick={() => setModal(false)} className="flex-1 rounded-full border border-[#D8CFC8] py-2.5 text-sm font-medium text-[#746A64]">Cancelar</button>
              <button onClick={guardarClase} disabled={guardando || !editando.titulo}
                className="flex-1 rounded-full bg-[#294A38] py-2.5 text-sm font-semibold text-white transition hover:bg-[#203B2D] disabled:opacity-50">
                {guardando ? 'Guardando...' : 'Guardar clase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
