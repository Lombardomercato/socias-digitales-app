/* eslint-disable @typescript-eslint/no-require-imports */
// Solo dobles de RPC; nunca inicia sesión ni consulta una base real.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts'), logic = load('src/lib/home-calendar.ts', { './my-day': day })
const sentinel = new Error('NEXT_DYNAMIC_SENTINEL')
const server = load('src/lib/home-calendar-server.ts', { 'server-only': {}, 'next/navigation': { unstable_rethrow: error => { if (error === sentinel) throw error } }, './home-calendar': logic })
const HOY = '2026-10-26', UID = 'propia', perfil = { rol: 'alumna' }, permiso = { permitido: true, error: false }
const hito = { id: 'publicado', titulo: 'Clase compartida', fecha: '2026-10-29T19:30:00-03:00', enlace: null, accion: 'Entrar a la clase' }
function db(result = { data: [], error: null }) {
  const calls = [], signals = []
  return { calls, signals, rpc: (name, args) => { calls.push({ name, args }); return { abortSignal: async signal => { signals.push(signal); if (result instanceof Error) throw result; return result } } }, from() { throw new Error('No consultar tablas ni directorios desde este lector') } }
}
test('lector consulta exclusivamente el agregado existente del mes exacto, con señal y sin autenticar otra vez', async () => {
  const client = db(), result = await server.leerCalendarioPersonal(client, UID, perfil, permiso, '2026-10', HOY, [hito], false)
  assert.equal(result.estado, 'listo'); assert.equal(result.tareas.estado, 'lista'); assert.equal(result.encuentros.encuentros.length, 1)
  assert.deepEqual(client.calls, [{ name: 'resumen_mi_dia', args: { desde: '2026-10-01', hasta: '2026-10-31' } }]); assert.ok(client.signals[0] instanceof AbortSignal)
  assert.equal(client.signals[0].aborted, false)
  const febrero = db(); await server.leerCalendarioPersonal(febrero, UID, perfil, permiso, '2027-02', HOY, [], false)
  assert.equal(febrero.calls[0].args.hasta, '2027-02-28')
})
test('no permiso o error de permiso jamás consulta tareas privadas; eventos siguen siendo independientes', async () => {
  for (const [access, estado] of [[{ permitido: false }, 'no-habilitado'], [{ permitido: true, error: true }, 'error'], [null, 'error'], [{ permitido: 'true' }, 'error'], [{ permitido: true, error: 'false' }, 'error']]) {
    const client = db(), result = await server.leerCalendarioPersonal(client, UID, perfil, access, undefined, HOY, [hito], false)
    assert.equal(client.calls.length, 0); assert.equal(result.tareas.estado, estado); assert.equal(result.encuentros.estado, 'lista'); assert.equal(result.encuentros.encuentros.length, 1)
  }
})
test('admin, identidad ausente y fecha inválida no consultan ni devuelven calendario de alumna', async () => {
  for (const args of [[UID, { rol: 'admin' }, permiso, HOY], [UID, perfil, { permitido: true, admin: true }, HOY], ['', perfil, permiso, HOY], [UID, {}, permiso, HOY], [UID, perfil, permiso, '2026-02-30']]) {
    const client = db(); assert.deepEqual(await server.leerCalendarioPersonal(client, args[0], args[1], args[2], undefined, args[3], [hito], false), { estado: 'error' }); assert.equal(client.calls.length, 0)
  }
})
test('fallos y datos ajenos nunca se convierten en cero ni ocultan el encuentro confirmado', async () => {
  for (const response of [{ data: null, error: { message: 'red' } }, { data: null, error: null }, new Error('timeout'), { data: [{ alumna_id: 'ajena', fecha: HOY, total: 1, completadas: 0, generales: 1, generales_completadas: 0, negocio: 0, negocio_completadas: 0 }], error: null }]) {
    const result = await server.leerCalendarioPersonal(db(response), UID, perfil, permiso, undefined, HOY, [hito], false)
    assert.equal(result.tareas.estado, 'error'); assert.equal(result.encuentros.estado, 'lista'); assert.ok(!JSON.stringify(result).includes('ajena'))
  }
  const result = await server.leerCalendarioPersonal(db(), UID, perfil, permiso, undefined, HOY, [], true)
  assert.equal(result.tareas.estado, 'lista'); assert.equal(result.encuentros.estado, 'error')
  await assert.rejects(server.leerCalendarioPersonal(db(sentinel), UID, perfil, permiso, undefined, HOY, [], false), error => error === sentinel)
})
test('Server Component no serializa cliente de sesión ni identidad y omite completamente administradoras', async () => {
  const calls = [], datos = { estado: 'error' }
  const Component = load('src/app/inicio/PersonalCalendar.tsx', { '@/components/HomeCalendar': { default: () => null }, '@/lib/home-calendar-server': { leerCalendarioPersonal: async (...args) => { calls.push(args); return datos } } }).default
  const props = { supabase: { privateClient: true }, usuariaId: UID, perfil, permisoMiDia: permiso, hoy: HOY, hitos: [hito], errorAgenda: false }
  const view = await Component(props)
  assert.deepEqual(Object.keys(view.props), ['datos']); assert.equal(view.props.datos, datos); assert.equal(calls.length, 1)
  assert.equal(await Component({ ...props, perfil: { rol: 'admin' } }), null); assert.equal(calls.length, 1)
  assert.equal(await Component({ ...props, permisoMiDia: { permitido: true, admin: true } }), null); assert.equal(calls.length, 1)
})
