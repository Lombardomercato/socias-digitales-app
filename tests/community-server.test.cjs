/* eslint-disable @typescript-eslint/no-require-imports */
// Base y Auth simulados: estas pruebas no sustituyen el ensayo real de RLS.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const domain = load('src/lib/community.ts'), userId = '00000000-0000-4000-8000-000000000011', otherId = '00000000-0000-4000-8000-000000000012'
const id = '00000000-0000-4000-8000-000000000001', commentId = '00000000-0000-4000-8000-000000000002', date = '2026-10-26T17:31:29.123456+00:00'
const perfil = { id: userId, nombre: 'Socia ficticia', rol: 'alumna', tipo_usuario: 'socia', estado: 'activa' }
const post = changes => ({ id, alumna_id: userId, contenido: 'Un avance ficticio', tipo: 'avance', created_at: date, actualizado_at: date, version: 1, retirada_en: null, oculta_en: null, motivo_moderacion: null, ...changes })
const comment = changes => ({ id: commentId, publicacion_id: id, autor_id: userId, contenido: 'Un comentario ficticio', created_at: date, actualizado_at: date, version: 1, retirada_en: null, oculta_en: null, motivo_moderacion: null, ...changes })
const foto = { id: '00000000-0000-4000-8000-000000000020', ancho: 1080, alto: 1920 }
const otraFoto = { id: '00000000-0000-4000-8000-000000000021', ancho: 1080, alto: 1080 }
class ErrorFotosComunidad extends Error { constructor(status, message) { super(message); this.status = status } }
function fixture(options = {}) {
  const calls = [], tables = { publicaciones: (options.posts ?? [post()]).map(p => ({ ...p })), comentarios: (options.comments ?? []).map(c => ({ ...c })), reacciones: (options.reactions ?? []).map(r => ({ ...r })) }
  let profile = options.profile === undefined ? perfil : options.profile
  const db = {
    auth: { getUser: async () => { calls.push(['getUser']); return { data: { user: options.user === undefined ? { id: userId, user_metadata: { rol: 'admin' } } : options.user }, error: options.authError ?? null } } },
    from(table) {
      const q = { table, action: 'read', filters: [], n: null, single: false, sorts: [] }
      const query = {
        select(fields) { q.fields = fields; return query },
        eq(k, v) { q.filters.push(['eq', k, v]); return query },
        is(k, v) { q.filters.push(['is', k, v]); return query },
        not(k, op, v) { q.filters.push(['not', k, op, v]); return query },
        or(value) { q.or = value; return query },
        order(k, v) { q.sorts.push([k, v]); return query },
        limit(n) { q.n = n; return query },
        insert(data) { q.action = 'insert'; q.data = data; return query },
        update(data) { q.action = 'update'; q.data = data; return query },
        delete() { q.action = 'delete'; return query },
        maybeSingle() { q.single = true; return run() },
        then(resolve, reject) { return run().then(resolve, reject) },
      }
      async function run() {
        calls.push(structuredClone(q))
        if (table === 'perfiles') return { data: profile, error: options.profileError ?? null }
        if (options.tableError) return { data: null, error: { code: '42501', message: 'detalle privado ficticio' } }
        let rows = tables[table].filter(row => q.filters.every(([op, k, v, fourth]) => op === 'eq' || op === 'is' ? row[k] === v : !(row[k] === fourth)))
        if (q.action === 'insert') {
          if (options.insertError && !options.insertCommitted) return { data: null, error: options.insertError }
          if (tables[table].some(r => r.id === q.data.id && q.data.id || table === 'reacciones' && r.publicacion_id === q.data.publicacion_id && r.alumna_id === q.data.alumna_id)) return { data: null, error: { code: '23505' } }
          const row = table === 'publicaciones' ? post(q.data) : table === 'comentarios' ? comment(q.data) : { id: commentId, ...q.data }
          tables[table].push(row); rows = [row]
          if (options.insertCommitted) return { data: null, error: options.insertError ?? { code: 'red' } }
        }
        if (q.action === 'update') {
          if (options.updateConflict) { if (rows[0]) rows[0].version += 2; return { data: null, error: null } }
          rows = rows.map(row => { Object.assign(row, q.data, { version: row.version + 1 }); return row })
          if (options.updateCommitted) return { data: null, error: { code: 'red' } }
        }
        if (q.action === 'delete') { tables[table] = tables[table].filter(row => !rows.includes(row)); return { data: null, error: null } }
        if (q.action === 'read' && q.sorts.length) rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id))
        if (q.n) rows = rows.slice(0, q.n)
        return { data: q.single ? rows[0] ?? null : rows, error: null }
      }
      return query
    },
    async rpc(name, args) {
      calls.push({ rpc: name, args })
      if (options.rpcError === name) return { data: null, error: { message: 'secreto ficticio' } }
      if (name === 'obtener_autores_comunidad') return { data: options.missingAuthor ? [] : args.p_ids.map(id => ({ id, nombre: 'Socia ficticia', es_admin: false, email: 'no-debe-proyectarse@example.test' })), error: null }
      assert.equal(name, 'obtener_resumen_comunidad')
      return { data: options.missingSummary ? [] : args.p_ids.map(publicacion_id => ({ publicacion_id, total_comentarios: options.invalidCount ?? String(tables.comentarios.filter(c => c.publicacion_id === publicacion_id && !c.oculta_en && !c.retirada_en).length), total_felicitaciones: tables.reacciones.filter(r => r.publicacion_id === publicacion_id).length, felicitada: tables.reacciones.some(r => r.publicacion_id === publicacion_id && r.alumna_id === userId) })), error: null }
    },
  }
  const server = load('src/lib/community-server.ts', {
    'next/navigation': { unstable_rethrow() {} }, './supabase/server': { createClient: async () => db }, './community': domain,
    './community-photos-server': { ErrorFotosComunidad, verificarFotosComunidad: async (auth, postId, fotos) => {
      calls.push({ verificarFotos: true, usuaria: auth.userId, postId, fotos: structuredClone(fotos) })
      if (options.photoError) throw options.photoError
    } },
  })
  const auth = { supabase: db, userId, admin: options.admin ?? false, perfil: { ...perfil, avatar_url: null } }
  return { server, db, auth, calls, tables, setProfile(p) { profile = p }, setPhotoError(error) { options.photoError = error } }
}
test('autorizar usa getUser y un perfil propio protegido, no metadata manipulable', async () => {
  const f = fixture(), auth = await f.server.autorizarComunidad()
  assert.equal(auth.admin, false); assert.equal(auth.userId, userId); assert.equal(auth.perfil.avatar_url, null)
  assert.deepEqual(f.calls[0], ['getUser']); assert.equal(f.calls[1].fields, 'id,rol,tipo_usuario,estado,nombre'); assert.deepEqual(f.calls[1].filters, [['eq', 'id', userId]])
  for (const [options, status] of [[{ user: null }, 401], [{ authError: {} }, 401], [{ profile: null }, 503], [{ profile: { ...perfil, id: otherId } }, 503], [{ profileError: {} }, 503], [{ profile: { ...perfil, tipo_usuario: 'gratuito', rol: 'afiliada' } }, 403], [{ profile: { ...perfil, estado: 'pausada' } }, 403]]) {
    const denied = await fixture(options).server.autorizarComunidad()
    assert.equal(denied.error.status, status); assert.ok(!Object.hasOwn(denied, 'supabase'))
    assert.ok(!JSON.stringify(denied).includes('detalle privado'))
  }
})
test('feed pagina 20+1 con keyset sin perder microsegundos y resume en dos RPC seguras', async () => {
  const posts = Array.from({ length: 21 }, (_v, n) => post({ id: `00000000-0000-4000-8000-${String(n + 100).padStart(12, '0')}` }))
  const f = fixture({ posts }), result = await f.server.leerComunidad(f.auth, { vista: 'todas', tipo: 'avance', cursor: `${date}~${id}` })
  assert.equal(result.estado, 'lista'); assert.equal(result.publicaciones.length, 20); assert.ok(result.siguiente.startsWith(date + '~'))
  const query = f.calls.find(c => c.table === 'publicaciones')
  assert.equal(query.n, 21); assert.ok(query.or.includes(date)); assert.deepEqual(query.sorts, [['created_at', { ascending: false }], ['id', { ascending: false }]])
  assert.ok(query.filters.some(f => f[1] === 'retirada_en')); assert.ok(query.filters.some(f => f[1] === 'oculta_en'))
  assert.equal(f.calls.filter(c => c.rpc).length, 2)
  assert.equal(f.calls.find(c => c.rpc === 'obtener_resumen_comunidad').args.p_ids.length, 20)
  assert.equal(domain.esPaginaComunidad(result), true)
  const json = JSON.stringify(result)
  for (const privado of ['email', 'alumna_id', 'ingresos', 'motivo_moderacion', 'imagen_url', 'archivo_url']) assert.ok(!json.includes(privado))
})
test('vista propia conserva el historial, moderación requiere admin y vacíos/error nunca inventan cero', async () => {
  const f = fixture({ posts: [post({ retirada_en: date })] })
  assert.equal((await f.server.leerComunidad(f.auth, { vista: 'todas' })).publicaciones.length, 0)
  const mine = await f.server.leerComunidad(f.auth, { vista: 'mias' }); assert.equal(mine.publicaciones[0].retirada, true)
  assert.equal((await f.server.leerComunidad(f.auth, { vista: 'ocultas' })).estado, 'error')
  const admin = fixture({ admin: true, posts: [post({ retirada_en: date, oculta_en: date })] })
  assert.equal((await admin.server.leerComunidad(admin.auth, { vista: 'todas' })).publicaciones.length, 1)
  for (const options of [{ missingSummary: true }, { missingAuthor: true }, { invalidCount: 'no disponible' }, { tableError: true }, { rpcError: 'obtener_autores_comunidad' }, { rpcError: 'obtener_resumen_comunidad' }]) {
    const x = fixture(options), result = await x.server.leerComunidad(x.auth)
    assert.equal(result.estado, 'error'); assert.ok(!Object.hasOwn(result, 'publicaciones')); assert.ok(!JSON.stringify(result).includes('secreto'))
  }
})
test('crear publicación fija autora de sesión y recupera misma intención después de respuesta perdida', async () => {
  for (const options of [{}, { insertCommitted: true }]) {
    const f = fixture({ posts: [], ...options }), input = { id, tipo: 'idea', contenido: 'Mi idea ficticia' }
    const created = await f.server.crearPublicacionComunidad(f.auth, input), retried = await f.server.crearPublicacionComunidad(f.auth, input)
    assert.equal(created.id, id); assert.deepEqual(retried, created); assert.equal(f.tables.publicaciones.length, 1)
    const write = f.calls.find(c => c.action === 'insert')
    assert.deepEqual(write.data, { id, alumna_id: userId, tipo: input.tipo, contenido: input.contenido, fotos: [] })
    await assert.rejects(f.server.crearPublicacionComunidad(f.auth, { ...input, contenido: 'Cambió' }), e => e.status === 409)
  }
})
test('editar/retirar propios: versión, conflicto, reintento y preservación de identidad', async () => {
  for (const options of [{}, { updateCommitted: true }]) {
    const f = fixture(options), cambio = { version: 1, accion: 'editar', tipo: 'pregunta', contenido: '¿Cómo sigo?' }
    const edited = await f.server.cambiarPublicacionComunidad(f.auth, id, cambio)
    assert.equal(edited.version, 2); assert.equal(edited.contenido, cambio.contenido)
    assert.deepEqual(await f.server.cambiarPublicacionComunidad(f.auth, id, cambio), edited)
    assert.equal(f.calls.filter(c => c.action === 'update').length, 1)
    const write = f.calls.find(c => c.action === 'update'); assert.deepEqual(write.data, { contenido: cambio.contenido, tipo: cambio.tipo })
    assert.deepEqual(write.filters, [['eq', 'id', id], ['eq', 'version', 1]])
  }
  const other = fixture({ posts: [post({ alumna_id: otherId })] })
  await assert.rejects(other.server.cambiarPublicacionComunidad(other.auth, id, { version: 1, accion: 'retirar' }), e => e.status === 403)
  const conflict = fixture({ updateConflict: true })
  await assert.rejects(conflict.server.cambiarPublicacionComunidad(conflict.auth, id, { version: 1, accion: 'retirar' }), e => e.status === 409)
})
test('moderación solo admin, no edita textos ajenos y no confunde motivos distintos con mismo intento', async () => {
  const member = fixture()
  await assert.rejects(member.server.cambiarPublicacionComunidad(member.auth, id, { version: 1, accion: 'ocultar', motivo: 'Fuera de tema' }), e => e.status === 403)
  assert.equal(member.calls.filter(c => c.action === 'update').length, 0)
  const admin = fixture({ admin: true, posts: [post({ alumna_id: otherId })] })
  const hidden = await admin.server.cambiarPublicacionComunidad(admin.auth, id, { version: 1, accion: 'ocultar', motivo: 'Fuera de tema' })
  assert.equal(hidden.oculta, true); assert.equal(hidden.version, 2); assert.equal(admin.tables.publicaciones[0].moderada_por, userId)
  await assert.rejects(admin.server.cambiarPublicacionComunidad(admin.auth, id, { version: 1, accion: 'ocultar', motivo: 'Otro motivo' }), e => e.status === 409)
  await assert.rejects(admin.server.cambiarPublicacionComunidad(admin.auth, id, { version: 2, accion: 'editar', tipo: 'avance', contenido: 'Ajeno' }), e => e.status === 403)
  const shown = await admin.server.cambiarPublicacionComunidad(admin.auth, id, { version: 2, accion: 'mostrar' })
  assert.equal(shown.oculta, false); assert.equal(shown.version, 3)
})
test('comentarios pertenecen al post comprobado, no se crean en ocultos/retirados y son recuperables', async () => {
  const f = fixture({ comments: [] }), input = { id: commentId, contenido: 'Una respuesta ficticia' }
  const created = await f.server.crearComentarioComunidad(f.auth, id, input)
  assert.equal(created.publicacion_id, id); assert.equal(created.propia, true)
  assert.equal((await f.server.crearComentarioComunidad(f.auth, id, input)).id, commentId)
  const retired = await f.server.cambiarComentarioComunidad(f.auth, commentId, { version: 1, accion: 'retirar' }); assert.equal(retired.retirada, true)
  const restored = await f.server.cambiarComentarioComunidad(f.auth, commentId, { version: 2, accion: 'restaurar' }); assert.equal(restored.retirada, false)
  const listed = await f.server.leerComentariosComunidad(f.auth, id); assert.equal(domain.esPaginaComentarios(listed), true); assert.equal(listed.comentarios.length, 1)
  for (const field of ['retirada_en', 'oculta_en']) {
    const x = fixture({ posts: [post({ [field]: date })] })
    await assert.rejects(x.server.crearComentarioComunidad(x.auth, id, input), e => e.status === 404)
    assert.equal(x.calls.filter(c => c.action === 'insert').length, 0)
  }
})
test('felicitar exige estado deseado, espera persistencia y confirma resumen sin duplicar', async () => {
  const f = fixture()
  assert.deepEqual(await f.server.felicitarPublicacionComunidad(f.auth, id, true), { activo: true, total: 1 })
  assert.deepEqual(await f.server.felicitarPublicacionComunidad(f.auth, id, true), { activo: true, total: 1 })
  assert.equal(f.tables.reacciones.length, 1)
  assert.deepEqual(await f.server.felicitarPublicacionComunidad(f.auth, id, false), { activo: false, total: 0 })
  assert.deepEqual(await f.server.felicitarPublicacionComunidad(f.auth, id, false), { activo: false, total: 0 })
  assert.equal(f.tables.reacciones.length, 0)
  const failed = fixture({ insertError: { code: '42501', message: 'privado' } })
  await assert.rejects(failed.server.felicitarPublicacionComunidad(failed.auth, id, true), e => e.status === 403 && !e.message.includes('privado'))
})
test('servidor no usa resultados, pruebas privadas, metadata ni credenciales privilegiadas', () => {
  const source = read('src/lib/community-server.ts')
  for (const forbidden of ["from('resultados')", 'archivo_url', 'SERVICE_ROLE', 'createAdminClient', 'user_metadata', 'getSession(', 'imagen_url', '.select(\'*\'']) assert.ok(!source.includes(forbidden), forbidden)
  assert.ok(source.startsWith("import 'server-only'"))
})
test('fotos: crear vincula metadata verificada al post y devuelve únicamente id y dimensiones', async () => {
  const f = fixture({ posts: [] }), entrada = domain.validarNuevaPublicacion({ id, tipo: 'avance', contenido: '', fotos: [foto, otraFoto] })
  const guardada = await f.server.crearPublicacionComunidad(f.auth, entrada)
  assert.equal(guardada.contenido, ''); assert.deepEqual(guardada.fotos, [foto, otraFoto]); assert.equal(domain.esPublicacionComunidad(guardada), true)
  const verificacion = f.calls.find(c => c.verificarFotos)
  assert.deepEqual(verificacion, { verificarFotos: true, usuaria: userId, postId: id, fotos: [foto, otraFoto] })
  const indiceVerify = f.calls.findIndex(c => c.verificarFotos), indiceInsert = f.calls.findIndex(c => c.action === 'insert')
  assert.ok(indiceVerify > 0 && indiceVerify < indiceInsert)
  assert.deepEqual(f.calls[indiceInsert].data.fotos, [foto, otraFoto])
  for (const privado of ['r2.', 'http', 'key', 'ruta', 'alumna_id']) assert.ok(!JSON.stringify(guardada.fotos).includes(privado))
})
test('crear fotos confirma reintento antes de verificar archivos y no acepta distinta lista u orden con el mismo UUID', async () => {
  for (const options of [{}, { insertCommitted: true }]) {
    const f = fixture({ posts: [], ...options }), input = { id, tipo: 'idea', contenido: 'Idea con fotos', fotos: [foto, otraFoto] }
    const first = await f.server.crearPublicacionComunidad(f.auth, input)
    f.setPhotoError(new ErrorFotosComunidad(503, 'Almacenamiento momentáneamente no disponible.'))
    assert.deepEqual(await f.server.crearPublicacionComunidad(f.auth, input), first)
    assert.equal(f.calls.filter(c => c.verificarFotos).length, 1); assert.equal(f.tables.publicaciones.length, 1)
    await assert.rejects(f.server.crearPublicacionComunidad(f.auth, { ...input, fotos: [otraFoto, foto] }), error => error.status === 409)
    await assert.rejects(f.server.crearPublicacionComunidad(f.auth, { ...input, fotos: [{ ...foto, ancho: 100 }, otraFoto] }), error => error.status === 409)
    assert.equal(f.calls.filter(c => c.verificarFotos).length, 1)
  }
})
test('fotos pendientes o ajenas no guardan la publicación y conservan el error seguro de la verificación', async () => {
  for (const status of [400, 403, 404, 503]) {
    const f = fixture({ posts: [], photoError: new ErrorFotosComunidad(status, 'No pudimos confirmar esta foto.') })
    await assert.rejects(f.server.crearPublicacionComunidad(f.auth, { id, tipo: 'avance', contenido: '', fotos: [foto] }), error => error.status === status && error.message === 'No pudimos confirmar esta foto.')
    assert.equal(f.tables.publicaciones.length, 0); assert.equal(f.calls.filter(c => c.action === 'insert').length, 0)
  }
})
test('PATCH sin fotos conserva adjuntos guardados y admite texto vacío solamente si quedan fotos', async () => {
  const f = fixture({ posts: [post({ fotos: [foto] })] })
  const guardada = await f.server.cambiarPublicacionComunidad(f.auth, id, { version: 1, accion: 'editar', tipo: 'idea', contenido: '' })
  assert.deepEqual(guardada.fotos, [foto]); assert.equal(guardada.contenido, '')
  assert.ok(!Object.hasOwn(f.calls.find(c => c.action === 'update').data, 'fotos'))
  assert.deepEqual(f.calls.find(c => c.verificarFotos).fotos, [foto])
  const vacia = fixture()
  await assert.rejects(vacia.server.cambiarPublicacionComunidad(vacia.auth, id, { version: 1, accion: 'editar', tipo: 'idea', contenido: '' }), error => error.status === 400)
  assert.equal(vacia.calls.filter(c => c.action === 'update').length, 0)
})
test('editar fotos compara orden/dimensiones y confirma respuesta perdida sin volver a consultar almacenamiento', async () => {
  for (const options of [{}, { updateCommitted: true }]) {
    const f = fixture({ posts: [post({ fotos: [foto] })], ...options }), cambio = { version: 1, accion: 'editar', tipo: 'avance', contenido: 'Dos fotos', fotos: [foto, otraFoto] }
    const first = await f.server.cambiarPublicacionComunidad(f.auth, id, cambio)
    assert.deepEqual(first.fotos, [foto, otraFoto]); assert.equal(first.version, 2)
    f.setPhotoError(new ErrorFotosComunidad(503, 'Almacenamiento temporalmente no disponible.'))
    assert.deepEqual(await f.server.cambiarPublicacionComunidad(f.auth, id, cambio), first)
    assert.equal(f.calls.filter(c => c.verificarFotos).length, 1); assert.equal(f.calls.filter(c => c.action === 'update').length, 1)
    await assert.rejects(f.server.cambiarPublicacionComunidad(f.auth, id, { ...cambio, fotos: [otraFoto, foto] }), error => error.status === 409)
    assert.equal(f.calls.filter(c => c.verificarFotos).length, 1)
  }
})
test('retirar fotos es explícito, no borra objetos y moderar no verifica ni modifica adjuntos', async () => {
  const f = fixture({ posts: [post({ fotos: [foto] })] })
  const changed = await f.server.cambiarPublicacionComunidad(f.auth, id, { version: 1, accion: 'editar', tipo: 'avance', contenido: 'Solo texto', fotos: [] })
  assert.deepEqual(changed.fotos, []); assert.equal(f.calls.filter(c => c.verificarFotos).length, 0)
  const admin = fixture({ admin: true, posts: [post({ alumna_id: otherId, fotos: [foto] })], photoError: new ErrorFotosComunidad(503, 'No disponible') })
  const hidden = await admin.server.cambiarPublicacionComunidad(admin.auth, id, { version: 1, accion: 'ocultar', motivo: 'Revisar esta publicación.' })
  assert.equal(hidden.oculta, true); assert.deepEqual(hidden.fotos, [foto]); assert.equal(admin.calls.filter(c => c.verificarFotos).length, 0)
  assert.ok(!Object.hasOwn(admin.calls.find(c => c.action === 'update').data, 'fotos'))
})
test('leer fotos requiere metadatos DTO válidos; un error no se convierte en publicación de texto sin adjuntos', async () => {
  for (const fotos of [null, [{ ...foto, url: 'https://example.invalid/privado' }], [foto, foto], [{ ...foto, ancho: 2049 }]]) {
    const f = fixture({ posts: [post({ fotos })] }), pagina = await f.server.leerComunidad(f.auth)
    assert.equal(pagina.estado, 'error'); assert.ok(!Object.hasOwn(pagina, 'publicaciones'))
  }
  const legacy = fixture(), pagina = await legacy.server.leerComunidad(legacy.auth)
  assert.deepEqual(pagina.publicaciones[0].fotos, [])
})
