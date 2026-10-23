/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports)
  return m.exports
}
function harness(file, props, deps) {
  let cursor = 0; const cells = [], celebrations = []
  const feedback = { default: () => null, useSuccessCelebration: () => ({ celebration: null, celebrate: value => celebrations.push(value) }) }
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], v => { cells[i] = typeof v === 'function' ? v(cells[i]) : v }] },
    useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] },
    useEffect() {}, useCallback: callback => callback,
  }
  const Component = load(file, { ...deps, react: hooks, '@/components/SuccessCelebration': feedback }).default
  const render = () => { cursor = 0; return Component(props) }
  function find(node, predicate) {
    if (!node || typeof node !== 'object') return null
    if (predicate(node)) return node
    for (const child of [node.props?.children].flat(Infinity)) { const found = find(child, predicate); if (found) return found }
    return null
  }
  return { props, cells, celebrations, feedback, render, find: p => find(render(), p), button: text => find(render(), n => n.type === 'button' && n.props.children === text) }
}
const claseId = '11111111-1111-4111-8111-111111111111'
const progreso = { clase_id: claseId, completada: true, posicion_seg: 0, duracion_seg: 0, actualizado_en: '2026-10-23T15:00:00Z' }
const tick = () => new Promise(resolve => setImmediate(resolve))
function player(completada = false) {
  const updates = [], errors = []
  const props = { clase: { id: claseId, titulo: 'Clase ficticia', modulo: 'Prueba', vimeo_url: null }, url: null, progreso: { ...progreso, completada }, esAdmin: false, onSiguiente() {}, onCerrar() {}, onProgreso: p => updates.push(p), onError: e => errors.push(e) }
  return { ...harness('src/app/classroom/ClassPlayer.tsx', props, { '@/lib/class-progress': load('src/lib/class-progress.ts'), '@/components/ClassMaterials': { default: () => null } }), updates, errors }
}
test('clase celebra únicamente una marca positiva confirmada y dentro del diálogo nativo', async () => {
  const original = global.fetch
  global.fetch = async () => ({ ok: true, json: async () => ({ progreso }) })
  try {
    const view = player(); assert.equal(view.celebrations.length, 0)
    assert.equal(view.render().type, 'dialog')
    assert.equal(view.find(n => n.type === view.feedback.default).props.placement, 'inline')
    view.button('Marcar como completada').props.onClick(); await tick()
    assert.equal(view.updates.length, 1); assert.equal(view.celebrations.length, 1)
    assert.equal(view.celebrations[0].key, `clase:${claseId}`)
    assert.match(view.celebrations[0].message, /marcada como completada/)
  } finally { global.fetch = original }
})
test('clase no felicita al desmarcar, con respuesta ajena/incompleta, ante error o al cargar', async () => {
  const original = global.fetch
  try {
    for (const [ok, data, completada] of [[true, { progreso: { ...progreso, completada: false } }, true], [false, { error: 'Sin conexión' }, false], [true, {}, false], [true, { progreso: { ...progreso, clase_id: 'ajena' } }, false]]) {
      global.fetch = async () => ({ ok, json: async () => data })
      const view = player(completada)
      view.button(completada ? '✓ Completada · desmarcar' : 'Marcar como completada').props.onClick(); await tick()
      assert.equal(view.celebrations.length, 0)
      if (!ok || !data.progreso || data.progreso.clase_id !== claseId) assert.equal(view.updates.length, 0)
    }
    const admin = player(); admin.props.esAdmin = true
    assert.equal(admin.button('Marcar como completada'), null); assert.equal(admin.celebrations.length, 0)
  } finally { global.fetch = original }
})
function resultado() {
  return harness('src/app/resultados/ResultadosCliente.tsx', { misResultados: [], productos: [], periodoInicial: '2026-10' }, {
    'next/link': { default: () => null }, 'next/navigation': { useRouter: () => ({ refresh() {} }) },
    '@/components/ArrowIcon': { default: () => null }, '@/components/NavigationIcon': { default: () => null }, '@/components/ResultsDashboard': { default: () => null }, '@/lib/results': load('src/lib/results.ts'),
  })
}
function prepararResultado(view) {
  view.button('Cargar resultado').props.onClick()
  view.find(n => n.type === 'textarea').props.onChange({ target: { value: 'Resultado de ejemplo para prueba local.' } })
  view.find(n => n.type === 'input' && n.props.type === 'number').props.onChange({ target: { value: '25' } })
  view.find(n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [new File(['fixture'], 'prueba.png', { type: 'image/png' })], value: '' } })
}
test('resultado felicita envío a revisión solo con el ID confirmado del mismo intento, nunca aprobación', async () => {
  const original = global.fetch
  try {
    global.fetch = async (_url, options) => { const datos = JSON.parse(options.body.get('datos')); return { ok: true, json: async () => ({ ok: true, id: datos.id }) } }
    const view = resultado(); prepararResultado(view)
    assert.equal(view.celebrations.length, 0)
    await view.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(view.celebrations.length, 1); assert.match(view.celebrations[0].message, /Flor lo va a revisar/)
    assert.ok(!/aprobado|ganaste/i.test(view.celebrations[0].message))
    assert.equal(view.find(n => n.type === 'form'), null)
  } finally { global.fetch = original }
})
test('resultado conserva formulario y no celebra respuestas fallidas o sin confirmación del intento', async () => {
  const original = global.fetch
  try {
    for (const data of [{ ok: false, error: 'No se guardó' }, { ok: true }, { ok: true, id: 'otro-intento' }]) {
      global.fetch = async () => ({ ok: true, json: async () => data })
      const view = resultado(); prepararResultado(view)
      await view.find(n => n.type === 'form').props.onSubmit({ preventDefault() {} })
      assert.equal(view.celebrations.length, 0)
      assert.ok(view.find(n => n.type === 'form')); assert.equal(view.find(n => n.type === 'textarea').props.value, 'Resultado de ejemplo para prueba local.')
    }
  } finally { global.fetch = original }
})
