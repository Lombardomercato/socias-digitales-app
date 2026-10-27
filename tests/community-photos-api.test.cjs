/* eslint-disable @typescript-eslint/no-require-imports */
// The route and HTTP authorization wrapper are real; sessions/storage are mocked.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports)
  return m.exports
}
const domain = load('src/lib/community.ts'), metrics = load('src/lib/metrics.ts')
const id = n => `${n.toString(16).padStart(8, '0')}-abab-4aba-8aba-101010101010`
const USER = id(1), POST = id(10), FOTO = id(20), dto = { id: FOTO, ancho: 320, alto: 240 }
class ErrorComunidad extends Error { constructor(status, message) { super(message); this.status = status } }
class ErrorFotosComunidad extends Error { constructor(status, message) { super(message); this.status = status } }
const pathRoute = 'src/app/api/comunidad/[id]/fotos/[fotoId]/route.ts'
const urlPath = `/api/comunidad/${POST}/fotos/${FOTO}`
const context = (post = POST, photo = FOTO) => ({ params: Promise.resolve({ id: post, fotoId: photo }) })
function request(method = 'GET', route = urlPath, data, headers = {}) {
  return new Request('https://app.example.test' + route, { method, headers: { ...(method === 'GET' ? {} : { origin: 'https://app.example.test', 'Content-Type': 'image/webp' }), ...headers }, ...(data === undefined ? {} : { body: typeof data === 'string' ? data : new Uint8Array(data) }) })
}
function privacy(response) {
  assert.equal(response.headers.get('cache-control'), 'private, no-store'); assert.equal(response.headers.get('x-content-type-options'), 'nosniff'); assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
}
function fixture(options = {}) {
  const calls = [], auth = { admin: Boolean(options.admin), userId: USER, perfil: {}, supabase: { from: () => ({ select() { return this }, eq() { return this }, maybeSingle: async () => ({ data: null, error: null }) }) } }
  const server = { ErrorComunidad, autorizarComunidad: async () => { calls.push(['auth']); return options.authError ? { error: { status: options.authError, mensaje: 'Acceso ficticio denegado' } } : auth } }
  const photos = options.photos ?? {
    ErrorFotosComunidad,
    subirFotoComunidad: async (...args) => { calls.push(['upload', ...args]); if (options.throw) throw options.throw; if (!domain.idComunidadValido(args[1]) || !domain.idComunidadValido(args[2])) throw new ErrorFotosComunidad(400, 'Identificador no válido.'); if (options.pending) await options.pending; return dto },
    obtenerFotoComunidad: async (...args) => { calls.push(['read', ...args]); if (options.throw) throw options.throw; if (!domain.idComunidadValido(args[1]) || !domain.idComunidadValido(args[2])) throw new ErrorFotosComunidad(404, 'Foto no disponible.'); return new Response(new Uint8Array([82, 73, 70, 70]), { headers: { 'Content-Type': 'image/webp', 'Content-Length': '4', 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; sandbox" } }) },
  }
  const http = load('src/lib/community-http.ts', { 'next/navigation': { unstable_rethrow: error => { if (error === options.control) throw error } }, './metrics': metrics, './community-server': server })
  const api = load(pathRoute, { '@/lib/community-http': http, '@/lib/community-photos-server': photos, '@/lib/community-server': server })
  return { api, auth, calls, http }
}
test('ruta usa Node/60segundos y exige sesión/plan antes de tocar bytes o almacenamiento', async () => {
  for (const method of ['GET', 'PUT']) for (const code of [401, 403, 503]) {
    const f = fixture({ authError: code }), input = request(method, urlPath, method === 'PUT' ? Buffer.from('imagen ficticia') : undefined)
    const response = await f.api[method](input, context())
    assert.equal(response.status, code); privacy(response); assert.deepEqual(f.calls.map(call => call[0]), ['auth']); assert.equal(input.bodyUsed, false)
  }
  const f = fixture(); assert.equal(f.api.runtime, 'nodejs'); assert.equal(f.api.maxDuration, 60)
})
test('PUT verifica Origin antes de autenticar; no confía en forwarded-host, puertos distintos ni origen con ruta', async () => {
  for (const headers of [{ origin: '' }, { origin: 'https://otro.example.test' }, { origin: 'https://app.example.test/path' }, { origin: 'null' }, { origin: 'https://app.example.test:444' }, { origin: 'https://malicioso.test', 'x-forwarded-host': 'malicioso.test' }]) {
    const f = fixture(), response = await f.api.PUT(request('PUT', urlPath, Buffer.from('foto'), headers), context())
    assert.equal(response.status, 403); privacy(response); assert.equal(f.calls.length, 0)
  }
})
test('GET/PUT rechazan parámetros extra sin convertirlos en identidad, bucket o clave de almacenamiento', async () => {
  for (const method of ['GET', 'PUT']) for (const query of ['?alumna_id=otra', '?bucket=publico', '?key=ajena', '?fotoId=otra', '?ancho=1', '?v=1']) {
    const f = fixture(), response = await f.api[method](request(method, urlPath + query, method === 'PUT' ? Buffer.from('foto') : undefined), context())
    assert.equal(response.status, 400); privacy(response); assert.deepEqual(f.calls.map(call => call[0]), ['auth'])
  }
})
test('PUT pasa solo sesión/ruta canónica/request original al servicio y espera su confirmación exacta', async () => {
  let finish
  const f = fixture({ pending: new Promise(resolve => { finish = resolve }) }), input = request('PUT', urlPath, Buffer.from('foto'))
  let completed = false
  const pending = f.api.PUT(input, context(POST.toUpperCase(), FOTO.toUpperCase())).then(value => { completed = true; return value })
  await new Promise(resolve => setImmediate(resolve)); assert.equal(completed, false)
  finish(); const result = await pending
  assert.equal(result.status, 200); privacy(result); assert.deepEqual(await result.json(), { foto: dto })
  assert.deepEqual(f.calls[1], ['upload', f.auth, POST, FOTO, input]); assert.equal(f.calls[1][1].userId, USER)
})
test('GET devuelve cuerpo WebP privado del servicio sin JSON, URL pública ni cabeceras R2', async () => {
  const f = fixture(), result = await f.api.GET(request(), context())
  assert.equal(result.status, 200); privacy(result); assert.equal(result.headers.get('content-type'), 'image/webp'); assert.equal(result.headers.get('vary'), 'Cookie'); assert.equal(result.headers.get('x-amz-meta-autora'), null)
  assert.deepEqual(new Uint8Array(await result.arrayBuffer()), new Uint8Array([82, 73, 70, 70])); assert.deepEqual(f.calls[1], ['read', f.auth, POST, FOTO])
})
test('errores de foto mantienen status sin éxito simulado; errores desconocidos se sanitizan y señales Next se relanzan', async () => {
  for (const method of ['GET', 'PUT']) for (const code of [400, 403, 404, 409, 413, 415, 422, 429, 503]) {
    const f = fixture({ throw: new ErrorFotosComunidad(code, 'Error de foto controlado') }), result = await f.api[method](request(method, urlPath, method === 'PUT' ? Buffer.from('foto') : undefined), context())
    assert.equal(result.status, code); privacy(result); const body = await result.json(); assert.equal(body.estado, 'error'); assert.equal(Object.hasOwn(body, 'foto'), false)
  }
  const secret = fixture({ throw: new Error('No publicar detalle privado de R2') }), result = await secret.api.PUT(request('PUT', urlPath, Buffer.from('foto')), context())
  assert.equal(result.status, 503); assert.ok(!JSON.stringify(await result.json()).includes('detalle privado'))
  const control = new Error('señal Next ficticia'), f = fixture({ throw: control, control })
  await assert.rejects(f.api.GET(request(), context()), error => error === control)
})
test('identificadores de ruta inválidos no se interpretan como claves y conservan404GET/400PUT', async () => {
  for (const method of ['GET', 'PUT']) for (const target of [['../privado', FOTO], [POST, 'foto.jpg'], [POST, ''], ['no-uuid', FOTO]]) {
    const f = fixture(), result = await f.api[method](request(method, urlPath, method === 'PUT' ? Buffer.from('foto') : undefined), context(...target))
    assert.equal(result.status, method === 'GET' ? 404 : 400); privacy(result)
  }
})
test('integración del PUT con guard binario real deniega MIME/cuerpo excesivo después de autorización sin escribir R2', async () => {
  const calls = [], photos = load('src/lib/community-photos-server.ts', { './community': domain, './r2-upload': { pedirR2: async (...args) => { calls.push(args); throw new Error('Must not reach storage') } } })
  for (const [data, type, headers, expected] of [[Buffer.from('{}'), 'application/json', {}, 415], [Buffer.from('<svg/>'), 'image/webp', {}, 415], [Buffer.alloc(4 * 1024 * 1024 + 1), 'image/png', { 'Content-Length': '1' }, 413], [Buffer.alloc(0), 'image/png', {}, 400]]) {
    const f = fixture({ photos }), result = await f.api.PUT(request('PUT', urlPath, data, { 'Content-Type': type, ...headers }), context())
    assert.equal(result.status, expected); privacy(result); assert.equal(calls.length, 0)
  }
})
