'use client'

import { useState } from 'react'
import { calcularMetricas, dineroMetrica, porcentajeMetrica, fechaMetrica, type DatosMetrica, type Metrica } from '@/lib/metrics'

export function ResumenMetricas({ datos }: { datos: DatosMetrica }) {
  const r=calcularMetricas(datos)
  return <div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        {label:'Comisiones estimadas',valor:dineroMetrica(r.comisiones),nota:'Comisión × ventas',fondo:'bg-[#F4CAD8] border-[#EC9BB6]/60'},
        {label:'Neto estimado',valor:dineroMetrica(r.neto),nota:'Comisiones − gasto real',fondo:'bg-[#294A38] border-[#294A38] text-white'},
        {label:'Retorno sobre el gasto',valor:porcentajeMetrica(r.roi),nota:'Neto ÷ gasto real',fondo:'bg-white border-[#e7ddd5]'},
        {label:'Costo por mensaje',valor:dineroMetrica(r.costoMensaje),nota:'Gasto real ÷ mensajes',fondo:'bg-[#FAF7F3] border-[#e7ddd5]'},
      ].map(x=><article key={x.label} className={`min-w-0 rounded-[22px] border p-5 ${x.fondo}`}><p className="text-[10px] uppercase tracking-[.14em] opacity-80">{x.label}</p><p className="mt-3 break-words font-impact text-2xl font-semibold tabular-nums">{x.valor}</p><p className="mt-2 text-xs opacity-70">{x.nota}</p></article>)}
    </div>
    <p className="mt-3 text-xs leading-5 text-[#746a64]">Estimaciones según tus datos. Un importe vacío significa que todavía no lo informaste; cero significa que no hubo gasto o comisión.</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <section className="rounded-[22px] border border-[#e7ddd5] bg-white p-5" aria-label="Recorrido de la campaña">
        <h3 className="text-sm font-semibold">De mensajes a ventas</h3>
        <div className="mt-4 space-y-3">{[
          {label:'Mensajes recibidos',n:datos.mensajes_recibidos,color:'bg-[#F4CAD8]'},
          {label:'Personas en el grupo',n:datos.personas_grupo,color:'bg-[#EC9BB6]'},
          {label:'Reservas',n:datos.reservas,color:'bg-[#294A38]/60'},
          {label:'Ventas',n:datos.ventas,color:'bg-[#294A38]'},
        ].map(x=><div key={x.label}><div className="flex justify-between gap-3 text-xs"><span>{x.label}</span><span className="font-semibold tabular-nums">{x.n.toLocaleString('es-AR')}</span></div><div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[#F4EFEA]" aria-hidden="true"><div className={`h-full rounded-full ${x.color}`} style={{width:`${x.n/Math.max(1,datos.mensajes_recibidos,datos.personas_grupo,datos.reservas,datos.ventas)*100}%`}} /></div></div>)}</div>
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[#e7ddd5] pt-4 text-xs text-[#746a64]"><span>Al grupo: <strong className="font-semibold text-[#211c19]">{porcentajeMetrica(r.alGrupo)}</strong></span><span>Cierre sobre reservas: <strong className="font-semibold text-[#211c19]">{porcentajeMetrica(r.cierre)}</strong></span></div>
        {(datos.personas_grupo>datos.mensajes_recibidos || datos.ventas>datos.reservas) && <p className="mt-3 text-xs leading-5 text-[#746a64]">Revisá los conteos: grupo y ventas pueden incluir personas que llegaron por otros canales.</p>}
      </section>
      <section className="rounded-[22px] border border-[#e7ddd5] bg-[#FAF7F3] p-5" aria-label="Presupuesto de la campaña">
        <h3 className="text-sm font-semibold">Tu presupuesto</h3>
        <dl className="mt-4 space-y-3 text-sm">{[
          ['Presupuesto total',dineroMetrica(datos.inversion)],['Gasto real acumulado',dineroMetrica(datos.gasto_acumulado)],
          ['Disponible',dineroMetrica(r.disponible)],['Días de presupuesto',r.diasPresupuesto===null?'—':`${r.diasPresupuesto} días`],
          ['Ventas para cubrir el presupuesto',r.ventasPresupuesto===null?'—':r.ventasPresupuesto.toLocaleString('es-AR')],
        ].map(([label,value])=><div key={label} className="flex justify-between gap-4 border-b border-[#e7ddd5] pb-2 last:border-0"><dt className="text-[#746a64]">{label}</dt><dd className="shrink-0 font-medium tabular-nums">{value}</dd></div>)}</dl>
        {r.disponible!==null && r.disponible<0 && <p role="status" className="mt-3 rounded-lg border border-[#EC9BB6] bg-[#F4CAD8] p-3 text-xs">El gasto informado supera tu presupuesto.</p>}
        <p className="mt-3 text-xs leading-5 text-[#746a64]">Los días disponibles usan tu presupuesto diario. No predicen nuevas ventas.</p>
      </section>
    </div>
  </div>
}

const series = {
  ventas: {nombre:'Ventas',valor:(x:Metrica)=>x.ventas,formato:(n:number|null)=>n===null?'—':n.toLocaleString('es-AR')},
  gasto: {nombre:'Gasto real',valor:(x:Metrica)=>x.gasto_acumulado,formato:dineroMetrica},
  neto: {nombre:'Neto estimado',valor:(x:Metrica)=>calcularMetricas(x).neto,formato:dineroMetrica},
}
export function EvolucionMetricas({ registros }: { registros:Metrica[] }) {
  const [serie,setSerie]=useState<keyof typeof series>('ventas')
  const configuracion=series[serie]
  const ordenados=[...registros].sort((a,b)=>a.fecha.localeCompare(b.fecha)).slice(-30)
  const conocidos=ordenados.map((m,i)=>({m,i,v:configuracion.valor(m)})).filter((p):p is {m:Metrica;i:number;v:number}=>p.v!==null && Number.isFinite(p.v))
  const min=Math.min(0,...conocidos.map(p=>p.v)),max=Math.max(1,...conocidos.map(p=>p.v))
  const x=(i:number)=>ordenados.length>1?52+i/(ordenados.length-1)*516:310
  const y=(n:number)=>170-(n-min)/(max-min)*130
  return <section className="rounded-[22px] border border-[#e7ddd5] bg-white p-5" aria-labelledby="evolucion-metricas">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 id="evolucion-metricas" className="text-sm font-semibold">Evolución por fecha</h3><div className="flex flex-wrap gap-1 rounded-full border border-[#e7ddd5] bg-[#FAF7F3] p-1" aria-label="Dato del gráfico">{Object.entries(series).map(([id,s])=><button key={id} type="button" aria-pressed={serie===id} onClick={()=>setSerie(id as keyof typeof series)} className={`rounded-full px-3 py-2 text-xs ${serie===id?'bg-[#294A38] text-white':'text-[#746a64]'}`}>{s.nombre}</button>)}</div></div>
    {conocidos.length ? <figure className="mt-4">
      <svg viewBox="0 0 620 215" className="w-full" role="img" aria-label={`${configuracion.nombre}: ${conocidos.length} registros por fecha. Valores disponibles debajo del gráfico.`}>
        {[min,(max+min)/2,max].map((n,i)=><g key={i}><line x1="52" x2="568" y1={y(n)} y2={y(n)} stroke="#e7ddd5" strokeWidth="1" /><text x="46" y={y(n)+4} textAnchor="end" fontSize="10" fill="#746a64">{n.toLocaleString('es-AR',{maximumFractionDigits:0,notation:'compact'})}</text></g>)}
        {conocidos.map((p,i)=>{const anterior=conocidos[i-1];return <g key={p.m.id}>{anterior && p.i===anterior.i+1 && <line x1={x(anterior.i)} y1={y(anterior.v)} x2={x(p.i)} y2={y(p.v)} stroke="#294A38" strokeWidth="2.5" />}<circle cx={x(p.i)} cy={y(p.v)} r="4" fill="#EC9BB6" stroke="#294A38" strokeWidth="1.5"><title>{fechaMetrica(p.m.fecha)}: {configuracion.formato(p.v)}</title></circle></g>})}
        {ordenados.length>0 && <><text x={x(0)} y="198" textAnchor="middle" fontSize="10" fill="#746a64">{fechaMetrica(ordenados[0].fecha)}</text>{ordenados.length>1 && <text x={x(ordenados.length-1)} y="198" textAnchor="middle" fontSize="10" fill="#746a64">{fechaMetrica(ordenados[ordenados.length-1].fecha)}</text>}</>}
      </svg>
      <figcaption className="text-xs leading-5 text-[#746a64]">Últimos 30 registros de esta campaña. Son valores acumulados, no ventas nuevas por día.</figcaption>
      <details className="mt-3 text-xs text-[#746a64]"><summary className="cursor-pointer font-medium text-[#294A38]">Ver valores del gráfico</summary><dl className="mt-2 grid gap-2 sm:grid-cols-3">{ordenados.map(m=><div key={m.id} className="flex justify-between gap-3 rounded-lg border border-[#e7ddd5] p-2"><dt>{fechaMetrica(m.fecha)}</dt><dd>{configuracion.formato(configuracion.valor(m))}</dd></div>)}</dl></details>
    </figure> : <p className="mt-5 rounded-xl border border-[#e7ddd5] bg-[#FAF7F3] p-5 text-sm text-[#746a64]">{registros.length?'Completá el gasto real para ver esta evolución.':'Guardá tu primer análisis para ver la evolución.'}</p>}
  </section>
}
