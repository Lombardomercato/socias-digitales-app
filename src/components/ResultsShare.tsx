'use client'

import { useEffect, useRef, useState } from 'react'
import { dineroTablero, type TableroResultados } from '@/lib/results-dashboard'
import styles from './ResultsDashboard.module.css'

// No recibe resultados individuales: no hay PII, comprobantes ni URLs en el PNG.
export default function ResultsShare({data,comunidad}:{data:TableroResultados;comunidad:boolean}) {
  const canvas=useRef<HTMLCanvasElement>(null)
  const [formato,setFormato]=useState('historia')
  const [archivo,setArchivo]=useState<{key:string;blob:Blob}|null>(null)
  const [error,setError]=useState('')
  const [mensaje,setMensaje]=useState('')
  const key=JSON.stringify({data,comunidad,formato})
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
        function texto(valor:string,x:number,y:number,tamano:number,color='#211C19',peso=400,max=904) {
          if(!ctx) return
          ctx.fillStyle=color; ctx.font=`${peso} ${tamano}px ${fuente}`
          while(ctx.measureText(valor).width>max && tamano>16) { tamano-=2;ctx.font=`${peso} ${tamano}px ${fuente}` }
          ctx.fillText(valor,x,y)
        }
        ctx.fillStyle='#F4EFEA';ctx.fillRect(0,0,1080,alto)
        texto('SOCIAS DIGITALES',88,110,25,'#294A38',600)
        texto(comunidad?'Lo que construimos juntas.':'Lo que construyo, se ve.',88,190,40,'#211C19',600)
        ctx.fillStyle='#294A38';ctx.beginPath();ctx.roundRect(64,236,952,formato==='historia'?430:330,36);ctx.fill()
        texto('COMISIONES APROBADAS · USD',100,300,22,'#E3E9E3',600)
        texto(dineroTablero(data.total),100,formato==='historia'?450:418,100,'#FFFDFA',600,880)
        texto(data.periodo,100,formato==='historia'?525:480,26,'#FFFDFA')
        texto('Revisadas por Flor · con comprobante',100,formato==='historia'?605:530,21,'#E3E9E3')
        const top=formato==='historia'?790:650, bottom=formato==='historia'?1240:850
        texto('MI EVOLUCIÓN MENSUAL',88,top-50,22,'#294A38',600)
        if(comunidad) { ctx.fillStyle='#F4EFEA';ctx.fillRect(80,top-80,925,45);texto('EVOLUCIÓN DE LA COMUNIDAD',88,top-50,22,'#294A38',600) }
        const max=Math.max(1,...data.meses.map(m=>m.centavos)), paso=904/data.meses.length
        ctx.strokeStyle='#D6C9BE';ctx.beginPath();ctx.moveTo(88,bottom);ctx.lineTo(992,bottom);ctx.stroke()
        data.meses.forEach((m,i)=>{
          const h=Math.max(3,m.centavos/max*(bottom-top)), x=88+i*paso+paso*.18
          ctx.fillStyle=m.periodo===data.mejorMes?.periodo?'#294A38':'#EC9BB6'
          ctx.beginPath();ctx.roundRect(x,bottom-h,paso*.64,h,6);ctx.fill()
          if(data.meses.length===6 || i%2===0 || i===data.meses.length-1) texto(m.corto,x-4,bottom+34,18,'#746A64',400,paso*(data.meses.length===12?1.8:1))
        })
        if(formato==='historia') {
          ctx.fillStyle='#F4CAD8';ctx.beginPath();ctx.roundRect(64,1370,952,245,32);ctx.fill()
          texto(comunidad?'MEJOR MES DE LA COMUNIDAD':'MI MEJOR MES',100,1435,22,'#294A38',600)
          texto(data.mejorMes?.nombre??'—',100,1500,34,'#211C19',600)
          texto(dineroTablero(data.mejorMes?.centavos??0),100,1570,47,'#211C19',600)
        }
        texto('Carga manual · Comisiones, no facturación ni ganancia neta.',88,alto-120,20,'#746A64')
        texto('Resultados personales. No representan una promesa de ingresos.',88,alto-83,19,'#746A64')
        if(comunidad) { ctx.fillStyle='#F4EFEA';ctx.fillRect(80,alto-113,930,45);texto('Resultados de la comunidad. No son ingresos de una sola persona.',88,alto-83,19,'#746A64') }
        elemento.toBlob(blob=>{ if(!cancelado) { if(blob) setArchivo({key,blob});else setError('No pudimos generar la imagen. Probá otro navegador.') } },'image/png')
      } catch { if(!cancelado) setError('No pudimos preparar la imagen. Cerrá y volvé a intentarlo.') }
    }
    void dibujar()
    return ()=>{cancelado=true}
  },[data,comunidad,formato,key])
  function descargar() {
    if(!listo || !archivo) return
    const url=URL.createObjectURL(archivo.blob), a=document.createElement('a')
    a.href=url;a.download=`socias-resultados-${formato}.png`;a.click()
    setTimeout(()=>URL.revokeObjectURL(url),30000)
    setMensaje('Imagen descargada. Podés subirla a tu red favorita.')
  }
  async function compartir() {
    if(!listo || !archivo) return
    setError('');setMensaje('')
    const file=new File([archivo.blob],`socias-resultados-${formato}.png`,{type:'image/png'})
    try {
      if(!navigator.canShare?.({files:[file]}) || !navigator.share) { descargar();return }
      await navigator.share({files:[file],title:comunidad?'Resultados de la comunidad · Socias Digitales':'Mis resultados · Socias Digitales'})
      setMensaje('Imagen compartida desde tu dispositivo.')
    } catch(causa) { if(!(causa instanceof DOMException && causa.name==='AbortError')) setError('No pudimos abrir Compartir. Usá Descargar PNG.') }
  }
  return <section className={styles.share} aria-labelledby="compartir-resultados">
    <h3 id="compartir-resultados" className="text-lg font-semibold">Tu resultado, listo para compartir</h3>
    <div className={styles.shareLayout}><canvas ref={canvas} aria-label="Vista previa de la imagen: total y evolución de comisiones aprobadas" className={`${styles.canvas} font-impact`} /><div>
      <label className={styles.control}>Formato<select value={formato} onChange={e=>{setFormato(e.target.value);setError('');setMensaje('')}}><option value="historia">Historia · 1080 × 1920</option><option value="publicacion">Publicación · 1080 × 1080</option></select></label>
      <p className="mt-4 text-sm leading-7">La imagen incluye el total, el período y la evolución mensual de los montos aprobados con comprobante. No incluye nombres, capturas, descripciones ni datos de otras personas.</p>
      <p className={styles.muted}>Revisá la imagen antes de publicarla. No se publica automáticamente en ninguna red.</p>
      <div className={styles.shareActions}><button type="button" disabled={!listo} className={styles.button} onClick={descargar}>Descargar PNG</button><button type="button" disabled={!listo} className={styles.button} onClick={()=>void compartir()}>Compartir imagen</button></div>
      {!listo && !error && <p role="status" className={styles.muted}>Preparando imagen…</p>}{error && <p role="alert" className={styles.error}>{error}</p>}{mensaje && <p role="status" className={styles.muted}>{mensaje}</p>}
    </div></div>
  </section>
}
