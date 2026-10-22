'use client'

import { useState } from 'react'
import ArrowIcon from './ArrowIcon'
import { tableroCampanas, compararCampanas, type CampanaMetricas } from '@/lib/metrics-campaigns'
import { dineroMetrica, porcentajeMetrica, fechaMetrica, ESTRATEGIAS_METRICAS, type Metrica } from '@/lib/metrics'

const control = 'min-h-11 w-full min-w-0 max-w-full rounded-xl border border-[#E7DDD5] bg-[#FFFDFA] px-3 py-3 text-base text-[#211C19] outline-none focus:border-[#294A38] sm:text-sm'
const cantidad = (n: number | null) => n === null ? '—' : n.toLocaleString('es-AR', { maximumFractionDigits: 1 })
const graficos = {
  ventas: { nombre: 'Ventas declaradas', valor: (c: CampanaMetricas) => c.ventas, formato: cantidad },
  gasto: { nombre: 'Gasto real', valor: (c: CampanaMetricas) => c.gasto_acumulado, formato: dineroMetrica },
  neto: { nombre: 'Neto estimado', valor: (c: CampanaMetricas) => c.calculadas.neto, formato: dineroMetrica },
}

function TarjetaCampana({ campana, letra }: { campana: CampanaMetricas; letra: string }) {
  const c = campana.calculadas
  return <article className="min-w-0 rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-5">
    <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F4CAD8] text-sm font-semibold text-[#294A38]">{letra}</span><div className="min-w-0"><h3 className="break-words text-base font-semibold">{campana.campana}</h3><p className="mt-1 text-xs leading-5 text-[#746A64]">{ESTRATEGIAS_METRICAS[campana.estrategia]} · {fechaMetrica(campana.fecha)}</p></div></div>
    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3">{[
      ['Ventas declaradas', cantidad(campana.ventas)], ['Gasto real · USD', dineroMetrica(campana.gasto_acumulado)],
      ['Comisiones estimadas', dineroMetrica(c.comisiones)], ['Neto estimado', dineroMetrica(c.neto)],
      ['Costo por venta', dineroMetrica(c.costoVenta)], ['Mensajes a ventas', porcentajeMetrica(c.conversionMensajesVentas)],
    ].map(([nombre, valor]) => <div key={nombre} className="min-w-0"><dt className="text-[11px] leading-5 text-[#746A64]">{nombre}</dt><dd className="mt-1 break-words font-impact text-lg font-semibold tabular-nums text-[#294A38]">{valor}</dd></div>)}</dl>
  </article>
}

