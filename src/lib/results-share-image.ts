import { dineroTablero, type TableroResultados } from './results-dashboard'
import { cifraEjeResultados, geometriaResultados, type TipoGraficoResultados } from './results-chart'

export interface OpcionesImagenResultados {
  formato:'historia'|'publicacion'; grafico:TipoGraficoResultados; comunidad:boolean; fuente:string; editorial:string
}
export function dibujarImagenResultados(ctx:CanvasRenderingContext2D,data:TableroResultados,opciones:OpcionesImagenResultados) {
  const historia=opciones.formato==='historia', alto=historia?1920:1080
  const verde='#294A38', tinta='#211C19', crema='#F4EFEA', rosa='#EC9BB6', claro='#FFFDFA', secundario='#746A64'
  function texto(valor:string,x:number,y:number,tamano:number,color=tinta,peso=400,max=904,fuente=opciones.fuente) {
    ctx.fillStyle=color;ctx.font=`${peso} ${tamano}px ${fuente}`
    while(ctx.measureText(valor).width>max && tamano>14) { tamano-=2;ctx.font=`${peso} ${tamano}px ${fuente}` }
    ctx.fillText(valor,x,y)
  }
  function caja(x:number,y:number,w:number,h:number,color:string,borde?:string) {
    ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,30);ctx.fill()
    if(borde) {ctx.strokeStyle=borde;ctx.lineWidth=2;ctx.stroke()}
  }
  ctx.fillStyle=crema;ctx.fillRect(0,0,1080,alto)
  texto('SOCIAS DIGITALES',72,historia?112:68,24,verde,600)
  texto(opciones.comunidad?'Nuestro camino en números.':'Mi camino en números.',72,historia?218:139,historia?59:48,tinta,600,936,opciones.editorial)
  const heroY=historia?280:180, heroH=historia?365:260
  caja(56,heroY,968,heroH,verde)
  texto('COMISIONES APROBADAS · USD',88,heroY+64,22,'#E3E9E3',600)
  texto(dineroTablero(data.total),88,heroY+(historia?205:151),historia?112:94,claro,600,900)
  texto(data.periodo,88,heroY+(historia?269:203),25,claro)
  if(historia) texto('Con comprobante · Revisadas por Flor',88,heroY+324,21,'#E3E9E3')
  else texto('Con comprobante · Revisadas por Flor',88,heroY+238,18,'#E3E9E3')
  const chartY=historia?692:470, chartH=historia?610:340
  caja(56,chartY,968,chartH,claro,'#E7DDD5')
  texto('EVOLUCIÓN MENSUAL',88,chartY+58,22,verde,600)
  texto('USD',88,chartY+100,17,secundario)
  const limites={izquierda:151,derecha:983,arriba:chartY+(historia?150:117),abajo:chartY+chartH-84}
  const serie=geometriaResultados(data.meses,limites)
  ctx.lineWidth=2
  for(const marca of serie.marcas) {
    ctx.strokeStyle='#E7DDD5';ctx.setLineDash([3,7]);ctx.beginPath();ctx.moveTo(limites.izquierda,marca.y);ctx.lineTo(limites.derecha,marca.y);ctx.stroke()
    texto(cifraEjeResultados(marca.centavos),88,marca.y+6,17,secundario,400,58)
  }
  ctx.setLineDash([])
  if(opciones.grafico==='linea' && serie.puntos.length) {
    ctx.fillStyle='#F4CAD8';ctx.beginPath();ctx.moveTo(serie.puntos[0].x,limites.abajo)
    for(const p of serie.puntos) ctx.lineTo(p.x,p.y)
    ctx.lineTo(serie.puntos[serie.puntos.length-1].x,limites.abajo);ctx.closePath();ctx.fill()
    ctx.strokeStyle=verde;ctx.lineWidth=6;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath()
    serie.puntos.forEach((p,i)=>{ if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y) });ctx.stroke()
    for(const p of serie.puntos) {ctx.fillStyle=p.periodo===data.mejorMes?.periodo?rosa:claro;ctx.strokeStyle=verde;ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.periodo===data.mejorMes?.periodo?10:7,0,Math.PI*2);ctx.fill();ctx.stroke()}
  } else for(const p of serie.puntos) {
    if(p.centavos>0) {
      ctx.fillStyle=p.periodo===data.mejorMes?.periodo?verde:rosa;ctx.beginPath()
      ctx.roundRect(p.x-serie.paso*.24,p.y,serie.paso*.48,limites.abajo-p.y,6);ctx.fill()
    }
  }
  const pico=serie.puntos.find(p=>p.periodo===data.mejorMes?.periodo)
  if(pico) texto(dineroTablero(pico.centavos),Math.max(limites.izquierda,Math.min(813,pico.x-65)),pico.y-22,18,verde,600,170)
  serie.puntos.forEach((p,i)=>{
    if(data.meses.length===6 || i%2===0 || i===data.meses.length-1) texto(p.corto,p.x-serie.paso*.34,limites.abajo+40,17,secundario,400,serie.paso*(data.meses.length===12?1.7:1))
  })
  const statY=historia?1354:842, statH=historia?222:124
  caja(56,statY,474,statH,'#F4CAD8')
  texto('MEJOR MES',84,statY+(historia?55:34),historia?21:17,verde,600,418)
  texto(dineroTablero(data.mejorMes?.centavos??0),84,statY+(historia?124:76),historia?49:33,tinta,600,418)
  texto(data.mejorMes?.nombre??'Sin resultados',84,statY+(historia?176:106),historia?24:18,secundario,400,418)
  caja(550,statY,474,statH,claro,'#E7DDD5')
  const activos=data.meses.filter(m=>m.centavos>0).length
  texto(data.variacion===null?'MESES CON RESULTADOS':'VS. PERÍODO ANTERIOR',578,statY+(historia?55:34),historia?21:17,verde,600,418)
  const valor=data.variacion===null?`${activos} de ${data.meses.length}`:`${data.variacion>0?'+':''}${new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}).format(data.variacion)}%`
  texto(valor,578,statY+(historia?124:76),historia?49:33,tinta,600,418)
  texto(data.variacion===null?'Con comisiones aprobadas':`${data.meses.length} meses vs. los ${data.meses.length} previos`,578,statY+(historia?176:106),historia?24:18,secundario,400,418)
  if(historia) {
    texto('Un resultado a la vez.',72,1688,50,verde,600,936,opciones.editorial)
    texto('Carga manual · Comisiones aprobadas con comprobante.',72,1750,22,secundario)
  }
  texto('Comisiones en USD. No son facturación ni ganancia neta.',72,alto-(historia?105:62),historia?21:18,secundario)
  texto(opciones.comunidad?'Total de la comunidad, no de una sola persona.':'Resultados personales, no una promesa de ingresos.',72,alto-(historia?66:31),historia?21:18,secundario)
  return {ancho:1080,alto}
}
