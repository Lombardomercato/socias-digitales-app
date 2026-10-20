'use client'

import { useId, useState } from 'react'
import dynamic from 'next/dynamic'
import NavigationIcon from './NavigationIcon'
import { tableroResultados, dineroTablero, type TableroResultados } from '@/lib/results-dashboard'
import { geometriaResultados, cifraEjeResultados, type TipoGraficoResultados } from '@/lib/results-chart'
import type { Resultado } from '@/lib/results'
import styles from './ResultsDashboard.module.css'

const ResultsShare = dynamic(()=>import('./ResultsShare'), { loading:()=> <p role="status" className={styles.empty}>Preparando tu imagen…</p> })

function MonthlyChart({ data, selected, tipo }: { data: TableroResultados; selected:string; tipo:TipoGraficoResultados }) {
  const id = useId(), base=222
  const serie=geometriaResultados(data.meses,{izquierda:48,derecha:588,arriba:22,abajo:base})
  return <svg viewBox="0 0 600 245" role="img" aria-labelledby={id} className={styles.graph}>
    <title id={id}>{`Gráfico de ${tipo==='linea'?'línea':'barras'}: comisiones aprobadas por mes, en USD. Valores disponibles debajo del gráfico.`}</title>
    {serie.marcas.map(m=><g key={m.y}><line x1="48" x2="588" y1={m.y} y2={m.y} stroke="#E7DDD5" strokeDasharray="3 5" /><text x="0" y={m.y+4} fontSize="13" fill="#746A64">{cifraEjeResultados(m.centavos)}</text></g>)}
    {tipo==='linea' && <><polygon points={serie.area} fill="#F4CAD8" opacity=".65" /><polyline points={serie.linea} fill="none" stroke="#294A38" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" /></>}
    {serie.puntos.map(p=><g key={p.periodo}><title>{`${p.nombre}: ${dineroTablero(p.centavos)}`}</title>{tipo==='linea'?<circle cx={p.x} cy={p.y} r={p.periodo===selected?6:4} fill={p.periodo===selected?'#EC9BB6':'#FFFDFA'} stroke="#294A38" strokeWidth="2" />:p.centavos>0?<rect x={p.x-serie.paso*.26} y={p.y} width={serie.paso*.52} height={base-p.y} rx="5" fill={p.periodo===selected?'#294A38':'#EC9BB6'} />:null}</g>)}
  </svg>
}
function ChartSwitch({tipo,onChange}:{tipo:TipoGraficoResultados;onChange:(t:TipoGraficoResultados)=>void}) {
  return <div role="group" aria-label="Visualización del gráfico" className={styles.chartSwitch}>{(['linea','barras'] as const).map(t=><button type="button" key={t} aria-pressed={tipo===t} onClick={()=>onChange(t)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={t==='linea'?'M3 17 8 12l5 3 8-11':'M5 20V12m7 8V4m7 16V8'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>{t==='linea'?'Línea':'Barras'}</button>)}</div>
}
export default function ResultsDashboard({ resultados, periodoActual, errorCarga=false, comunidad=false }: {
  resultados: Resultado[]; periodoActual:string; errorCarga?:boolean; comunidad?:boolean
}) {
  const [cantidad,setCantidad]=useState(6)
  const [fin,setFin]=useState(periodoActual)
  const [mesElegido,setMesElegido]=useState<string|null>(null)
  const [compartir,setCompartir]=useState(false)
  const [grafico,setGrafico]=useState<TipoGraficoResultados>('linea')
  const data=tableroResultados(resultados,fin,cantidad)
  const seleccionado=data.meses.find(m=>m.periodo===mesElegido) ?? data.mejorMes ?? data.meses[data.meses.length-1]
  const ranking=data.meses.filter(m=>m.centavos>0).sort((a,b)=>b.centavos-a.centavos).slice(0,3)
  const titulo=comunidad?'Resultados de la comunidad':'Mi camino en números'
  const pendientes=resultados.filter(r=>r.estado==='pendiente').length
  function cambiarPeriodo(nuevo:string) { setFin(nuevo); setMesElegido(null); setCompartir(false) }
  return <section aria-label="Tablero de comisiones aprobadas" className={styles.dashboard}>
    <div className={styles.toolbar}>
      <div><p className={styles.eyebrow}>Resultados que construimos</p><h2 className="mt-2 text-xl font-semibold">{titulo}</h2></div>
      <div className={styles.controls}>
        <label className={styles.control}>Vista<select value={cantidad} onChange={e=>{setCantidad(Number(e.target.value));setCompartir(false)}}><option value="6">6 meses</option><option value="12">12 meses</option></select></label>
        <label className={styles.control}>Hasta el mes<input type="month" required value={fin} max={periodoActual} min="1901-01" onChange={e=>{if (/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(e.target.value) && e.target.value<=periodoActual) cambiarPeriodo(e.target.value)}} /></label>
      </div>
    </div>
    <div className={styles.overview}>
      <article className={styles.hero}>
        <div className={styles.heroTop}><span className={styles.eyebrow}>Comisiones aprobadas · USD</span><span className={styles.badge}><NavigationIcon name="solicitudes" />Revisadas por Flor</span></div>
        <div><p className={styles.amount}>{errorCarga?'—':dineroTablero(data.total)}</p><p className="text-sm">{data.periodo}</p></div>
        <div className={styles.heroNote}>{comunidad?'Suma de los registros de la comunidad.':'Tus resultados, de distintas plataformas, en un mismo lugar.'}<br />Solo montos aprobados con comprobante.</div>
      </article>
      <div className={styles.stats}>
        <article className={styles.stat}><p className={styles.eyebrow}>{comunidad?'Mejor mes · Comunidad':'Tu mejor mes'}</p><p className={styles.statValue}>{errorCarga?'—':data.mejorMes?dineroTablero(data.mejorMes.centavos):'Por construir'}</p><p className={styles.muted}>{!errorCarga && data.mejorMes?data.mejorMes.nombre:'Dentro del período elegido'}</p></article>
        <article className={styles.stat}><p className={styles.eyebrow}>Evolución</p><p className={styles.statValue}>{errorCarga?'—':data.variacion===null?'Sin comparación':`${data.variacion>0?'+':''}${new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(data.variacion)}%`}</p><p className={styles.muted}>Vs. los {cantidad} meses anteriores{!errorCarga && data.variacion===null?' · Sin base aprobada previa':''}</p></article>
        <article className={styles.stat}><p className={styles.eyebrow}>Registros aprobados</p><p className={styles.statValue}>{errorCarga?'—':data.registros}</p><p className={styles.muted}>Con monto y comprobante · no equivale a cantidad de ventas</p></article>
      </div>
    </div>
    {errorCarga?<p role="status" className={styles.empty}>El tablero no está disponible hasta recuperar el historial completo. No se generan imágenes con información incompleta.</p>:<>
      <div className={styles.charts}>
        <article className={styles.panel}>
          <div className={styles.panelHead}><div><h3>{comunidad?'El camino de la comunidad':'Así viene tu camino'}</h3><p className={styles.muted}>Comisiones por mes · USD</p></div><ChartSwitch tipo={grafico} onChange={tipo=>{setGrafico(tipo);setCompartir(false)}} /></div>
          <MonthlyChart data={data} selected={seleccionado.periodo} tipo={grafico} />
          <div className={styles.monthList} aria-label="Explorar meses">{data.meses.map(m=><button key={m.periodo} type="button" className={styles.month} aria-label={m.nombre} aria-pressed={m.periodo===seleccionado.periodo} onClick={()=>setMesElegido(m.periodo)}>{m.corto}</button>)}</div>
          <div className={styles.selected} aria-live="polite"><span>{seleccionado.nombre}<br /><span className={styles.muted}>{seleccionado.registros} {seleccionado.registros===1?'registro aprobado':'registros aprobados'}</span></span><strong>{dineroTablero(seleccionado.centavos)}</strong></div>
          <details className={styles.disclosure}><summary>Ver todos los valores</summary><table className={styles.table}><caption className="sr-only">Comisiones aprobadas, en USD, por mes</caption><thead><tr><th scope="col">Mes</th><th scope="col">Registros</th><th scope="col">USD</th></tr></thead><tbody>{data.meses.map(m=><tr key={m.periodo}><th scope="row">{m.nombre}</th><td>{m.registros}</td><td>{dineroTablero(m.centavos)}</td></tr>)}</tbody></table></details>
        </article>
        <article className={styles.panel}>
          <h3>Meses que se destacan</h3><p className={styles.muted}>{comunidad?'Picos de la comunidad en el período':'Tus picos dentro del período'}</p>
          {ranking.length?<div className={styles.ranking}>{ranking.map((m,i)=><div key={m.periodo}><div className={styles.rankLabel}><span>{String(i+1).padStart(2,'0')} · {m.nombre}</span><strong>{dineroTablero(m.centavos)}</strong></div><div className={styles.track}><span style={{width:`${m.centavos/ranking[0].centavos*100}%`}} /></div></div>)}</div>:<p className={styles.empty}>Tu gráfico empieza con el primer resultado aprobado. Cargá el monto y su comprobante; Flor lo revisa antes de sumarlo.</p>}
          <div className="mt-6 border-t border-[#e7ddd5] pt-4"><p className={styles.eyebrow}>Promedio mensual</p><p className={styles.statValue}>{dineroTablero(data.promedio)}</p><p className={styles.muted}>Incluye los {cantidad} meses, también los que no tienen registros.</p></div>
        </article>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#e7ddd5] bg-[#FAF7F3] p-5"><div><h3 className="text-base font-semibold">Lo que lográs, se comparte.</h3><p className={styles.muted}>Una imagen lista para tu historia o publicación. Sin comprobantes ni datos personales.</p></div><button type="button" className={styles.button} disabled={!data.registros} aria-expanded={compartir} onClick={()=>setCompartir(!compartir)}><NavigationIcon name="resultados" />{compartir?'Cerrar imagen':'Preparar imagen'}</button></div>
      {compartir && data.registros>0 && <ResultsShare data={data} comunidad={comunidad} graficoInicial={grafico} />}
      <p className={styles.footnote}>Carga manual · Comisiones declaradas en USD, no facturación bruta ni ganancia neta. La revisión es de Flor, no una certificación de las plataformas. {pendientes>0?`${pendientes} ${pendientes===1?'registro en revisión, todavía fuera':'registros en revisión, todavía fuera'} del tablero. `:''}{data.excluidos>0?`${data.excluidos} aprobados históricos no se grafican por falta de comprobante, monto válido o mes reconocible.`:''}</p>
    </>}
  </section>
}
