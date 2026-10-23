/* eslint-disable @typescript-eslint/no-require-imports */
// Hooks, responses and timers are isolated fixtures, not real student writes.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}, timers = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', 'setTimeout', 'clearTimeout', code)(name => name in deps ? deps[name] : require(name), m, m.exports, timers.setTimeout ?? setTimeout, timers.clearTimeout ?? clearTimeout)
  return m.exports
}
const day = load('src/lib/my-day.ts'), progress = load('src/lib/class-progress.ts')
const planner = load('src/lib/study-planner.ts', { './my-day': day })
const USER = '06bb7999-997b-49c8-ba80-b8d05bca4a84', TODAY = '2026-10-23'
const first = { id: '11111111-1111-4111-8111-111111111111', titulo: 'Primer paso', programa: 'Bienvenida', seccion: 'Clases', motivo: 'empezar', posicionSeg: null }
const second = { id: '22222222-2222-4222-8222-222222222222', titulo: 'Nicho y producto', programa: 'Desafío Socias', seccion: 'Material de apoyo', motivo: 'continuar', posicionSeg: 87 }
const plan = { estado: 'listo', opciones: [first, second] }
function all(tree, predicate) { if (!tree || typeof tree !== 'object') return []; return [...(predicate(tree) ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, predicate))] }
function text(tree) { if (typeof tree === 'string' || typeof tree === 'number') return String(tree); return !tree || typeof tree !== 'object' ? '' : [tree.props?.children].flat(Infinity).map(text).join('') }
function view(extra = {}) {
  const cells = [], pending = new Set(), cleanups = new Map(), timers = new Map(), borradores = [], guardadas = []
  let cursor = 0, timerId = 0, props = extra
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value }] },
    useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] },
    useEffect(effect, deps) { const i = cursor++, previous = cells[i]; if (!previous || deps.some((value, n) => !Object.is(value, previous.deps[n]))) { cells[i] = { effect, deps }; pending.add(i) } },
  }
  const Component = load('src/components/StudyPlannerClient.tsx', { react: hooks, 'next/link': { default: ({ prefetch, ...rest }) => { void prefetch; return React.createElement('a', rest) } }, './ArrowIcon': { default: () => null }, './NavigationIcon': { default: () => null }, '@/lib/my-day': day, '@/lib/class-progress': progress, '@/lib/study-planner': planner }, { setTimeout: (fn, delay) => { const id = ++timerId; timers.set(id, { fn, delay }); return id }, clearTimeout: id => timers.delete(id) }).default
  const render = () => { cursor = 0; return Component({ plan, fechaInicial: TODAY, hoy: TODAY, alumnaId: USER, onBorradorChange: value => borradores.push(value), onGuardada: value => guardadas.push(value), ...props }) }
  const find = predicate => all(render(), predicate)[0]
  const button = label => find(node => node.type === 'button' && text(node).trim() === label)
  const flush = () => { render(); for (const i of pending) { cleanups.get(i)?.(); cleanups.set(i, cells[i].effect()) } pending.clear() }
  return { cells, timers, borradores, guardadas, render, find, button, flush, html: () => renderToStaticMarkup(render()), setProps: value => { props = { ...props, ...value } }, unmount: () => { for (const cleanup of cleanups.values()) cleanup?.() }, open: () => button('Planificar una clase').props.onClick(), date: () => find(node => node.type === 'input' && node.props.type === 'date'), name: () => find(node => node.type === 'input' && node.props.maxLength === 300), select: () => find(node => node.type === 'select'), fieldset: () => find(node => node.type === 'fieldset'), submit: () => find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }) }
}
const ack = (body, changes = {}) => ({ ok: true, tarea: { ...body, alumna_id: USER, version: 1, creado_en: '2026-10-23T16:00:00Z', actualizada_en: '2026-10-23T16:00:00Z', ...changes } })
const response = (body, ok = true, status = 200) => ({ ok, status, json: async () => body })
function network(impl) {
  const original = global.fetch, requests = []
  global.fetch = async (url, options) => { const request = { url, options, body: JSON.parse(options.body) }; requests.push(request); return impl(request, requests.length) }
  return { requests, restore: () => { global.fetch = original } }
}
test('abrir, elegir programa/fecha y cancelar no guarda ni modifica clases; campos móviles legibles', () => {
  const n = network(() => { throw new Error('No debe consultar') })
  try {
    const ui = view({ fechaInicial: '2026-10-01' }); assert.equal(n.requests.length, 0); assert.equal(ui.find(node => node.type === 'form'), undefined)
    ui.open(); assert.deepEqual(ui.borradores, [true]); assert.equal(ui.date().props.value, TODAY)
    ui.select().props.onChange({ target: { value: second.id } }); assert.equal(ui.name().props.value, planner.textoTareaEstudio(second)); assert.match(ui.html(), /1:27/)
    ui.date().props.onChange({ target: { value: '2026-10-26' } }); ui.name().props.onChange({ target: { value: 'Mi ratito para estudiar' } })
    assert.match(ui.html(), /Completarla no marca el video como visto/); assert.equal(ui.date().props.className.includes('text-base'), true)
    ui.button('Cancelar plan').props.onClick(); assert.deepEqual(ui.borradores, [true, false]); assert.equal(n.requests.length, 0); assert.equal(ui.guardadas.length, 0)
  } finally { n.restore() }
})
test('validación impide fecha pasada/inválida o texto vacío antes de enviar; permisos/catálogo no se inventan', async () => {
  const n = network(() => { throw new Error('No debe consultar') })
  try {
    const ui = view(); ui.open()
    for (const fecha of ['', '2026-02-30', '2026-10-22']) { ui.date().props.onChange({ target: { value: fecha } }); await ui.submit(); assert.match(ui.html(), /Elegí hoy o una fecha futura/); assert.equal(ui.guardadas.length, 0) }
    ui.date().props.onChange({ target: { value: TODAY } }); ui.name().props.onChange({ target: { value: ' ' } }); await ui.submit(); assert.match(ui.html(), /Usá un texto/)
    const bloqueado = view({ bloqueada: true }); assert.equal(bloqueado.button('Planificar una clase').props.disabled, true); bloqueado.open(); assert.equal(bloqueado.find(node => node.type === 'form'), undefined)
    for (const estado of [{ estado: 'error', opciones: [] }, { estado: 'listo', opciones: [] }]) { const otra = view({ plan: estado }); assert.equal(otra.button('Planificar una clase'), undefined); assert.equal(otra.find(node => node.type === 'form'), undefined) }
    assert.equal(n.requests.length, 0)
  } finally { n.restore() }
})
test('confirmación crea solo tarea normal pendiente: callback y enlace llegan únicamente tras ACK exacto', async () => {
  const n = network(({ body }) => response(ack(body)))
  try {
    const ui = view(); ui.open(); assert.equal(n.requests.length, 0)
    ui.date().props.onChange({ target: { value: '2026-10-26' } }); ui.name().props.onChange({ target: { value: '  Estudiar   con calma  ' } })
    await ui.submit()
    assert.equal(n.requests.length, 1); const request = n.requests[0]
    assert.equal(request.url, '/api/checklist'); assert.equal(request.options.method, 'POST')
    assert.deepEqual(Object.keys(request.body).sort(), ['id', 'version', 'texto', 'fecha', 'categoria', 'completada', 'archivada'].sort())
    assert.equal(request.body.texto, 'Estudiar con calma'); assert.equal(request.body.categoria, 'negocio_digital'); assert.equal(request.body.version, null); assert.equal(request.body.completada, false); assert.equal(request.body.archivada, false)
    assert.equal(ui.guardadas.length, 1); assert.equal(ui.guardadas[0].alumna_id, USER); assert.deepEqual(ui.borradores, [true, false])
    assert.match(ui.html(), /La tarea quedó pendiente/); assert.match(ui.html(), /href="\/checklist\?fecha=2026-10-26"/)
    assert.equal(ui.find(node => node.type === 'form'), undefined); assert.equal(ui.timers.size, 0)
  } finally { n.restore() }
})
test('doble clic queda bloqueado de inmediato; envío congela campos y cancelación hasta confirmar', async () => {
  let finish
  const n = network(request => new Promise(resolve => { finish = () => resolve(response(ack(request.body))) }))
  try {
    const ui = view(); ui.open(); const first = ui.submit(), double = ui.submit()
    assert.equal(n.requests.length, 1); assert.equal(ui.fieldset().props.disabled, true); assert.equal(ui.button('Cancelar plan').props.disabled, true)
    assert.equal([...ui.timers.values()][0].delay, 20_000); assert.equal(ui.guardadas.length, 0)
    finish(); await first; await double; assert.equal(ui.guardadas.length, 1); assert.equal(ui.timers.size, 0)
  } finally { n.restore() }
})
test('red, JSON inválido y ACK incoherentes conservan UUID+snapshot y congelan edición para reintentar', async () => {
  const failures = [() => { throw new TypeError('Sin conexión') }, () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError('JSON inválido') } }), () => response(null), ({ body }) => response(ack(body, { id: crypto.randomUUID() })), ({ body }) => response(ack(body, { alumna_id: crypto.randomUUID() })), ({ body }) => response(ack(body, { texto: 'Otra tarea' })), ({ body }) => response(ack(body, { categoria: 'pagos' })), ({ body }) => response(ack(body, { fecha: '2026-10-27' })), ({ body }) => response(ack(body, { completada: true })), ({ body }) => response(ack(body, { archivada: true })), ({ body }) => response(ack(body, { version: 0 })), ({ body }) => response(ack(body, { creado_en: 'no es fecha' })), ({ body }) => response({ ...ack(body), ok: false })]
  for (const fail of failures) {
    const n = network((request, count) => count === 1 ? fail(request) : response(ack(request.body, { version: 3 })))
    try {
      const ui = view(); ui.open(); ui.date().props.onChange({ target: { value: '2026-10-26' } }); await ui.submit()
      assert.equal(ui.guardadas.length, 0); assert.deepEqual(ui.borradores, [true]); assert.equal(ui.fieldset().props.disabled, true)
      assert.match(ui.html(), /Reintentá confirmar el mismo envío/); assert.ok(ui.button('Reintentar confirmación'))
      ui.button('Cerrar sin volver a enviar').props.onClick(); ui.button('Revisar envío pendiente').props.onClick()
      assert.equal(ui.fieldset().props.disabled, true); assert.equal(ui.date().props.value, '2026-10-26')
      await ui.submit()
      assert.deepEqual(n.requests[1].body, n.requests[0].body); assert.equal(ui.guardadas.length, 1); assert.equal(ui.guardadas[0].version, 3)
      assert.equal(n.requests.every(request => request.url === '/api/checklist' && request.options.method === 'POST'), true)
    } finally { n.restore() }
  }
})
test('timeout aborta a los20s y conserva el mismo intento: abortar no equivale a que no se guardó', async () => {
  const n = network((request, count) => count === 1 ? new Promise((_resolve, reject) => request.options.signal.addEventListener('abort', () => reject(new DOMException('Tiempo agotado', 'AbortError')))) : response(ack(request.body)))
  try {
    const ui = view(); ui.open(); const promise = ui.submit(); const [id, timeout] = [...ui.timers][0]
    assert.equal(timeout.delay, 20_000); ui.timers.delete(id); timeout.fn(); await promise
    assert.equal(ui.guardadas.length, 0); assert.equal(ui.fieldset().props.disabled, true)
    await ui.submit(); assert.deepEqual(n.requests[0].body, n.requests[1].body); assert.equal(ui.guardadas.length, 1); assert.equal(ui.timers.size, 0)
  } finally { n.restore() }
})
test('401/403/409 bloquean el reenvío con o sin JSON, incluso al cerrar y volver a abrir', async () => {
  for (const status of [401, 403, 409]) for (const json of [true, false]) {
    const n = network(() => json ? response({ error: 'Revisá tu cuenta y agenda.' }, false, status) : { ok: false, status, json: async () => { throw new SyntaxError('Respuesta no JSON') } })
    try {
      const ui = view(); ui.open(); await ui.submit()
      assert.equal(ui.button('Reintentar confirmación').props.disabled, true, `Debe bloquear HTTP${status} JSON=${json}`)
      await ui.submit(); assert.equal(n.requests.length, 1)
      ui.button('Cerrar sin volver a enviar').props.onClick(); ui.button('Revisar envío pendiente').props.onClick(); await ui.submit()
      assert.equal(n.requests.length, 1); assert.equal(ui.guardadas.length, 0); assert.match(ui.html(), /volver a comprobar tu cuenta/)
    } finally { n.restore() }
  }
})
test('beforeunload solo acompaña formulario abierto y limpia listener al cancelar, confirmar o desmontar', async () => {
  const previous = global.window, events = []
  global.window = { addEventListener: (name, fn) => events.push(['add', name, fn]), removeEventListener: (name, fn) => events.push(['remove', name, fn]) }
  const n = network(({ body }) => response(ack(body)))
  try {
    const ui = view(); ui.flush(); assert.equal(events.length, 0)
    ui.open(); ui.flush(); assert.equal(events[0][1], 'beforeunload')
    let prevented = false; const event = { preventDefault() { prevented = true } }; events[0][2](event); assert.equal(prevented, true); assert.equal(event.returnValue, '')
    ui.button('Cancelar plan').props.onClick(); ui.flush(); assert.equal(events[1][0], 'remove'); assert.equal(events[1][2], events[0][2])
    ui.open(); ui.flush(); await ui.submit(); ui.flush(); assert.equal(events[3][0], 'remove')
    ui.button('Planificar otro paso').props.onClick(); ui.flush(); ui.unmount(); assert.equal(events[5][0], 'remove'); assert.equal(events[5][2], events[4][2])
  } finally { n.restore(); global.window = previous }
})
