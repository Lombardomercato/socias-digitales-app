/* eslint-disable @typescript-eslint/no-require-imports */
// Servicios y registros ficticios aislados. No certifican RLS de producción.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const d = load('src/lib/resource-crm.ts'), metrics = load('src/lib/metrics.ts')
const uid = '00000000-0000-4000-8000-000000000010', id = '00000000-0000-4000-8000-000000000001', contactoId = '00000000-0000-4000-8000-000000000002', eventoId = '00000000-0000-4000-8000-000000000003', fecha = '2026-10-25T12:00:00.123456+00:00'
const perfil = { id: uid, rol: 'admin' }, recurso = { id, nombre: 'Recurso local ficticio', slug: 'recurso-local-ficticio', orientacion: 'ambas', url: null, estado: 'borrador', version: 1, creado_en: fecha, actualizado_en: fecha }
const contacto = { id: contactoId, nombre: 'Contacto local ficticio', email_normalizado: 'persona@example.invalid', telefono: null, fuente: 'manual', referencia_externa: null, segmento_camara: 'sin_definir', perfil_id: null, vinculo_confirmado_en: null, cliente_confirmado: false, version: 1, creado_en: fecha, actualizado_en: fecha }
const evento = { id: eventoId, contacto_id: contactoId, recurso_id: id, tipo: 'solicitud', fuente: 'manual', referencia_externa: null, observado_en: fecha, creado_en: fecha }
function fixture(options = {}) {
  const calls = [], tablas = { crm_recursos: structuredClone(options.recursos ?? [recurso]), crm_contactos: structuredClone(options.contactos ?? [contacto]), crm_eventos: structuredClone(options.eventos ?? []) }
  const db = {
    auth: { getUser: async () => ({ data: { user: options.user === undefined ? { id: uid, user_metadata: { rol: 'admin' } } : options.user }, error: options.authError ?? null }) },
    from(table) {
      const q = { table, action: 'read', filters: [], sorts: [] }
      const builder = {
        select(fields) { q.fields = fields; return builder }, eq(k, v) { q.filters.push(['eq', k, v]); return builder }, is(k, v) { q.filters.push(['is', k, v]); return builder }, not(k, op, v) { q.filters.push(['not', k, v]); return builder }, or(value) { q.or = value; return builder },
        order(k, value) { q.sorts.push([k, value]); return builder }, limit(n) { q.limit = n; return builder }, insert(data) { q.action = 'insert'; q.data = data; return builder }, update(data) { q.action = 'update'; q.data = data; return builder },
        maybeSingle() { q.single = true; return run() }, then(resolve, reject) { return run().then(resolve, reject) },
      }
      async function run() {
        calls.push(structuredClone(q))
        if (table === 'perfiles') return { data: options.profile === undefined ? perfil : options.profile, error: options.profileError ?? null }
        if (options.tableError === table) return { data: null, error: { message: 'detalle privado de prueba' } }
        let rows = tablas[table].filter(row => q.filters.every(([op, k, v]) => op === 'not' ? row[k] !== v : row[k] === v))
        if (q.action === 'insert') {
          if (options.writeError && !options.committed) return { data: null, error: options.writeError }
          if (tablas[table].some(r => r.id === q.data.id || table === 'crm_recursos' && r.slug === q.data.slug || q.data.referencia_externa && r.fuente === q.data.fuente && r.referencia_externa === q.data.referencia_externa)) return { data: null, error: { code: '23505' } }
          const row = { ...(table === 'crm_recursos' ? recurso : table === 'crm_contactos' ? contacto : evento), ...q.data }; tablas[table].push(row); rows = [row]
        }
        if (q.action === 'update') {
          if (options.conflict) { if (rows[0]) rows[0].version += 2; return { data: null, error: null } }
          rows.forEach(r => Object.assign(r, q.data, { version: r.version + 1 }))
        }
        if (options.committed && q.action !== 'read') return { data: null, error: { code: 'red' } }
        if (q.limit) rows = rows.slice(0, q.limit)
        return { data: q.single ? rows[0] ?? null : rows, error: null }
      }
      return builder
    },
    async rpc(nombre, args) {
      calls.push({ rpc: nombre, args }); assert.equal(nombre, 'resumen_crm_contactos')
      if (options.rpcError) return { data: null, error: { message: 'no difundir' } }
      return { data: options.missingSummary ? [] : args.p_ids.map(contacto_id => ({ contacto_id, recursos_distintos: String(new Set(tablas.crm_eventos.filter(e => e.contacto_id === contacto_id && e.tipo === 'solicitud').map(e => e.recurso_id)).size), pidio_info: tablas.crm_eventos.some(e => e.contacto_id === contacto_id && e.tipo === 'info_socias'), interes_vigente_en: null })), error: null }
    },
  }
  const api = load('src/lib/resource-crm-server.ts', { 'next/navigation': { unstable_rethrow: error => { if (error === options.control) throw error } }, './supabase/server': { createClient: async () => { if (options.control) throw options.control; return db } }, './resource-crm': d, './metrics': metrics })
  return { api, auth: { supabase: db, userId: uid }, calls, tablas }
}
test('adminauth comprueba getUser+perfilpropio, no metadata; alumnas/anónimas no reciben CRM', async () => {
  for (const [options, status] of [[{ user: null }, 401], [{ authError: {} }, 401], [{ profile: { ...perfil, rol: 'alumna' } }, 403], [{ profile: null }, 503], [{ profile: { ...perfil, id: contactoId } }, 503], [{ profileError: {} }, 503]]) {
    const f = fixture(options), result = await f.api.autorizarRecursosCrm(); assert.equal(result.error.status, status); assert.ok(!Object.hasOwn(result, 'supabase')); assert.ok(!f.calls.some(c => c.table?.startsWith('crm_')))
  }
  const f = fixture(); assert.equal((await f.api.autorizarRecursosCrm()).userId, uid); assert.equal(f.calls[0].fields, 'id,rol')
})
test('vacío es distinto de error y el resumen faltante no se vuelve puntaje cero', async () => {
  const vacio = fixture({ recursos: [], contactos: [] })
  assert.deepEqual(await vacio.api.leerCatalogoCrm(vacio.auth), { estado: 'lista', recursos: [], limitado: false })
  assert.deepEqual(await vacio.api.leerContactosCrm(vacio.auth), { estado: 'lista', contactos: [], siguiente: null })
  for (const options of [{ rpcError: true }, { missingSummary: true }, { tableError: 'crm_contactos' }]) { const f = fixture(options), data = await f.api.leerContactosCrm(f.auth); assert.equal(data.estado, 'error'); assert.ok(!Object.hasOwn(data, 'contactos')); assert.ok(!JSON.stringify(data).includes('no difundir')) }
})
test('contactos usan filtros exactos, cursor de microsegundos y resumen SQL completo', async () => {
  const f = fixture({ eventos: [evento] }), result = await f.api.leerContactosCrm(f.auth, { fuente: 'manual', segmento: 'sin_definir', relacion: 'sin_vinculo', cursor: fecha + '~' + contactoId })
  assert.equal(result.estado, 'lista'); assert.equal(result.contactos[0].interes.puntos, 10)
  const query = f.calls.find(c => c.table === 'crm_contactos'); assert.equal(query.limit, 26); assert.ok(query.or.includes(fecha)); assert.ok(query.filters.some(f => f[1] === 'fuente')); assert.ok(query.filters.some(f => f[1] === 'vinculo_confirmado_en'))
  assert.equal(f.calls.filter(c => c.rpc).length, 1); assert.ok(!query.fields.includes('ingresos')); assert.ok(!query.fields.includes('auth'))
})
test('guardar recurso recupera respuesta perdida por UUID y respeta versiones/CAS', async () => {
  for (const options of [{}, { committed: true }]) {
    const f = fixture({ recursos: [], ...options }), entrada = d.validarRecursoCrm({ id, nombre: recurso.nombre, slug: recurso.slug, orientacion: 'ambas', url: null })
    const saved = await f.api.guardarRecursoCrm(f.auth, entrada)
    assert.equal(saved.estado, 'borrador'); assert.equal(saved.version, 1); assert.deepEqual(await f.api.guardarRecursoCrm(f.auth, entrada), saved); assert.equal(f.tablas.crm_recursos.length, 1)
    const cambio = d.validarRecursoCrm({ id, version: 1, nombre: 'Nombre actualizado', slug: recurso.slug, orientacion: 'sin_mostrarse', url: '' }, true)
    const edited = await f.api.guardarRecursoCrm(f.auth, cambio, true); assert.equal(edited.version, 2); assert.equal(edited.nombre, 'Nombre actualizado'); assert.deepEqual(await f.api.guardarRecursoCrm(f.auth, cambio, true), edited)
    assert.ok(f.calls.find(c => c.action === 'update').filters.some(x => x[1] === 'version' && x[2] === 1))
  }
  const f = fixture({ conflict: true }), cambio = d.validarRecursoCrm({ id, version: 1, nombre: 'Otro', slug: recurso.slug, orientacion: 'ambas', url: null }, true)
  await assert.rejects(f.api.guardarRecursoCrm(f.auth, cambio, true), error => error.status === 409)
})
test('alta contacto sin link, segmentación CAS y deduplicación por referencia sin fusionar', async () => {
  const f = fixture({ contactos: [], committed: true }), entrada = d.validarContactoCrm({ id: contactoId, nombre: contacto.nombre, email: contacto.email_normalizado, telefono: null, fuente: 'manual', referencia_externa: 'ID-declarado', segmento_camara: 'sin_definir' })
  const saved = await f.api.crearContactoCrm(f.auth, entrada)
  assert.equal(saved.perfil_id, null); assert.equal(saved.cliente_confirmado, false); assert.deepEqual(await f.api.crearContactoCrm(f.auth, entrada), saved)
  const write = f.calls.find(c => c.action === 'insert'); for (const denied of ['perfil_id', 'cliente_confirmado', 'vinculo_confirmado_en']) assert.ok(!Object.hasOwn(write.data, denied))
  const edited = await f.api.segmentarContactoCrm(f.auth, contactoId, { version: 1, segmento_camara: 'no' }); assert.equal(edited.version, 2); assert.equal(edited.segmento_camara, 'no'); assert.deepEqual(await f.api.segmentarContactoCrm(f.auth, contactoId, { version: 1, segmento_camara: 'no' }), edited)
  const duplicate = fixture({ contactos: [{ ...contacto, referencia_externa: 'ID-declarado' }] })
  await assert.rejects(duplicate.api.crearContactoCrm(duplicate.auth, { ...entrada, id: eventoId }), e => e.status === 409 && e.message.includes('no se fusionó'))
})
test('historial verifica contacto, no usa página parcial para calcular score y eventos son idempotentes', async () => {
  const f = fixture(), entrada = d.validarEventoCrm({ id: eventoId, tipo: 'solicitud', recurso_id: id, fuente: 'manual', referencia_externa: null, observado_en: fecha })
  const first = await f.api.registrarEventoCrm(f.auth, contactoId, entrada); assert.deepEqual(await f.api.registrarEventoCrm(f.auth, contactoId, entrada), first); assert.equal(f.tablas.crm_eventos.length, 1)
  const hist = await f.api.leerHistorialCrm(f.auth, contactoId); assert.equal(hist.estado, 'lista'); assert.equal(hist.eventos.length, 1); assert.equal(hist.contacto.interes.puntos, 10)
  assert.equal(f.calls.filter(c => c.rpc).at(-1).args.p_ids[0], contactoId)
  await assert.rejects(f.api.registrarEventoCrm(f.auth, contactoId, { ...entrada, datos: { ...entrada.datos, tipo: 'info_socias' } }), e => e.status === 409)
})
test('API administra todos los endpoints con caché privada, origen estricto y campos de vínculo prohibidos', async () => {
  const f = fixture(), deps = { '@/lib/resource-crm': d, '@/lib/resource-crm-server': f.api }, resourceApi = load('src/app/api/admin/recursos/route.ts', deps), contactApi = load('src/app/api/admin/recursos/contactos/route.ts', deps)
  const get = await resourceApi.GET(new Request('https://app.example.test/api/admin/recursos')); assert.equal(get.status, 200); assert.equal(get.headers.get('cache-control'), 'private, no-store')
  const request = (data, origin = 'https://app.example.test') => new Request('https://app.example.test/api/admin/recursos/contactos', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(data) })
  assert.equal((await contactApi.POST(request({}, 'https://otra.example.test'))).status, 403)
  assert.equal((await contactApi.POST(request({ id: contactoId, nombre: 'Prueba', email: 'a@example.invalid', fuente: 'manual', segmento_camara: 'no', perfil_id: uid }))).status, 400)
  assert.equal((await contactApi.POST(request('x'.repeat(20000)))).status, 413)
  const student = fixture({ profile: { ...perfil, rol: 'alumna' } }), deniedApi = load('src/app/api/admin/recursos/contactos/route.ts', { '@/lib/resource-crm': d, '@/lib/resource-crm-server': student.api })
  const response = await deniedApi.GET(new Request('https://app.example.test/api/admin/recursos/contactos')); assert.equal(response.status, 403); assert.ok(!JSON.stringify(await response.json()).includes('persona@example.invalid'))
})
