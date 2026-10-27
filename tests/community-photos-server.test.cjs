/* eslint-disable @typescript-eslint/no-require-imports */
// Real Sharp codecs; private storage and RLS reads are in-memory fixtures only.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), sharp = require('sharp')
const { createHash, createHmac, randomBytes } = require('node:crypto')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports)
  return m.exports
}
const domain = load('src/lib/community.ts')
const id = n => `${n.toString(16).padStart(8, '0')}-1010-4010-8010-101010101010`
const USER = id(1), OTHER = id(2), POST = id(10), FOTO = id(20)
const hash = body => createHash('sha256').update(body).digest('hex')
const fileKey = (owner = USER, post = POST, photo = FOTO) => `comunidad-fotos/archivos/${owner}/${post}/${photo}.webp`
const quotaDay = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Cordoba', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
const quotaKey = (owner = USER) => `comunidad-fotos/cuotas/${owner}/${quotaDay()}.json`
const meta = (bytes, owner = USER, post = POST, photo = FOTO, changes = {}) => ({ autora: owner, publicacion: post, foto: photo, 'entrada-sha256': hash(bytes), ancho: '320', alto: '240', ...changes })
const parent = (changes = {}) => ({ id: POST, alumna_id: USER, fotos: [{ id: FOTO, ancho: 320, alto: 240 }], retirada_en: null, oculta_en: null, ...changes })

function storage(options = {}) {
  const objects = new Map(), calls = []; let revision = 0
  function seed(key, body, type = 'image/webp', metadata = {}) {
    const data = Buffer.from(body), record = { body: data, type, metadata: { ...metadata }, etag: `"${++revision}-${hash(data).slice(0, 20)}"` }
    objects.set(key, record); return record
  }
  function answer(method, key, changes = {}) {
    const record = objects.get(key)
    if (!record) return new Response(null, { status: 404 })
    const headers = { 'Content-Type': record.type, 'Content-Length': String(record.body.length), ETag: record.etag, ...Object.fromEntries(Object.entries(record.metadata).map(([name, value]) => [`x-amz-meta-${name}`, value])), ...changes }
    return new Response(method === 'HEAD' ? null : new Uint8Array(record.body), { headers })
  }
  async function pedirR2(method, key, query = {}, body = '', type, condition, settings) {
    const call = { method, key, query, body, type, condition, settings }; calls.push(call)
    const custom = await options.intercept?.(call, { objects, calls, seed, answer })
    if (custom !== undefined) return custom
    if (method === 'GET' || method === 'HEAD') return answer(method, key)
    assert.equal(method, 'PUT', 'Photo operations must never delete objects')
    const previous = objects.get(key)
    if (condition?.['If-None-Match'] === '*' && previous || condition?.['If-Match'] && previous?.etag !== condition['If-Match']) return new Response(null, { status: 412 })
    assert.ok(condition && (condition['If-Match'] || condition['If-None-Match']), 'All writes use a storage precondition')
    const saved = seed(key, body, type, settings?.metadatos ?? {})
    return new Response(null, { status: 200, headers: { ETag: saved.etag } })
  }
  return { objects, calls, seed, answer, pedirR2 }
}
function fixture(options = {}) {
  const r2 = storage(options), queries = []
  const auth = { userId: options.userId ?? USER, admin: Boolean(options.admin), perfil: {}, supabase: { from(table) {
    assert.equal(table, 'publicaciones')
    const query = { table, fields: '', id: null }; queries.push(query)
    return { select(fields) { query.fields = fields; return this }, eq(column, value) { assert.equal(column, 'id'); query.id = value; return this }, async maybeSingle() {
      if (options.queryThrow) throw new Error('Mock query failure')
      return { data: options.post ?? null, error: options.queryError ?? null }
    } }
  } } }
  const server = load('src/lib/community-photos-server.ts', { './r2-upload': r2, './community': domain, sharp })
  return { ...r2, auth, server, queries }
}
function request(bytes, type = 'image/png', headers = {}) {
  return new Request(`https://app.example.test/api/comunidad/${POST}/fotos/${FOTO}`, { method: 'PUT', headers: { 'Content-Type': type, ...headers }, body: new Uint8Array(bytes) })
}
const encoded = async (format = 'png', create = {}) => sharp({ create: { width: 320, height: 240, channels: 3, background: '#EC9BB6', ...create } })[format]().toBuffer()
function status(expected) { return error => error instanceof Error && error.status === expected }

