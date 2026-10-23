/* eslint-disable @typescript-eslint/no-require-imports */
// Catálogo/almacenamiento simulados, autorización/proyección reales. No DB ni red.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}, extra = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ...Object.keys(extra), ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports, ...Object.values(extra)); return m.exports }
const management = load('src/lib/class-management.ts'), access = load('src/lib/class-access.ts')
const materials = load('src/lib/class-materials.ts', { './class-management': management })
const model = load('src/lib/resource-library.ts', { './class-access': access, './class-management': management, './class-materials': materials })
const uuid = n => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
const SOCIA = { rol: 'alumna', tipo_usuario: 'socia', estado: 'activa', desafio_socias_habilitada: false }
const clase = (n, extra = {}) => ({ id: uuid(n), titulo: `Clase ${n}`, descripcion: null, orden: n, modulo: 'Desafío Socias', activo: true, acceso_gratuito: false, puede_ver: true, tiene_video_privado: true, vimeo_url: null, plan: '27', ...extra })
const material = (n, extra = {}) => ({ id: uuid(n), titulo: `Guía ${n}`, tipo: 'enlace', url: 'https://docs.example.test/privado?token=no-publicar', activo: true, creado: '2026-10-23T12:00:00Z', ...extra })
function sistema({ catalogo = [], leerCatalogo, leerIndice = async () => ({ materiales: [], revision: 'no-publicar-r2' }) } = {}) {
  const catalogos = [], indices = [], logs = []
  const api = load('src/lib/resource-library-server.ts', {
    './resource-library': model,
    './class-catalog': { leerCatalogoClases: async perfil => { catalogos.push(perfil); return leerCatalogo ? leerCatalogo() : catalogo } },
    './class-materials-store': { leerMateriales: async (id, opciones) => { indices.push({ id, opciones }); return leerIndice(id, opciones) } },
  }, { console: { error: (...values) => logs.push(values) } })
  return { ...api, catalogos, indices, logs }
}

test('perfil ausente/admin y parámetros inválidos no leen catálogo ni índices', async () => {
  for (const perfil of [null, undefined, [], 'socia', { rol: 'admin' }]) {
    const s = sistema({ catalogo: [clase(1)] }), result = await s.leerBibliotecaRecursos(perfil)
    assert.equal(result.estado, 'error'); assert.deepEqual(s.catalogos, []); assert.deepEqual(s.indices, [])
  }
  for (const offset of [-1, NaN, Infinity, 1.2, '0', null, {}, Number.MAX_SAFE_INTEGER + 1]) {
    const s = sistema(); assert.equal((await s.leerBibliotecaRecursos(SOCIA, offset)).estado, 'error'); assert.deepEqual(s.catalogos, [])
  }
  for (const revision of [null, '', 'a'.repeat(63), 'a'.repeat(65), 'A'.repeat(64), 1, {}]) {
    const s = sistema(); assert.equal((await s.leerBibliotecaRecursos(SOCIA, 0, revision)).estado, 'error'); assert.deepEqual(s.catalogos, [])
  }
})

test('doble autorización evita leer índices de privadas gratuitas, ocultas, bloqueadas o IDs inválidos', async () => {
  const catalogo = [clase(1), clase(2, { activo: false }), clase(3, { puede_ver: false }), clase(4, { id: 'invalido' }), clase(5, { acceso_gratuito: true, tiene_video_privado: false }), clase(5)]
  for (const [perfil, ids] of [[SOCIA, [uuid(1), uuid(5)]], [{ ...SOCIA, estado: 'pausada' }, [uuid(5)]], [{ ...SOCIA, estado: 'cancelada' }, [uuid(5)]], [{ rol: 'alumna', tipo_usuario: 'gratuito' }, [uuid(5)]], [{ rol: 'afiliada', estado: 'activa' }, [uuid(5)]], [{ rol: 'alumna', tipo_usuario: 'desafio', estado: 'activa', desafio_socias_habilitada: true }, [uuid(1), uuid(5)]]]) {
    const s = sistema({ catalogo }), result = await s.leerBibliotecaRecursos(perfil)
    assert.equal(result.estado, 'listo'); assert.deepEqual(s.catalogos, [perfil]); assert.deepEqual(s.indices.map(call => call.id), ids)
    assert.ok(s.indices.every(call => call.opciones.timeoutMs === 5000))
    assert.equal(result.resumen.clasesRevisadas, ids.length)
  }
})

