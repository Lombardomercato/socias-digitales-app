import type { MesResultados } from './results-dashboard'

export type TipoGraficoResultados = 'linea' | 'barras'
export interface LimitesGrafico { izquierda:number; derecha:number; arriba:number; abajo:number }
// La línea une los meses reales, sin suavizados que inventen picos entre datos.
export function geometriaResultados(meses:MesResultados[], limites:LimitesGrafico) {
  const mayor=Math.max(0,...meses.map(m=>m.centavos))
  const pasoEscala=mayor>0?10**Math.floor(Math.log10(mayor))/2:100
  const maximo=mayor>0?Math.ceil(mayor/pasoEscala)*pasoEscala:100
  const ancho=limites.derecha-limites.izquierda
  const paso=ancho/Math.max(1,meses.length)
  const puntos=meses.map((m,i)=>({ ...m,
    x:limites.izquierda+paso*(i+.5),
    y:limites.abajo-(m.centavos/maximo)*(limites.abajo-limites.arriba),
  }))
  const linea=puntos.map(p=>`${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
  const area=puntos.length?`${puntos[0].x.toFixed(2)},${limites.abajo} ${linea} ${puntos[puntos.length-1].x.toFixed(2)},${limites.abajo}`:''
  return { puntos,linea,area,paso,maximo,
    marcas:[0,.5,1].map(p=>({centavos:maximo*p,y:limites.abajo-p*(limites.abajo-limites.arriba)})),
  }
}
export function cifraEjeResultados(centavos:number) {
  return new Intl.NumberFormat('es-AR',{notation:'compact',maximumFractionDigits:1}).format(centavos/100)
}
