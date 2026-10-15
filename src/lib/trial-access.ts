import 'server-only'
import type { createAdminClient } from './supabase/admin'
import { CUENTAS_PRUEBA_IDS } from './test-accounts'

const ID = CUENTAS_PRUEBA_IDS[0]
export const MODULOS_PRUEBA = [
  ['Estrategia', 'accesos_estrategia'], ['Resultados', 'accesos_resultados'],
  ['Métricas', 'accesos_metricas'], ['Mi día', 'accesos_mi_dia'],
] as const
type Cliente = ReturnType<typeof createAdminClient>
export async function leerAccesosPrueba(admin: Cliente) {
  const { data: perfil, error } = await admin.from('perfiles')
    .select('id,nombre,rol,tipo_usuario,estado,desafio_socias_habilitada,desafio_socias_estado').eq('id', ID).maybeSingle()
  if (error || !perfil || perfil.rol === 'admin') throw new Error('No pudimos verificar la cuenta de alumna de prueba. No se hicieron cambios.')
  const filas = await Promise.all(MODULOS_PRUEBA.map(async ([nombre, tabla]) => {
    const { data, error: fallo } = await admin.from(tabla).select('habilitada').eq('usuaria_id', ID).maybeSingle()
    if (fallo) throw new Error('No pudimos comprobar todos los permisos de prueba.')
    return { nombre, habilitada: data?.habilitada === true }
  }))
  return { nombre: perfil.nombre || 'Alumna de prueba', rol: perfil.rol, plan: perfil.tipo_usuario, activa: perfil.estado === 'activa', desafio: perfil.desafio_socias_habilitada === true && perfil.desafio_socias_estado === 'habilitada', modulos: filas }
}
export async function habilitarAccesosPrueba(admin: Cliente, administradora: string) {
  const antes = await leerAccesosPrueba(admin)
  const { data, error } = await admin.from('perfiles').update({
    tipo_usuario: 'socia', estado: 'activa', desafio_socias_habilitada: true, desafio_socias_estado: 'habilitada',
  }).eq('id', ID).eq('rol', antes.rol).select('id').maybeSingle()
  if (error || !data) throw new Error('No pudimos habilitar el plan de la cuenta de prueba.')
  // Reintento idempotente. No cambiar rol, respuestas, clases, progreso ni campañas.
  for (const [, tabla] of MODULOS_PRUEBA) {
    const resultado = await admin.from(tabla).upsert({ usuaria_id: ID, habilitada: true, administradora_id: administradora, actualizada_en: new Date().toISOString() }, { onConflict: 'usuaria_id' }).select('usuaria_id').maybeSingle()
    if (resultado.error || !resultado.data) throw new Error('Se habilitó solo parte del acceso. Volvé a intentar para completar los módulos; no se borró ningún dato.')
  }
  const despues = await leerAccesosPrueba(admin)
  if (despues.rol !== antes.rol || despues.plan !== 'socia' || !despues.activa || !despues.desafio || despues.modulos.some(m => !m.habilitada))
    throw new Error('No pudimos confirmar todos los accesos. Recargá para comprobar el estado.')
  return despues
}