test('página consume hasta veinte clases autorizadas, no veinte adjuntos ni catálogo bloqueado', async () => {
  const catalogo = Array.from({ length: 23 }, (_, n) => clase(n + 1)).concat(clase(99, { puede_ver: false }))
  const s = sistema({ catalogo, leerIndice: async id => ({ materiales: [material(Number.parseInt(id.slice(-12), 16))], revision: 'r2-no-publicar' }) })
  const first = await s.leerBibliotecaRecursos(SOCIA)
  assert.equal(first.estado, 'listo'); assert.equal(first.offset, 0); assert.equal(first.hayMas, true); assert.equal(first.nextOffset, 20)
  assert.deepEqual(first.resumen, { clasesRevisadas: 20, clasesLeidas: 20, materiales: 20, archivos: 0, enlaces: 20 })
  assert.deepEqual(first.recursos.map(item => item.claseId), Array.from({ length: 20 }, (_, n) => uuid(n + 1)))
  const second = await s.leerBibliotecaRecursos(SOCIA, first.nextOffset, first.revisionCatalogo)
  assert.equal(second.estado, 'listo'); assert.equal(second.hayMas, false); assert.equal(second.nextOffset, null); assert.equal(second.offset, 20)
  assert.deepEqual(second.resumen, { clasesRevisadas: 3, clasesLeidas: 3, materiales: 3, archivos: 0, enlaces: 3 })
  assert.deepEqual(second.recursos.map(item => item.claseId), [21, 22, 23].map(uuid))
  assert.ok(s.indices.every(call => call.id !== uuid(99)))
})

test('una primera página sin adjuntos puede tener más clases; catálogo vacío es vacío confirmado', async () => {
  const catalogo = Array.from({ length: 21 }, (_, n) => clase(n + 1))
  const first = await sistema({ catalogo }).leerBibliotecaRecursos(SOCIA)
  assert.deepEqual(first.recursos, []); assert.equal(first.hayMas, true); assert.equal(first.nextOffset, 20); assert.equal(first.resumen.clasesLeidas, 20)
  const empty = await sistema().leerBibliotecaRecursos(SOCIA)
  assert.equal(empty.estado, 'listo'); assert.equal(empty.hayMas, false); assert.equal(empty.nextOffset, null)
  assert.deepEqual(empty.resumen, { clasesRevisadas: 0, clasesLeidas: 0, materiales: 0, archivos: 0, enlaces: 0 })
})

test('catálogo denegado/corrupto es fallo global; no se disfraza como cero ni expone errores internos', async () => {
  for (const opciones of [{ leerCatalogo: () => { throw new Error('token-clave-privado') } }, { catalogo: null }, { catalogo: [clase(1, { titulo: null })] }]) {
    const s = sistema(opciones), result = await s.leerBibliotecaRecursos(SOCIA)
    assert.equal(result.estado, 'error'); assert.ok(!Object.hasOwn(result, 'recursos')); assert.ok(!Object.hasOwn(result, 'resumen')); assert.deepEqual(s.indices, [])
    assert.deepEqual(s.logs, [['resource_library_catalog_read_failed']]); assert.ok(!JSON.stringify(result).includes('token-clave-privado'))
  }
})

test('fallos por clase son parciales, conservan otras clases y jamás se vuelven vacío confirmado', async () => {
  const catalogo = [clase(1), clase(2), clase(3), clase(4)]
  const s = sistema({ catalogo, leerIndice: async id => {
    if (id === uuid(2)) throw new Error('ruta-r2-privada')
    if (id === uuid(3)) return { materiales: [material(3), material(3)] }
    return { materiales: [material(Number.parseInt(id.slice(-12), 16)), material(90, { activo: false })] }
  } })
  const result = await s.leerBibliotecaRecursos(SOCIA)
  assert.equal(result.estado, 'parcial'); assert.deepEqual(result.recursos.map(item => item.claseId), [1, 4].map(uuid))
  assert.deepEqual(result.fallos.map(item => item.claseId), [2, 3].map(uuid))
  assert.deepEqual(result.resumen, { clasesRevisadas: 4, clasesLeidas: 2, materiales: 2, archivos: 0, enlaces: 2 })
  assert.ok(!JSON.stringify(result).includes('ruta-r2-privada')); assert.ok(!JSON.stringify(result).includes('token='))
  assert.deepEqual(Object.keys(result.fallos[0]).sort(), ['claseId', 'claseTitulo', 'programa', 'seccion'].sort())
  assert.deepEqual(s.logs, [['resource_library_materials_read_failed', { clases: 2, offset: 0 }]])
  const failed = await sistema({ catalogo, leerIndice: async () => { throw new Error('error') } }).leerBibliotecaRecursos(SOCIA)
  assert.equal(failed.estado, 'parcial'); assert.equal(failed.resumen.clasesLeidas, 0); assert.equal(failed.fallos.length, 4); assert.deepEqual(failed.recursos, [])
})

