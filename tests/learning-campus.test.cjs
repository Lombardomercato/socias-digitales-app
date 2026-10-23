/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const management = load('src/lib/class-management.ts'), progress = load('src/lib/class-progress.ts')
const { resumirCampusAprendizaje: resumir } = load('src/lib/learning-campus.ts', { './class-management': management, './class-progress': progress })
const clase = (id, modulo = 'Bienvenida', extra = {}) => ({ id, titulo: `Clase ${id}`, modulo, orden: 0, activo: true, puede_ver: true, tiene_video_privado: true, vimeo_url: null, plan: '27', descripcion: null, ...extra })
const avance = (clase_id, extra = {}) => ({ clase_id, posicion_seg: 0, duracion_seg: 100, completada: false, actualizado_en: '2026-10-23T12:00:00Z', ...extra })

test('campus vacío conocido no inventa clases, próxima, programa completo ni porcentaje', () => {
  assert.deepEqual(resumir([], []), { estado: 'listo', programas: [], total: 0, completadas: 0, enCurso: 0, bloqueadas: 0, sinVideo: 0, programasCompletos: 0, proxima: null })
})
test('totales cuentan solo publicadas autorizadas reproducibles y deduplican sin sumar bloqueadas o sin video', () => {
  const a = clase('a'), clases = [a, a, clase('bloqueada', 'Bienvenida', { puede_ver: false }), clase('sin-video', 'Bienvenida', { tiene_video_privado: false }), clase('oculta', 'Oculto', { activo: false }), clase('vimeo', 'Otro', { tiene_video_privado: false, vimeo_url: 'https://vimeo.com/123' }), clase('vimeo-roto', 'Otro', { tiene_video_privado: false, vimeo_url: 'https://ejemplo.test' })]
  const result = resumir(clases, [avance('a', { completada: true }), avance('bloqueada', { completada: true }), avance('oculta', { completada: true }), avance('ajena', { completada: true })])
  assert.equal(result.total, 2); assert.equal(result.completadas, 1); assert.equal(result.enCurso, 0)
  assert.equal(result.bloqueadas, 1); assert.equal(result.sinVideo, 2); assert.equal(result.programasCompletos, 0)
  assert.equal(result.programas.length, 2); assert.equal(result.programas[0].completo, false)
  assert.equal('porcentaje' in result, false)
})
test('Bienvenida primero y clases en su orden de sección; no adelanta el apoyo por tener orden menor', () => {
  const clases = [clase('apoyo', 'Desafío Socias › Material de apoyo'), clase('c2', 'Desafío Socias en vivo', { orden: 2 }), clase('c1', 'Desafío Socias', { orden: 1 }), clase('bienvenida', 'Introducción'), clase('otro', 'Otro')]
  const result = resumir(clases, [])
  assert.deepEqual(result.programas.map(p => p.nombre), ['Bienvenida', 'Desafío Socias', 'Otro'])
  assert.equal(result.proxima.id, 'bienvenida')
  assert.equal(result.programas[1].proxima.id, 'c1')
  const siguiente = resumir(clases, [avance('bienvenida', { completada: true }), avance('c1', { completada: true })])
  assert.equal(siguiente.proxima.id, 'c2')
  assert.equal(siguiente.proxima.motivo, 'empezar'); assert.equal(siguiente.proxima.posicionSeg, null)
})
test('próxima prioriza progreso reciente propio disponible, no completadas, ocultas ni bloqueadas', () => {
  const clases = [clase('inicio'), clase('b', 'Desafío Socias'), clase('apoyo', 'Desafío Socias › Material de apoyo'), clase('bloqueada', 'Otro', { puede_ver: false }), clase('oculta', 'Otro', { activo: false })]
  const result = resumir(clases, [avance('b', { posicion_seg: 20 }), avance('apoyo', { posicion_seg: 35.8, actualizado_en: '2026-10-23T13:00:00Z' }), avance('bloqueada', { posicion_seg: 99, actualizado_en: '2026-10-23T14:00:00Z' }), avance('oculta', { posicion_seg: 99, actualizado_en: '2026-10-23T14:00:00Z' })])
  assert.equal(result.enCurso, 2); assert.equal(result.proxima.id, 'apoyo'); assert.equal(result.proxima.posicionSeg, 35)
  assert.equal(result.proxima.seccion, 'Material de apoyo'); assert.equal(result.proxima.motivo, 'continuar')
  const marcado = resumir(clases, [avance('b', { posicion_seg: 90, completada: true })])
  assert.equal(marcado.enCurso, 0); assert.equal(marcado.proxima.id, 'inicio')
})
test('el programa solo queda completo al terminar también el apoyo; una bloqueada no forma un 100% parcial', () => {
  const clases = [clase('a'), clase('b', 'Bienvenida › Material de apoyo')]
  assert.equal(resumir(clases, [avance('a', { completada: true })]).programas[0].completo, false)
  const completadas = [avance('a', { completada: true }), avance('b', { completada: true })]
  const completo = resumir(clases, completadas)
  assert.equal(completo.programasCompletos, 1); assert.equal(completo.programas[0].completo, true); assert.equal(completo.proxima, null)
  assert.equal(resumir([...clases, clase('privada', 'Bienvenida', { puede_ver: false })], completadas).programasCompletos, 0)
  assert.equal(resumir([...clases, clase('futura', 'Bienvenida', { tiene_video_privado: false })], completadas).programas[0].completo, false)
})
test('sin catálogo todo es desconocido; sin progreso conserva disponibilidad pero jamás cero ni próxima falsa', () => {
  const result = resumir([clase('a'), clase('b', 'Otro', { puede_ver: false })], null)
  assert.equal(result.estado, 'error'); assert.equal(result.total, 1); assert.equal(result.bloqueadas, 1)
  for (const campo of ['completadas', 'enCurso', 'programasCompletos', 'proxima']) assert.equal(result[campo], null)
  for (const p of result.programas) { assert.equal(p.completadas, null); assert.equal(p.enCurso, null); assert.equal(p.completo, null); assert.equal(p.proxima, null) }
  const unknown = resumir(null, [])
  for (const campo of ['total', 'completadas', 'enCurso', 'bloqueadas', 'sinVideo', 'programasCompletos', 'proxima']) assert.equal(unknown[campo], null)
})
test('último progreso del mismo ID prevalece sin duplicar; inválido disponible vuelve desconocida la lectura', () => {
  const viejo = avance('a', { completada: true }), nuevo = avance('a', { posicion_seg: 12, actualizado_en: '2026-10-23T13:00:00Z' })
  for (const registros of [[viejo, nuevo], [nuevo, viejo]]) {
    const result = resumir([clase('a')], registros)
    assert.equal(result.completadas, 0); assert.equal(result.enCurso, 1); assert.equal(result.proxima.id, 'a')
  }
  for (const extra of [{ posicion_seg: NaN }, { posicion_seg: -1 }, { completada: null }, { actualizado_en: 'no es fecha' }]) {
    const result = resumir([clase('a')], [avance('a', extra)])
    assert.equal(result.estado, 'error'); assert.equal(result.completadas, null); assert.equal(result.proxima, null)
  }
  const zonas = resumir([clase('a'), clase('b')], [avance('a', { posicion_seg: 10, actualizado_en: '2026-10-23T14:00:00+03:00' }), avance('b', { posicion_seg: 20, actualizado_en: '2026-10-23T12:00:00Z' })])
  assert.equal(zonas.proxima.id, 'b')
  assert.equal(resumir([clase('a')], {}).estado, 'error')
})
test('proyección serializable no expone enlaces, claves, revisiones o PII ni muta los datos fuente', () => {
  const clases = [clase('a', 'Bienvenida', { vimeo_url: 'https://vimeo.com/123', video_key: 'clave-privada', email: 'privado@ejemplo.test', miniatura_revision: 'revision-privada' })]
  const registros = [avance('a', { posicion_seg: 15 })], antes = JSON.stringify([clases, registros])
  const result = resumir(clases, registros), json = JSON.stringify(result)
  assert.deepEqual(JSON.parse(json), result); assert.equal(JSON.stringify([clases, registros]), antes)
  for (const valor of ['vimeo.com', 'clave-privada', 'privado@ejemplo.test', 'revision-privada', 'video_key', 'miniatura_revision']) assert.ok(!json.includes(valor))
  assert.deepEqual(Object.keys(result.proxima).sort(), ['id', 'titulo', 'programa', 'seccion', 'motivo', 'posicionSeg'].sort())
})