export default function CampaignMetricsDashboard({ registros, errorCarga = false, limitado = false, onNueva, onVer }: { registros: Metrica[]; errorCarga?: boolean; limitado?: boolean; onNueva: () => void; onVer: (clave: string) => void }) {
  const [principal, setPrincipal] = useState('')
  const [comparada, setComparada] = useState('')
  const [serie, setSerie] = useState<keyof typeof graficos>('ventas')
  const campanas = tableroCampanas(registros)
  const a = campanas.find(c => c.clave === principal) ?? campanas[0]
  const opcionesB = a ? campanas.filter(c => c.alumna_id === a.alumna_id && c.clave !== a.clave) : []
  const b = opcionesB.find(c => c.clave === comparada)
  const comparacion = a && b ? compararCampanas(a, b) : null
  const seleccionadas = a ? [a, ...(b ? [b] : [])] : []
  const grafico = graficos[serie]
  const valores = seleccionadas.map(grafico.valor).filter((v): v is number => v !== null)
  const minimo = Math.min(0, ...valores), maximo = Math.max(0, ...valores)
  const amplitud = maximo - minimo || 1
  const cero = -minimo / amplitud * 100
  return <section aria-labelledby="tablero-campanas" className="mt-6 space-y-4">
    <div className="rounded-[24px] border border-[#EC9BB6] bg-[#F4CAD8]/50 p-5 sm:p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#294A38]">Una mirada a tu negocio</p>
      <h2 id="tablero-campanas" className="mt-2 text-xl font-semibold sm:text-2xl">Tus campañas, en perspectiva</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#655B56]">Compará tus campañas y mirá lo que estás construyendo. Usamos el último análisis guardado de cada una, sin sumar dos veces tus avances.</p>
    </div>
    {errorCarga ? <p role="status" className="rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-5 text-sm">El tablero no está disponible hasta recuperar el historial. No mostramos cifras parciales como si estuvieran completas.</p> : !a ? <div className="rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-6"><h3 className="text-base font-semibold">Tu primera campaña empieza acá.</h3><p className="mt-2 text-sm leading-6 text-[#746A64]">Guardá un análisis para ver tus números. Cuando tengas otra campaña, vas a poder compararlas.</p><button type="button" onClick={onNueva} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white">Crear mi primer análisis <ArrowIcon /></button></div> : <>
      {limitado && <p role="status" className="rounded-xl border border-[#E7DDD5] bg-[#FAF7F3] p-4 text-xs leading-5">Vista parcial: usamos los últimos 500 análisis cargados. Podrían faltar campañas o parte de su historia. No es un total de todo tu negocio.</p>}
      <div className="grid gap-4 sm:grid-cols-2"><label className="block min-w-0 text-xs font-medium text-[#746A64]">Campaña A<select value={a.clave} onChange={e => { setPrincipal(e.target.value); setComparada('') }} className={`mt-2 ${control}`}>{campanas.map(c => <option key={c.clave} value={c.clave}>{c.campana} · {ESTRATEGIAS_METRICAS[c.estrategia]}</option>)}</select></label><label className="block min-w-0 text-xs font-medium text-[#746A64]">Comparar con<select value={b?.clave ?? ''} disabled={!opcionesB.length} onChange={e => setComparada(e.target.value)} className={`mt-2 ${control} disabled:opacity-60`}><option value="">{opcionesB.length ? 'Elegí otra campaña' : 'Necesitás otra campaña para comparar'}</option>{opcionesB.map(c => <option key={c.clave} value={c.clave}>{c.campana} · {ESTRATEGIAS_METRICAS[c.estrategia]}</option>)}</select></label></div>
      <div className={`grid gap-4 ${b ? 'lg:grid-cols-2' : ''}`}>{seleccionadas.map((c, i) => <TarjetaCampana key={c.clave} campana={c} letra={i === 0 ? 'A' : 'B'} />)}</div>
      <figure className="rounded-[22px] border border-[#E7DDD5] bg-[#FAF7F3] p-5 sm:p-6" aria-label="Comparación visual de campañas">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-base font-semibold">{b ? 'Tus campañas, lado a lado' : 'Tu última foto guardada'}</h3><div role="group" aria-label="Dato a comparar" className="flex flex-wrap gap-1">{Object.entries(graficos).map(([id, g]) => <button type="button" key={id} aria-pressed={serie === id} onClick={() => setSerie(id as keyof typeof graficos)} className={`min-h-11 rounded-full border px-3 py-2 text-xs font-medium ${serie === id ? 'border-[#294A38] bg-[#294A38] text-white' : 'border-[#E7DDD5] bg-[#FFFDFA] text-[#294A38]'}`}>{g.nombre}</button>)}</div></div>
        <dl className="mt-5 space-y-5">{seleccionadas.map((c, i) => {
          const v = grafico.valor(c)
          return <div key={c.clave}><div className="flex flex-wrap justify-between gap-2"><dt className="min-w-0 break-words text-sm">{i === 0 ? 'A' : 'B'} · {c.campana}</dt><dd className="font-impact text-base font-semibold tabular-nums">{grafico.formato(v)}</dd></div><div aria-hidden="true" className="relative mt-2 h-4 rounded-full border border-[#E7DDD5] bg-[#FFFDFA]"><span className="absolute inset-y-0 w-px bg-[#746A64]" style={{ left: `${cero}%` }} />{v !== null && <span className={`absolute inset-y-0 rounded-full ${i === 0 ? 'bg-[#294A38]' : 'bg-[#EC9BB6]'}`} style={{ left: `${Math.min(cero, (v - minimo) / amplitud * 100)}%`, width: `${Math.abs(v) / amplitud * 100}%` }} />}</div></div>
        })}</dl>
        <figcaption className="mt-4 text-xs leading-5 text-[#746A64]">{grafico.nombre}{serie !== 'ventas' ? ' · USD' : ''}. Las barras usan la misma escala desde cero; — significa que falta el importe. Compará teniendo en cuenta la fecha y el recorrido de cada campaña.</figcaption>
      </figure>
      {comparacion && <DiferenciasCampanas a={a} b={b!} />}
      <div className="flex flex-wrap gap-3">{seleccionadas.map((c, i) => <button type="button" key={c.clave} onClick={() => onVer(c.clave)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#D8CFC8] bg-[#FFFDFA] px-4 py-3 text-sm font-medium text-[#294A38]">Ver evolución de {i === 0 ? 'A' : 'B'} <ArrowIcon /></button>)}</div>
      <p className="text-xs leading-5 text-[#746A64]">Datos declarados y estimaciones en USD, no ventas verificadas por Flor. Mensajes a ventas usa ventas ÷ mensajes; puede superar 100% si los conteos incluyen otros canales. Las comisiones aprobadas y sus comprobantes siguen en Mis resultados.</p>
    </>}
  </section>
}

function DiferenciasCampanas({ a, b }: { a: CampanaMetricas; b: CampanaMetricas }) {
  const diferencia = compararCampanas(a, b)!
  const filas = [
    ['Ventas declaradas', diferencia.diferencias.ventas, cantidad, ''],
    ['Gasto real', diferencia.diferencias.gasto, dineroMetrica, ''],
    ['Neto estimado', diferencia.diferencias.neto, dineroMetrica, ''],
    ['Mensajes a ventas', diferencia.diferencias.conversionMensajesVentas, cantidad, ' pp'],
  ] as const
  return <section aria-label="Diferencias entre campañas" className="rounded-[22px] border border-[#E7DDD5] bg-[#FFFDFA] p-5"><h3 className="text-sm font-semibold">Diferencia de A respecto de B</h3><p className="mt-1 text-xs leading-5 text-[#746A64]">A: {fechaMetrica(a.fecha)} · B: {fechaMetrica(b.fecha)}. Restamos A − B; no son ventas nuevas entre esas fechas.</p><dl className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">{filas.map(([nombre, valor, formato, unidad]) => <div key={nombre} className="min-w-0"><dt className="text-[11px] text-[#746A64]">{nombre}</dt><dd className="mt-2 break-words font-impact text-lg font-semibold tabular-nums">{valor !== null && valor > 0 ? '+' : ''}{formato(valor)}{valor === null ? '' : unidad}</dd></div>)}</dl></section>
}
