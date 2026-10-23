/* eslint-disable @typescript-eslint/no-require-imports */
// Datos ficticios: resumen puro de tareas propias, sin API o base real.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts')
const { resumirMiDiaInicio: resumir } = load('src/lib/home-operations.ts', { './my-day': day })
const OWNER = 'cuenta-propia', FECHA = '2026-10-23'
const tarea = (id, extra = {}) => ({ id, alumna_id: OWNER, texto: `Tarea ${id}`, fecha: FECHA, categoria: 'negocio_digital', completada: false, archivada: false, version: 1, creado_en: '2026-10-23T12:00:00Z', actualizada_en: '2026-10-23T12:00:00Z', ...extra })
const agregado = (total = 1, completadas = 0, extra = {}) => ({ alumna_id: OWNER, fecha: FECHA, total, completadas, generales: 0, generales_completadas: 0, negocio: total, negocio_completadas: completadas, ...extra })
const datos = (tareas = [], extra = {}) => {
  const propias = tareas.filter(t => t.alumna_id === OWNER && t.fecha === FECHA && !t.archivada)
  return { tareas, semana: propias.length ? [day.resumenTareas(propias, FECHA)] : [], limitado: false, errorCarga: false, ...extra }
}
test('resume el día propio y devuelve solo las primeras tres pendientes activas en el orden del lector', () => {
  const rows = [tarea('a'), tarea('hecha', { completada: true }), tarea('archivada', { archivada: true }), tarea('b', { categoria: 'vida_personal' }), tarea('c'), tarea('d'), tarea('otra', { alumna_id: 'otra-cuenta', texto: 'No mostrar este texto' }), tarea('mañana', { fecha: '2026-10-24' })]
  const result = resumir(datos(rows), OWNER, FECHA)
  assert.deepEqual(result, { estado: 'listo', fecha: FECHA, total: 5, completadas: 1, pendientes: 4, proximas: [{ id: 'a', texto: 'Tarea a' }, { id: 'b', texto: 'Tarea b' }, { id: 'c', texto: 'Tarea c' }] })
  assert.ok(!JSON.stringify(result).includes('No mostrar'))
})
test('lista completa vacía o solo archivadas confirma cero aunque la RPC no emita fila', () => {
  for (const source of [datos(), datos([tarea('retirada', { archivada: true })]), datos([], { semana: [agregado(3, 1, { alumna_id: 'otra-cuenta' }), agregado(2, 0, { fecha: '2026-10-24' })] })]) {
    assert.deepEqual(resumir(source, OWNER, FECHA), { estado: 'listo', fecha: FECHA, total: 0, completadas: 0, pendientes: 0, proximas: [] })
  }
  assert.deepEqual(resumir(datos([], { semana: [agregado(0)] }), OWNER, FECHA), { estado: 'listo', fecha: FECHA, total: 0, completadas: 0, pendientes: 0, proximas: [] })
})
test('sin límite exige concordancia del agregado con toda la lista y no interpreta una fila faltante como cero', () => {
  const rows = [tarea('a')]
  for (const semana of [[], [agregado(2)], [agregado(1, 1)], [agregado(1, 0, { generales: 1, negocio: 0 })], [agregado(1), agregado(1)]]) assert.deepEqual(resumir(datos(rows, { semana }), OWNER, FECHA), { estado: 'error' })
})
test('lectura limitada usa los totales completos de RPC, no las 500 filas, y no inventa textos faltantes', () => {
  const rows = Array.from({ length: 500 }, (_, i) => tarea(`t-${i}`, { completada: i < 250 }))
  const result = resumir(datos(rows, { limitado: true, semana: [agregado(1000, 400)] }), OWNER, FECHA)
  assert.equal(result.total, 1000); assert.equal(result.completadas, 400); assert.equal(result.pendientes, 600)
  assert.deepEqual(result.proximas.map(t => t.id), ['t-250', 't-251', 't-252'])
  const sinPreview = resumir(datos(rows.map(t => ({ ...t, completada: true })), { limitado: true, semana: [agregado(1000, 500)] }), OWNER, FECHA)
  assert.equal(sinPreview.pendientes, 500); assert.deepEqual(sinPreview.proximas, [])
  assert.deepEqual(resumir(datos(rows, { limitado: true, semana: [] }), OWNER, FECHA), { estado: 'error' })
  assert.deepEqual(resumir(datos([], { limitado: true }), OWNER, FECHA), { estado: 'error' })
})
test('agregados limitados menores que lo realmente leído son incoherentes, también en pendientes por categoría', () => {
  const rows = [tarea('a'), tarea('b', { completada: true }), tarea('general', { categoria: 'trabajo' })]
  for (const fila of [agregado(2, 1), agregado(10, 0), agregado(10, 10), agregado(10, 1, { generales: 1, generales_completadas: 1, negocio: 9, negocio_completadas: 0 })]) {
    assert.deepEqual(resumir(datos(rows, { limitado: true, semana: [fila] }), OWNER, FECHA), { estado: 'error' })
  }
})
test('conteos rechazan null, coerciones, negativos, fracciones, desbordes y particiones inválidas', () => {
  for (const cambio of [{ total: null }, { total: '' }, { total: false }, { total: NaN }, { total: Infinity }, { total: -1 }, { total: 1.5 }, { total: '01' }, { total: '1e3' }, { total: ' 1' }, { total: Number.MAX_SAFE_INTEGER + 1 }, { completadas: 2 }, { generales: 1 }, { negocio_completadas: 1 }, { generales_completadas: 1 }]) assert.deepEqual(resumir(datos([tarea('a')], { semana: [agregado(1, 0, cambio)] }), OWNER, FECHA), { estado: 'error' }, JSON.stringify(cambio))
  const enterosTexto = Object.fromEntries(Object.entries(agregado()).map(([key, value]) => [key, typeof value === 'number' ? String(value) : value]))
  assert.equal(resumir(datos([tarea('a')], { semana: [enterosTexto] }), OWNER, FECHA).total, 1)
})
test('error de carga, fecha, datos incompletos o tarea propia inválida dejan el resumen desconocido', () => {
  for (const source of [null, {}, datos([], { errorCarga: true }), datos([], { errorCarga: undefined }), datos([], { limitado: undefined }), datos([], { tareas: null }), datos([], { semana: null }), datos([tarea('a'), tarea('a')]), datos([tarea('a', { completada: 'false' })]), datos([tarea('a', { archivada: 'false' })]), datos([tarea('a', { categoria: 'otra' })]), datos([tarea('a', { texto: '' })]), datos([tarea('a', { texto: 'a'.repeat(301) })]), datos([tarea('a', { fecha: '2026-02-30' })]), datos([], { semana: [agregado(0, 0, { fecha: '2026-02-30' })] })]) {
    assert.deepEqual(resumir(source, OWNER, FECHA), { estado: 'error' })
  }
  for (const fecha of ['', '2026-02-30', null, '2099-13-01']) assert.deepEqual(resumir(datos(), OWNER, fecha), { estado: 'error' })
  assert.deepEqual(resumir(datos(), '', FECHA), { estado: 'error' })
})
test('la proyección no muta datos ni publica propiedad, email, versiones, categorías o textos de otras cuentas', () => {
  const source = datos([tarea('a', { email: 'privado@ejemplo.test', perfil: { documento: 'no-copiar' } }), tarea('ajena', { alumna_id: 'otra-cuenta', texto: 'Texto ajeno' })])
  const antes = JSON.stringify(source), result = resumir(source, OWNER, FECHA), json = JSON.stringify(result)
  assert.equal(JSON.stringify(source), antes)
  assert.deepEqual(Object.keys(result.proximas[0]).sort(), ['id', 'texto'])
  for (const privado of [OWNER, 'otra-cuenta', 'privado@', 'no-copiar', 'alumna_id', 'categoria', 'version', 'Texto ajeno']) assert.ok(!json.includes(privado))
  assert.deepEqual(JSON.parse(json), result)
})
