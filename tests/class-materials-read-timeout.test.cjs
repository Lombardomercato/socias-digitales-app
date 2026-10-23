/* eslint-disable @typescript-eslint/no-require-imports */
// Transporte simulado y credenciales de ejemplo. No acceso a R2 ni datos reales.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}, extra = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ...Object.keys(extra), ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports, ...Object.values(extra)); return m.exports }
const management = load('src/lib/class-management.ts')
const materials = load('src/lib/class-materials.ts', { './class-management': management })
const CLASE = '00000000-0000-4000-8000-000000000001'
function store(impl = async () => new Response(null, { status: 404 })) {
  const calls = [], api = load('src/lib/class-materials-store.ts', { './class-management': management, './class-materials': materials, './r2-upload': { pedirR2: (...args) => { calls.push(args); return impl(...args) } } })
  return { ...api, calls }
}
function index(etag = '"rev-ficticia"', extra = {}) { return new Response(JSON.stringify({ version: 1, materiales: [] }), { headers: { etag, ...extra } }) }

test('leerMateriales sin opciones conserva timeout de 25s y lectura 404 sin escrituras', async () => {
  for (const options of [undefined, {}, { timeoutMs: undefined }]) {
    const s = store(), result = await s.leerMateriales(CLASE, options)
    assert.deepEqual(result, { materiales: [], revision: null }); assert.equal(s.calls.length, 1)
    assert.deepEqual(s.calls[0], ['GET', `materiales-clases/${CLASE}/indice-v1.json`, {}, '', undefined, undefined, { sinCompresion: true, timeoutMs: 25000 }])
  }
})

test('timeout configurable admite únicamente enteros de 1 a 25s inclusive', async () => {
  for (const timeoutMs of [1000, 5000, 25000]) {
    const s = store(async () => index()), result = await s.leerMateriales(CLASE, { timeoutMs })
    assert.deepEqual(result, { materiales: [], revision: '"rev-ficticia"' }); assert.equal(s.calls[0][6].timeoutMs, timeoutMs)
  }
  for (const timeoutMs of [0, -1, 999, 25001, 1000.5, NaN, Infinity, '5000', null, {}, true]) {
    const s = store(); await assert.rejects(() => s.leerMateriales(CLASE, { timeoutMs }), /Tiempo de lectura no válido/); assert.deepEqual(s.calls, [])
  }
  const s = store(); await assert.rejects(() => s.leerMateriales('id-invalido', { timeoutMs: 5000 })); assert.deepEqual(s.calls, [])
})

test('el HEAD de ETag débil usa el mismo timeout y no inventa una revisión fuerte', async () => {
  for (const timeoutMs of [1000, 5000, 25000]) {
    const s = store(async method => method === 'GET' ? index('W/"rev-ficticia"') : new Response(null, { headers: { etag: '"rev-ficticia"' } }))
    assert.equal((await s.leerMateriales(CLASE, { timeoutMs })).revision, '"rev-ficticia"')
    assert.deepEqual(s.calls.map(call => call[0]), ['GET', 'HEAD']); assert.ok(s.calls.every(call => call[6].timeoutMs === timeoutMs && call[6].sinCompresion))
    assert.equal(s.calls[0][1], s.calls[1][1])
  }
  for (const head of [() => new Response(null, { headers: { etag: '"otra"' } }), () => new Response(null, { headers: { etag: 'W/"rev-ficticia"' } }), () => new Response(null, { status: 403 }), () => new Response(null)]) {
    const s = store(async method => method === 'GET' ? index('W/"rev-ficticia"') : head())
    await assert.rejects(() => s.leerMateriales(CLASE, { timeoutMs: 5000 }), /verificar su versión/)
    assert.ok(s.calls.every(call => ['GET', 'HEAD'].includes(call[0])))
  }
})

test('fallo/abort del GET, cuerpo o HEAD se propaga y no produce falso índice vacío', async () => {
  const fallo = new DOMException('Timeout de ejemplo', 'TimeoutError')
  for (const impl of [async () => { throw fallo }, async () => ({ ok: true, status: 200, headers: new Headers({ etag: '"rev"' }), text: async () => { throw fallo } }), async method => { if (method === 'GET') return index('W/"rev-ficticia"'); throw fallo }]) {
    const s = store(impl); await assert.rejects(() => s.leerMateriales(CLASE, { timeoutMs: 5000 }), error => error === fallo)
    assert.ok(s.calls.every(call => ['GET', 'HEAD'].includes(call[0])))
  }
  for (const status of [401, 403, 429, 500]) {
    const s = store(async () => new Response(null, { status })); await assert.rejects(() => s.leerMateriales(CLASE, { timeoutMs: 5000 }))
  }
})

test('timeout llega a AbortSignal del fetch existente y no usa Promise.race ni credenciales reales', async () => {
  const calls = [], signals = []
  const env = { R2_S3_ACCOUNT_ID: 'cuenta-ficticia', R2_BUCKET_NAME: 'bucket-ficticio', R2_ACCESS_KEY_ID: 'key-ficticia', R2_SECRET_ACCESS_KEY: 'secret-ficticio' }
  const r2 = load('src/lib/r2-upload.ts', { './class-management': management }, {
    process: { env },
    AbortSignal: { timeout: ms => { const signal = new AbortController().signal; signals.push({ ms, signal }); return signal } },
    fetch: async (_url, options) => { calls.push(options); return new Response(null, { status: 404 }) },
  })
  const s = load('src/lib/class-materials-store.ts', { './class-management': management, './class-materials': materials, './r2-upload': r2 })
  await s.leerMateriales(CLASE, { timeoutMs: 5000 }); await s.leerMateriales(CLASE)
  assert.deepEqual(signals.map(value => value.ms), [5000, 25000])
  assert.equal(calls[0].signal, signals[0].signal); assert.equal(calls[1].signal, signals[1].signal)
  assert.ok(calls.every(call => call.method === 'GET' && call.cache === 'no-store'))
  assert.ok(!read('src/lib/class-materials-store.ts').includes('Promise.race'))
})
