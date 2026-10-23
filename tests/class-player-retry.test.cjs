/* eslint-disable @typescript-eslint/no-require-imports */
// Fetch and hooks are isolated fixtures; no browser or real progress writes.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in deps ? deps[name] : require(name), m, m.exports)
  return m.exports
}
const ID = '11111111-1111-4111-8111-111111111111'
const inicial = { clase_id: ID, completada: false, posicion_seg: 0, duracion_seg: 120, actualizado_en: '2026-10-23T15:00:00Z' }
function player(completada = false) {
  const cells = [], updates = [], errors = [], celebrations = []
  let cursor = 0, progreso = { ...inicial, completada }
  const onProgreso = value => { progreso = value; updates.push(value) }
  const onError = value => errors.push(value)
  const celebrate = value => celebrations.push(value)
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value }] },
    useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] },
    useCallback(callback, deps) { const i = cursor++, previous = cells[i]; if (!previous || deps.some((value, n) => !Object.is(value, previous.deps[n]))) cells[i] = { callback, deps }; return cells[i].callback },
    useEffect() {},
  }
  const Component = load('src/app/classroom/ClassPlayer.tsx', { react: hooks, '@/lib/class-progress': load('src/lib/class-progress.ts'), '@/components/ClassMaterials': { default: () => null }, '@/components/SuccessCelebration': { default: () => null, useSuccessCelebration: () => ({ celebration: null, celebrate }) } }).default
  const render = () => { cursor = 0; return Component({ clase: { id: ID, titulo: 'Clase de prueba', modulo: 'Programa ficticio', tiene_video_privado: true, vimeo_url: null }, url: '/fixture-no-reproduce.mp4', progreso, esAdmin: false, onProgreso, onError, onSiguiente() {}, onCerrar() {} }) }
  function all(tree, predicate) { if (!tree || typeof tree !== 'object') return []; return [...(predicate(tree) ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, predicate))] }
  function text(tree) { if (typeof tree === 'string' || typeof tree === 'number') return String(tree); return !tree || typeof tree !== 'object' ? '' : [tree.props?.children].flat(Infinity).map(text).join('') }
  const find = predicate => all(render(), predicate)[0]
  const button = label => find(node => node.type === 'button' && text(node) === label)
  const settle = async () => { await cells.find(cell => cell?.current instanceof Promise)?.current; await Promise.resolve() }
  const posicion = async () => { const video = find(node => node.type === 'video'); video.props.ref.current = { currentTime: 25, duration: 120 }; video.props.onPlay(); await settle() }
  return { cells, updates, errors, celebrations, render, find, button, settle, posicion, error: () => text(all(find(node => node.props?.role === 'alert'), node => node.type === 'p')[0]), estado: () => text(find(node => node.props?.role === 'status')), marcar: async () => { button(progreso.completada ? '✓ Completada · desmarcar' : 'Marcar como completada').props.onClick(); await settle() }, reintentar: async () => { button('Reintentar guardar').props.onClick(); await settle() } }
}
const response = (row = inicial) => ({ ok: true, json: async () => ({ progreso: row }) })
const failure = message => ({ ok: false, json: async () => ({ error: message }) })
function respuestas(sequence) {
  const requests = []
  global.fetch = async (_url, options) => { requests.push(JSON.parse(options.body)); const next = sequence.shift(); assert.ok(next, 'No debe haber solicitudes inesperadas'); if (next instanceof Error) throw next; return next }
  return requests
}

