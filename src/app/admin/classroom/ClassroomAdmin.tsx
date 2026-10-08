'use client'

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

  const modulos = [...new Set(clases.map(c => c.modulo))]

  async function guardarClase() {
    setGuardando(true)
    const datos = { ...editando, orden: Number(editando.orden) }
    if (editando.id) {
      await supabase.from('clases').update(datos).eq('id', editando.id)
    } else {
      await supabase.from('clases').insert({ ...datos, orden: clases.length })
    }
    setModal(false)
    setEditando(CLASE_VACIA)
    setGuardando(false)
    router.refresh()
  }

  async function eliminarClase(id: string) {
    if (!confirm('¿Eliminar esta clase?')) return
    await supabase.from('clases').delete().eq('id', id)
    router.refresh()
  }

  async function asignarPlan(alumnaId: string, plan: string | null) {
    setAsignando(alumnaId)
    await supabase.from('perfiles').update({ plan }).eq('id', alumnaId)
    setAsignando(null)
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
          <h1 className="text-lg font-bold text-rose-600">Programa Socias Digitales</h1>
        </div>
        {tab === 'clases' && (
          <button onClick={() => { setEditando({ ...CLASE_VACIA, orden: clases.length }); setModal(true) }}
            className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
            + Nueva clase
          </button>
        )}
      </nav>

      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex gap-6 max-w-5xl mx-auto">
          {(['clases', 'alumnas'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-rose-500 text-rose-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t === 'clases' ? `📚 Clases (${clases.length})` : `👥 Alumnas y planes (${alumnas.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">

        {tab === 'clases' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <p className="text-2xl font-bold text-gray-900">{clases.length}</p>
                <p className="text-xs text-gray-400 mt-1">Total clases</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <p className="text-2xl font-bold" style={{ color: '#E27396' }}>{clases.filter(c => c.plan === '27').length}</p>
                <p className="text-xs text-gray-400 mt-1">Plan $27</p>
              </div>
              <div className="bg-white rounded-xl p-4 text-center shadow-sm border border-gray-100">
                <p className="text-2xl font-bold" style={{ color: '#337357' }}>{clases.filter(c => c.plan === '97').length}</p>
                <p className="text-xs text-gray-400 mt-1">Plan $97</p>
              </div>
            </div>

            {modulos.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">📚</p>
                <p>No hay clases todavía. Creá la primera.</p>
              </div>
            ) : (
              modulos.map(modulo => (
                <div key={modulo}>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">{modulo}</h2>
                  <div className="space-y-2">
                    {clases.filter(c => c.modulo === modulo).map(clase => (
                      <div key={clase.id} className={`bg-white rounded-xl p-4 flex items-center gap-4 border ${clase.activo ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                          style={{ background: clase.plan === '27' ? '#fce7f3' : '#edf7f2', color: clase.plan === '27' ? '#E27396' : '#337357' }}>
                          {clase.orden + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-sm">{clase.titulo}</p>
                          {clase.descripcion && <p className="text-xs text-gray-400 truncate">{clase.descripcion}</p>}
                          {clase.vimeo_url && <p className="text-xs text-blue-400 truncate mt-0.5">{clase.vimeo_url}</p>}
                          {clase.video_key && <p className="text-xs text-green-700 truncate mt-0.5">Video privado conectado</p>}
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${clase.plan === '27' ? 'bg-pink-100 text-pink-600' : 'bg-green-100 text-green-700'}`}>
                          ${clase.plan}
                        </span>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => {
                            setEditando({ titulo: clase.titulo, descripcion: clase.descripcion ?? '', vimeo_url: clase.vimeo_url ?? '', video_key: clase.video_key ?? '', plan: clase.plan, modulo: clase.modulo, activo: clase.activo, orden: clase.orden, id: clase.id })
                            setModal(true)
                          }} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">Editar</button>
                          <button onClick={() => eliminarClase(clase.id)}
                            className="text-xs px-2 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50">×</button>
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
            <p className="text-sm text-gray-500 mb-4">Asigná el plan de acceso a cada alumna.</p>
            {alumnas.map(alumna => (
              <div key={alumna.id} className="bg-white rounded-xl p-4 flex items-center gap-4 border border-gray-100">
                <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center text-lg flex-shrink-0">🌸</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm">{alumna.nombre ?? 'Sin nombre'}</p>
                  <p className="text-xs text-gray-400">{alumna.plan ? `Plan $${alumna.plan} activo` : 'Sin plan asignado'}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => asignarPlan(alumna.id, '27')} disabled={asignando === alumna.id}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${alumna.plan === '27' ? 'border-pink-300 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    $27
                  </button>
                  <button onClick={() => asignarPlan(alumna.id, '97')} disabled={asignando === alumna.id}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${alumna.plan === '97' ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                    $97
                  </button>
                  {alumna.plan && (
                    <button onClick={() => asignarPlan(alumna.id, null)} disabled={asignando === alumna.id}
                      className="text-xs px-2 py-1.5 rounded-lg border border-red-100 text-red-400 hover:bg-red-50">×</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{editando.id ? 'Editar clase' : 'Nueva clase'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
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
                <input type="checkbox" id="activo" checked={editando.activo}
                  onChange={e => setEditando(p => ({ ...p, activo: e.target.checked }))} className="rounded" />
                <label htmlFor="activo" className="text-sm text-gray-600">Clase activa (visible para alumnas)</label>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium">Cancelar</button>
              <button onClick={guardarClase} disabled={guardando || !editando.titulo}
                className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white py-2.5 rounded-lg text-sm font-medium">
                {guardando ? 'Guardando...' : 'Guardar clase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
