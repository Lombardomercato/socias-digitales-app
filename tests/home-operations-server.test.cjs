/* eslint-disable @typescript-eslint/no-require-imports */
// Lectores/sesión simulados; no consultas reales, escrituras ni navegador.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts')
const operations = load('src/lib/home-operations.ts', { './my-day': day })
const OWNER = 'cuenta-propia', FECHA = '2026-10-23'
const empty = { tareas: [], semana: [], limitado: false, errorCarga: false }
function reader(impl = async () => empty) {
  const calls = []
  const supabase = { from() { throw new Error('No se permiten consultas adicionales') }, rpc() { throw new Error('No se permiten RPC adicionales') }, auth: { getUser() { throw new Error('getUser ya fue comprobado por el llamador') } } }
  const api = load('src/lib/home-operations-server.ts', { './my-day': day, './home-operations': operations, './my-day-server': { leerMiDia: (client, uid, fecha) => { assert.equal(client, supabase); calls.push({ uid, fecha }); return impl() } } })
  return { ...api, supabase, calls }
}
test('permiso falso o error se distinguen sin tocar tareas, Auth o consultas adicionales', async () => {
  for (const [permiso, estado] of [[{ permitido: false }, 'no-habilitado'], [{ permitido: false, error: false }, 'no-habilitado'], [{ permitido: false, error: true }, 'error'], [{ permitido: true, error: true }, 'error'], [{ permitido: 'true' }, 'error'], [null, 'error']]) {
    const view = reader(), result = await view.leerResumenMiDiaInicio(view.supabase, OWNER, FECHA, permiso)
    assert.deepEqual(result, { estado }); assert.deepEqual(view.calls, [])
  }
})
test('lector permitido reutiliza una sola lectura con UID de sesión y fecha explícita', async () => {
  const view = reader(), result = await view.leerResumenMiDiaInicio(view.supabase, OWNER, FECHA, { permitido: true, error: false })
  assert.deepEqual(view.calls, [{ uid: OWNER, fecha: FECHA }])
  assert.deepEqual(result, { estado: 'listo', fecha: FECHA, total: 0, completadas: 0, pendientes: 0, proximas: [] })
})
test('errores de lectura o datos inválidos no producen ceros ni filtran mensajes internos', async () => {
  for (const impl of [async () => { throw new Error('detalle privado') }, async () => ({ ...empty, errorCarga: true }), async () => ({ ...empty, limitado: true }), async () => null]) {
    const view = reader(impl), result = await view.leerResumenMiDiaInicio(view.supabase, OWNER, FECHA, { permitido: true })
    assert.deepEqual(result, { estado: 'error' }); assert.ok(!JSON.stringify(result).includes('detalle privado'))
  }
  for (const [uid, fecha] of [['', FECHA], [OWNER, '2026-02-30']]) {
    const view = reader(); assert.deepEqual(await view.leerResumenMiDiaInicio(view.supabase, uid, fecha, { permitido: true }), { estado: 'error' }); assert.deepEqual(view.calls, [])
  }
})
test('integración mock con leerMiDia conserva exactamente su consulta propia y RPC semanal existentes', async () => {
  const calls = [], row = { id: 'tarea-propia', alumna_id: OWNER, texto: 'Preparar clase', fecha: FECHA, categoria: 'negocio_digital', completada: false, archivada: false, version: 1, creado_en: '2026-10-23T12:00:00Z', actualizada_en: '2026-10-23T12:00:00Z' }
  const summary = day.resumenTareas([row], FECHA)
  const supabase = {
    from(table) {
      calls.push(['from', table]); assert.equal(table, 'checklist_tareas')
      const query = {}
      for (const method of ['select', 'eq', 'order']) query[method] = (...args) => { calls.push([method, ...args]); return query }
      query.limit = async value => { calls.push(['limit', value]); return { data: [row], error: null, count: 1 } }
      return query
    },
    rpc: async (name, args) => { calls.push(['rpc', name, args]); return { data: [summary, { ...summary, alumna_id: 'otra-cuenta', texto: 'No copiar' }], error: null } },
    auth: { getUser: () => { throw new Error('No Auth adicional') } },
  }
  const myDay = load('src/lib/my-day-server.ts', { './my-day': day })
  const api = load('src/lib/home-operations-server.ts', { './my-day': day, './home-operations': operations, './my-day-server': myDay })
  const result = await api.leerResumenMiDiaInicio(supabase, OWNER, FECHA, { permitido: true })
  assert.deepEqual(result, { estado: 'listo', fecha: FECHA, total: 1, completadas: 0, pendientes: 1, proximas: [{ id: row.id, texto: row.texto }] })
  assert.equal(calls.filter(call => call[0] === 'from').length, 1)
  assert.deepEqual(calls.filter(call => call[0] === 'eq'), [['eq', 'alumna_id', OWNER], ['eq', 'fecha', FECHA]])
  assert.deepEqual(calls.find(call => call[0] === 'rpc'), ['rpc', 'resumen_mi_dia', { desde: '2026-10-19', hasta: '2026-10-25' }])
  assert.deepEqual(calls.find(call => call[0] === 'limit'), ['limit', 500])
})
test('server-only sin acceso directo, caché compartida, credenciales, envíos o mutaciones', () => {
  const source = read('src/lib/home-operations-server.ts')
  assert.ok(source.startsWith("import 'server-only'"))
  for (const forbidden of ['.from(', '.rpc(', '.insert(', '.update(', '.upsert(', '.delete(', '.auth.', 'createAdminClient', 'user_metadata', 'process.env', 'unstable_cache', "'use cache'", 'fetch(']) assert.ok(!source.includes(forbidden))
})
