/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts'), { resumirSemana } = load('src/lib/my-day-week.ts', { './my-day': day })
const fila = (fecha, total = 3, completadas = 1) => ({ alumna_id: 'cuenta-propia', fecha, total, completadas, generales: 1, generales_completadas: completadas > 0 ? 1 : 0, negocio: total - 1, negocio_completadas: Math.max(0, completadas - 1) })
test('semana confirmada suma una vez cada fecha y distingue días vacíos, tareas y pendientes', () => {
  const result = resumirSemana([fila('2026-10-19'), fila('2026-10-23', 5, 4)], '2026-10-23')
  assert.equal(result.estado, 'listo'); assert.equal(result.desde, '2026-10-19'); assert.equal(result.hasta, '2026-10-25')
  assert.equal(result.total, 8); assert.equal(result.completadas, 5); assert.equal(result.pendientes, 3); assert.equal(result.diasConTareas, 2)
  assert.equal(result.dias.length, 7); assert.deepEqual(result.dias[1], { fecha: '2026-10-20', total: 0, completadas: 0, pendientes: 0 })
  assert.deepEqual(result.dias[4], { fecha: '2026-10-23', total: 5, completadas: 4, pendientes: 1 })
})
test('vacío es conocido solo cuando la lectura fue confirmada; error mantiene días pero no ceros', () => {
  const vacio = resumirSemana([], '2026-10-23')
  assert.equal(vacio.estado, 'listo'); assert.equal(vacio.total, 0); assert.equal(vacio.diasConTareas, 0)
  for (const result of [resumirSemana([], '2026-10-23', true), resumirSemana([fila('2026-10-19')], '2026-10-23', true), resumirSemana(null, '2026-10-23')]) {
    assert.equal(result.estado, 'error'); assert.equal(result.dias.length, 7)
    for (const key of ['total', 'completadas', 'pendientes', 'diasConTareas']) assert.equal(result[key], null)
    assert.ok(result.dias.every(d => d.total === null && d.completadas === null && d.pendientes === null))
  }
})
test('rechaza duplicados, números inválidos e incoherencias en los agregados sin inventar progreso', () => {
  for (const cambio of [{ total: null }, { total: '' }, { total: false }, { total: NaN }, { total: Infinity }, { total: -1 }, { total: 1.2 }, { total: '1e2' }, { total: ' 3' }, { completadas: 4 }, { generales: 2 }, { negocio_completadas: 1 }, { generales_completadas: 2 }]) assert.equal(resumirSemana([{ ...fila('2026-10-23'), ...cambio }], '2026-10-23').estado, 'error')
  assert.equal(resumirSemana([fila('2026-10-23'), fila('2026-10-23')], '2026-10-23').estado, 'error')
  const enterosTexto = Object.fromEntries(Object.entries(fila('2026-10-23')).map(([key, value]) => [key, typeof value === 'number' ? String(value) : value]))
  assert.equal(resumirSemana([enterosTexto], '2026-10-23').total, 3)
  const enorme = { ...fila('2026-10-19'), total: Number.MAX_SAFE_INTEGER, generales: Number.MAX_SAFE_INTEGER - 2, negocio: 2 }
  assert.equal(resumirSemana([enorme, fila('2026-10-23')], '2026-10-23').estado, 'error')
})
test('solo incluye la semana de la fecha elegida y resuelve cruces de mes, año y bisiesto', () => {
  const result = resumirSemana([fila('2026-12-27', 100, 99), fila('2026-12-28'), fila('2027-01-03'), fila('2027-01-04', 100, 99)], '2027-01-01')
  assert.equal(result.desde, '2026-12-28'); assert.equal(result.hasta, '2027-01-03'); assert.equal(result.total, 6)
  const bisiesto = resumirSemana([], '2028-02-29')
  assert.equal(bisiesto.desde, '2028-02-28'); assert.equal(bisiesto.hasta, '2028-03-05')
  for (const fecha of ['2026-02-30', '', null, '2026-13-01']) {
    const unknown = resumirSemana([], fecha)
    assert.equal(unknown.estado, 'error'); assert.equal(unknown.total, null); assert.deepEqual(unknown.dias, [])
  }
  assert.equal(resumirSemana([{ ...fila('2026-10-23'), fecha: '2026-02-30' }], '2026-10-23').estado, 'error')
})
test('no muta los datos ni expone IDs/textos ni añade rachas, porcentajes, rangos o nuevas consultas', () => {
  const source = [{ ...fila('2026-10-23'), texto: 'Dato personal', email: 'privado@ejemplo.test' }], antes = JSON.stringify(source), result = resumirSemana(source, '2026-10-23'), json = JSON.stringify(result)
  assert.equal(JSON.stringify(source), antes); assert.deepEqual(JSON.parse(json), result)
  for (const token of ['cuenta-propia', 'Dato personal', 'privado@ejemplo.test', 'racha', 'porcentaje', 'rango']) assert.ok(!json.includes(token))
  for (const token of ['fetch(', 'supabase', '.insert(', '.update(', 'localStorage']) assert.ok(!read('src/lib/my-day-week.ts').includes(token))
})
