'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import EmailPreference from '@/components/EmailPreference'
import { OCUPACIONES, INGRESOS } from '@/lib/perfil-preguntas'

interface Perfil {
  id: string
  nombre: string
  avatar_url: string | null
  progreso: number
  rol: string
  whatsapp: string | null
  telefono?: string | null
  fecha_nacimiento: string | null
  ocupacion: string | null
  titulo_profesional: string | null
  es_mama: boolean | null
  ingresos_actuales: string | null
  pais: string | null
  provincia: string | null
}

interface Props {
  user: User
  perfil: Perfil | null
}

export default function PerfilCliente({ user, perfil }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [nombre, setNombre] = useState(perfil?.nombre ?? '')
  const [telefono, setTelefono] = useState(perfil?.whatsapp ?? perfil?.telefono ?? '')
  const [fechaNacimiento, setFechaNacimiento] = useState(perfil?.fecha_nacimiento ?? '')
  const [ocupacion, setOcupacion] = useState(perfil?.ocupacion ?? '')
  const [tituloProfesional, setTituloProfesional] = useState(perfil?.titulo_profesional ?? '')
  const [esMama, setEsMama] = useState<boolean | null>(perfil?.es_mama ?? null)
  const [ingresosActuales, setIngresosActuales] = useState(perfil?.ingresos_actuales ?? '')
  const [pais, setPais] = useState(perfil?.pais ?? '')
  const [provincia, setProvincia] = useState(perfil?.provincia ?? '')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(perfil?.avatar_url ?? null)
  const [editando, setEditando] = useState(true)
  const [bannerProximamente, setBannerProximamente] = useState(false)

  const searchParams = useSearchParams()
  useEffect(() => {
    if (searchParams.get('proximamente') !== '1') return
    const showTimer = window.setTimeout(() => setBannerProximamente(true), 0)
    const hideTimer = window.setTimeout(() => setBannerProximamente(false), 4000)
    return () => {
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [searchParams])

  const progreso = perfil?.progreso ?? 0
  const esAdmin = perfil?.rol === 'admin'

  async function guardarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setGuardando(true)
    setMensaje('')

    const { data, error } = await supabase
      .from('perfiles')
      .update({
        nombre,
        whatsapp: telefono || null,
        avatar_url: avatarUrl,
        fecha_nacimiento: fechaNacimiento || null,
        ocupacion: ocupacion || null,
        titulo_profesional: tituloProfesional || null,
        es_mama: esMama,
        ingresos_actuales: ingresosActuales || null,
        pais: pais || null,
        provincia: provincia || null,
      })
      .eq('id', user.id).select('id').maybeSingle()

    if (error || !data) {
      setMensaje('Error al guardar. Intentá de nuevo.')
    } else {
      setMensaje('¡Perfil guardado con éxito!')
      router.refresh()
    }
    setGuardando(false)
  }

  async function subirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0]
    if (!archivo) return
    setSubiendoFoto(true)
    const extension = archivo.name.split('.').pop()
    const nombreArchivo = `${user.id}/avatar-${Date.now()}.${extension}`
    const { error } = await supabase.storage.from('avatars').upload(nombreArchivo, archivo, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(nombreArchivo)
      setAvatarUrl(data.publicUrl)
    }
    setSubiendoFoto(false)
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const inputClass = "w-full border border-[#EC9BB6]/55 bg-[#FAF7F3] rounded-xl px-4 py-3 text-[#171413] focus:outline-none focus:ring-2 focus:ring-[#294A38]"
  const labelClass = "block text-sm font-medium text-[#655B56] mb-1.5"

  return (
    <div className="min-h-screen bg-[#F4EFEA] text-[#171413]">
      <nav className="flex items-center justify-between bg-[#FAF7F3] px-5 py-4 sm:px-8">
        <Link href={esAdmin ? '/admin' : '/inicio'} aria-label={esAdmin ? 'Volver al panel de Flor' : 'Volver a mi espacio'}>
          <img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" style={{ height: 44, width: 'auto', objectFit: 'contain' }} />
        </Link>
        <div className="flex items-center gap-4">
          <Link href={esAdmin ? '/admin' : '/inicio'} className="text-sm font-medium text-[#294A38]">{esAdmin ? 'Panel de Flor' : 'Mi espacio'}</Link>
          <button onClick={cerrarSesion} className="text-sm text-[#655B56] hover:text-[#171413]">Cerrar sesión</button>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:py-10">

        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#294A38]">Tu cuenta</p>
          <h1 className="mt-2 font-serif text-4xl text-[#171413]">Mi perfil</h1>
          <p className="mt-2 text-sm leading-6 text-[#655B56]">Tus datos y preferencias.</p>
        </header>

        {/* Banner próximamente */}
        {bannerProximamente && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-bold text-amber-800 text-sm">Sección en preparación</p>
              <p className="text-xs text-amber-600 mt-0.5">Esa sección estará disponible muy pronto. Por ahora podés completar tu perfil y cargar tus métricas.</p>
            </div>
          </div>
        )}

        {/* Tarjeta compacta de perfil */}
        {!editando && nombre ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} className="w-16 h-16 rounded-full object-cover border-4 border-[#F4CAD8]" alt="" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F4CAD8] font-impact text-xl font-medium text-[#294A38]">{(nombre || 'SD').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}</div>
              )}
              <div>
                <p className="font-bold text-gray-900 text-lg">{nombre}</p>
                {(pais || provincia) && (
                  <p className="text-sm text-gray-500">{[provincia, pais].filter(Boolean).join(', ')}</p>
                )}
                {ocupacion && <p className="text-xs text-[#294A38] mt-0.5">{ocupacion}</p>}
              </div>
            </div>
            <button onClick={() => setEditando(true)}
              className="text-sm text-[#294A38] hover:text-[#171413] font-medium border border-[#F4CAD8] rounded-lg px-4 py-2 hover:bg-rose-50 transition-colors">
              Completá tu perfil
            </button>
          </div>
        ) : null}

        {/* Formulario de perfil (colapsable) */}
        {editando && (
        <div className="rounded-2xl border border-[#EC9BB6]/50 bg-white p-5 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-serif text-3xl font-semibold text-[#171413]">Completá tu perfil</h2>
            {nombre && (
              <button onClick={() => setEditando(false)} className="text-sm text-gray-400 hover:text-gray-600">✕ Cerrar</button>
            )}
          </div>

          {/* Avatar */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-28 h-28 mb-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Foto de perfil" className="w-28 h-28 rounded-full object-cover border-4 border-[#F4CAD8]" />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#F4CAD8] font-impact text-3xl font-medium text-[#294A38]">{(nombre || 'SD').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}</div>
              )}
            </div>
            <label className="cursor-pointer text-sm text-[#294A38] hover:text-[#171413] font-medium">
              {subiendoFoto ? 'Subiendo...' : 'Cambiar foto'}
              <input type="file" accept="image/*" onChange={subirFoto} className="hidden" />
            </label>
          </div>

          <form onSubmit={guardarPerfil} className="space-y-5">

            {/* Nombre */}
            <div>
              <label htmlFor="perfil-nombre" className={labelClass}>Nombre completo</label>
              <input id="perfil-nombre" type="text" value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Tu nombre" className={inputClass} />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="perfil-email" className={labelClass}>Email</label>
              <input id="perfil-email" type="email" value={user.email ?? ''} disabled className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-gray-500 bg-gray-50" />
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="perfil-telefono" className={labelClass}>Teléfono / WhatsApp (opcional)</label>
              <input id="perfil-telefono" type="tel" value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Con código de país" className={inputClass} autoComplete="tel" />
            </div>

            {/* Fecha de nacimiento */}
            <div>
              <label htmlFor="perfil-nacimiento" className={labelClass}>Fecha de nacimiento</label>
              <input id="perfil-nacimiento" type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)} className={inputClass} />
            </div>

            {/* Ocupación */}
            <div>
              <label htmlFor="perfil-ocupacion" className={labelClass}>Ocupación</label>
              <select id="perfil-ocupacion" value={ocupacion} onChange={e => setOcupacion(e.target.value)} className={inputClass}>
                <option value="">Seleccioná una opción</option>
                {ocupacion && !OCUPACIONES.includes(ocupacion) && <option value={ocupacion}>{ocupacion}</option>}
                {OCUPACIONES.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Título profesional (solo si es Profesional) */}
            {(ocupacion === 'Profesional' || tituloProfesional) && (
              <div>
                <label htmlFor="perfil-titulo" className={labelClass}>¿Cuál es tu título?</label>
                <input id="perfil-titulo" type="text" value={tituloProfesional} onChange={e => setTituloProfesional(e.target.value)} placeholder="Ej: Licenciada en Administración" className={inputClass} />
              </div>
            )}

            {/* ¿Sos mamá? */}
            <div>
              <label className={labelClass}>¿Sos mamá?</label>
              <div className="flex gap-4">
                <button type="button" aria-pressed={esMama === true} onClick={() => setEsMama(true)}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${esMama === true ? 'border-[#294A38] bg-[#F4CAD8] text-[#171413]' : 'border-gray-200 text-gray-500 hover:border-[#EC9BB6]'}`}>
                  Sí
                </button>
                <button type="button" aria-pressed={esMama === false} onClick={() => setEsMama(false)}
                  className={`flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-colors ${esMama === false ? 'border-[#294A38] bg-[#F4CAD8] text-[#171413]' : 'border-gray-200 text-gray-500 hover:border-[#EC9BB6]'}`}>
                  No
                </button>
              </div>
            </div>

            {/* Ingresos actuales */}
            <div>
              <label htmlFor="perfil-ingresos" className={labelClass}>Ingresos actuales</label>
              <select id="perfil-ingresos" value={ingresosActuales} onChange={e => setIngresosActuales(e.target.value)} className={inputClass}>
                <option value="">Seleccioná una opción</option>
                {ingresosActuales && !INGRESOS.includes(ingresosActuales) && <option value={ingresosActuales}>{ingresosActuales}</option>}
                {INGRESOS.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            {/* País */}
            <div>
              <label htmlFor="perfil-pais" className={labelClass}>País</label>
              <input id="perfil-pais" type="text" value={pais} onChange={e => setPais(e.target.value)} placeholder="Ej: Argentina" className={inputClass} />
            </div>

            {/* Provincia */}
            <div>
              <label htmlFor="perfil-provincia" className={labelClass}>Provincia / Estado</label>
              <input id="perfil-provincia" type="text" value={provincia} onChange={e => setProvincia(e.target.value)} placeholder="Ej: Buenos Aires" className={inputClass} />
            </div>

            {/* Progreso */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">Progreso del curso</label>
                <span className="text-sm font-bold text-[#294A38]">{progreso}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-[#294A38] h-3 rounded-full transition-all" style={{ width: `${progreso}%` }} />
              </div>
            </div>

            {mensaje && (
              <p className={`text-sm rounded-lg px-3 py-2 ${mensaje.includes('Error') ? 'text-red-600 bg-red-50 border border-red-200' : 'text-green-700 bg-green-50 border border-green-200'}`}>
                {mensaje}
              </p>
            )}

            <button type="submit" disabled={guardando}
              className="w-full bg-[#294A38] hover:bg-[#203a2c] disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors">
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>
        </div>
        )}
        <section className="flex items-center justify-between gap-4 rounded-2xl border border-[#EC9BB6]/45 bg-[#FAF7F3] p-5">
          <div><h2 className="text-sm font-semibold">Seguridad de tu cuenta</h2><p className="mt-1 text-xs text-[#655B56]">Tu contraseña es personal.</p></div>
          <Link href="/cuenta/contrasena" className="text-sm font-semibold text-[#294A38] underline underline-offset-4">Cambiar contraseña</Link>
        </section>

        <EmailPreference />

      </div>
    </div>
  )
}
