export const CLASE_LANZAMIENTO = {
  fecha: '2026-10-12T20:05:00-03:00',
  etiqueta: 'Lunes 12 de octubre',
  hora: '20:05 · Argentina',
}

export function tiempoHastaClase(ahora: number) {
  const restante = Date.parse(CLASE_LANZAMIENTO.fecha) - ahora
  if (restante <= 0) return 'Llegó la hora de la clase'
  const minutos = Math.ceil(restante / 60_000)
  const dias = Math.floor(minutos / 1440)
  const horas = Math.floor((minutos % 1440) / 60)
  const mins = minutos % 60
  return `Faltan ${[dias > 0 ? `${dias} d` : '', horas > 0 ? `${horas} h` : '', `${mins} min`].filter(Boolean).join(' · ')}`
}
