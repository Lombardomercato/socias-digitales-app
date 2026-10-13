'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import ArrowIcon from '@/components/ArrowIcon'
import { ResumenMetricas, EvolucionMetricas } from '@/components/MetricsVisuals'
import { CAMPOS_DINERO, CAMPOS_CONTEO, ESTRATEGIAS_METRICAS, validarMetrica, claveCampana, fechaMetrica, calcularMetricas, dineroMetrica, type Metrica, type DatosMetrica } from '@/lib/metrics'

const campo='mt-2 w-full min-w-0 rounded-xl border border-[#e7ddd5] bg-[#FAF7F3] px-3 py-2.5 text-sm outline-none focus:border-[#294A38]'
const boton='inline-flex items-center justify-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60'
type Formulario={campana:string;fecha:string;estrategia:DatosMetrica['estrategia']} & Record<typeof CAMPOS_DINERO[number]|typeof CAMPOS_CONTEO[number]|'dias_captacion',string>
const nuevoForm=(fecha:string):Formulario=>({campana:'',fecha,estrategia:'lanzamiento',comision_producto:'',inversion:'',inversion_por_dia:'',gasto_acumulado:'',dias_captacion:'',mensajes_recibidos:'0',personas_grupo:'0',reservas:'0',ventas:'0'})
function formularioDesde(m:Metrica,fecha:string):Formulario {
  const form=nuevoForm(fecha)
  form.campana=m.campana;form.estrategia=m.estrategia
  for(const k of [...CAMPOS_DINERO,...CAMPOS_CONTEO,'dias_captacion'] as const)form[k]=m[k]===null?'':String(m[k])
  return form
}
const camposPresupuesto=[
  {id:'comision_producto',label:'Comisión por venta · USD'},
  {id:'inversion',label:'Presupuesto total · USD'},
  {id:'inversion_por_dia',label:'Presupuesto diario · USD'},
  {id:'dias_captacion',label:'Días de captación'},
  {id:'gasto_acumulado',label:'Gasto real acumulado · USD'},
] as const
const camposResultados=[{id:'mensajes_recibidos',label:'Mensajes recibidos'},{id:'personas_grupo',label:'Personas en el grupo'},{id:'reservas',label:'Reservas'},{id:'ventas',label:'Ventas concretadas'}] as const
export default function MetricasCliente({historial,fechaInicial,errorCarga=false,limitado=false}:{
  historial:Metrica[];fechaInicial:string;errorCarga?:boolean;limitado?:boolean
}) {
  const router=useRouter()
  const [form,setForm]=useState<Formulario>(()=>historial[0]?formularioDesde(historial[0],fechaInicial):nuevoForm(fechaInicial))
  const [editando,setEditando]=useState<{id:string;version:number}|null>(()=>historial[0]?.fecha===fechaInicial?{id:historial[0].id,version:historial[0].version}:null)
  const [locales,setLocales]=useState<Record<string,Metrica>>({})
  const [filtroCampana,setFiltroCampana]=useState('')
  const [guardando,setGuardando]=useState(false)
  const [error,setError]=useState('')
  const [guardado,setGuardado]=useState('')
  const [conflicto,setConflicto]=useState(false)
  const intento=useRef<string|null>(null)
  const ocupado=useRef(false)
  const formRef=useRef<HTMLFormElement>(null)
  const registros=new Map(historial.map(m=>[m.id,m]))
  Object.values(locales).forEach(m=>{const original=registros.get(m.id);if(!original || m.version>original.version)registros.set(m.id,m)})
  const todos=[...registros.values()].sort((a,b)=>b.fecha.localeCompare(a.fecha)||b.actualizado_at.localeCompare(a.actualizado_at))
  const campanas=[...new Map(todos.map(m=>[claveCampana(m),m])).entries()]
  const claveSeleccionada=filtroCampana || (todos[0] ? claveCampana(todos[0]) : '')
  const filtrados=todos.filter(m=>claveCampana(m)===claveSeleccionada)
  const numero=(v:string)=>v.trim()===''?null:Number(v)
  const datos:DatosMetrica={campana:form.campana,fecha:form.fecha,estrategia:form.estrategia,comision_producto:numero(form.comision_producto),inversion:numero(form.inversion),inversion_por_dia:numero(form.inversion_por_dia),gasto_acumulado:numero(form.gasto_acumulado),dias_captacion:numero(form.dias_captacion),mensajes_recibidos:Number(form.mensajes_recibidos),personas_grupo:Number(form.personas_grupo),reservas:Number(form.reservas),ventas:Number(form.ventas)}
  function modificar<K extends keyof Formulario>(k:K,v:Formulario[K]) {setForm(prev=>({...prev,[k]:v}));setError('');setGuardado('');intento.current=null}
  function abrir(m:Metrica,continuar=false) {
    const siguiente=formularioDesde(m,continuar?fechaInicial:m.fecha)
    setForm(siguiente);setEditando(continuar?null:{id:m.id,version:m.version});setConflicto(false);setError('');setGuardado('');intento.current=null
    formRef.current?.scrollIntoView({behavior:'instant',block:'start'})
  }
  function nuevo() {setForm(nuevoForm(fechaInicial));setEditando(null);setConflicto(false);setError('');setGuardado('');intento.current=null;formRef.current?.scrollIntoView({behavior:'instant',block:'start'})}
  async function guardar(e:React.FormEvent) {
    e.preventDefault()
    if(ocupado.current || conflicto) return
    ocupado.current=true;setGuardando(true);setError('');setGuardado('')
    try {
      intento.current??=crypto.randomUUID()
      const entrada={...datos,id:editando?.id??intento.current,version:editando?.version??null}
      validarMetrica(entrada,editando?'editar':'crear')
      const response=await fetch('/api/metricas',{method:editando?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entrada)})
      const data=await response.json()
      if(!response.ok || !data.ok || !data.metrica) {if(response.status===409 && editando){setConflicto(true);router.refresh()}throw new Error(data.error||'No pudimos guardar el análisis.')}
      const m=data.metrica as Metrica
      setLocales(prev=>({...prev,[m.id]:m}));setEditando({id:m.id,version:m.version});setFiltroCampana(claveCampana(m));setGuardado('Análisis guardado. Ya aparece en tu historial.');intento.current=null;router.refresh()
    }catch(causa){setError(causa instanceof Error?causa.message:'No pudimos conectarnos. Tus datos siguen en el formulario.')}
    finally{setGuardando(false);ocupado.current=false}
  }
  return <div className="min-h-screen bg-[#F4EFEA] text-[#211c19]">
    <header className="flex h-[76px] items-center justify-between border-b border-[#e7ddd5] px-5 sm:px-8"><Link href="/inicio"><img src="/academy-horizontal-color.png" alt="Socias Digitales Academy" className="h-11 w-auto" /></Link><Link href="/inicio" className="inline-flex items-center gap-2 text-sm text-[#294A38]">Mi espacio <ArrowIcon /></Link></header>
    <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#294A38]">Socias Digitales</p><h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-.04em] sm:text-5xl">Mis métricas</h1></div><button type="button" onClick={nuevo} disabled={guardando} className="inline-flex rounded-full border border-[#294A38]/30 px-5 py-3 text-sm font-medium text-[#294A38]">Nuevo análisis +</button></div>
      {errorCarga && <p role="alert" className="mt-5 rounded-xl border border-[#EC9BB6] bg-[#F4CAD8] p-4 text-sm">No pudimos cargar el historial. Tus datos del formulario se conservan. <button type="button" onClick={()=>router.refresh()} className="underline">Reintentar</button></p>}
      <form ref={formRef} onSubmit={guardar} className="mt-6 scroll-mt-5">
        <fieldset disabled={guardando} className="space-y-4">
          <section className="grid gap-4 rounded-[22px] border border-[#e7ddd5] bg-white p-5 sm:grid-cols-[1.5fr_1fr_1fr]">
            <label className="block min-w-0 text-sm font-medium">Campaña<input required maxLength={100} value={form.campana} onChange={e=>modificar('campana',e.target.value)} placeholder="Ej. Socias · octubre" className={campo} /></label>
            <label className="block min-w-0 text-sm font-medium">Fecha del análisis<input required type="date" max={fechaInicial} value={form.fecha} onChange={e=>modificar('fecha',e.target.value)} className={campo} /></label>
            <label className="block min-w-0 text-sm font-medium">Estrategia<select value={form.estrategia} onChange={e=>modificar('estrategia',e.target.value as DatosMetrica['estrategia'])} className={campo}>{Object.entries(ESTRATEGIAS_METRICAS).map(([id,nombre])=><option key={id} value={id}>{nombre}</option>)}</select></label>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-[22px] border border-[#e7ddd5] bg-white p-5"><h2 className="text-base font-semibold">Inversión y comisión</h2><p className="mt-1 text-xs text-[#746a64]">Podés dejar vacíos los importes que todavía no conozcas.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{camposPresupuesto.map(c=><label key={c.id} className={`block min-w-0 text-xs font-medium ${c.id==='gasto_acumulado'?'rounded-xl border border-[#EC9BB6]/60 bg-[#F4CAD8]/40 p-3 sm:col-span-2':''}`}>{c.label}<input type="number" min="0" max={c.id==='dias_captacion'?3650:1e9} step={c.id==='dias_captacion'?'1':'.01'} value={form[c.id]} onChange={e=>modificar(c.id,e.target.value)} className={campo} placeholder={c.id==='gasto_acumulado'?'Lo gastado hasta esta fecha':'Opcional'} />{c.id==='gasto_acumulado' && <span className="mt-2 block text-[11px] font-normal text-[#746a64]">Este es el gasto real de toda la campaña, no solo del día.</span>}</label>)}</div></section>
            <section className="rounded-[22px] border border-[#e7ddd5] bg-[#FAF7F3] p-5"><h2 className="text-base font-semibold">Resultados hasta esa fecha</h2><p className="mt-1 text-xs leading-5 text-[#746a64]">Cargá los totales acumulados de esta campaña. No solo lo de hoy.</p><div className="mt-4 grid gap-4 sm:grid-cols-2">{camposResultados.map(c=><label key={c.id} className="block min-w-0 text-xs font-medium">{c.label}<input required type="number" min="0" max="1000000000" step="1" value={form[c.id]} onChange={e=>modificar(c.id,e.target.value)} className={campo} /></label>)}</div><p className="mt-5 border-t border-[#e7ddd5] pt-4 text-xs leading-5 text-[#746a64]">Un análisis por campaña, estrategia y fecha. Desde el historial podés corregirlo o continuar al día siguiente.</p></section>
          </div>
        </fieldset>
        {error && <div role="alert" className="mt-4 rounded-xl border border-[#EC9BB6] bg-[#F4CAD8] p-4 text-sm"><p>{error}</p>{conflicto && editando && <button type="button" className="mt-2 font-semibold underline" onClick={()=>{const m=todos.find(x=>x.id===editando.id);if(m)abrir(m)}}>Descartar mis cambios y abrir la versión guardada</button>}</div>}
        {guardado && <p role="status" className="mt-4 rounded-xl border border-[#294A38]/30 bg-white p-4 text-sm">{guardado}</p>}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#746a64]">{editando?'Editando un análisis guardado.':'Nuevo registro de tu campaña.'}</p><button type="submit" disabled={guardando||errorCarga||conflicto} className={boton}>{guardando?'Guardando…':editando?'Actualizar análisis':'Guardar análisis'}<ArrowIcon /></button></div>
      </form>
      <section className="mt-8" aria-labelledby="calculo-metricas"><h2 id="calculo-metricas" className="mb-4 text-xl font-semibold">Tu análisis</h2><ResumenMetricas datos={datos} /></section>
      <section className="mt-8" aria-labelledby="historial-metricas">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 id="historial-metricas" className="text-xl font-semibold">Historial y evolución</h2>{campanas.length>0 && <label className="text-xs text-[#746a64]">Campaña <select value={claveSeleccionada} onChange={e=>setFiltroCampana(e.target.value)} className="ml-2 max-w-full rounded-full border border-[#e7ddd5] bg-white px-3 py-2 text-sm">{campanas.map(([clave,m])=><option key={clave} value={clave}>{m.campana} · {ESTRATEGIAS_METRICAS[m.estrategia]}</option>)}</select></label>}</div>
        {limitado && <p className="mb-3 text-xs text-[#746a64]">Mostramos tus últimos 500 análisis guardados.</p>}
        {!errorCarga && <EvolucionMetricas registros={filtrados} />}
        <div className="mt-4 space-y-3">{filtrados.map(m=>{const r=calcularMetricas(m);return <article key={m.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#e7ddd5] bg-white p-5"><div><p className="text-xs text-[#746a64]">{fechaMetrica(m.fecha)} · {ESTRATEGIAS_METRICAS[m.estrategia]}</p><h3 className="mt-1 text-sm font-semibold">{m.campana}</h3><p className="mt-2 text-xs text-[#746a64]">{m.ventas} ventas · {m.mensajes_recibidos} mensajes</p></div><div className="flex flex-wrap items-center gap-5"><div><p className="text-[10px] uppercase tracking-[.12em] text-[#746a64]">Neto estimado</p><p className="mt-1 font-impact text-lg font-semibold">{dineroMetrica(r.neto)}</p></div><button type="button" disabled={guardando} onClick={()=>abrir(m)} className="text-sm font-semibold text-[#294A38] underline">Editar</button><button type="button" disabled={guardando} onClick={()=>abrir(m,true)} className="rounded-full border border-[#294A38]/30 px-3 py-2 text-xs font-medium text-[#294A38]">Continuar hoy <ArrowIcon /></button></div></article>})}</div>
      </section>
    </main>
  </div>
}
