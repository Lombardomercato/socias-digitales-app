// Identidad explícita: no excluir alumnas reales por su nombre o por un alias de email.
export const CUENTAS_PRUEBA_IDS = ['06bb7999-997b-49c8-ba80-b8d05bca4a84'] as const
export const FILTRO_CUENTAS_PRUEBA = `(${CUENTAS_PRUEBA_IDS.join(',')})`
export function esCuentaPrueba(id: string | null | undefined) {
  return CUENTAS_PRUEBA_IDS.some(prueba => prueba === id)
}
