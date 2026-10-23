/* eslint-disable @typescript-eslint/no-require-imports */
// Hooks/navegador simulados: verifican comportamiento, no sustituyen QA visual.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const rank = load('src/lib/personal-rank.ts', { './my-day': load('src/lib/my-day.ts') })
const datos = { fecha: '2026-10-23', desde: '2026-09-24', clases: { estado: 'lista', datos: { completadas: 3, disponibles: 6, programas: 1 } }, dia: { estado: 'lista', datos: { tareas: 10, dias: 3, racha: 0 } }, metricas: { estado: 'error' } }
function ui(nombre = 'default', props = { datos }, extra = {}) {
  const cells = [], pending = [], cleanups = new Map(); let cursor = 0, currentProps = props
  const hooks = {
    useState: initial => { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value }] },
    useRef: initial => { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] },
    useEffect: (effect, deps) => { const i = cursor++, anterior = cells[i]; if (!anterior || deps.some((d, n) => !Object.is(d, anterior[n]))) { cells[i] = deps; pending.push(() => { cleanups.get(i)?.(); cleanups.set(i, effect()) }) } },
  }
  const Component = load('src/components/PersonalRankCard.tsx', { react: hooks, '@/lib/personal-rank': { ...rank, ...extra } })[nombre]
  const render = () => { cursor = 0; return Component(currentProps) }
  function all(node, predicate) { if (!node || typeof node !== 'object') return []; return [...(predicate(node) ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => all(child, predicate))] }
  function text(node) { if (typeof node === 'string' || typeof node === 'number') return String(node); if (!node || typeof node !== 'object') return ''; return [node.props?.children].flat(Infinity).map(text).join('') }
  return { render, html: () => renderToStaticMarkup(render()), button: title => all(render(), n => n.type === 'button').find(n => text(n) === title), canvas: () => all(render(), n => n.type === 'canvas')[0], props: next => { currentProps = next }, flush: async () => { while (pending.length) pending.shift()(); await Promise.resolve(); await Promise.resolve() } }
}
test('tarjeta muestra nivel y requisitos en una superficie sólida; errores/bloqueos no crean rangos o exportaciones', () => {
  const html = ui().html()
  assert.match(html, /Socia TOP/); assert.match(html, /¡Qué lindo/); assert.match(html, /bg-\[#FAF7F3\]/); assert.ok(!html.includes('sd-glass'))
  assert.match(html, /sin puntos permanentes/); assert.match(html, /no un ranking|ni un ranking/)
  for (const estado of ['error', 'bloqueada']) {
    const view = ui('default', { datos: { ...datos, dia: { estado } } }), markup = view.html()
    assert.ok(!markup.includes('Socia TOP')); assert.ok(!markup.includes('Preparar mi historia'))
    assert.ok(markup.includes(estado === 'error' ? 'No pudimos actualizar' : 'necesita acceso'))
  }
  const inicio = ui('default', { datos: { ...datos, clases: { estado: 'lista', datos: { completadas: 0, disponibles: 6, programas: 0 } }, dia: { estado: 'lista', datos: { tareas: 0, dias: 0, racha: 0 } } } })
  assert.equal(inicio.button('Preparar mi historia').props.disabled, true)
  assert.match(inicio.html(), /primera clase o tarea/)
})
function navegador() {
  const saved = new Map(['document', 'navigator', 'getComputedStyle', 'setTimeout'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]))
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL
  const clicks = [], revocados = [], shares = [], draws = []
  const anchor = { click() { clicks.push({ href: this.href, download: this.download }) } }
  const document = { fonts: { ready: Promise.resolve() }, documentElement: {}, createElement: tipo => { assert.equal(tipo, 'a'); return anchor } }
  const navigator = { canShare: () => false, share: async payload => { shares.push(payload) } }
  Object.defineProperty(globalThis, 'document', { configurable: true, value: document }); Object.defineProperty(globalThis, 'navigator', { configurable: true, value: navigator })
  Object.defineProperty(globalThis, 'getComputedStyle', { configurable: true, value: () => ({ fontFamily: 'Poppins local', getPropertyValue: () => 'Playfair local' }) })
  Object.defineProperty(globalThis, 'setTimeout', { configurable: true, value: callback => { callback(); return 1 } })
  URL.createObjectURL = () => 'blob:qa-local'; URL.revokeObjectURL = url => revocados.push(url)
  const canvas = { width: 0, height: 0, getContext: () => ({}), toBlob: callback => callback(new Blob(['PNG ficticio para probar callbacks'], { type: 'image/png' })) }
  return { canvas, document, navigator, clicks, revocados, shares, draws, cleanup: () => { URL.createObjectURL = create; URL.revokeObjectURL = revoke; for (const [k, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, k, descriptor); else delete globalThis[k] } } }
}
test('preparación es local, espera fuentes y exporta solo proyección; compartir sin soporte descarga y revoca URL', async () => {
  const browser = navegador()
  try {
    const data = rank.datosImagenRango(datos), view = ui('HistoriaRango', { data }, { dibujarImagenRango: (_ctx, projection) => browser.draws.push(projection) })
    view.canvas().props.ref.current = browser.canvas
    assert.equal(view.button('Descargar PNG').props.disabled, true)
    await view.flush()
    assert.equal(browser.canvas.width, 1080); assert.equal(browser.canvas.height, 1920)
    assert.deepEqual(browser.draws, [data]); assert.equal(browser.clicks.length, 0); assert.equal(browser.shares.length, 0)
    assert.equal(view.button('Descargar PNG').props.disabled, false)
    await view.button('Compartir imagen').props.onClick()
    await Promise.resolve()
    assert.equal(browser.clicks.length, 1); assert.equal(browser.clicks[0].download, 'mi-nivel-socias-digitales.png')
    assert.deepEqual(browser.revocados, ['blob:qa-local']); assert.equal(browser.shares.length, 0)
    assert.ok(!read('src/components/PersonalRankCard.tsx').includes('fetch('))
  } finally { browser.cleanup() }
})
test('fallo de canvas permite reintentar sin perder datos; una imagen anterior no se descarga con nuevos conteos', async () => {
  const browser = navegador()
  try {
    browser.canvas.getContext = () => null
    const data = rank.datosImagenRango(datos), view = ui('HistoriaRango', { data }, { dibujarImagenRango() {} })
    view.canvas().props.ref.current = browser.canvas; await view.flush()
    assert.match(view.html(), /No pudimos preparar/); assert.equal(view.button('Descargar PNG').props.disabled, true)
    browser.canvas.getContext = () => ({})
    view.button('Reintentar imagen').props.onClick(); view.render(); await view.flush()
    assert.equal(view.button('Descargar PNG').props.disabled, false)
    view.props({ data: { ...data, tareas: 11 } })
    assert.equal(view.button('Descargar PNG').props.disabled, true)
    assert.equal(browser.clicks.length, 0)
  } finally { browser.cleanup() }
})
test('Web Share solo se abre por acción explícita y entrega un archivo sin identidad ni publicación automática', async () => {
  const browser = navegador()
  try {
    browser.navigator.canShare = () => true
    const data = rank.datosImagenRango(datos), view = ui('HistoriaRango', { data }, { dibujarImagenRango() {} })
    view.canvas().props.ref.current = browser.canvas; await view.flush()
    assert.equal(browser.shares.length, 0)
    view.button('Compartir imagen').props.onClick(); await Promise.resolve(); await Promise.resolve()
    assert.equal(browser.shares.length, 1)
    assert.deepEqual(Object.keys(browser.shares[0]).sort(), ['files', 'title'])
    assert.equal(browser.shares[0].files[0].name, 'mi-nivel-socias-digitales.png')
    assert.equal(browser.clicks.length, 0); assert.match(view.html(), /No publicamos nada automáticamente/)
  } finally { browser.cleanup() }
})
test('un blob nulo no habilita exportación; cancelar el selector nativo no se presenta como envío ni error', async () => {
  const browser = navegador()
  try {
    browser.canvas.toBlob = callback => callback(null)
    const data = rank.datosImagenRango(datos), view = ui('HistoriaRango', { data }, { dibujarImagenRango() {} })
    view.canvas().props.ref.current = browser.canvas; await view.flush()
    assert.match(view.html(), /No pudimos generar el PNG/)
    assert.equal(view.button('Descargar PNG').props.disabled, true); assert.equal(browser.clicks.length, 0)
    browser.canvas.toBlob = callback => callback(new Blob(['fixture'], { type: 'image/png' }))
    view.button('Reintentar imagen').props.onClick(); view.render(); await view.flush()
    browser.navigator.canShare = () => true
    browser.navigator.share = async () => { throw new DOMException('Cancelado', 'AbortError') }
    view.button('Compartir imagen').props.onClick(); await Promise.resolve(); await Promise.resolve()
    assert.equal(browser.clicks.length, 0)
    assert.ok(!view.html().includes('No pudimos abrir Compartir')); assert.ok(!view.html().includes('Usaste el selector'))
  } finally { browser.cleanup() }
})
