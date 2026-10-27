'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ArrowIcon from '@/components/ArrowIcon'
import NavigationIcon from '@/components/NavigationIcon'
import ResultsDashboard from '@/components/ResultsDashboard'
import SuccessCelebration, { useSuccessCelebration } from '@/components/SuccessCelebration'
import { ESTADO_RESULTADO, MAX_CAPTURA, dineroResultado, type Resultado, type EstadoResultado } from '@/lib/results'

const campo = 'mt-2 w-full rounded-xl border border-[#e7ddd5] bg-[#FAF7F3] px-4 py-3 text-sm outline-none focus:border-[#294A38]'
const boton = 'inline-flex items-center justify-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60'
export function Estado({ estado }: { estado: string }) {
  const estilo = ESTADO_RESULTADO[estado as EstadoResultado]
  return <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-medium ${estilo?.color ?? 'border-[#e7ddd5]'}`}>{estilo?.nombre ?? estado}</span>
}
export function Captura({ id, onReady }: { id: string; onReady?:(lista:boolean)=>void }) {
  const [fallo, setFallo] = useState(false)
  return fallo ? <p className="rounded-xl border border-[#e7ddd5] p-4 text-sm text-[#746a64]">No pudimos abrir la captura. <button type="button" className="underline" onClick={() => setFallo(false)}>Reintentar</button></p> :
    <a href={`/api/resultados/${id}/archivo`} target="_blank" rel="noopener noreferrer" aria-label="Abrir captura"><img src={`/api/resultados/${id}/archivo`} alt="Captura del resultado" onLoad={()=>onReady?.(true)} onError={() => {setFallo(true);onReady?.(false)}} className="max-h-80 w-full rounded-xl border border-[#e7ddd5] bg-[#FAF7F3] object-contain" /></a>
}
export default function ResultadosCliente({ misResultados, productos, periodoInicial, errorCarga = false }: {
  misResultados: Resultado[]; productos: { id: string; nombre: string; tipo: string }[]; periodoInicial: string; errorCarga?: boolean
}) {
  const router = useRouter()
  const [mostrarForm, setMostrarForm] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)
  const [descripcion, setDescripcion] = useState('')
  const [monto, setMonto] = useState('')
  const [periodo, setPeriodo] = useState(periodoInicial)
  const [producto, setProducto] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const intento = useRef<string | null>(null)
  const ocupado = useRef(false)
  const urlPreview = useRef('')
  const { celebration, celebrate } = useSuccessCelebration()
  useEffect(() => () => { if (urlPreview.current) URL.revokeObjectURL(urlPreview.current) }, [])
  function cambiarArchivo(file: File | null) {
    if (urlPreview.current) URL.revokeObjectURL(urlPreview.current)
    urlPreview.current = file ? URL.createObjectURL(file) : ''
    setPreview(urlPreview.current); setArchivo(file)
  }
  const historial = misResultados.filter(r => filtro === 'todos' || r.estado === filtro)
  function editar() { intento.current = null; setError(''); setExito(false) }
  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (ocupado.current) return
    ocupado.current = true; setEnviando(true); setError(''); setExito(false)
    try {
      if (!archivo) throw new Error('Adjuntá el comprobante para que Flor pueda revisar tu resultado.')
      if (monto === '' || Number(monto) <= 0) throw new Error('Ingresá la comisión en USD que figura en tu comprobante.')
      intento.current ??= crypto.randomUUID()
      const form = new FormData()
      form.set('datos', JSON.stringify({ id: intento.current, descripcion, monto: monto === '' ? null : Number(monto), periodo, producto_id: producto || null }))
      if (archivo) form.set('captura', archivo)
      const response = await fetch('/api/resultados', { method: 'POST', body: form })
      const respuesta = await response.json()
      if (!response.ok || !respuesta.ok || respuesta.id !== intento.current) throw new Error(respuesta.error || 'No pudimos confirmar el resultado. Tus datos se conservan para reintentar.')
      celebrate({ key: `resultado:${respuesta.id}`, title: '¡Bien ahí, Socia!', message: 'Recibimos tu resultado. Flor lo va a revisar.' })
      setExito(true); setMostrarForm(false); setDescripcion(''); setMonto(''); setProducto(''); cambiarArchivo(null); intento.current = null
      router.refresh()
    } catch (causa) { setError(causa instanceof Error ? causa.message : 'No pudimos conectarnos. Tus datos siguen en el formulario.') }
    finally { ocupado.current = false; setEnviando(false) }
  }
  return <div className="min-h-screen bg-[#F4EFEA] text-[#211c19]">
    <SuccessCelebration celebration={celebration} />
    <header data-student-section-header="true" className="flex h-[76px] items-center justify-between border-b border-[#e7ddd5] px-5 sm:px-8">
      <Link href="/inicio"><img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto" /></Link>
      <Link href="/inicio" className="inline-flex items-center gap-2 text-sm text-[#294A38]">Mi espacio <ArrowIcon /></Link>
    </header>
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#294A38]">Socias Digitales</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Mis resultados</h1></div><button type="button" onClick={() => { setMostrarForm(true); setExito(false) }} className={boton}><NavigationIcon name="resultados" />Cargar resultado</button></div>
      {errorCarga && <div role="alert" className="mt-6 rounded-xl border border-[#EC9BB6] bg-[#F4CAD8] p-4 text-sm">No pudimos cargar toda la información. <button type="button" onClick={() => router.refresh()} className="font-semibold underline">Reintentar</button></div>}
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#746a64]">Cargá tus comisiones con su comprobante. Flor las revisa y, una vez aprobadas, se suman a tu tablero.</p>
      {exito && <p role="status" className="mt-5 rounded-xl border border-[#294A38]/30 bg-white p-4 text-sm">Resultado enviado. Ya quedó en revisión.</p>}
      {mostrarForm && <section className="mt-6 rounded-[24px] border border-[#e7ddd5] bg-white p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4"><h2 className="text-xl font-semibold">Nuevo resultado</h2><button type="button" disabled={enviando} onClick={() => setMostrarForm(false)} className="text-sm text-[#746a64] underline">Cerrar</button></div>
        <form onSubmit={enviar} className="mt-5"><fieldset disabled={enviando} className="space-y-5">
          <label className="block text-sm font-medium">¿Qué resultado querés compartir?<textarea required maxLength={2000} value={descripcion} onChange={e => { editar(); setDescripcion(e.target.value) }} rows={4} className={campo} placeholder="Contanos el producto, la plataforma donde vendiste y cómo te fue." /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Comisión en USD<input required type="number" min=".01" max="1000000000" step=".01" value={monto} onChange={e => { editar(); setMonto(e.target.value) }} className={campo} placeholder="0,00" /><span className="mt-2 block text-xs font-normal leading-5 text-[#746a64]">Cargá tu comisión, no el precio del producto. No ingreses importes en pesos como si fueran dólares.</span></label><label className="block text-sm font-medium">Mes del resultado<input required type="month" max={periodoInicial} value={periodo} onChange={e => { editar(); setPeriodo(e.target.value) }} className={campo} /></label></div>
          <label className="block text-sm font-medium">Producto <span className="font-normal text-[#746a64]">(opcional)</span><select value={producto} onChange={e => { editar(); setProducto(e.target.value) }} className={campo}><option value="">Sin producto asociado</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
          <label className="block text-sm font-medium">Comprobante <span className="font-normal text-[#746a64]">(obligatorio)</span><input required type="file" accept="image/png,image/jpeg,image/webp" className={campo} onChange={e => {
            const file = e.target.files?.[0] ?? null
            editar()
            if (file && (file.size > MAX_CAPTURA || !['image/png','image/jpeg','image/webp'].includes(file.type))) { e.target.value = ''; cambiarArchivo(null); setError('Usá una imagen JPG, PNG o WEBP de hasta 3 MB.'); return }
            cambiarArchivo(file)
          }} /><span className="mt-2 block text-xs font-normal text-[#746a64]">JPG, PNG o WEBP · hasta 3 MB. Mostrá el monto y la plataforma; ocultá datos de clientas. El comprobante no se incluye en la imagen para redes.</span></label>
          {preview && <img src={preview} alt="Vista previa de tu captura" className="max-h-52 rounded-xl border border-[#e7ddd5] object-contain" />}
        </fieldset>{error && <p role="alert" className="mt-4 rounded-xl border border-[#EC9BB6] bg-[#F4CAD8] p-4 text-sm">{error}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#746a64]">Flor revisará tu carga antes de aprobarla.</p><button type="submit" disabled={enviando || errorCarga} className={boton}>{enviando ? 'Enviando…' : 'Enviar a revisión'}<ArrowIcon /></button></div></form>
      </section>}
      <ResultsDashboard resultados={misResultados} periodoActual={periodoInicial} errorCarga={errorCarga} />
      <section className="mt-8" aria-labelledby="historial-resultados">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="historial-resultados" className="text-xl font-semibold">Tu historial</h2><label className="text-xs text-[#746a64]">Estado <select value={filtro} onChange={e => setFiltro(e.target.value)} className="ml-2 rounded-full border border-[#e7ddd5] bg-white px-3 py-2 text-sm"><option value="todos">Todos</option>{Object.entries(ESTADO_RESULTADO).map(([id,s]) => <option key={id} value={id}>{s.nombre}</option>)}</select></label></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">{historial.map(r => <article key={r.id} className="rounded-[22px] border border-[#e7ddd5] bg-white p-5">
          <div className="flex items-center justify-between gap-2"><p className="text-xs text-[#746a64]">{r.mes || new Date(r.created_at).toLocaleDateString('es-AR')}</p><Estado estado={r.estado} /></div>
          {r.monto !== null && <p className="mt-4 font-impact text-2xl font-semibold">{dineroResultado(Number(r.monto))}</p>}
          {r.titulo && <h3 className="mt-3 font-semibold">{r.titulo}</h3>}<p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">{r.descripcion}</p>
          {r.archivo_url && <div className="mt-4"><Captura id={r.id} /></div>}
        </article>)}</div>
        {!errorCarga && !historial.length && <div className="mt-4 rounded-[22px] border border-[#e7ddd5] bg-[#FAF7F3] p-8 text-center"><p className="text-sm text-[#746a64]">{misResultados.length ? 'No hay resultados con este estado.' : 'Tu primer resultado empieza acá.'}</p>{!misResultados.length && <button type="button" onClick={() => setMostrarForm(true)} className="mt-4 text-sm font-semibold text-[#294A38] underline">Cargar resultado</button>}</div>}
      </section>
    </main>
  </div>
}
