'use client'

import { useEffect, useRef, useState } from 'react'
import { esFotoComunidad, idComunidadValido, type FotoComunidad } from '@/lib/community'
import { controlComunidad } from './community-client'

export default function CommunityPhotos({ publicacionId, fotos }: { publicacionId: string; fotos?: FotoComunidad[] }) {
  const [seleccion, setSeleccion] = useState<number | null>(null)
  const [errores, setErrores] = useState<Record<string, boolean>>({})
  const [reintentos, setReintentos] = useState<Record<string, number>>({})
  const dialogo = useRef<HTMLDialogElement | null>(null)
  const visibles = idComunidadValido(publicacionId) && Array.isArray(fotos) ? fotos.filter(esFotoComunidad).slice(0, 4) : []
  const actual = seleccion === null ? null : visibles[seleccion] ?? null
  const abierta = actual !== null
  const encabezadoId = `fotos-${publicacionId}`
  const ruta = (foto: FotoComunidad) => `/api/comunidad/${publicacionId}/fotos/${foto.id}`

  useEffect(() => {
    const elemento = dialogo.current
    if (abierta && elemento && !elemento.open) elemento.showModal()
    return () => { if (elemento?.open) elemento.close() }
  }, [abierta])

  function cambiarFoto(indice: number) { setSeleccion(indice) }
  function reintentar(id: string) {
    setErrores(prev => ({ ...prev, [id]: false }))
    setReintentos(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }))
  }
  if (!visibles.length) return null

  return <div className="mt-4 min-w-0" aria-label="Fotos de la publicación">
    <div className={`grid min-w-0 gap-2 ${visibles.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
      {visibles.map((foto, indice) => <div key={foto.id} className="min-w-0 rounded-[18px] border border-[#E7DDD5] bg-[#FAF7F3]">
        <button type="button" onClick={() => cambiarFoto(indice)} aria-label={`Ver foto ${indice + 1} de ${visibles.length}`} className={`block w-full overflow-hidden rounded-[17px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294A38] ${visibles.length === 1 ? 'aspect-[4/3] max-h-[30rem]' : 'aspect-square'}`}>
          {errores[foto.id] ? <span className="flex h-full min-h-32 items-center justify-center px-3 text-center text-xs leading-5 text-[#746A64]">No pudimos mostrar esta foto.</span>
            : <img key={`${foto.id}:${reintentos[foto.id] ?? 0}`} src={ruta(foto)} width={foto.ancho} height={foto.alto} alt={`Foto ${indice + 1} compartida en esta publicación`} loading="lazy" decoding="async" onError={() => setErrores(prev => ({ ...prev, [foto.id]: true }))} className="h-full w-full object-cover" />}
        </button>
        {errores[foto.id] && <div className="p-2 text-center"><button type="button" onClick={() => reintentar(foto.id)} className={`${controlComunidad} px-3 text-xs`}>Reintentar foto {indice + 1}</button></div>}
      </div>)}
    </div>
    <p className="mt-2 text-[11px] leading-5 text-[#746A64]">Tocá una foto para verla completa.</p>
    {actual && <dialog ref={dialogo} aria-labelledby={encabezadoId} onCancel={() => setSeleccion(null)} onClose={() => setSeleccion(null)} className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-full overflow-y-auto rounded-[24px] border border-[#E7DDD5] bg-[#FFFDFA] p-3 text-[#211C19] backdrop:bg-black/60 sm:p-5" style={{ maxWidth: 'min(64rem, calc(100vw - 1rem))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id={encabezadoId} className="text-base font-semibold">Foto {(seleccion ?? 0) + 1} de {visibles.length}</h2><button type="button" onClick={() => setSeleccion(null)} className={controlComunidad} autoFocus>Cerrar</button></div>
      <div className="mt-3 rounded-[16px] border border-[#E7DDD5] bg-[#FAF7F3] p-1">
        <img key={`ampliada:${actual.id}:${reintentos[actual.id] ?? 0}`} src={ruta(actual)} width={actual.ancho} height={actual.alto} alt={`Foto ${(seleccion ?? 0) + 1} de la publicación, completa`} onError={() => setErrores(prev => ({ ...prev, [actual.id]: true }))} className="mx-auto h-auto max-h-[65dvh] w-auto max-w-full object-contain" />
      </div>
      {errores[actual.id] && <p role="alert" className="mt-3 text-sm leading-6 text-[#746A64]">No pudimos abrir la foto. Tu sesión o la visibilidad de la publicación pueden haber cambiado. Actualizá la comunidad para volver a comprobarla.</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">{visibles.length > 1 && <><button type="button" disabled={seleccion === 0} onClick={() => cambiarFoto((seleccion ?? 0) - 1)} className={controlComunidad}>Anterior</button><button type="button" disabled={seleccion === visibles.length - 1} onClick={() => cambiarFoto((seleccion ?? 0) + 1)} className={controlComunidad}>Siguiente</button></>}</div>
        <a href={ruta(actual)} target="_blank" rel="noopener noreferrer" className={controlComunidad}>Abrir foto completa <span className="sr-only">en otra pestaña</span></a>
      </div>
    </dialog>}
  </div>
}