test('autosave exitoso actualiza posición pero no borra marca manual fallida ni su reintento', async () => {
  const original = global.fetch
  try {
    const requests = respuestas([failure('No se confirmó la clase completada.'), response({ ...inicial, posicion_seg: 25 }), response({ ...inicial, posicion_seg: 25, completada: true })])
    const view = player(); await view.marcar()
    assert.equal(view.error(), 'No se confirmó la clase completada.'); assert.equal(view.updates.length, 0)
    const guardar = view.cells.find(cell => cell?.callback)?.callback
    await view.posicion()
    assert.equal(view.updates[0].posicion_seg, 25); assert.equal(view.error(), 'No se confirmó la clase completada.')
    assert.equal(view.estado(), ''); assert.equal(view.errors.at(-1), 'No se confirmó la clase completada.')
    assert.equal(view.celebrations.length, 0); assert.ok(view.button('Reintentar guardar'))
    assert.equal(view.cells.find(cell => cell?.callback)?.callback, guardar)
    await view.reintentar()
    assert.deepEqual(requests.map(request => request.action), ['completada', 'posicion', 'completada'])
    assert.equal(requests[2].completada, true); assert.equal(view.error(), ''); assert.equal(view.errors.at(-1), '')
    assert.equal(view.estado(), 'Progreso guardado'); assert.equal(view.celebrations.length, 1)
  } finally { global.fetch = original }
})

test('autosave fallido no reemplaza el intento de completada ni su mensaje; no envía posición al reintentar', async () => {
  const original = global.fetch
  try {
    for (const error of [failure('Falló el minuto.'), new TypeError('Sin red'), response({ ...inicial, clase_id: 'ajena' })]) {
      const requests = respuestas([failure('No se confirmó la clase completada.'), error, response({ ...inicial, completada: true })])
      const view = player(); await view.marcar(); await view.posicion()
      assert.equal(view.error(), 'No se confirmó la clase completada.'); assert.equal(view.errors.length, 1)
      assert.equal(view.updates.length, 0); assert.equal(view.celebrations.length, 0)
      await view.reintentar()
      assert.equal(requests[2].action, 'completada'); assert.equal(requests[2].completada, true); assert.equal(view.error(), '')
    }
  } finally { global.fetch = original }
})

test('una respuesta de completada incoherente no limpia el intento y sobrevive otro autosave', async () => {
  const original = global.fetch
  try {
    const requests = respuestas([failure('No se confirmó la clase.'), response(inicial), response({ ...inicial, posicion_seg: 25 }), response({ ...inicial, completada: true })])
    const view = player(); await view.marcar(); await view.reintentar()
    assert.match(view.error(), /No pudimos confirmar el estado/); assert.equal(view.updates.length, 0); assert.equal(view.celebrations.length, 0)
    await view.posicion()
    assert.match(view.error(), /No pudimos confirmar el estado/); assert.equal(view.updates.length, 1)
    await view.reintentar()
    assert.deepEqual(requests.map(request => request.action), ['completada', 'completada', 'posicion', 'completada'])
    assert.equal(view.error(), ''); assert.equal(view.celebrations.length, 1)
  } finally { global.fetch = original }
})

test('desmarcar fallido también se conserva frente a autosave y al confirmar no dispara felicitación', async () => {
  const original = global.fetch
  try {
    const requests = respuestas([failure('No pudimos desmarcarla.'), response({ ...inicial, posicion_seg: 25, completada: true }), response(inicial)])
    const view = player(true); await view.marcar(); await view.posicion()
    assert.equal(view.error(), 'No pudimos desmarcarla.'); await view.reintentar()
    assert.deepEqual(requests[2], { action: 'completada', completada: false }); assert.equal(view.error(), ''); assert.equal(view.celebrations.length, 0)
  } finally { global.fetch = original }
})

test('sin marca manual pendiente, error de posición ofrece su reintento y no conserva éxito anterior contradictorio', async () => {
  const original = global.fetch
  try {
    const requests = respuestas([response({ ...inicial, posicion_seg: 25 }), failure('No se guardó el minuto.'), response({ ...inicial, posicion_seg: 25 })])
    const view = player(); await view.posicion(); assert.equal(view.estado(), 'Progreso guardado')
    await view.posicion(); assert.equal(view.error(), 'No se guardó el minuto.'); assert.equal(view.estado(), '')
    await view.reintentar(); assert.equal(requests[2].action, 'posicion'); assert.equal(view.error(), ''); assert.equal(view.estado(), 'Progreso guardado')
    assert.equal(view.celebrations.length, 0)
  } finally { global.fetch = original }
})
