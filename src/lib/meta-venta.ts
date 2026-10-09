export function calcularMetaVenta(objetivo: number, precio: number | null, porcentaje: number | null) {
  if (precio === null || porcentaje === null || ![objetivo, precio, porcentaje].every(Number.isFinite)
    || objetivo < 0 || precio <= 0 || porcentaje <= 0 || porcentaje > 100) return null
  const comision = Math.round(precio * porcentaje) / 100
  if (comision <= 0) return null
  return { comision, ventasNecesarias: Math.ceil(objetivo / comision) }
}
