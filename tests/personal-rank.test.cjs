/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts')
const rank = load('src/lib/personal-rank.ts', { './my-day': day })
const datos = (clases = 0, tareas = 0, dias = 0, programas = 0) => ({ fecha: '2026-10-23', desde: '2026-09-24', clases: { estado: 'lista', datos: { completadas: clases, disponibles: Math.max(6, clases), programas } }, dia: { estado: 'lista', datos: { tareas, dias, racha: 0 } }, metricas: { estado: 'lista', datos: { analisis: 999 } } })
test('rangos personales tienen cinco etapas con requisitos concretos, no puntos ni métricas comerciales', () => {
  for (const [input, etapa] of [[datos(), 'Inicio'], [datos(1), 'En marcha'], [datos(0, 1, 1), 'En marcha'], [datos(3, 3, 3), 'En foco'], [datos(3, 10, 3), 'En acción'], [datos(3, 10, 3, 1), 'Socia TOP']]) {
    const result = rank.rangoPersonal(input)
    assert.equal(result.estado, 'listo'); assert.equal(result.etapa.etiqueta, etapa)
    assert.equal('puntos' in result, false)
  }
  for (const input of [datos(2, 10, 3, 1), datos(3, 10, 2, 1), datos(3, 9, 3, 1)]) assert.notEqual(rank.rangoPersonal(input).etapa.etiqueta, 'Socia TOP')
})
test('próximo nivel conserva numeradores, umbrales, progreso y un destino real sin autohabilitar módulos', () => {
  const inicio = rank.rangoPersonal(datos()), marcha = rank.rangoPersonal(datos(1)), foco = rank.rangoPersonal(datos(3, 3, 3)), accion = rank.rangoPersonal(datos(3, 10, 3))
  assert.equal(inicio.proximo.etapa.etiqueta, 'En marcha'); assert.equal(inicio.proximo.progreso, 0)
  assert.deepEqual(marcha.proximo.requisitos.map(r => [r.id, r.actual, r.meta]), [['clases', 1, 3], ['dias', 0, 3]])
  assert.equal(marcha.proximo.progreso, 17)
  assert.equal(foco.proximo.etapa.etiqueta, 'En acción'); assert.equal(accion.proximo.etapa.etiqueta, 'Socia TOP')
  for (const r of accion.proximo.requisitos) assert.ok(['/classroom', '/checklist'].includes(r.href))
  assert.equal(rank.rangoPersonal(datos(3, 10, 3, 1)).proximo, null)
})
test('recalcula desde registros actuales: repetir, desmarcar y reprogramar no acumula puntos ni rangos permanentes', () => {
  const input = datos(3, 10, 3, 1), antes = JSON.stringify(input)
  assert.deepEqual(rank.rangoPersonal(input), rank.rangoPersonal(input))
  assert.equal(rank.rangoPersonal(datos(3, 9, 3, 1)).etapa.etiqueta, 'En foco')
  assert.equal(rank.rangoPersonal(input).etapa.etiqueta, 'Socia TOP')
  assert.equal(rank.rangoPersonal(datos(2, 10, 3, 0)).etapa.etiqueta, 'En marcha')
  assert.equal(JSON.stringify(input), antes)
})
test('error en Clases o Mi día no produce rango ni exportación; bloqueado nunca equivale a cero', () => {
  for (const fuente of ['clases', 'dia']) {
    for (const [estado, expected] of [['error', 'error'], ['bloqueada', 'bloqueado']]) {
      const input = { ...datos(3, 10, 3, 1), [fuente]: { estado } }
      assert.deepEqual(rank.rangoPersonal(input), { estado: expected }); assert.equal(rank.datosImagenRango(input), null)
    }
  }
  for (const estado of ['error', 'bloqueada']) assert.equal(rank.rangoPersonal({ ...datos(3, 10, 3, 1), metricas: { estado } }).etapa.etiqueta, 'Socia TOP')
})
test('datos ausentes, null, negativos, NaN o período distinto no simulan progreso conocido', () => {
  const buenos = datos(3, 10, 3, 1)
  for (const input of [null, {}, { ...buenos, fecha: null }, { ...buenos, desde: '2026-09-23' }, { ...buenos, clases: { estado: 'lista', datos: null } }, { ...buenos, dia: { estado: 'lista', datos: { tareas: null, dias: 0 } } }, { ...buenos, dia: { estado: 'lista', datos: { tareas: 10, dias: 31 } } }, { ...buenos, clases: { estado: 'lista', datos: { completadas: -1, disponibles: 6, programas: 0 } } }, { ...buenos, clases: { estado: 'lista', datos: { completadas: NaN, disponibles: 6, programas: 0 } } }]) {
    assert.deepEqual(rank.rangoPersonal(input), { estado: 'error' }); assert.equal(rank.datosImagenRango(input), null)
  }
})
test('proyección para historia contiene solo etiqueta, conteos y fechas: sin identidad, textos, finanzas ni fuentes heredadas', () => {
  const input = { ...datos(3, 10, 3, 1), nombre: 'Nombre privado', email: 'privado@ejemplo.test', id: 'identificador-privado', tareas: [{ texto: 'Tarea privada' }], rango_legacy: 'Top oro', ingresos: 9999 }
  const projection = rank.datosImagenRango(input)
  assert.deepEqual(Object.keys(projection).sort(), ['etiqueta', 'clases', 'programas', 'tareas', 'dias', 'fecha', 'desde'].sort())
  for (const privado of ['Nombre privado', '@ejemplo.test', 'identificador-privado', 'Tarea privada', '9999', 'Top oro']) assert.ok(!JSON.stringify(projection).includes(privado))
  assert.equal(rank.datosImagenRango(datos()), null)
})
function canvas() {
  const textos = []
  return { textos, ctx: { fillRect() {}, beginPath() {}, roundRect() {}, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, bezierCurveTo() {}, measureText: valor => ({ width: valor.length * 10 }), fillText: valor => textos.push(valor) } }
}
test('PNG dibuja historia 1080×1920 con nivel real, período explícito, textos legibles y sin promesas ni datos privados', () => {
  const projection = rank.datosImagenRango(datos(3, 10, 3, 1)), c = canvas()
  assert.deepEqual(rank.dibujarImagenRango(c.ctx, projection, { fuente: 'Poppins local', editorial: 'Playfair local' }), { ancho: 1080, alto: 1920 })
  assert.ok(c.textos.includes('Socia TOP')); assert.ok(c.textos.includes('PROGRAMAS COMPLETOS'))
  assert.ok(c.textos.some(t => t.includes(rank.fechaRango(projection.fecha)))); assert.ok(c.textos.some(t => t.includes('No es') || t.includes('no un ranking')))
  assert.ok(!c.textos.some(t => /USD|ventas|ganancia|email|privado@/.test(t)))
  assert.throws(() => rank.dibujarImagenRango(c.ctx, { ...projection, etiqueta: 'privado@ejemplo.test' }, { fuente: 'Poppins', editorial: 'Playfair' }))
})
