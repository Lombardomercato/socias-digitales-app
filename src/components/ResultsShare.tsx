'use client'

import { useEffect, useRef, useState } from 'react'
import { dineroTablero, type TableroResultados } from '@/lib/results-dashboard'
import { dibujarImagenResultados } from '@/lib/results-share-image'
import type { TipoGraficoResultados } from '@/lib/results-chart'
import styles from './ResultsDashboard.module.css'

// No recibe resultados individuales: no hay PII, comprobantes ni URLs en el PNG.
export default function ResultsShare({data,comunidad,graficoInicial='linea'}:{data:TableroResultados;comunidad:boolean;graficoInicial?:TipoGraficoResultados}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const [formato,setFormato]=useState<'historia'|'publicacion'>('historia')
  const [grafico,setGrafico]=useState<TipoGraficoResultados>(graficoInicial)
  const [archivo,setArchivo]=useState<{key:string;blob:Blob}|null>(null)
  const [error,setError]=useState('')
  const [mensaje,setMensaje]=useState('')
  const key=JSON.stringify({data,comunidad,formato,grafico})
  const listo=archivo?.key===key
  useEffect(()=>{
    let cancelado=false
    const elemento=canvas.current
    if(!elemento) return
    async function dibujar() {
      try {
        await document.fonts.ready
        if(cancelado || !elemento) return
        const ctx=elemento.getContext('2d')
        if(!ctx) throw new Error('Tu navegador no pudo preparar la imagen.')
        const alto=formato==='historia'?1920:1080
        elemento.width=1080; elemento.height=alto
        const fuente=getComputedStyle(elemento).fontFamily
        const editorial=getComputedStyle(document.documentElement).getPropertyValue('--font-playfair').trim() || fuente
        dibujarImagenResultados(ctx,data,{formato,grafico,comunidad,fuente,editorial})
        elemento.toBlob(blob=>{ if(!cancelado) { if(blob) setArchivo({key,blob});else setError('No pudimos generar la imagen. Probá otro navegador.') } },'image/png')
      } catch { if(!cancelado) setError('No pudimos preparar la imagen. Cerrá y volvé a intentarlo.') }
    }
    void dibujar()
    return ()=>{cancelado=true}
  },[data,comunidad,formato,grafico,key])
  function descargar() {
    if(!listo || !archivo) return
    const url=URL.createObjectURL(archivo.blob), a=document.createElement('a')
    a.href=url;a.download=`socias-resultados-${formato}-${grafico}.png`;a.click()
    setTimeout(()=>URL.revokeObjectURL(url),30000)
    setMensaje('Imagen descargada. Podés subirla a tu red favorita.')
  }
  async function compartir() {
    if(!listo || !archivo) return
    setError('');setMensaje('')
    const file=new File([archivo.blob],`socias-resultados-${formato}-${grafico}.png`,{type:'image/png'})
    try {
      if(!navigator.canShare?.({files:[file]}) || !navigator.share) { descargar();return }
      await navigator.share({files:[file],title:comunidad?'Resultados de la comunidad · Socias Digitales':'Mis resultados · Socias Digitales'})
      setMensaje('Imagen compartida desde tu dispositivo.')
    } catch(causa) { if(!(causa instanceof DOMException && causa.name==='AbortError')) setError('No pudimos abrir Compartir. Usá Descargar PNG.') }
  }
  return <section className={styles.share} aria-labelledby="compartir-resultados">
    <h3 id="compartir-resultados" className="text-lg font-semibold">Tu resultado, listo para compartir</h3>
    <div className={styles.shareLayout}><canvas ref={canvas} aria-label="Vista previa de la imagen: total y evolución de comisiones aprobadas" className={`${styles.canvas} font-impact`} /><div>
      <div className={styles.controls}><label className={styles.control}>Formato<select value={formato} onChange={e=>{setFormato(e.target.value as 'historia'|'publicacion');setError('');setMensaje('')}}><option value="historia">Historia · 1080 × 1920</option><option value="publicacion">Publicación · 1080 × 1080</option></select></label><label className={styles.control}>Gráfico de la imagen<select value={grafico} onChange={e=>{setGrafico(e.target.value as TipoGraficoResultados);setError('');setMensaje('')}}><option value="linea">Línea</option><option value="barras">Barras</option></select></label></div>
      <p className="mt-5 font-impact text-2xl font-semibold">{dineroTablero(data.total)}</p><p className={styles.muted}>{data.periodo} · Solo montos aprobados con comprobante</p>
      <p className="mt-4 text-sm leading-7">Tu resumen incluye el total, la evolución mensual y el mejor mes. Si no hay un período previo para comparar, muestra los meses con resultados, sin inventar un porcentaje de crecimiento.</p>
      <p className={styles.muted}>No incluye nombres, capturas, descripciones ni datos de otras personas.</p>
      <p className={styles.muted}>Revisá la imagen antes de publicarla. No se publica automáticamente en ninguna red.</p>
      <div className={styles.shareActions}><button type="button" disabled={!listo} className={styles.button} onClick={descargar}>Descargar PNG</button><button type="button" disabled={!listo} className={styles.button} onClick={()=>void compartir()}>Compartir imagen</button></div>
      {!listo && !error && <p role="status" className={styles.muted}>Preparando imagen…</p>}{error && <p role="alert" className={styles.error}>{error}</p>}{mensaje && <p role="status" className={styles.muted}>{mensaje}</p>}
    </div></div>
  </section>
}
