import { CLASE_LANZAMIENTO } from './clase-lanzamiento'

export interface HitoAgenda {
  id: string
  titulo: string
  fecha: string
  enlace: string | null
  accion: string
}

// No se generan encuentros semanales que Flor no haya confirmado.
// Al agregar los siguientes hitos, la tarjeta elige el próximo por fecha.
export const AGENDA_SOCIAS: readonly HitoAgenda[] = [{
  id: 'desafio-socias-2026-10-12',
  titulo: 'Desafío Socias',
  fecha: CLASE_LANZAMIENTO.fecha,
  enlace: null,
  accion: 'Entrar a la clase',
}]

function diaArgentina(fecha: number) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(fecha)
}

export function proximoHito(hitos: readonly HitoAgenda[], ahora: number): HitoAgenda | null {
  const validos = hitos.filter(hito => Number.isFinite(Date.parse(hito.fecha)))
  const futuros = validos.filter(hito => Date.parse(hito.fecha) >= ahora)
  if (futuros.length) return futuros.reduce((primero, hito) => Date.parse(hito.fecha) < Date.parse(primero.fecha) ? hito : primero)
  // Hoy conserva el acceso; mañana no muestra un contador vencido.
  const deHoy = validos.filter(hito => diaArgentina(Date.parse(hito.fecha)) === diaArgentina(ahora))
  return deHoy.length ? deHoy.reduce((ultimo, hito) => Date.parse(hito.fecha) > Date.parse(ultimo.fecha) ? hito : ultimo) : null
}

export function cuentaRegresiva(fecha: string, ahora: number) {
  const minutos = Math.max(0, Math.ceil((Date.parse(fecha) - ahora) / 60_000))
  return { minutos, dias: Math.floor(minutos / 1440), horas: Math.floor((minutos % 1440) / 60), mins: minutos % 60 }
}

export function fechaHito(fecha: string) {
  const opciones = { timeZone: 'America/Argentina/Buenos_Aires' }
  const dia = new Intl.DateTimeFormat('es-AR', { ...opciones, weekday: 'long' }).format(new Date(fecha))
  const fechaCorta = new Intl.DateTimeFormat('es-AR', { ...opciones, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(fecha))
  const hora = new Intl.DateTimeFormat('es-AR', { ...opciones, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(fecha))
  return { dia: dia[0].toUpperCase() + dia.slice(1), fecha: fechaCorta, hora }
}
