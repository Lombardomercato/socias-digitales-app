/* eslint-disable @typescript-eslint/no-require-imports */
// Agregados ficticios y proyecciones puras; sin datos o servicios reales.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts'), calendar = load('src/lib/home-calendar.ts', { './my-day': day })
const HOY = '2026-10-26', UID = 'cuenta-propia', rango = calendar.resolverMesCalendario(undefined, HOY)
const fila = extra => ({ alumna_id: UID, fecha: HOY, total: 5, completadas: 2, generales: 2, generales_completadas: 1, negocio: 3, negocio_completadas: 1, ...extra })
const hito = extra => ({ id: 'encuentro-publicado', titulo: 'Nuestra próxima clase', fecha: '2026-10-29T19:30:00-03:00', enlace: 'https://example.com/clase', accion: 'Entrar a la clase', ...extra })

test('meses se resuelven desde Argentina, cruzan años y respetan seis meses y límites de fecha', () => {
  assert.deepEqual(rango, { mes: '2026-10', etiqueta: 'octubre de 2026', desde: '2026-10-01', hasta: '2026-10-31', anterior: '2026-09', siguiente: '2026-11', actual: '2026-10', mesCorregido: false })
  assert.equal(calendar.resolverMesCalendario('2026-04', HOY).anterior, null)
  assert.equal(calendar.resolverMesCalendario('2027-04', HOY).siguiente, null)
  assert.equal(calendar.resolverMesCalendario('2027-02', HOY).hasta, '2027-02-28')
  assert.equal(calendar.resolverMesCalendario('2024-02', '2024-03-31').hasta, '2024-02-29')
  assert.equal(calendar.resolverMesCalendario('2000-01', '2000-01-01').anterior, null)
  assert.equal(calendar.resolverMesCalendario('2099-12', '2099-12-31').siguiente, null)
  for (const mes of ['2026-03', '2027-05', '2026-13', '2026-1', '', null, ['2026-10'], '../../admin', '1999-12']) {
    const result = calendar.resolverMesCalendario(mes, HOY)
    assert.equal(result.mes, '2026-10'); assert.equal(result.mesCorregido, true)
  }
  for (const fecha of ['2026-02-30', '1999-12-31', '', null]) assert.throws(() => calendar.resolverMesCalendario(undefined, fecha))
})
test('el rango mensual contiene solo sus días, sin inventar tareas en padding u otros meses', () => {
  const fechas = calendar.fechasMesCalendario(rango)
  assert.equal(fechas.length, 31); assert.equal(fechas[0], '2026-10-01'); assert.equal(fechas.at(-1), '2026-10-31')
  assert.equal(calendar.fechasMesCalendario(calendar.resolverMesCalendario('2027-02', HOY)).length, 28)
  assert.deepEqual(calendar.fechasMesCalendario({ desde: '2026-10-02', hasta: '2026-11-01' }), [])
})
test('agregado completo confirma ceros solo en días ausentes y conserva conteos, sin textos privados', () => {
  const source = [fila({ texto: 'No serializar notas', email: 'privado@example.test', version: 8 })], antes = JSON.stringify(source)
  const result = calendar.resumirTareasCalendario(source, UID, rango)
  assert.equal(result.estado, 'lista'); assert.equal(result.dias.length, 31); assert.equal(result.total, 5); assert.equal(result.completadas, 2); assert.equal(result.pendientes, 3)
  assert.deepEqual(result.dias.find(d => d.fecha === HOY), { fecha: HOY, total: 5, completadas: 2, pendientes: 3 })
  assert.deepEqual(result.dias[0], { fecha: '2026-10-01', total: 0, completadas: 0, pendientes: 0 })
  assert.equal(JSON.stringify(source), antes)
  for (const dato of [UID, 'alumna_id', 'privado@', 'No serializar', 'version', 'generales', 'negocio']) assert.ok(!JSON.stringify(result).includes(dato))
  assert.equal(calendar.resumirTareasCalendario([], UID, rango).total, 0)
  const texto = Object.fromEntries(Object.entries(fila()).map(([k, v]) => [k, typeof v === 'number' ? String(v) : v]))
  assert.equal(calendar.resumirTareasCalendario([texto], UID, rango).pendientes, 3)
})
test('errores, filas ajenas/duplicadas/rango extraño y conteos incoherentes no se convierten en cero', () => {
  for (const source of [null, {}, [fila(), fila()], [fila({ alumna_id: 'otra-cuenta' })], [fila({ fecha: '2026-11-01' })], [fila({ fecha: '2026-02-30' })], [null]]) assert.deepEqual(calendar.resumirTareasCalendario(source, UID, rango), { estado: 'error' })
  for (const cambio of [{ total: null }, { total: false }, { total: '5.0' }, { total: ' 5' }, { total: '05' }, { total: -1 }, { total: Infinity }, { total: 1.2 }, { total: Number.MAX_SAFE_INTEGER + 1 }, { completadas: 6 }, { generales: 1 }, { generales_completadas: 3 }, { negocio_completadas: 2 }]) assert.deepEqual(calendar.resumirTareasCalendario([fila(cambio)], UID, rango), { estado: 'error' }, JSON.stringify(cambio))
  assert.deepEqual(calendar.resumirTareasCalendario([], UID, rango, true), { estado: 'error' })
  assert.deepEqual(calendar.resumirTareasCalendario([], '', rango), { estado: 'error' })
  const gigantes = [fila({ fecha: '2026-10-01', total: Number.MAX_SAFE_INTEGER, completadas: 0, generales: Number.MAX_SAFE_INTEGER, generales_completadas: 0, negocio: 0, negocio_completadas: 0 }), fila({ fecha: '2026-10-02' })]
  assert.deepEqual(calendar.resumirTareasCalendario(gigantes, UID, rango), { estado: 'error' })
})
test('encuentros autorizados conservan fecha Argentina, hora, destino seguro y ninguna auditoría', () => {
  const source = [hito({ fecha: '2026-10-27T01:30:00Z', audiencias: ['socia'], administradora: 'privada', publicado: true }), hito({ id: 'fuera', fecha: '2026-11-01T19:30:00-03:00' })]
  const result = calendar.proyectarEncuentrosCalendario(source, rango)
  assert.equal(result.estado, 'lista'); assert.equal(result.encuentros.length, 1)
  assert.deepEqual(result.encuentros[0], { id: 'encuentro-publicado', titulo: 'Nuestra próxima clase', fecha: '2026-10-27T01:30:00Z', dia: '2026-10-26', hora: '22:30', enlace: 'https://example.com/clase', accion: 'Entrar a la clase' })
  for (const dato of ['audiencias', 'administradora', 'privada', 'publicado']) assert.ok(!Object.keys(result.encuentros[0]).includes(dato))
  assert.equal(calendar.proyectarEncuentrosCalendario([hito({ enlace: null })], rango).encuentros[0].enlace, null)
  assert.deepEqual(calendar.proyectarEncuentrosCalendario([], rango), { estado: 'lista', encuentros: [] })
})
test('enlaces peligrosos, identidades repetidas y errores de agenda no se publican como encuentros válidos', () => {
  for (const cambio of [{ enlace: 'javascript:alert(1)' }, { enlace: 'http://example.com' }, { enlace: 'https://usuario:secreto@example.com/clase' }, { enlace: undefined }, { titulo: '' }, { fecha: '2026-02-30T19:30:00-03:00' }, { fecha: '2026-10-29T24:00:00Z' }, { id: '' }, { accion: '' }]) assert.deepEqual(calendar.proyectarEncuentrosCalendario([hito(cambio)], rango), { estado: 'error' }, JSON.stringify(cambio))
  assert.deepEqual(calendar.proyectarEncuentrosCalendario([hito(), hito()], rango), { estado: 'error' })
  assert.deepEqual(calendar.proyectarEncuentrosCalendario([], rango, true), { estado: 'error' })
})
