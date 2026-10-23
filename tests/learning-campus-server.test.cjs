/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n === 'server-only' ? {} : n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const management = load('src/lib/class-management.ts'), progress = load('src/lib/class-progress.ts'), access = load('src/lib/class-access.ts')
const campus = load('src/lib/learning-campus.ts', { './class-management': management, './class-progress': progress })
const perfil = { rol: 'alumna', tipo_usuario: 'socia', estado: 'activa' }
const clase = { id: 'a', titulo: 'Clase de prueba local', modulo: 'Bienvenida', orden: 0, activo: true, puede_ver: true, tiene_video_privado: true, vimeo_url: null, plan: '27', descripcion: null }
const registro = { clase_id: 'a', completada: true, posicion_seg: 15, duracion_seg: 100, actualizado_en: '2026-10-23T12:00:00Z' }
function server({ catalogo = async () => [clase], progreso = async () => [registro] } = {}) {
  const calls = [], supabase = { from() { throw new Error('No se permiten consultas nuevas') } }
  const api = load('src/lib/learning-campus-server.ts', {
    './class-access': access, './learning-campus': campus,
    './class-catalog': { leerCatalogoClases: p => { calls.push(['catalogo', p]); return catalogo() } },
    './class-progress-server': { leerProgresoClases: (s, id) => { assert.equal(s, supabase); calls.push(['progreso', id]); return progreso() } },
  })
  return { ...api, calls, supabase }
}
test('reader consulta solo lectores existentes con perfil protegido y progreso de la cuenta de sesión', async () => {
  const s = server(), result = await s.leerCampusAprendizaje(s.supabase, 'mi-cuenta', perfil)
  assert.deepEqual(s.calls, [['catalogo', perfil], ['progreso', 'mi-cuenta']])
  assert.equal(result.estado, 'listo'); assert.equal(result.completadas, 1); assert.equal(result.programasCompletos, 1)
})
test('catálogo y progreso comienzan en paralelo, sin esperar uno para iniciar el otro', async () => {
  let finishCatalogo, finishProgreso
  const s = server({ catalogo: () => new Promise(resolve => { finishCatalogo = resolve }), progreso: () => new Promise(resolve => { finishProgreso = resolve }) })
  const promise = s.leerCampusAprendizaje(s.supabase, 'mi-cuenta', perfil)
  assert.equal(s.calls.length, 2)
  finishProgreso([registro]); finishCatalogo([clase])
  assert.equal((await promise).estado, 'listo')
})
test('error de catálogo no inventa lista ni totales; error de progreso preserva catálogo y desconocido', async () => {
  const failure = async () => { throw new Error('mensaje interno privado') }
  const sinCatalogo = server({ catalogo: failure }), desconocido = await sinCatalogo.leerCampusAprendizaje(sinCatalogo.supabase, 'mi-cuenta', perfil)
  assert.equal(desconocido.estado, 'error'); assert.equal(desconocido.total, null); assert.deepEqual(desconocido.programas, [])
  const sinProgreso = server({ progreso: failure }), parcial = await sinProgreso.leerCampusAprendizaje(sinProgreso.supabase, 'mi-cuenta', perfil)
  assert.equal(parcial.total, 1); assert.equal(parcial.completadas, null); assert.equal(parcial.programasCompletos, null); assert.equal(parcial.proxima, null)
  assert.ok(!JSON.stringify([desconocido, parcial]).includes('mensaje interno'))
})
test('no abre lecturas para admin, gratuitas sin formación, pausadas, canceladas o ID ausente', async () => {
  for (const p of [{ ...perfil, rol: 'admin' }, { ...perfil, tipo_usuario: 'gratuito' }, { ...perfil, tipo_usuario: 'desafio' }, { ...perfil, estado: 'pausada' }, { ...perfil, estado: 'cancelada' }, null]) {
    const s = server(), result = await s.leerCampusAprendizaje(s.supabase, 'mi-cuenta', p)
    assert.equal(s.calls.length, 0); assert.equal(result.estado, 'error'); assert.equal(result.total, null)
  }
  const s = server(); assert.equal((await s.leerCampusAprendizaje(s.supabase, '', perfil)).estado, 'error'); assert.equal(s.calls.length, 0)
  const desafio = server(); assert.equal((await desafio.leerCampusAprendizaje(desafio.supabase, 'mi-cuenta', { ...perfil, tipo_usuario: 'desafio', desafio_socias_habilitada: true })).estado, 'listo')
})
test('gratuita activa con permiso Desafío heredado conserva la misma formación real que la biblioteca', async () => {
  const heredado = { ...perfil, tipo_usuario: 'gratuito', desafio_socias_habilitada: true }
  assert.equal(access.puedeVerClasesPrivadas(heredado), true)
  const s = server(), result = await s.leerCampusAprendizaje(s.supabase, 'mi-cuenta', heredado)
  assert.equal(result.estado, 'listo'); assert.equal(s.calls.length, 2)
  assert.deepEqual(s.calls, [['catalogo', heredado], ['progreso', 'mi-cuenta']])
})
test('server-only y sin nuevas escrituras, credenciales, metadata o caché compartida entre alumnas', () => {
  const source = read('src/lib/learning-campus-server.ts')
  assert.ok(source.startsWith("import 'server-only'"))
  for (const mutation of ['.insert(', '.update(', '.upsert(', '.delete(', 'createAdminClient', 'user_metadata', 'process.env', "'use cache'", 'unstable_cache']) assert.ok(!source.includes(mutation))
})
