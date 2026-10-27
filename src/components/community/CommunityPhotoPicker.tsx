'use client'

import { useRef, type ChangeEvent } from 'react'
import NavigationIcon from '@/components/NavigationIcon'
import { controlComunidad } from './community-client'

export interface FotoEnEditorComunidad {
  id: string
  nombre: string
  preview: string | null
  estado: 'preparando' | 'lista' | 'subiendo' | 'cargada' | 'error'
  error: string
}
interface Props {
  fotos: FotoEnEditorComunidad[]
  bloqueada: boolean
  preparando: boolean
  onSeleccion: (archivos: File[], reemplazarId?: string) => void
  onQuitar: (id: string) => void
}

export default function CommunityPhotoPicker({ fotos, bloqueada, preparando, onSeleccion, onQuitar }: Props) {
  const selector = useRef<HTMLInputElement | null>(null)
  const reemplazo = useRef<string | undefined>(undefined)
  function abrir(id?: string) {
    if (bloqueada || preparando) return
    reemplazo.current = id
    if (selector.current) { selector.current.multiple = !id; selector.current.click() }
  }
  function seleccionar(event: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(event.currentTarget.files ?? [])
    event.currentTarget.value = ''
    if (archivos.length && !bloqueada && !preparando) onSeleccion(archivos, reemplazo.current)
    reemplazo.current = undefined
  }
  return <section aria-label="Fotos para tu publicación" className="mt-4 min-w-0 border-t border-[#E7DDD5] pt-4">
    <input ref={selector} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={bloqueada || preparando} onChange={seleccionar} aria-label="Seleccionar fotos JPG, PNG o WebP" className="sr-only" />
    <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => abrir()} disabled={bloqueada || preparando || fotos.length >= 4} className={`${controlComunidad} bg-[#FAF7F3]`}><NavigationIcon name="comunidad" />{fotos.length ? 'Agregar fotos' : 'Agregar fotos a mi publicación'}</button><span className="text-xs tabular-nums text-[#746A64]">{fotos.length} / 4 fotos</span></div>
    <p className="mt-2 text-xs leading-5 text-[#746A64]">JPG, PNG o WebP · hasta 20 MB por original. Las preparamos para que carguen mejor desde el celular.</p>
    {fotos.length > 0 && <div className="mt-3 grid min-w-0 grid-cols-2 gap-3">{fotos.map((foto, indice) => <div key={foto.id} className="min-w-0 rounded-[18px] border border-[#E7DDD5] bg-[#FAF7F3] p-2">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-[12px] border border-[#E7DDD5] bg-[#FFFDFA]">{foto.preview ? <img src={foto.preview} alt={`Vista previa de la foto ${indice + 1}`} className="h-full w-full object-cover" /> : <span className="px-2 text-center text-xs leading-5 text-[#746A64]">Preparando tu foto…</span>}</div>
      <p className="mt-2 text-xs font-semibold text-[#294A38]">Foto {indice + 1}</p><p className="mt-1 break-words text-[11px] leading-5 text-[#746A64] [overflow-wrap:anywhere]">{foto.nombre}</p>
      {foto.estado === 'preparando' || foto.estado === 'subiendo' ? <p role="status" className="mt-1 text-xs leading-5 text-[#294A38]">{foto.estado === 'preparando' ? 'Preparando…' : 'Cargando esta foto…'}</p> : foto.estado === 'cargada' ? <p className="mt-1 text-xs leading-5 text-[#294A38]">Lista para publicar</p> : foto.estado === 'lista' ? <p className="mt-1 text-xs leading-5 text-[#746A64]">Todavía sin publicar</p> : null}
      {foto.error && <p role="alert" className="mt-2 text-xs leading-5 text-[#B01B30]">{foto.error}</p>}
      <div className="mt-2 flex flex-wrap gap-1"><button type="button" onClick={() => abrir(foto.id)} disabled={bloqueada || preparando} className="min-h-11 min-w-11 rounded-full px-2 text-xs font-medium text-[#294A38] underline-offset-4 hover:underline disabled:opacity-50">Reemplazar</button><button type="button" onClick={() => onQuitar(foto.id)} disabled={bloqueada || preparando} className="min-h-11 min-w-11 rounded-full px-2 text-xs font-medium text-[#294A38] underline-offset-4 hover:underline disabled:opacity-50">Quitar</button></div>
    </div>)}</div>}
    {fotos.length > 0 && <p className="mt-3 text-xs leading-5 text-[#746A64]">Elegir fotos no publica nada. Revisá que no muestren datos privados antes de compartir.</p>}
  </section>
}
