/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const ROOT = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8')
function load(deps = {}, timers = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(read('src/components/SuccessCelebration.tsx'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', code)(name => name.endsWith('.css') ? {} : name in deps ? deps[name] : require(name), m, m.exports, timers.setTimeout ?? setTimeout, timers.clearTimeout ?? clearTimeout)
  return m.exports
}
function hook() {
  const cells = [], effects = [], timers = new Map(), cancelled = []
  let cursor = 0, nextTimer = 0, updates = 0
  const React = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], value => { updates++; cells[i] = value }] },
    useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] },
    useEffect(effect) { const i = cursor++; if (!(i in cells)) { cells[i] = true; effects.push(effect) } },
    useCallback(callback) { const i = cursor++; if (!(i in cells)) cells[i] = callback; return cells[i] },
  }
  const { useSuccessCelebration } = load({ react: React }, { setTimeout: (fn, delay) => { const id = ++nextTimer; timers.set(id, { fn, delay }); return id }, clearTimeout: id => { cancelled.push(id); timers.delete(id) } })
  const render = () => { cursor = 0; return useSuccessCelebration() }
  const first = render()
  let cleanup
  return { first, render, timers, cancelled, updates: () => updates, mount: () => { cleanup = effects[0]() }, unmount: () => cleanup?.(), fire: () => { for (const [id, timer] of [...timers]) { timers.delete(id); timer.fn() } } }
}
const event = (key = 'tarea:1') => ({ key, title: '¡Un paso más, Socia!', message: 'Tu tarea quedó completada.' })
test('celebración solo se dispara montada y mantiene callbacks estables entre renders', () => {
  const ui = hook()
  assert.equal(ui.first.celebration, null)
  ui.first.celebrate(event()); assert.equal(ui.timers.size, 0)
  ui.mount(); ui.first.celebrate(event())
  const actual = ui.render()
  assert.deepEqual(actual.celebration, { ...event(), variant: 'confetti' })
  assert.equal(actual.celebrate, ui.first.celebrate); assert.equal(actual.dismiss, ui.first.dismiss)
  assert.equal([...ui.timers.values()][0].delay, 3500)
  ui.unmount()
})
test('deduplica una clave sin prolongar el aviso, admite otra y mantiene un máximo de 64 claves', () => {
  const ui = hook(); ui.mount()
  ui.first.celebrate(event()); const firstTimer = [...ui.timers.keys()][0]
  ui.first.celebrate(event()); assert.deepEqual([...ui.timers.keys()], [firstTimer])
  assert.equal(ui.updates(), 1)
  for (let i = 2; i <= 65; i++) ui.first.celebrate(event(`tarea:${i}`))
  assert.equal(ui.timers.size, 1); assert.equal(ui.cancelled.length, 64)
  ui.first.celebrate(event('tarea:2')); assert.equal(ui.updates(), 65)
  ui.first.celebrate(event('tarea:1')); assert.equal(ui.updates(), 66)
  ui.unmount()
})
test('descarta entradas vacías y limpia temporizador al reemplazar, cerrar y desmontar', () => {
  const ui = hook(); ui.mount()
  for (const input of [{ ...event(), key: ' ' }, { ...event(), title: '' }, { ...event(), message: '\n' }]) ui.first.celebrate(input)
  assert.equal(ui.updates(), 0)
  ui.first.celebrate(event()); ui.first.dismiss()
  assert.equal(ui.render().celebration, null); assert.equal(ui.timers.size, 0)
  ui.first.celebrate({ ...event('metrica:1:1'), variant: 'gentle' })
  assert.equal(ui.render().celebration.variant, 'gentle')
  ui.fire(); assert.equal(ui.render().celebration, null)
  ui.first.celebrate(event('tarea:2')); const pending = [...ui.timers.values()][0].fn
  ui.unmount(); const updates = ui.updates()
  assert.equal(ui.timers.size, 0)
  pending(); ui.first.celebrate(event('tarea:3')); ui.first.dismiss()
  assert.equal(ui.updates(), updates)
})
test('render conserva un único canal polite; confetti decorativo contiene 18 papeles y no agrega controles', () => {
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
  const { SuccessCelebration } = load()
  const markup = celebration => renderToStaticMarkup(React.createElement(SuccessCelebration, { celebration }))
  const empty = markup(null)
  assert.match(empty, /role="status" aria-live="polite" aria-atomic="true"/)
  assert.ok(!empty.includes('sd-success-card'))
  const html = markup({ ...event(), variant: 'confetti' })
  assert.equal((html.match(/class="sd-success-paper"/g) ?? []).length, 18)
  assert.equal((html.match(/role="status"/g) ?? []).length, 1)
  assert.match(html, /sd-success-celebration--floating" aria-hidden="true"/)
  assert.ok(!/<button|<audio|<video|tabindex=|autoplay/i.test(html))
  const inline = renderToStaticMarkup(React.createElement(SuccessCelebration, { celebration: { ...event(), variant: 'gentle', message: '<script>texto largo</script>' }, placement: 'inline' }))
  assert.ok(inline.includes('sd-success-celebration--inline')); assert.ok(!inline.includes('sd-success-paper'))
  assert.ok(inline.includes('&lt;script&gt;')); assert.ok(!inline.includes('<script>'))
})
test('estilos respetan safe area, ancho móvil, puntero libre y movimiento reducido estático', () => {
  const css = read('src/components/success-celebration.css')
  assert.match(css, /top: calc\(88px \+ env\(safe-area-inset-top, 0px\)\)/)
  assert.match(css, /max-width: calc\(100vw - 32px - env\(safe-area-inset-left, 0px\) - env\(safe-area-inset-right, 0px\)\)/)
  assert.match(css, /pointer-events: none/); assert.match(css, /overflow-wrap: anywhere/)
  assert.match(css, /animation: sd-success-paper-fall 1400ms/)
  const reduce = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'))
  assert.match(reduce, /\.sd-success-card \{ animation: none; \}/)
  assert.match(reduce, /\.sd-success-papers \{ display: none; \}/)
  assert.match(reduce, /\.sd-success-paper \{ animation: none; \}/)
  assert.ok(!/!important|100vw;|overflow-x: hidden|filter:|box-shadow:/.test(css))
})
