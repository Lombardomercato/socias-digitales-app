/* eslint-disable @typescript-eslint/no-require-imports */
// Transporte y servicios simulados; sin usuarios, mensajes o envíos reales.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const domain = load('src/lib/community.ts'), metrics = load('src/lib/metrics.ts')
const id = '00000000-0000-4000-8000-000000000001', commentId = '00000000-0000-4000-8000-000000000002'
const contexto = value => ({ params: Promise.resolve({ id: value }) })
class ErrorComunidad extends Error { constructor(status, message) { super(message); this.status = status } }
function fixture(options = {}) {
  const calls = [], auth = { admin: Boolean(options.admin), userId: 'solo-de-sesion' }
  const page = { estado: 'lista', publicaciones: [], siguiente: null }, comments = { estado: 'lista', comentarios: [], siguiente: null }
  const server = {
    ErrorComunidad,
    autorizarComunidad: async () => { calls.push(['auth']); return options.authError ? { error: { status: options.authError, mensaje: 'Sin acceso de prueba' } } : auth },
    leerComunidad: async (...args) => { calls.push(['feed', ...args]); return options.page ?? page },
    leerComentariosComunidad: async (...args) => { calls.push(['comments', ...args]); return comments },
    crearPublicacionComunidad: async (...args) => { calls.push(['create', ...args]); if (options.throw) throw options.throw; return { id, contenido: args[1].contenido } },
    cambiarPublicacionComunidad: async (...args) => { calls.push(['edit', ...args]); return { id: args[1], version: args[2].version + 1 } },
    crearComentarioComunidad: async (...args) => { calls.push(['comment', ...args]); return { id: args[2].id, publicacion_id: args[1], contenido: args[2].contenido } },
    cambiarComentarioComunidad: async (...args) => { calls.push(['edit-comment', ...args]); return { id: args[1], version: args[2].version + 1 } },
    felicitarPublicacionComunidad: async (...args) => { calls.push(['congratulate', ...args]); return { activo: args[2], total: args[2] ? 1 : 0 } },
  }
  const http = load('src/lib/community-http.ts', { 'next/navigation': { unstable_rethrow: error => { if (error === options.control) throw error } }, './metrics': metrics, './community-server': server })
  const deps = { '@/lib/community': domain, '@/lib/community-server': server, '@/lib/community-http': http }
  return { calls, auth, http, api: load('src/app/api/comunidad/route.ts', deps), post: load('src/app/api/comunidad/[id]/route.ts', deps), comments: load('src/app/api/comunidad/[id]/comentarios/route.ts', deps), comment: load('src/app/api/comunidad/comentarios/[id]/route.ts', deps), reaction: load('src/app/api/comunidad/[id]/felicitar/route.ts', deps) }
}
function request(method = 'GET', route = '/api/comunidad', data, headers = {}) {
  return new Request('https://app.example.test' + route, { method, headers: { ...(method === 'GET' ? {} : { origin: 'https://app.example.test', 'content-type': 'application/json' }), ...headers }, ...(data === undefined ? {} : { body: typeof data === 'string' ? data : JSON.stringify(data) }) })
}
function privacy(response) {
  assert.equal(response.headers.get('cache-control'), 'private, no-store')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
}
test('GET exige sesión y plan también en API; nunca consulta con ID elegido por navegador', async () => {
  for (const status of [401, 403, 503]) {
    const f = fixture({ authError: status }), response = await f.api.GET(request())
    assert.equal(response.status, status); privacy(response); assert.deepEqual(f.calls.map(c => c[0]), ['auth'])
  }
  for (const query of ['?usuaria_id=otra', '?tipo_usuario=socia', '?vista=ocultas', '?vista=retiradas', '?cursor=mal', '?tipo=idea&tipo=avance']) {
    const f = fixture(), response = await f.api.GET(request('GET', '/api/comunidad' + query))
    assert.ok([400, 403].includes(response.status)); privacy(response); assert.equal(f.calls.some(c => c[0] === 'feed'), false)
  }
  const f = fixture(), response = await f.api.GET(request('GET', '/api/comunidad?tipo=idea&vista=mias'))
  assert.equal(response.status, 200); privacy(response)
  assert.equal(f.calls[1][1], f.auth); assert.deepEqual(f.calls[1][2], { tipo: 'idea', vista: 'mias', cursor: undefined })
})
test('admin puede moderar lectura y un fallo no aparece como muro vacío', async () => {
  const admin = fixture({ admin: true }); assert.equal((await admin.api.GET(request('GET', '/api/comunidad?vista=ocultas'))).status, 200)
  const failed = fixture({ page: { estado: 'error', mensaje: 'No se pudo leer' } }), response = await failed.api.GET(request())
  assert.equal(response.status, 503); privacy(response); assert.equal(Object.hasOwn(await response.json(), 'publicaciones'), false)
})
test('POST valida origen/JSON/límite real/identidad y espera confirmación del servicio', async () => {
  for (const [headers, body, status] of [[{ origin: 'https://otro.example.test' }, {}, 403], [{ origin: '' }, {}, 403], [{ 'content-type': 'text/plain' }, '{}', 415], [{ 'content-length': '20000' }, '{}', 413], [{}, 'x'.repeat(16385), 413], [{}, '{inválido', 400], [{}, { id, tipo: 'idea', contenido: 'Hola', alumna_id: 'otra' }, 400]]) {
    const f = fixture(), response = await f.api.POST(request('POST', '/api/comunidad', body, headers))
    assert.equal(response.status, status); privacy(response); assert.equal(f.calls.some(c => c[0] === 'create'), false)
    if (status === 403) assert.equal(f.calls.length, 0)
  }
  const f = fixture(), response = await f.api.POST(request('POST', '/api/comunidad', { id, tipo: 'idea', contenido: '  Mi idea  ' }))
  assert.equal(response.status, 200); privacy(response)
  assert.deepEqual(await response.json(), { ok: true, publicacion: { id, contenido: 'Mi idea' } })
  assert.deepEqual(f.calls[1], ['create', f.auth, { id, tipo: 'idea', contenido: 'Mi idea' }])
})
test('PATCH usa ruta comprobada y solo intención/version, nunca acepta cambios de autora o publicación padre', async () => {
  const f = fixture()
  const response = await f.post.PATCH(request('PATCH', `/api/comunidad/${id}`, { version: 3, accion: 'retirar' }), contexto(id))
  assert.equal(response.status, 200); privacy(response); assert.deepEqual(f.calls[1], ['edit', f.auth, id, { version: 3, accion: 'retirar' }])
  for (const [route, body, target] of [['otro', { version: 1, accion: 'retirar' }, 'otro'], [id, { version: 1, accion: 'retirar', alumna_id: 'otra' }, id], [id + '?usuario=otra', { version: 1, accion: 'retirar' }, id]]) {
    const x = fixture(), r = await x.post.PATCH(request('PATCH', '/api/comunidad/' + route, body), contexto(target))
    assert.equal(r.status, 400); assert.equal(x.calls.some(c => c[0] === 'edit'), false)
  }
  const comments = fixture(), changed = await comments.comment.PATCH(request('PATCH', '/api/comunidad/comentarios/' + commentId, { version: 1, accion: 'editar', contenido: 'Mensaje nuevo' }), contexto(commentId))
  assert.equal(changed.status, 200); assert.deepEqual(comments.calls[1], ['edit-comment', comments.auth, commentId, { version: 1, accion: 'editar', contenido: 'Mensaje nuevo' }])
})
test('comentarios y felicitaciones no reciben identidad ni permiten cambiar de publicación en JSON', async () => {
  const f = fixture()
  const listed = await f.comments.GET(request('GET', '/api/comunidad/' + id + '/comentarios'), contexto(id))
  assert.equal(listed.status, 200); privacy(listed)
  assert.deepEqual(f.calls[1], ['comments', f.auth, id, undefined])
  const created = await f.comments.POST(request('POST', '/api/comunidad/' + id + '/comentarios', { id: commentId, contenido: 'Hola' }), contexto(id))
  assert.equal(created.status, 200); assert.equal((await created.json()).comentario.publicacion_id, id)
  const rejected = await f.comments.POST(request('POST', '/api/comunidad/' + id + '/comentarios', { id: commentId, contenido: 'Hola', publicacion_id: 'otra' }), contexto(id))
  assert.equal(rejected.status, 400)
  const put = await f.reaction.PUT(request('PUT', '/api/comunidad/' + id + '/felicitar', { activo: true }), contexto(id))
  assert.equal(put.status, 200); assert.deepEqual(await put.json(), { ok: true, activo: true, total: 1 })
  assert.deepEqual(f.calls.find(c => c[0] === 'congratulate'), ['congratulate', f.auth, id, true])
})
test('errores de persistencia no se transforman en éxito ni exponen detalles privados; señales Next se relanzan', async () => {
  const f = fixture({ throw: new Error('clave privada ficticia') }), response = await f.api.POST(request('POST', '/api/comunidad', { id, tipo: 'idea', contenido: 'Mi idea' }))
  assert.equal(response.status, 503); privacy(response); assert.ok(!JSON.stringify(await response.json()).includes('clave privada'))
  const conflict = fixture({ throw: new ErrorComunidad(409, 'Actualizá la versión') }), r = await conflict.api.POST(request('POST', '/api/comunidad', { id, tipo: 'idea', contenido: 'Mi idea' }))
  assert.equal(r.status, 409); assert.equal((await r.json()).mensaje, 'Actualizá la versión')
  const control = new Error('señal Next ficticia'), internal = fixture({ throw: control, control })
  await assert.rejects(internal.api.POST(request('POST', '/api/comunidad', { id, tipo: 'idea', contenido: 'Mi idea' })), error => error === control)
})
