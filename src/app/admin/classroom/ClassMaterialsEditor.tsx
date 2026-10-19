'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ACEPTAR_MATERIALES, archivoMaterial, detalleMaterial, enlaceMaterial, tituloMaterial, type MaterialClase } from '@/lib/class-materials'
import { MaterialIcon } from '@/components/ClassMaterials'

interface Lista { materiales: MaterialClase[]; revision: string | null }
interface Carga { ticket: string; url: string; mime: string; subido?: boolean }
const campo = 'mt-2 min-h-11 w-full min-w-0 rounded-xl border border-[#D8CFC8] bg-[#FFFDFA] px-3 py-3 text-base'
const boton = 'min-h-11 rounded-full border border-[#D8CFC8] px-4 py-2 text-sm text-[#294A38] disabled:opacity-50'
async function consultarMateriales(claseId: string, signal?: AbortSignal): Promise<Lista> {
  const response = await fetch(`/api/admin/clases/${claseId}/materiales`, { cache: 'no-store', signal })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error ?? 'No pudimos cargar los materiales.')
  return data
}
function enviarArchivo(carga: Carga, file: File, progreso: (n: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', carga.url); xhr.timeout = 10 * 60_000
    xhr.setRequestHeader('Content-Type', carga.mime)
    xhr.upload.onprogress = e => { if (e.lengthComputable) progreso(Math.round(e.loaded / e.total * 100)) }
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error('No pudimos subir el archivo. Revisá tu conexión y reintentá.'))
    xhr.onerror = xhr.ontimeout = () => reject(new Error('Se interrumpió la carga. Revisá tu conexión y reintentá.'))
    xhr.send(file)
  })
}
export default function ClassMaterialsEditor({ claseId, disabled = false, onBusy }: { claseId: string; disabled?: boolean; onBusy: (busy: boolean) => void }) {
  const [lista, setLista] = useState<Lista | null>(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [busy, setBusy] = useState(false)
  const [modo, setModo] = useState<'archivo' | 'enlace'>('archivo')
  const [titulo, setTitulo] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [porcentaje, setPorcentaje] = useState(0)
  const [edicion, setEdicion] = useState<{ id: string; titulo: string; url?: string } | null>(null)
  const [recargar, setRecargar] = useState(false)
  const [lectura, setLectura] = useState(true)
  const carga = useRef<Carga | null>(null), fileRef = useRef<HTMLInputElement>(null)
  const recibir = useCallback((data: Lista) => { setLista(data); setError(''); setRecargar(false); setLectura(false) }, [])
  useEffect(() => {
    const c = new AbortController()
    void consultarMateriales(claseId, c.signal).then(data => { if (!c.signal.aborted) recibir(data) }, cause => {
      if (!c.signal.aborted) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar los materiales.'); setLectura(false) }
    })
    return () => c.abort()
  }, [claseId, recibir])
  async function cargar() {
    setLectura(true)
    try { recibir(await consultarMateriales(claseId)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos cargar los materiales.'); setLectura(false) }
  }
  async function api(body: Record<string, unknown>) {
    const response = await fetch(`/api/admin/clases/${claseId}/materiales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, revision: lista?.revision }) })
    const data = await response.json()
    if (!response.ok) { if (response.status === 409) setRecargar(true); throw new Error(data.error ?? 'No pudimos guardar.') }
    return data
  }
  async function ejecutar(trabajo: () => Promise<void>) {
    if (busy || disabled || !lista || lectura || recargar) return
    setBusy(true); onBusy(true); setError(''); setAviso('')
    try { await trabajo() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No pudimos guardar el material.') }
    finally { setBusy(false); onBusy(false) }
  }
  async function agregar(e: React.FormEvent) {
    e.preventDefault()
    await ejecutar(async () => {
      const nombre = tituloMaterial(titulo)
      let guardada: Lista
      if (modo === 'enlace') guardada = await api({ action: 'enlace', titulo: nombre, url: enlaceMaterial(url) })
      else {
        if (!file) throw new Error('Elegí el archivo que querés adjuntar.')
        archivoMaterial(file.name, file.size)
        if (!carga.current) carga.current = await api({ action: 'preparar', titulo: nombre, nombre: file.name, bytes: file.size })
        const pendiente = carga.current!
        if (!pendiente.subido) {
          try { await enviarArchivo(pendiente, file, setPorcentaje); pendiente.subido = true }
          catch (cause) { carga.current = null; throw cause }
        }
        guardada = await api({ action: 'finalizar', ticket: pendiente.ticket })
      }
      setLista(guardada); setTitulo(''); setUrl(''); setFile(null); carga.current = null; setPorcentaje(0)
      if (fileRef.current) fileRef.current.value = ''
      setAviso('Material guardado. Sigue el acceso y la publicación de esta clase.')
    })
  }
  function cambiarModo(nuevo: 'archivo' | 'enlace') { if (nuevo !== modo) { setFile(null); setPorcentaje(0) } setModo(nuevo); carga.current = null; setError(''); setAviso('') }
  const bloqueado = disabled || busy || lectura || !lista || recargar
  const activas = lista?.materiales.filter(m => m.activo) ?? [], retiradas = lista?.materiales.filter(m => !m.activo) ?? []
  function fila(m: MaterialClase) {
    return <li key={m.id} className="rounded-xl border border-[#E7DDD5] bg-[#FFFDFA] p-3">
      <div className="flex items-start gap-3 text-[#294A38]"><MaterialIcon enlace={m.tipo === 'enlace'} /><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold text-[#211C19]">{m.titulo}</p><p className="mt-1 break-words text-xs text-[#746A64]">{detalleMaterial(m)}</p></div></div>
      {edicion?.id === m.id ? <form onSubmit={e => { e.preventDefault(); void ejecutar(async () => { setLista(await api({ action: 'editar', materialId: m.id, titulo: tituloMaterial(edicion.titulo), ...(m.tipo === 'enlace' ? { url: enlaceMaterial(edicion.url) } : {}) })); setEdicion(null); setAviso('Material actualizado.') }) }} className="mt-3 space-y-3"><fieldset disabled={bloqueado} className="space-y-3"><label className="block text-sm">Nombre del material<input required maxLength={120} value={edicion.titulo} onChange={e => setEdicion({ ...edicion, titulo: e.target.value })} className={campo} /></label>{m.tipo === 'enlace' && <label className="block text-sm">Enlace del material<input type="url" required maxLength={2048} value={edicion.url ?? ''} onChange={e => setEdicion({ ...edicion, url: e.target.value })} className={campo} /></label>}<div className="flex flex-wrap gap-2"><button className={boton}>Guardar material</button><button type="button" onClick={() => setEdicion(null)} className={boton}>Cancelar edición</button></div></fieldset></form>
        : <div className="mt-2 flex flex-wrap gap-2">{m.activo && <><a href={`/api/classroom/${claseId}/materiales/${m.id}`} target="_blank" rel="noopener noreferrer" className={boton + ' inline-flex items-center'}>Abrir</a><button type="button" disabled={bloqueado} onClick={() => setEdicion({ id: m.id, titulo: m.titulo, ...(m.tipo === 'enlace' ? { url: m.url } : {}) })} className={boton}>Editar</button></>}<button type="button" disabled={bloqueado} onClick={() => void ejecutar(async () => { setLista(await api({ action: m.activo ? 'retirar' : 'restaurar', materialId: m.id })); setAviso(m.activo ? 'Material retirado. Podés restaurarlo más abajo.' : 'Material restaurado.') })} className={boton}>{m.activo ? 'Retirar' : 'Restaurar'}</button></div>}
    </li>
  }
  return <section aria-label="Materiales de la clase" className="mt-5 rounded-2xl border border-[#E7DDD5] bg-[#F4EFEA]/50 p-4">
    <h3 className="font-impact text-base font-semibold">Materiales de la clase</h3><p className="mt-2 text-sm leading-5 text-[#746A64]">Archivos y enlaces que acompañan este video. Se guardan por separado y tienen el mismo acceso que la clase.</p>
    {lectura && <p role="status" className="mt-3 text-sm text-[#746A64]">Cargando materiales…</p>}
    {lista && <><ul className="mt-4 space-y-2">{activas.map(fila)}</ul>{!activas.length && <p className="mt-3 text-sm text-[#746A64]">Esta clase todavía no tiene materiales.</p>}
      <form onSubmit={e => void agregar(e)} className="mt-4"><fieldset disabled={bloqueado} className="space-y-3"><legend className="mb-3 text-sm font-semibold">Agregar material</legend>
        <div className="flex flex-wrap gap-2">{(['archivo', 'enlace'] as const).map(m => <button type="button" key={m} aria-pressed={modo === m} onClick={() => cambiarModo(m)} className={`${boton} ${modo === m ? 'border-[#EC9BB6] bg-[#F4CAD8]' : 'bg-[#FFFDFA]'}`}>{m === 'archivo' ? 'Subir archivo' : 'Agregar enlace'}</button>)}</div>
        <label className="block text-sm">Nombre para las alumnas<input required maxLength={120} value={titulo} onChange={e => { setTitulo(e.target.value); carga.current = null }} className={campo} placeholder="Ej.: Guía de ejercicios" /></label>
        {modo === 'enlace' ? <><label className="block text-sm">Enlace HTTPS<input key="material-link" type="url" required maxLength={2048} value={url} onChange={e => setUrl(e.target.value)} className={campo} placeholder="https://…" /></label><p className="text-xs leading-5 text-[#746A64]">Para Google Drive o Docs, revisá que las alumnas tengan permiso en ese servicio.</p></>
          : <><label className="block text-sm">Archivo<input key="material-file" ref={fileRef} type="file" accept={ACEPTAR_MATERIALES} onChange={e => { const elegido = e.target.files?.[0]; carga.current = null; setPorcentaje(0); setError(''); if (!elegido) { setFile(null); return } try { archivoMaterial(elegido.name, elegido.size); setFile(elegido); if (!titulo) setTitulo(elegido.name.replace(/\.[^.]+$/, '').slice(0, 120)) } catch (cause) { setFile(null); e.target.value = ''; setError(cause instanceof Error ? cause.message : 'Archivo no válido.') } }} className={campo + ' file:mr-3 file:rounded-full file:border-0 file:bg-[#F4CAD8] file:px-3 file:py-2 file:text-sm'} /></label><p className="text-xs leading-5 text-[#746A64]">PDF, Word (.docx), Excel (.xlsx), PowerPoint (.pptx), TXT o imágenes. Hasta 25 MB por archivo.</p></>}
        <button disabled={modo === 'archivo' && !file} className="min-h-11 w-full rounded-full bg-[#294A38] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? modo === 'archivo' && porcentaje < 100 ? `Subiendo… ${porcentaje}%` : 'Guardando material…' : 'Guardar material'}</button>
      </fieldset></form>
      {retiradas.length > 0 && <details className="mt-4 border-t border-[#E7DDD5] pt-3"><summary className="min-h-11 cursor-pointer py-3 text-sm text-[#746A64]">Materiales retirados · {retiradas.length}</summary><ul className="mt-2 space-y-2">{retiradas.map(fila)}</ul></details>}
    </>}
    {aviso && <p role="status" className="mt-3 rounded-xl border border-[#E7DDD5] bg-[#FFFDFA] p-3 text-sm text-[#294A38]">{aviso}</p>}
    {error && <p role="alert" className="mt-3 text-sm text-[#B01B30]">{error}</p>}
    {(!lista || recargar || error) && !busy && <button type="button" disabled={disabled || lectura} onClick={() => void cargar()} className={boton + ' mt-3'}>Recargar materiales</button>}
  </section>
}
