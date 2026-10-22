/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports)
  return m.exports
}
const metrics = load('src/lib/metrics.ts')
const { tableroCampanas, compararCampanas } = load('src/lib/metrics-campaigns.ts', { './metrics': metrics })
const base = { id: 'registro-a', alumna_id: 'socia-ficticia', campana: 'Campaña de ejemplo', estrategia: 'lanzamiento', fecha: '2026-10-20', actualizado_at: '2026-10-20T12:00:00Z', created_at: '2026-10-20T12:00:00Z', version: 1, comision_producto: 20, inversion: 200, inversion_por_dia: 10, gasto_acumulado: 100, dias_captacion: 3, mensajes_recibidos: 100, personas_grupo: 50, reservas: 20, ventas: 10 }
test('tablero conserva solo la última foto de cada campaña, no suma acumulados y no muta entradas', () => {
  const filas = [base, { ...base, id: 'registro-b', fecha: '2026-10-21', actualizado_at: '2026-10-21T12:00:00Z', ventas: 15, gasto_acumulado: 140 }, { ...base, id: 'otra-campana', campana: 'Otra campaña', ventas: 2 }]
  const antes = JSON.stringify(filas), tablero = tableroCampanas(filas)
  assert.equal(tablero.length, 2)
  assert.equal(tablero[0].ventas, 15); assert.equal(tablero[0].gasto_acumulado, 140)
  assert.equal(tablero[0].calculadas.comisiones, 300)
  assert.equal(tablero.find(c => c.campana === 'Otra campaña').ventas, 2)
  assert.equal(JSON.stringify(filas), antes)
  assert.deepEqual(tableroCampanas([]), [])
})
test('clave separa dueña y estrategia, normaliza nombre, y fecha real prevalece sobre carga tardía', () => {
  const filas = [
    base,
    { ...base, id: 'registro-b', campana: '  CAMPAÑA   de ejemplo  ', fecha: '2026-10-21', ventas: 11 },
    { ...base, id: 'fecha-vieja', actualizado_at: '2026-10-22T12:00:00Z', ventas: 50 },
    { ...base, id: 'automatica', estrategia: 'automatica', ventas: 3 },
    { ...base, id: 'otra-socia', alumna_id: 'otra-socia-ficticia', ventas: 4 },
  ]
  const tablero = tableroCampanas(filas)
  assert.equal(tablero.length, 3)
  assert.equal(tablero.find(c => c.clave === metrics.claveCampana(base)).ventas, 11)
  assert.equal(tablero[0].campana, 'CAMPAÑA de ejemplo')
  assert.notEqual(tablero.find(c => c.id === 'automatica').clave, metrics.claveCampana(base))
  assert.notEqual(tablero.find(c => c.id === 'otra-socia').clave, metrics.claveCampana(base))
})
test('orden y elección con empate son deterministas por fecha, actualizado e ID, aunque cambie el orden recibido', () => {
  const filas = [
    { ...base, id: 'a', ventas: 1 },
    { ...base, id: 'b', ventas: 2 },
    { ...base, id: 'c', campana: 'Más reciente', actualizado_at: '2026-10-20T13:00:00Z' },
    { ...base, id: 'd', campana: 'Último día', fecha: '2026-10-21' },
  ]
  const esperado = tableroCampanas(filas)
  assert.deepEqual(esperado.map(c => c.id), ['d', 'c', 'b'])
  assert.deepEqual(tableroCampanas([...filas].reverse()), esperado)
  assert.deepEqual(tableroCampanas([filas[1], filas[3], filas[0], filas[2]]), esperado)
})
test('proyección no serializa perfiles, contactos ni objetos crudos ajenos al análisis', () => {
  const [campana] = tableroCampanas([{ ...base, perfiles: { nombre: 'Nombre privado ficticio', email: 'ficticio@ejemplo.test' }, secreto: 'no-exportar' }])
  assert.equal('perfiles' in campana, false); assert.equal('secreto' in campana, false); assert.equal('created_at' in campana, false)
  assert.ok(!JSON.stringify(campana).includes('ficticio@ejemplo.test'))
  assert.ok(!JSON.stringify(campana).includes('Nombre privado'))
})
test('costos y conversiones usan gasto real y denominadores conocidos, nunca presupuesto ni clamp a 100%', () => {
  const [campana] = tableroCampanas([{ ...base, inversion: 1000, mensajes_recibidos: 2, ventas: 4, reservas: 2, gasto_acumulado: 40 }])
  assert.equal(campana.calculadas.costoVenta, 10)
  assert.equal(campana.calculadas.conversionMensajesVentas, 200)
  assert.equal(campana.calculadas.cierre, 200)
  assert.equal(campana.calculadas.comisiones, 80)
  assert.equal(campana.calculadas.neto, 40)
  const [sinBase] = tableroCampanas([{ ...base, mensajes_recibidos: 0, ventas: 0, reservas: 0, gasto_acumulado: null, comision_producto: null }])
  for (const key of ['costoVenta', 'conversionMensajesVentas', 'comisiones', 'neto', 'cierre']) assert.equal(sinBase.calculadas[key], null)
  const [organica] = tableroCampanas([{ ...base, gasto_acumulado: 0 }])
  assert.equal(organica.calculadas.costoVenta, 0)
  assert.equal(organica.calculadas.roi, null)
})
test('comparación mantiene fechas distintas y devuelve A menos B absoluto, ratios en puntos porcentuales', () => {
  const tablero = tableroCampanas([base, { ...base, id: 'otra', campana: 'Otra campaña', fecha: '2026-10-22', gasto_acumulado: 40, mensajes_recibidos: 100, reservas: 10, ventas: 5 }])
  const a = tablero.find(c => c.id === base.id), b = tablero.find(c => c.id === 'otra')
  const result = compararCampanas(a, b)
  assert.equal(result.a.fecha, '2026-10-20'); assert.equal(result.b.fecha, '2026-10-22')
  assert.deepEqual(result.diferencias, { ventas: 5, gasto: 60, comisiones: 100, neto: 40, costoVenta: 2, conversionMensajesVentas: 5, cierre: 0 })
  assert.equal(compararCampanas(b, a).diferencias.ventas, -5)
  assert.equal('ganadora' in result, false); assert.equal('ranking' in result, false)
})
test('datos ausentes conservan null en diferencias; cero conocido no equivale a ausencia', () => {
  const tablero = tableroCampanas([base, { ...base, id: 'otra', campana: 'Otra campaña', gasto_acumulado: null, comision_producto: null, mensajes_recibidos: 0, reservas: 0 }])
  const a = tablero.find(c => c.id === base.id), b = tablero.find(c => c.id === 'otra')
  const result = compararCampanas(a, b)
  assert.equal(result.diferencias.ventas, 0)
  for (const key of ['gasto', 'comisiones', 'neto', 'costoVenta', 'conversionMensajesVentas', 'cierre']) assert.equal(result.diferencias[key], null)
  const [sinGasto] = tableroCampanas([{ ...base, id: 'organica', campana: 'Orgánica', gasto_acumulado: 0 }])
  assert.equal(compararCampanas(a, sinGasto).diferencias.gasto, 100)
})
test('comparación rechaza dueñas distintas o la misma campaña, aunque cambie el ID del registro', () => {
  const [a] = tableroCampanas([base])
  const [misma] = tableroCampanas([{ ...base, id: 'otra-foto', campana: '  CAMPAÑA   DE EJEMPLO ' }])
  const [otraSocia] = tableroCampanas([{ ...base, id: 'otra-socia', alumna_id: 'otra-socia-ficticia', campana: 'Otra' }])
  assert.equal(compararCampanas(a, a), null)
  assert.equal(compararCampanas(a, misma), null)
  assert.equal(compararCampanas(a, otraSocia), null)
})