test('JPEG/PNG/WebP reales se recodifican a WebP con metadatos atómicos, DTO sin URLs y cuota Argentina', async () => {
  assert.equal(sharp.versions.sharp, '0.34.5')
  for (const format of ['jpeg', 'png', 'webp']) {
    const bytes = await encoded(format), f = fixture(), dto = await f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes, `image/${format}`))
    assert.deepEqual(dto, { id: FOTO, ancho: 320, alto: 240 }); assert.equal(Object.hasOwn(dto, 'url'), false)
    const record = f.objects.get(fileKey()), output = await sharp(record.body).metadata()
    assert.equal(output.format, 'webp'); assert.equal(output.width, dto.ancho); assert.equal(output.height, dto.alto)
    assert.equal(record.type, 'image/webp'); assert.deepEqual(record.metadata, meta(bytes))
    const put = f.calls.find(call => call.method === 'PUT' && call.key === fileKey())
    assert.deepEqual(put.condition, { 'If-None-Match': '*' }); assert.deepEqual(put.settings.metadatos, record.metadata)
    assert.deepEqual(JSON.parse(f.objects.get(quotaKey()).body), { version: 1, reservas: [{ post: POST, foto: FOTO, hash: hash(bytes) }] })
    assert.ok(f.queries.every(query => query.id === POST && query.fields === 'id,alumna_id,fotos,retirada_en,oculta_en'))
  }
})
test('orientación EXIF se aplica una vez y salida elimina EXIF/ICC; se respeta lado2048 sin ampliar', async () => {
  const bytes = await sharp({ create: { width: 60, height: 100, channels: 3, background: '#294A38' } }).withMetadata({ orientation: 6 }).jpeg().toBuffer()
  assert.equal((await sharp(bytes).metadata()).orientation, 6)
  const f = fixture(), dto = await f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes, 'image/jpeg'))
  assert.deepEqual(dto, { id: FOTO, ancho: 100, alto: 60 })
  const output = await sharp(f.objects.get(fileKey()).body).metadata()
  assert.equal(output.orientation, undefined); assert.equal(output.exif, undefined); assert.equal(output.icc, undefined)
  const large = fixture(), longBytes = await encoded('png', { width: 3000, height: 1000 })
  const resized = await large.server.subirFotoComunidad(large.auth, POST, FOTO, request(longBytes))
  assert.equal(resized.ancho, 2048); assert.ok(resized.alto <= 2048); assert.equal(resized.alto, 683)
})
test('MIME erróneo/SVG/GIF/firma falsa/corrupta y WebP animado no escriben fotos', async () => {
  const png = await encoded('png'), animation = await sharp(Buffer.concat([Buffer.alloc(12 * 12 * 3, 30), Buffer.alloc(12 * 12 * 3, 230)]), { raw: { width: 12, height: 24, pageHeight: 12, channels: 3 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer()
  assert.ok((await sharp(animation, { animated: true }).metadata()).pages > 1)
  for (const [bytes, type, expected] of [[png, 'image/jpeg', 415], [Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), 'image/svg+xml', 415], [Buffer.from('GIF89a'), 'image/gif', 415], [Buffer.from('RIFF0000WEBPinvalid'), 'image/webp', 422], [animation, 'image/webp', 422]]) {
    const f = fixture(); await assert.rejects(f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes, type)), status(expected))
    assert.equal(f.objects.has(fileKey()), false); assert.equal(f.calls.some(call => call.method === 'PUT' && call.key === fileKey()), false)
  }
})
test('4MiB se controla por stream real aun con Content-Length menor, vacío y longitud inválida fallan', async () => {
  const f = fixture(), over = Buffer.alloc(4 * 1024 * 1024 + 1, 1)
  for (const headers of [{}, { 'Content-Length': '1' }, { 'Content-Length': String(over.length) }, { 'Content-Length': '1.5' }, { 'Content-Length': '-1' }]) await assert.rejects(f.server.leerBytesFoto(request(over, 'image/png', headers)), status(413))
  await assert.rejects(f.server.leerBytesFoto(request(Buffer.alloc(0))), status(400))
  await assert.rejects(f.server.leerBytesFoto(new Request('https://app.example.test', { method: 'PUT', headers: { 'Content-Type': 'image/png' } })), status(400))
  const exact = Buffer.alloc(4 * 1024 * 1024, 1), readExact = await f.server.leerBytesFoto(request(exact))
  assert.equal(readExact.bytes.length, exact.length); assert.equal(readExact.tipo, 'image/png')
  let cancelled = false
  const streaming = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(4 * 1024 * 1024)); controller.enqueue(new Uint8Array(1)) }, cancel() { cancelled = true } })
  await assert.rejects(f.server.leerBytesFoto(new Request('https://app.example.test', { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: streaming, duplex: 'half' })), status(413)); assert.equal(cancelled, true)
})
test('25MP y salida WebP>2MiB se rechazan después de reservar, sin publicar ningún objeto de foto', async () => {
  const huge = await encoded('png', { width: 5001, height: 5000 }), f = fixture()
  assert.ok(huge.length < 4 * 1024 * 1024)
  await assert.rejects(f.server.subirFotoComunidad(f.auth, POST, FOTO, request(huge)), status(422)); assert.equal(f.objects.has(fileKey()), false); assert.ok(f.objects.has(quotaKey()))
  const noisy = await sharp(randomBytes(2048 * 2048 * 3), { raw: { width: 2048, height: 2048, channels: 3 } }).jpeg({ quality: 90 }).toBuffer(), second = fixture()
  assert.ok(noisy.length < 4 * 1024 * 1024)
  await assert.rejects(second.server.subirFotoComunidad(second.auth, POST, FOTO, request(noisy, 'image/jpeg')), status(413)); assert.equal(second.objects.has(fileKey()), false)
})
test('reintento mismoID/hash es idempotente; bytes distintos generan409 sin sobrescribir ni consumir otra reserva', async () => {
  const bytes = await encoded(), f = fixture(), dto = await f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes))
  const first = Buffer.from(f.objects.get(fileKey()).body), beforeWrites = f.calls.filter(call => call.method === 'PUT').length
  assert.deepEqual(await f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes)), dto)
  assert.equal(f.calls.filter(call => call.method === 'PUT').length, beforeWrites)
  await assert.rejects(f.server.subirFotoComunidad(f.auth, POST, FOTO, request(await encoded('png', { background: '#294A38' }))), status(409))
  assert.deepEqual(f.objects.get(fileKey()).body, first); assert.equal(JSON.parse(f.objects.get(quotaKey()).body).reservas.length, 1)
})
test('el padre ajeno/retirado/oculto no acepta fotos ni siquiera para admin; errorRLS no se interpreta como nuevo', async () => {
  const bytes = await encoded()
  for (const changes of [{ alumna_id: OTHER }, { retirada_en: '2026-10-26T10:00:00Z' }, { oculta_en: '2026-10-26T10:00:00Z' }]) {
    const f = fixture({ post: parent(changes), admin: true }); await assert.rejects(f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes)), status(403)); assert.equal(f.calls.length, 0)
  }
  const failed = fixture({ queryError: { code: '42501' } }); await assert.rejects(failed.server.subirFotoComunidad(failed.auth, POST, FOTO, request(bytes)), status(503)); assert.equal(failed.calls.length, 0)
  const invalid = fixture(); await assert.rejects(invalid.server.subirFotoComunidad(invalid.auth, '../post', FOTO, request(bytes)), status(400)); assert.equal(invalid.queries.length, 0)
})
test('cuota20 por cuenta/día es cerrada, reintento de reserva no duplica, CAS se agota a3 sin bypass', async () => {
  const bytes = await encoded(), reservations = Array.from({ length: 20 }, (_, i) => ({ post: id(100 + i), foto: id(200 + i), hash: 'a'.repeat(64) }))
  const full = fixture(); full.seed(quotaKey(), JSON.stringify({ version: 1, reservas: reservations }), 'application/json')
  await assert.rejects(full.server.subirFotoComunidad(full.auth, POST, FOTO, request(bytes)), status(429)); assert.equal(full.objects.has(fileKey()), false)
  let casCount = 0
  const conflict = fixture({ intercept(call) { if (call.method === 'PUT' && call.key.includes('/cuotas/')) { casCount++; return new Response(null, { status: 412 }) } } })
  await assert.rejects(conflict.server.subirFotoComunidad(conflict.auth, POST, FOTO, request(bytes)), status(503)); assert.equal(casCount, 3); assert.equal(conflict.objects.has(fileKey()), false)
  const reserved = fixture(); reserved.seed(quotaKey(), JSON.stringify({ version: 1, reservas: [{ post: POST, foto: FOTO, hash: hash(bytes) }] }), 'application/json')
  await reserved.server.subirFotoComunidad(reserved.auth, POST, FOTO, request(bytes)); assert.equal(reserved.calls.filter(call => call.method === 'PUT' && call.key.includes('/cuotas/')).length, 0)
  const wrong = fixture(); wrong.seed(quotaKey(), JSON.stringify({ version: 1, reservas: [{ post: POST, foto: FOTO, hash: 'b'.repeat(64) }] }), 'application/json')
  await assert.rejects(wrong.server.subirFotoComunidad(wrong.auth, POST, FOTO, request(bytes)), status(409)); assert.equal(wrong.objects.has(fileKey()), false)
})
test('la reserva cambia de día en Argentina, no al cruzar medianoche UTC del servidor', async () => {
  const bytes = await encoded(), OriginalDate = global.Date
  class FixedDate extends OriginalDate {
    constructor(...args) { if (args.length) super(...args); else super('2026-10-27T01:00:00.000Z') }
    static now() { return OriginalDate.parse('2026-10-27T01:00:00.000Z') }
  }
  global.Date = FixedDate
  try {
    const f = fixture(); await f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes))
    assert.ok(f.objects.has(`comunidad-fotos/cuotas/${USER}/2026-10-26.json`))
    assert.equal(f.objects.has(`comunidad-fotos/cuotas/${USER}/2026-10-27.json`), false)
  } finally { global.Date = OriginalDate }
})
test('cuotas corruptas/lectura fallida/ETag ausente o débil incoherente/PUT fallido no permiten cargar', async () => {
  const bytes = await encoded()
  const cases = [
    { body: '{invalid' }, { body: JSON.stringify({ version: 2, reservas: [] }) }, { body: JSON.stringify({ version: 1, reservas: [{ post: POST, foto: FOTO, hash: 'bad' }] }) },
    { body: ' '.repeat(16001) }, { headers: { ETag: '' } }, { headers: { ETag: 'W/"wrong"' } },
    { status: 500 }, { thrown: true }, { putFailed: true },
  ]
  for (const settings of cases) {
    const f = fixture({ intercept(call, store) {
      if (call.key.includes('/cuotas/') && call.method === 'GET') {
        if (settings.thrown) throw new Error('mock transport')
        if (settings.status) return new Response(null, { status: settings.status })
        if (settings.body !== undefined) return new Response(settings.body, { headers: { ETag: '"old"' } })
        return store.answer('GET', call.key, settings.headers)
      }
      if (settings.putFailed && call.method === 'PUT' && call.key.includes('/cuotas/')) return new Response(null, { status: 500 })
    } })
    f.seed(quotaKey(), JSON.stringify({ version: 1, reservas: [] }), 'application/json')
    await assert.rejects(f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes)), status(503)); assert.equal(f.objects.has(fileKey()), false)
  }
})
test('cuota ETag débil usa HEAD fuerte concordante y If-Match, sin sobrescribir una escritura competidora', async () => {
  const bytes = await encoded(); let conflicts = 0
  const f = fixture({ intercept(call, store) {
    if (call.method === 'GET' && call.key.includes('/cuotas/')) return store.answer('GET', call.key, { ETag: 'W/' + store.objects.get(call.key).etag })
    if (call.method === 'PUT' && call.key.includes('/cuotas/') && conflicts++ === 0) {
      store.seed(call.key, JSON.stringify({ version: 1, reservas: [{ post: id(30), foto: id(40), hash: 'c'.repeat(64) }] }), 'application/json')
      return new Response(null, { status: 412 })
    }
  } })
  f.seed(quotaKey(), JSON.stringify({ version: 1, reservas: [] }), 'application/json')
  await f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes))
  const current = JSON.parse(f.objects.get(quotaKey()).body)
  assert.equal(current.reservas.length, 2); assert.equal(current.reservas[0].post, id(30))
  assert.ok(f.calls.some(call => call.method === 'HEAD' && call.key === quotaKey()))
  assert.ok(f.calls.filter(call => call.method === 'PUT' && call.key === quotaKey()).every(call => call.condition['If-Match'] && !call.condition['If-Match'].startsWith('W/')))
})
test('carrera de foto crea soloobjeto inmutable y confirma HEAD; metadata mala o falta posterior falla cerrada', async () => {
  const bytes = await encoded()
  const raced = fixture({ intercept(call, store) {
    if (call.method === 'PUT' && call.key === fileKey()) {
      store.seed(call.key, call.body, call.type, call.settings.metadatos)
      return new Response(null, { status: 412 })
    }
  } })
  assert.deepEqual(await raced.server.subirFotoComunidad(raced.auth, POST, FOTO, request(bytes)), { id: FOTO, ancho: 320, alto: 240 })
  const missing = fixture({ intercept(call) { if (call.method === 'PUT' && call.key === fileKey()) return new Response(null, { status: 200 }) } })
  await assert.rejects(missing.server.subirFotoComunidad(missing.auth, POST, FOTO, request(bytes)), status(503))
  const wrong = fixture({ intercept(call, store) {
    if (call.method === 'PUT' && call.key === fileKey()) { store.seed(call.key, call.body, call.type, { ...call.settings.metadatos, autora: OTHER }); return new Response(null, { status: 200 }) }
  } })
  await assert.rejects(wrong.server.subirFotoComunidad(wrong.auth, POST, FOTO, request(bytes)), status(503))
})
test('verificar fotos requiere HEAD propiedad/hash/dimensiones correctas y no acepta imágenes no terminadas', async () => {
  const bytes = await encoded(), f = fixture(); await f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes))
  await f.server.verificarFotosComunidad(f.auth, POST, [{ id: FOTO, ancho: 320, alto: 240 }])
  await assert.rejects(f.server.verificarFotosComunidad(f.auth, POST, [{ id: FOTO, ancho: 321, alto: 240 }]), status(409))
  await assert.rejects(f.server.verificarFotosComunidad(f.auth, POST, [{ id: id(99), ancho: 320, alto: 240 }]), status(400))
  const invalid = f.objects.get(fileKey()); invalid.metadata['entrada-sha256'] = 'not-a-hash'
  await assert.rejects(f.server.verificarFotosComunidad(f.auth, POST, [{ id: FOTO, ancho: 320, alto: 240 }]), status(503))
})
test('GET deriva clave de autora real del padre bajoRLS; devuelve privado/WebP sin claves ni metadata deR2', async () => {
  const bytes = await encoded('webp'), f = fixture({ post: parent({ alumna_id: OTHER }) })
  f.seed(fileKey(OTHER), bytes, 'image/webp', meta(bytes, OTHER))
  const result = await f.server.obtenerFotoComunidad(f.auth, POST, FOTO)
  assert.equal(result.headers.get('content-type'), 'image/webp'); assert.equal(result.headers.get('cache-control'), 'private, no-store'); assert.equal(result.headers.get('vary'), 'Cookie')
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff'); assert.equal(result.headers.get('referrer-policy'), 'no-referrer'); assert.match(result.headers.get('content-security-policy'), /sandbox/)
  assert.equal(result.headers.get('x-amz-meta-autora'), null); assert.deepEqual(Buffer.from(await result.arrayBuffer()), bytes)
  assert.equal(f.calls.at(-1).key, fileKey(OTHER)); assert.equal(f.calls.some(call => call.key === fileKey(USER)), false)
})
test('GET ausente porRLS, foto fuera del array o retirada del array no intenta obtener el objeto', async () => {
  for (const changes of [{ post: null }, { post: parent({ fotos: [] }) }, { post: parent({ fotos: [{ id: id(99), ancho: 320, alto: 240 }] }) }]) {
    const f = fixture(changes); await assert.rejects(f.server.obtenerFotoComunidad(f.auth, POST, FOTO), status(404)); assert.equal(f.calls.length, 0)
  }
  const f = fixture({ queryError: { code: '42501' } }); await assert.rejects(f.server.obtenerFotoComunidad(f.auth, POST, FOTO), status(503)); assert.equal(f.calls.length, 0)
  const malformed = fixture({ post: parent() }); await assert.rejects(malformed.server.obtenerFotoComunidad(malformed.auth, 'bad', FOTO), status(404)); assert.equal(malformed.queries.length, 0)
})
test('GET objeto404, metadata/tipo/tamaño/dimensiones corruptos no se convierten en una imagen válida', async () => {
  const bytes = await encoded('webp')
  for (const settings of [{ missing: true }, { type: 'text/html' }, { metadata: { autora: OTHER } }, { metadata: { publicacion: id(99) } }, { metadata: { foto: id(99) } }, { metadata: { 'entrada-sha256': 'bad' } }, { metadata: { ancho: '321' } }, { headers: { 'Content-Length': '0' } }, { headers: { 'Content-Length': String(2 * 1024 * 1024 + 1) } }]) {
    const f = fixture({ post: parent(), intercept(call, store) { if (settings.headers && call.method === 'GET' && call.key === fileKey()) return store.answer('GET', call.key, settings.headers) } })
    if (!settings.missing) f.seed(fileKey(), bytes, settings.type ?? 'image/webp', meta(bytes, USER, POST, FOTO, settings.metadata))
    await assert.rejects(f.server.obtenerFotoComunidad(f.auth, POST, FOTO), status(settings.missing ? 404 : 503))
  }
})
test('R2 Content-Length debe ser un entero positivo, no una cadena fraccional o científica', async () => {
  const bytes = await encoded('webp')
  for (const length of ['1.5', '1e2', '+10']) {
    const f = fixture({ post: parent(), intercept(call, store) { if (call.method === 'GET' && call.key === fileKey()) return store.answer('GET', call.key, { 'Content-Length': length }) } })
    f.seed(fileKey(), bytes, 'image/webp', meta(bytes))
    await assert.rejects(f.server.obtenerFotoComunidad(f.auth, POST, FOTO), status(503), `Invalid Content-Length must be rejected: ${length}`)
  }
})
test('cuota sin Content-Length corta el stream al límite real y cancela antes de consumir el objeto completo', async () => {
  const bytes = await encoded(); let pulls = 0, cancelled = false
  const f = fixture({ intercept(call) {
    if (call.method === 'GET' && call.key.includes('/cuotas/')) {
      const stream = new ReadableStream({ pull(controller) { pulls++; if (pulls <= 256) controller.enqueue(new Uint8Array(4096).fill(32)); else controller.close() }, cancel() { cancelled = true } })
      return new Response(stream, { headers: { ETag: '"cuota-ficticia"' } })
    }
  } })
  await assert.rejects(f.server.subirFotoComunidad(f.auth, POST, FOTO, request(bytes)), status(503))
  assert.equal(cancelled, true); assert.ok(pulls <= 6, `Expected early stream stop, read ${pulls} chunks`); assert.equal(f.objects.has(fileKey()), false)
})
test('R2firma metadatos y condición en la misma operación; valores peligrosos no salen porHTTP', async () => {
  const r2 = load('src/lib/r2-upload.ts', { './class-management': load('src/lib/class-management.ts') })
  const names = ['R2_S3_ACCOUNT_ID', 'R2_BUCKET_NAME', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'], saved = new Map(names.map(name => [name, process.env[name]])), original = global.fetch, calls = []
  Object.assign(process.env, { R2_S3_ACCOUNT_ID: 'qa-account-only', R2_BUCKET_NAME: 'qa-bucket-only', R2_ACCESS_KEY_ID: 'qa-id-only', R2_SECRET_ACCESS_KEY: 'qa-secret-not-a-real-key' })
  global.fetch = async (url, options) => { calls.push({ url, options }); return new Response(null, { status: 200 }) }
  try {
    const body = new Uint8Array([1, 2, 3]), metadata = { autora: USER, publicacion: POST, foto: FOTO, 'entrada-sha256': hash(body), ancho: '320', alto: '240' }
    await r2.pedirR2('PUT', fileKey(), {}, body, 'image/webp', { 'If-None-Match': '*' }, { metadatos: metadata, timeoutMs: 50 })
    assert.equal(calls.length, 1); const { url, options } = calls[0], headers = new Headers(options.headers)
    assert.equal(headers.get('if-none-match'), '*'); assert.equal(headers.get('content-type'), 'image/webp'); assert.equal(options.cache, 'no-store')
    for (const [name, value] of Object.entries(metadata)) assert.equal(headers.get(`x-amz-meta-${name}`), value)
    const auth = headers.get('authorization'), signed = auth.match(/SignedHeaders=([^,]+)/)[1], signature = auth.match(/Signature=([a-f0-9]+)/)[1], scope = auth.match(/Credential=qa-id-only\/([^,]+)/)[1]
    assert.ok(signed.includes('if-none-match')); for (const name of Object.keys(metadata)) assert.ok(signed.includes(`x-amz-meta-${name}`))
    const canonical = ['PUT', new URL(url).pathname, '', signed.split(';').map(name => `${name}:${name === 'host' ? new URL(url).host : headers.get(name)}\n`).join(''), signed, hash(body)].join('\n')
    const hmac = (key, text) => createHmac('sha256', key).update(text).digest()
    const signing = hmac(hmac(hmac(hmac('AWS4qa-secret-not-a-real-key', scope.split('/')[0]), 'auto'), 's3'), 'aws4_request')
    const expected = createHmac('sha256', signing).update(['AWS4-HMAC-SHA256', headers.get('x-amz-date'), scope, hash(canonical)].join('\n')).digest('hex')
    assert.equal(signature, expected)
    for (const malicious of [{ Autora: USER }, { autora: 'unsafe\r\nInjected: header' }, { ['x'.repeat(41)]: USER }, { autora: 'x'.repeat(257) }]) await assert.rejects(r2.pedirR2('PUT', fileKey(), {}, body, 'image/webp', { 'If-None-Match': '*' }, { metadatos: malicious }))
    assert.equal(calls.length, 1)
  } finally { global.fetch = original; for (const [name, value] of saved) { if (value === undefined) delete process.env[name]; else process.env[name] = value } }
})
