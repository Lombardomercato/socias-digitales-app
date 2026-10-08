'use client'
import AdminSectionMenu from '@/components/AdminSectionMenu'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  tipo: string
  subtipo: string | null
  marca: string | null
  precio: number
  moneda: string
  comision_pct: number
  imagen_url: string | null
  link_compra: string | null
  activo: boolean
  orden: number
}

interface Props {
  productos: Producto[]
  cotizacion: number
}

const PRODUCTO_VACIO = {
  nombre: '',
  descripcion: '',
  tipo: 'digital',
  subtipo: 'ebook',
  marca: '',
  precio: 0,
  moneda: 'USD',
  comision_pct: 20,
  imagen_url: '',
  link_compra: '',
  activo: true,
  orden: 0,
}

const TIPO_EMOJI: Record<string, string> = { fisico: '📦', digital: '💻' }

const SUBTIPOS_FISICO = [
  'Cartera',
  'Billetera',
  'Ropa interior',
  'Ropa exterior',
  'Calzado',
  'Accesorios',
  'Bijouterie',
  'Cosmética',
  'Perfumería',
  'Hogar y deco',
  'Otro físico',
]

const SUBTIPOS_DIGITAL = ['Ebook', 'Membresía', 'Curso', 'Otro digital']

const SUBTIPO_LABEL: Record<string, string> = {
  ebook: 'Ebook',
  membresia: 'Membresía',
  curso: 'Curso',
  otro: 'Otro digital',
  producto_fisico: 'Producto físico',
}

function nombreDeImagen(archivo: File) {
  return `producto-${Date.now()}.${archivo.name.split('.').pop()}`
}

