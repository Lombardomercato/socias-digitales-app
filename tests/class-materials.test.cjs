const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
function load(file, deps = {}, extra = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', ...Object.keys(extra), code)(n => n === 'server-only' ? {} : n in deps ? deps[n] : require(n), m, m.exports, ...Object.values(extra))
  return m.exports
}
const management = load('src/lib/class-management.ts')
const logic = load('src/lib/class-materials.ts', { './class-management': management })
const classAccess = load('src/lib/class-access.ts')
const claseId = '2d0df184-c4a0-4072-bf9e-80734b876b35'
const materialId = '8d86bb87-c028-4b6c-a644-df19145bc655'
const otroId = '768b0be3-44ec-4f1e-9654-a351753208c2'
const ctx = { params: Promise.resolve({ id: claseId }) }
const link = { id: materialId, tipo: 'enlace', titulo: 'Guía de ejercicios', url: 'https://docs.google.com/document/d/ejemplo', activo: true, creado: '2026-10-19T14:00:00Z' }
class NextResponse extends Response { static json(data, opts = {}) { return Response.json(data, opts) } }
const next = { NextResponse }
function sistema({ user = { id: 'admin-fixture' }, perfil = { rol: 'admin' }, clase = { id: claseId, activo: true, acceso_gratuito: false }, denied = 0 } = {}) {
  const objects = new Map(), calls = []
  let seq = 0
  function seed(key, body, mime = 'application/json') {
    objects.set(key, { body: typeof body === 'string' ? new TextEncoder().encode(body) : body.slice(), etag: '"r' + ++seq + '"', mime })
  }
  const pedirR2 = async (method, key, _query, body, mime, condicion) => {
    calls.push({ method, key, condicion })
    const item = objects.get(key)
    if (method === 'PUT') {
      if (condicion?.['If-None-Match'] === '*' && item || condicion?.['If-Match'] && condicion['If-Match'] !== item?.etag) return new Response(null, { status: 412 })
      seed(key, body, mime); return new Response(null)
    }
    if (!item) return new Response(null, { status: 404 })
    return new Response(method === 'HEAD' ? null : item.body, { headers: { etag: item.etag, 'content-length': String(item.body.length), 'content-type': item.mime } })
  }
  const db = { auth: { getUser: async () => ({ data: { user } }) }, from: table => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: table === 'perfiles' ? perfil : clase }) }) }) }) }
  const r2 = { pedirR2, firmarCargaMaterial: (key, mime) => 'https://upload.test/' + encodeURIComponent(key) + '?type=' + encodeURIComponent(mime) }
  const store = load('src/lib/class-materials-store.ts', { './r2-upload': r2, './class-management': management, './class-materials': logic })
  const upload = load('src/lib/class-materials-upload.ts', { './r2-upload': r2, './class-management': management, './class-materials': logic }, { process: { env: { R2_SECRET_ACCESS_KEY: 'test-only-not-real' } } })
  const access = load('src/lib/class-materials-access.ts', { 'next/server': next, './supabase/server': { createClient: async () => db }, './class-management': management, './class-access': classAccess })
  const deps = { 'next/server': next, '@/lib/admin-auth': { autorizarAdmin: async () => denied ? { error: new Response(null, { status: denied }) } : { supabase: db, user } }, '@/lib/class-management': management, '@/lib/class-materials': logic, '@/lib/class-materials-store': store, '@/lib/class-materials-upload': upload, '@/lib/class-materials-access': access, '@/lib/r2-upload': r2 }
  const admin = load('src/app/api/admin/clases/[id]/materiales/route.ts', deps)
  const alumno = load('src/app/api/classroom/[id]/materiales/route.ts', deps)
  const download = load('src/app/api/classroom/[id]/materiales/[materialId]/route.ts', deps)
  const post = body => admin.POST(new Request('https://app.test/api/admin/clases/' + claseId + '/materiales', { method: 'POST', body: JSON.stringify(body), headers: { origin: 'https://app.test', 'content-type': 'application/json' } }), ctx)
  return { admin, alumno, download, post, objects, calls, seed, store, upload, index: `materiales-clases/${claseId}/indice-v1.json` }
}
test('materiales: valida documentos permitidos, tamaño, títulos y enlaces seguros', () => {
  assert.equal(logic.archivoMaterial('Guía.PDF', 10).mime, 'application/pdf')
  for (const extension of ['docx', 'xlsx', 'pptx', 'txt', 'png', 'jpg', 'jpeg', 'webp']) assert.ok(logic.archivoMaterial('Guía.' + extension, 100).mime)
  for (const [name, size] of [['a.html', 10], ['a.svg', 10], ['a.js', 10], ['a.exe', 10], ['a.zip', 10], ['a.pdf', 0], ['a.pdf', logic.MAX_MATERIAL_BYTES + 1], ['../a.pdf', 10], ['a\r\n.pdf', 10]]) assert.throws(() => logic.archivoMaterial(name, size))
  for (const url of ['javascript:alert(1)', 'http://docs.google.com/a', 'https://user:secret@example.com', 'https://localhost/a', 'https://127.0.0.1/a', 'https://example.com\nX-Test:a']) assert.throws(() => logic.enlaceMaterial(url))
  assert.equal(logic.enlaceMaterial(' https://example.com/guia '), 'https://example.com/guia')
  for (const title of ['', ' ', 'a'.repeat(121)]) assert.throws(() => logic.tituloMaterial(title))
  assert.throws(() => logic.validarMateriales([link, link]))
})
test('la lista para alumnas no entrega rutas R2, enlaces privados, retirados ni auditoría', () => {
  const result = logic.materialesVisibles(claseId, [link, { ...link, id: otroId, activo: false }])
  assert.equal(result.length, 1)
  assert.deepEqual(Object.keys(result[0]), ['id', 'titulo', 'tipo', 'detalle', 'href'])
  assert.equal(result[0].href, `/api/classroom/${claseId}/materiales/${materialId}`)
  assert.ok(!JSON.stringify(result).includes('/document/d/ejemplo'))
})
test('lectura autorizada vacía no crea objetos; solo 404 significa sin materiales', async () => {
  const s = sistema(), response = await s.admin.GET(new Request('https://app.test'), ctx)
  assert.deepEqual(await response.json(), { materiales: [], revision: null })
  assert.equal(s.objects.size, 0)
  for (const status of [401, 403, 500]) {
    const store = load('src/lib/class-materials-store.ts', { './class-management': management, './class-materials': logic, './r2-upload': { pedirR2: async () => new Response(null, { status }) } })
    await assert.rejects(() => store.leerMateriales(claseId))
  }
})
test('admin agrega, edita, retira y restaura sin borrar archivos ni tocar videos/progreso', async () => {
  const s = sistema()
  let response = await s.post({ action: 'enlace', revision: null, titulo: link.titulo, url: link.url })
  assert.equal(response.status, 200)
  let data = await response.json(), id = data.materiales[0].id
  const open = () => s.download.GET(new Request('https://app.test'), { params: Promise.resolve({ id: claseId, materialId: id }) })
  assert.equal((await open()).headers.get('location'), link.url)
  response = await s.post({ action: 'editar', revision: data.revision, materialId: id, titulo: 'Planilla de trabajo', url: 'https://example.com/plantilla' })
  data = await response.json(); assert.equal(data.materiales[0].titulo, 'Planilla de trabajo')
  data = await (await s.post({ action: 'retirar', revision: data.revision, materialId: id })).json()
  assert.equal((await open()).status, 404)
  assert.equal(data.materiales[0].activo, false)
  data = await (await s.post({ action: 'restaurar', revision: data.revision, materialId: id })).json()
  assert.equal((await open()).status, 302)
  assert.equal(data.materiales.length, 1)
  assert.ok(s.calls.every(c => c.key.startsWith(`materiales-clases/${claseId}/`) && c.method !== 'DELETE'))
})
test('carga completa: temporal firmado, archivo final inmutable, descarga protegida e idempotencia', async () => {
  const s = sistema(), body = new TextEncoder().encode('%PDF-1.7\nDocumento de prueba\n%%EOF')
  const prepared = await (await s.post({ action: 'preparar', revision: null, titulo: 'Guía PDF', nombre: 'Guía de clase.pdf', bytes: body.length })).json()
  const token = s.upload.leerTicketMaterial(prepared.ticket, 'admin-fixture', claseId)
  assert.ok(decodeURIComponent(prepared.url).includes('/temporales/'))
  assert.equal(s.objects.size, 0)
  s.seed(logic.claveMaterial(claseId, token.id, 'pdf', true), body, 'application/pdf')
  const result = await s.post({ action: 'finalizar', revision: null, ticket: prepared.ticket })
  assert.equal(result.status, 200)
  let data = await result.json()
  assert.equal(data.materiales[0].archivo.nombre, 'Guía de clase.pdf')
  assert.ok(s.objects.has(logic.claveMaterial(claseId, token.id, 'pdf')))
  assert.deepEqual(s.calls.find(c => c.method === 'PUT' && c.key.includes('/archivos/')).condicion, { 'If-None-Match': '*' })
  const descarga = await s.download.GET(new Request('https://app.test'), { params: Promise.resolve({ id: claseId, materialId: token.id }) })
  assert.equal(descarga.status, 200)
  assert.deepEqual(new Uint8Array(await descarga.arrayBuffer()), body)
  assert.equal(descarga.headers.get('content-type'), 'application/octet-stream')
  assert.equal(descarga.headers.get('x-content-type-options'), 'nosniff')
  assert.ok(descarga.headers.get('content-disposition').includes('attachment;'))
  const replay = await (await s.post({ action: 'finalizar', revision: null, ticket: prepared.ticket })).json()
  assert.equal(replay.materiales.length, 1)
  data = await (await s.post({ action: 'retirar', revision: data.revision, materialId: token.id })).json()
  assert.equal((await (await s.post({ action: 'finalizar', revision: null, ticket: prepared.ticket })).json()).materiales[0].activo, false)
})
test('el ticket rechaza otra cuenta/clase, manipulación y vencimiento; archivo falso no se publica', async () => {
  const s = sistema()
  const prepared = await (await s.post({ action: 'preparar', revision: null, titulo: 'Documento', nombre: 'documento.pdf', bytes: 6 })).json()
  for (const [value, user, id] of [[prepared.ticket, 'otra', claseId], [prepared.ticket, 'admin-fixture', otroId], [prepared.ticket + 'x', 'admin-fixture', claseId]]) assert.throws(() => s.upload.leerTicketMaterial(value, user, id))
  const expired = s.upload.ticketMaterial({ user: 'admin-fixture', clase: claseId, id: materialId, titulo: 'PDF', archivo: logic.archivoMaterial('a.pdf', 6), exp: Date.now() - 1 })
  assert.throws(() => s.upload.leerTicketMaterial(expired, 'admin-fixture', claseId))
  const token = s.upload.leerTicketMaterial(prepared.ticket, 'admin-fixture', claseId)
  s.seed(logic.claveMaterial(claseId, token.id, 'pdf', true), new TextEncoder().encode('<html>'), 'application/pdf')
  assert.equal((await s.post({ action: 'finalizar', revision: null, ticket: prepared.ticket })).status, 400)
  assert.ok(!s.objects.has(s.index))
  assert.ok(!s.objects.has(logic.claveMaterial(claseId, token.id, 'pdf')))
})
test('permisos: anónimas, gratuitas privadas y clase oculta no reciben lista, enlace ni descarga', async () => {
  for (const [options, status] of [[{ user: null }, 401], [{ perfil: { rol: 'alumna', tipo_usuario: 'gratuito' } }, 403], [{ perfil: { rol: 'alumna', desafio_socias_habilitada: true }, clase: { activo: false } }, 403]]) {
    const s = sistema(options)
    assert.equal((await s.alumno.GET(new Request('https://app.test'), ctx)).status, status)
    assert.equal((await s.download.GET(new Request('https://app.test'), { params: Promise.resolve({ id: claseId, materialId }) })).status, status)
    assert.equal(s.calls.length, 0)
  }
  for (const options of [{ perfil: { rol: 'alumna', desafio_socias_habilitada: true } }, { perfil: { rol: 'alumna', tipo_usuario: 'socia' } }, { perfil: { rol: 'alumna', tipo_usuario: 'gratuito' }, clase: { activo: true, acceso_gratuito: true } }]) {
    const s = sistema(options)
    assert.equal((await s.alumno.GET(new Request('https://app.test'), ctx)).status, 200)
  }
  for (const denied of [401, 403]) {
    const s = sistema({ denied })
    assert.equal((await s.post({ action: 'enlace', revision: null, titulo: 'PDF', url: link.url })).status, denied)
    assert.equal(s.calls.length, 0)
  }
})
test('concurrencia y datos corruptos fallan sin pisar el trabajo de otra administradora', async () => {
  const s = sistema()
  const saved = await s.store.guardarMateriales(claseId, [link], null, 'admin')
  assert.equal((await s.post({ action: 'enlace', revision: null, titulo: 'Nueva guía', url: link.url })).status, 409)
  await assert.rejects(() => s.store.guardarMateriales(claseId, [], null, 'otra'), s.store.ConflictoMateriales)
  assert.deepEqual((await s.store.leerMateriales(claseId)).materiales, saved.materiales)
  for (const revision of ['*', 'W/"a"', '"a", "b"', '\r\nX:a', undefined]) assert.throws(() => s.store.revisionMateriales(revision))
  s.seed(s.index, JSON.stringify({ version: 99, materiales: [] }))
  assert.equal((await s.admin.GET(new Request('https://app.test'), ctx)).status, 503)
  assert.equal(JSON.parse(new TextDecoder().decode(s.objects.get(s.index).body)).version, 99)
})
test('la firma de carga restringe método, objeto temporal, tipo y diez minutos sin revelar la clave', () => {
  const { createHash, createHmac } = require('node:crypto')
  const env = { R2_S3_ACCOUNT_ID: 'fixture', R2_BUCKET_NAME: 'private', R2_ACCESS_KEY_ID: 'fixture-access', R2_SECRET_ACCESS_KEY: 'fixture-secret' }
  const r2 = load('src/lib/r2-upload.ts', { './class-management': management }, { process: { env } })
  const key = logic.claveMaterial(claseId, materialId, 'pdf', true), url = new URL(r2.firmarCargaMaterial(key, 'application/pdf'))
  assert.equal(url.searchParams.get('X-Amz-Expires'), '600')
  assert.equal(url.searchParams.get('X-Amz-SignedHeaders'), 'content-type;host')
  assert.ok(url.pathname.includes('/temporales/')); assert.ok(!url.href.includes('fixture-secret'))
  const signature = url.searchParams.get('X-Amz-Signature'); url.searchParams.delete('X-Amz-Signature')
  const stamp = url.searchParams.get('X-Amz-Date'), scope = stamp.slice(0, 8) + '/auto/s3/aws4_request'
  const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase())
  const query = [...url.searchParams].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, v]) => enc(k) + '=' + enc(v)).join('&')
  const canonical = ['PUT', url.pathname, query, `content-type:application/pdf\nhost:${url.hostname}\n`, 'content-type;host', 'UNSIGNED-PAYLOAD'].join('\n')
  const hmac = (key, value) => createHmac('sha256', key).update(value).digest()
  const signing = hmac(hmac(hmac(hmac('AWS4fixture-secret', stamp.slice(0, 8)), 'auto'), 's3'), 'aws4_request')
  assert.equal(signature, createHmac('sha256', signing).update(['AWS4-HMAC-SHA256', stamp, scope, createHash('sha256').update(canonical).digest('hex')].join('\n')).digest('hex'))
})
test('una respuesta comprimida exige HEAD de la misma revisión; nunca inventa un ETag fuerte', async () => {
  const body = JSON.stringify({ version: 1, materiales: [link] })
  for (const [headTag, works] of [['"abc"', true], ['"otra"', false], ['W/"abc"', false]]) {
    const store = load('src/lib/class-materials-store.ts', { './class-management': management, './class-materials': logic, './r2-upload': { pedirR2: async method => method === 'HEAD' ? new Response(null, { headers: { etag: headTag } }) : new Response(body, { headers: { etag: 'W/"abc"' } }) } })
    if (works) assert.equal((await store.leerMateriales(claseId)).revision, '"abc"')
    else await assert.rejects(() => store.leerMateriales(claseId))
  }
})
test('listado móvil usa enlaces de descarga auténticos, estados vacíos/carga/error y bordes de marca', () => {
  const ui = load('src/components/ClassMaterials.tsx', {})
  const html = renderToStaticMarkup(React.createElement(ui.MaterialsList, { materiales: logic.materialesVisibles(claseId, [link]) }))
  assert.ok(html.includes('target="_blank"')); assert.ok(html.includes('noopener noreferrer'))
  assert.ok(html.includes('min-h-11')); assert.ok(html.includes('border-[#E7DDD5]')); assert.ok(html.includes('break-words'))
  assert.ok(!html.includes('docs.google.com/document'))
  const loading = renderToStaticMarkup(React.createElement(ui.default, { claseId }))
  assert.ok(loading.includes('Cargando materiales'))
  const editor = read('src/app/admin/classroom/ClassMaterialsEditor.tsx')
  assert.ok(editor.includes('Recargar materiales')); assert.ok(editor.includes('Materiales retirados'))
  assert.ok(editor.includes('carga.current')); assert.ok(editor.includes('pendiente.subido = true'))
  assert.ok(read('src/app/classroom/ClassPlayer.tsx').includes('<ClassMaterials key={clase.id}'))
})
