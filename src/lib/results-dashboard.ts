import type { Resultado } from './results'

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
export interface MesResultados { periodo: string; nombre: string; corto: string; centavos: number; registros: number }
export interface TableroResultados {
  meses: MesResultados[]; total: number; anterior: number; variacion: number | null
  registros: number; mejorMes: MesResultados | null; promedio: number; excluidos: number; periodo: string
}
export function periodoResultado(mes: string | null): string | null {
  if (!mes) return null
  const normal = mes.trim().toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  const match = /^(\p{L}+)\s+((?:19|20)\d{2})$/u.exec(normal)
  const indice = match ? MESES.indexOf(match[1]) : -1
  return match && indice >= 0 ? `${match[2]}-${String(indice+1).padStart(2,'0')}` : null
}
export function moverMes(periodo: string, cantidad: number) {
  const n = Number(periodo.slice(0,4))*12 + Number(periodo.slice(5,7))-1 + cantidad
  return `${Math.floor(n/12)}-${String(n%12+1).padStart(2,'0')}`
}
export function nombreMes(periodo: string, corto = false) {
  const nombre = MESES[Number(periodo.slice(5,7))-1]
  return `${(corto ? nombre.slice(0,3) : nombre).replace(/^./, c=>c.toUpperCase())} ${periodo.slice(corto?2:0,4)}`
}
// Proyección exclusivamente monetaria: nunca exporta identidad, texto o comprobantes.
export function tableroResultados(resultados: Resultado[], fin: string, cantidad = 6): TableroResultados {
  if (!/^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(fin) || ![6,12].includes(cantidad)) throw new Error('Período no válido.')
  const inicio = moverMes(fin,1-cantidad), inicioAnterior = moverMes(inicio,-cantidad)
  const meses: MesResultados[] = Array.from({length:cantidad},(_,i)=>{
    const periodo = moverMes(inicio,i)
    return { periodo, nombre:nombreMes(periodo), corto:nombreMes(periodo,true), centavos:0, registros:0 }
  })
  const indice = new Map(meses.map(m=>[m.periodo,m]))
  let anterior = 0, excluidos = 0
  for (const r of resultados) {
    if (r.estado !== 'aprobado') continue
    const periodo = periodoResultado(r.mes), monto = r.monto === null ? NaN : Number(r.monto)
    if (!r.archivo_url || !periodo || !Number.isFinite(monto) || monto <= 0 || monto > 1e9 || Math.abs(monto*100-Math.round(monto*100))>0.00001) { excluidos++; continue }
    const centavos = Math.round(monto*100)
    const mes = indice.get(periodo)
    if (mes) { mes.centavos += centavos; mes.registros++ }
    else if (periodo>=inicioAnterior && periodo<inicio) anterior += centavos
  }
  const total = meses.reduce((s,m)=>s+m.centavos,0)
  const mejorMes = meses.reduce<MesResultados|null>((max,m)=>m.centavos>0 && (!max || m.centavos>max.centavos)?m:max,null)
  return { meses, total, anterior, variacion:anterior>0?(total-anterior)/anterior*100:null,
    registros:meses.reduce((s,m)=>s+m.registros,0), mejorMes, promedio:Math.round(total/cantidad), excluidos,
    periodo:`${nombreMes(inicio)} — ${nombreMes(fin)}` }
}
export function dineroTablero(centavos: number) {
  return new Intl.NumberFormat('es-AR',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(centavos/100)
}