export default function ProductosAdmin({ productos, cotizacion }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [modal, setModal] = useState(false)
  const [editando, setEditando] = useState<typeof PRODUCTO_VACIO & { id?: string }>(PRODUCTO_VACIO)
  const [guardando, setGuardando] = useState(false)
  const [subiendoImg, setSubiendoImg] = useState(false)
  const [filtro, setFiltro] = useState<'todos' | 'fisico' | 'digital'>('todos')

  const productosFiltrados = productos.filter(p => filtro === 'todos' || p.tipo === filtro)

  async function guardar() {
    setGuardando(true)
    const datos = { ...editando, precio: Number(editando.precio), comision_pct: Number(editando.comision_pct) }
    if (editando.id) {
      await supabase.from('productos').update(datos).eq('id', editando.id)
    } else {
      await supabase.from('productos').insert({ ...datos, orden: productos.length })
    }
    setModal(false)
    setEditando(PRODUCTO_VACIO)
    setGuardando(false)
    router.refresh()
  }

  async function toggleActivo(p: Producto) {
    await supabase.from('productos').update({ activo: !p.activo }).eq('id', p.id)
    router.refresh()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este producto?')) return
    await supabase.from('productos').delete().eq('id', id)
    router.refresh()
  }

  async function subirImagen(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setSubiendoImg(true)
    const nombre = nombreDeImagen(archivo)
    const { error } = await supabase.storage.from('productos').upload(nombre, archivo, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('productos').getPublicUrl(nombre)
      setEditando(prev => ({ ...prev, imagen_url: data.publicUrl }))
    }
    setSubiendoImg(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <a href="/admin" className="text-gray-400 hover:text-gray-600 text-sm">← Admin</a>
          <h1 className="text-lg font-bold text-rose-600">Catálogo de Productos</h1>
        </div>
        <button onClick={() => { setEditando({ ...PRODUCTO_VACIO, orden: productos.length }); setModal(true) }}
          className="bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Nuevo producto
        </button>
      </nav>
      <AdminSectionMenu />

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Stats rápidas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-gray-900">{productos.length}</p>
            <p className="text-xs text-gray-400 mt-1">Total productos</p>
          </div>
          <div className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-blue-500">{productos.filter(p => p.tipo === 'digital').length}</p>
            <p className="text-xs text-gray-400 mt-1">💻 Digitales</p>
          </div>
          <div className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100">
            <p className="text-2xl font-bold text-amber-500">{productos.filter(p => p.tipo === 'fisico').length}</p>
            <p className="text-xs text-gray-400 mt-1">📦 Físicos</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          {(['todos', 'digital', 'fisico'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${filtro === f ? 'bg-rose-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-rose-300'}`}>
              {f === 'todos' ? 'Todos' : f === 'digital' ? '💻 Digitales' : '📦 Físicos'}
            </button>
          ))}
        </div>

        {/* Grid de productos */}
        {productosFiltrados.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center text-gray-400">
            <p className="text-4xl mb-3">🛍️</p>
            <p>No hay productos todavía. Creá el primero.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {productosFiltrados.map(p => (
              <div key={p.id} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${!p.activo ? 'opacity-60' : 'border-gray-100'}`}>
                {/* Imagen */}
                <div className="h-44 bg-gradient-to-br from-rose-50 to-pink-100 relative flex items-center justify-center overflow-hidden">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <span className="text-6xl">{TIPO_EMOJI[p.tipo]}</span>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.tipo === 'digital' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                      {TIPO_EMOJI[p.tipo]} {p.tipo === 'digital' ? 'Digital' : 'Físico'}
                    </span>
                    {p.subtipo && p.subtipo !== 'otro' && (
                      <span className="text-xs bg-white/90 text-gray-600 px-2 py-1 rounded-full font-medium">
                        {SUBTIPO_LABEL[p.subtipo] ?? p.subtipo}
                      </span>
                    )}
                  </div>
                  {!p.activo && (
                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                      <span className="bg-gray-800 text-white text-xs px-3 py-1 rounded-full font-medium">Inactivo</span>
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="font-bold text-gray-900 mb-0.5">{p.nombre}</h3>
                  {p.marca && <p className="text-xs text-rose-500 font-medium mb-1">{p.marca}</p>}
                  {p.descripcion && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{p.descripcion}</p>}

                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-lg font-bold text-rose-600">USD ${p.precio.toLocaleString('es-AR')}</span>
                      {p.moneda === 'USD' && (
                        <p className="text-xs text-gray-400">$ {(p.precio * cotizacion).toLocaleString('es-AR')} ARS</p>
                      )}
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      {p.comision_pct}% comisión
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <button onClick={() => toggleActivo(p)}
                      className={`flex-1 text-xs py-1.5 rounded-lg font-medium border transition-colors ${p.activo ? 'border-gray-200 text-gray-500 hover:bg-gray-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                      {p.activo ? 'Desactivar' : 'Activar'}
                    </button>
                    <button onClick={() => {
                      setEditando({ nombre: p.nombre, descripcion: p.descripcion ?? '', tipo: p.tipo, subtipo: p.subtipo ?? '', marca: p.marca ?? '', precio: p.precio, moneda: p.moneda, comision_pct: p.comision_pct, imagen_url: p.imagen_url ?? '', link_compra: p.link_compra ?? '', activo: p.activo, orden: p.orden, id: p.id })
                      setModal(true)
                    }} className="flex-1 text-xs py-1.5 rounded-lg font-medium border border-gray-200 text-gray-500 hover:bg-gray-50">
                      Editar
                    </button>
                    <button onClick={() => eliminar(p.id)} className="text-xs py-1.5 px-2 rounded-lg font-medium border border-red-100 text-red-400 hover:bg-red-50">
                      ×
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">{editando.id ? 'Editar producto' : 'Nuevo producto'}</h3>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Preview imagen */}
              <div className="h-36 bg-gray-100 rounded-xl overflow-hidden relative flex items-center justify-center">
                {editando.imagen_url
                  ? <img src={editando.imagen_url} className="w-full h-full object-cover" alt="" />
                  : <span className="text-5xl">{TIPO_EMOJI[editando.tipo]}</span>
                }
                <label className="absolute bottom-2 right-2 bg-white text-xs font-medium px-3 py-1.5 rounded-lg shadow cursor-pointer hover:bg-gray-50">
                  {subiendoImg ? 'Subiendo...' : 'Subir imagen'}
                  <input type="file" accept="image/*" onChange={subirImagen} className="hidden" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Nombre</label>
                <input type="text" placeholder="Ej: Membresía Socias Digitales"
                  value={editando.nombre}
                  onChange={e => setEditando(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Descripción</label>
                <textarea placeholder="Descripción del producto..." rows={2}
                  value={editando.descripcion ?? ''}
                  onChange={e => setEditando(p => ({ ...p, descripcion: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Categoría</label>
                  <select value={editando.tipo}
                    onChange={e => setEditando(p => ({ ...p, tipo: e.target.value, subtipo: e.target.value === 'fisico' ? 'Cartera' : 'Ebook' }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                    <option value="digital">💻 Digital</option>
                    <option value="fisico">📦 Físico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tipo de producto</label>
                  <select value={editando.subtipo ?? ''}
                    onChange={e => setEditando(p => ({ ...p, subtipo: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                    {(editando.tipo === 'fisico' ? SUBTIPOS_FISICO : SUBTIPOS_DIGITAL).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Marca</label>
                <input type="text" placeholder="Ej: Desigual, Victoria's Secret, Nike..."
                  value={editando.marca ?? ''}
                  onChange={e => setEditando(p => ({ ...p, marca: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Moneda</label>
                  <select value={editando.moneda}
                    onChange={e => setEditando(p => ({ ...p, moneda: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                    <option>USD</option>
                    <option>ARS</option>
                    <option>MXN</option>
                    <option>EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Precio en USD</label>
                  <input type="number" min={0} step={0.01} placeholder="0.00"
                    value={editando.precio}
                    onChange={e => setEditando(p => ({ ...p, precio: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                  {editando.precio > 0 && (
                    <p className="text-xs text-rose-500 font-medium mt-1">
                      = $ {(editando.precio * cotizacion).toLocaleString('es-AR')} ARS
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Comisión %</label>
                  <input type="number" min={0} max={100} step={0.5}
                    value={editando.comision_pct}
                    onChange={e => setEditando(p => ({ ...p, comision_pct: parseFloat(e.target.value) || 0 }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Link de compra (externo)</label>
                <input type="url" placeholder="https://..."
                  value={editando.link_compra ?? ''}
                  onChange={e => setEditando(p => ({ ...p, link_compra: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button onClick={() => setModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium">Cancelar</button>
              <button onClick={guardar} disabled={guardando || !editando.nombre}
                className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-300 text-white py-2.5 rounded-lg text-sm font-medium">
                {guardando ? 'Guardando...' : 'Guardar producto'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