test('reintentar la misma página confirma nuevamente los índices sin caché ni escrituras', async () => {
  let fail = true
  const s = sistema({ catalogo: [clase(1)], leerIndice: async () => { if (fail) throw new Error('temporal'); return { materiales: [material(1)] } } })
  const first = await s.leerBibliotecaRecursos(SOCIA)
  fail = false
  const retry = await s.leerBibliotecaRecursos(SOCIA, first.offset, first.revisionCatalogo)
  assert.equal(first.estado, 'parcial'); assert.equal(retry.estado, 'listo'); assert.equal(retry.recursos.length, 1); assert.deepEqual(retry.fallos, [])
  assert.equal(s.indices.length, 2); assert.equal(s.catalogos.length, 2)
})

test('revisión detecta catálogo autorizado modificado y offset inexistente antes de leer índices', async () => {
  let catalogo = [clase(1), clase(2)]
  const s = sistema({ leerCatalogo: () => catalogo })
  const first = await s.leerBibliotecaRecursos(SOCIA)
  assert.match(first.revisionCatalogo, /^[a-f0-9]{64}$/)
  s.indices.length = 0
  for (const offset of [2, 20, Number.MAX_SAFE_INTEGER]) assert.equal((await s.leerBibliotecaRecursos(SOCIA, offset, first.revisionCatalogo)).estado, 'actualizado')
  assert.deepEqual(s.indices, [])
  catalogo = [clase(1, { titulo: 'Organización nueva' }), clase(2)]
  const changed = await s.leerBibliotecaRecursos(SOCIA, 0, first.revisionCatalogo)
  assert.equal(changed.estado, 'actualizado'); assert.deepEqual(s.indices, [])
  const refresh = await s.leerBibliotecaRecursos(SOCIA)
  assert.equal(refresh.estado, 'listo'); assert.notEqual(refresh.revisionCatalogo, first.revisionCatalogo); assert.equal(s.indices.length, 2)
})

test('revisión es determinista y no depende de enlaces privados, metadatos ajenos ni clases denegadas', async () => {
  const allowed = [clase(1), clase(2)]
  const first = await sistema({ catalogo: allowed }).leerBibliotecaRecursos(SOCIA)
  const second = await sistema({ catalogo: [...allowed].reverse().map(row => ({ ...row, vimeo_url: 'https://vimeo.com/1/token-privado', video_key: 'r2-secreto', administradora: 'no-publicar' })).concat(clase(3, { puede_ver: false })) }).leerBibliotecaRecursos(SOCIA, 0, first.revisionCatalogo)
  assert.equal(second.estado, 'listo'); assert.equal(second.revisionCatalogo, first.revisionCatalogo)
  assert.ok(!JSON.stringify(second).includes('token-privado'))
})

test('máximo cuatro lecturas simultáneas, todas aguardadas, con salida estable pese al orden de llegada', async () => {
  const pendientes = [], completadas = [], catalogo = Array.from({ length: 20 }, (_, n) => clase(n + 1))
  let activas = 0, pico = 0, terminado = false
  const s = sistema({ catalogo, leerIndice: id => {
    activas++; pico = Math.max(pico, activas)
    return new Promise(resolve => pendientes.push(() => { activas--; completadas.push(id); resolve({ materiales: [material(Number.parseInt(id.slice(-12), 16))] }) }))
  } })
  const task = s.leerBibliotecaRecursos(SOCIA).then(result => { terminado = true; return result })
  const tick = () => new Promise(resolve => setImmediate(resolve))
  await tick(); assert.equal(s.indices.length, 4); assert.equal(activas, 4); assert.equal(terminado, false)
  while (completadas.length < 20) {
    const lote = pendientes.splice(0).reverse()
    assert.ok(lote.length > 0); for (const liberar of lote) liberar()
    await tick()
  }
  const result = await task
  assert.equal(pico, 4); assert.equal(activas, 0); assert.equal(terminado, true); assert.equal(completadas.length, 20)
  assert.notDeepEqual(completadas, catalogo.map(row => row.id))
  assert.deepEqual(result.recursos.map(item => item.claseId), catalogo.map(row => row.id))
  assert.ok(s.indices.every(call => call.opciones.timeoutMs === 5000))
})

test('lector solo reutiliza lecturas existentes; no crea auth, DB, URLs firmadas, caché o mutaciones', () => {
  const source = read('src/lib/resource-library-server.ts').replaceAll('Array.from(', '')
  assert.ok(source.startsWith("import 'server-only'"))
  for (const forbidden of ['.auth.', '.from(', '.rpc(', 'createAdminClient', 'createClient(', 'process.env', 'fetch(', '.insert(', '.upsert(', '.delete(', 'guardarMateriales', 'Promise.race', 'unstable_cache', "'use cache'"]) assert.ok(!source.includes(forbidden), forbidden)
})
