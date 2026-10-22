/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts'), metrics = load('src/lib/metrics.ts')
const USER = '06bb7999-997b-49c8-ba80-b8d05bca4a84', ID = '85c4f8b8-21df-4772-9c7b-0ba2ea52efa5'
const fila = { id: ID, alumna_id: USER, texto: 'Preparar contenido', categoria: 'negocio_digital', fecha: '2026-10-22', completada: false, archivada: false, version: 1, creado_en: '2026-10-20T18:00:00Z', actualizada_en: '2026-10-20T18:00:00Z' }
function view({ tareas = [fila], fecha = fila.fecha, hoy = fila.fecha, errorCarga = false } = {}) {
  const cells = [], effects = []; let cursor = 0, refreshes = 0, pushes = 0, rows = tareas
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value }] },
    useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] },
    useEffect(effect) { effects.push(effect) },
  }
  const React = require('react')
  const Cliente = load('src/app/checklist/ChecklistCliente.tsx', { react: hooks, 'next/navigation': { useRouter: () => ({ refresh: () => refreshes++, push: () => pushes++ }) }, 'next/link': { default: ({ prefetch, ...props }) => { void prefetch; return React.createElement('a', props) } }, '@/lib/my-day': day, '@/components/ArrowIcon': { default: () => null }, '@/components/NavigationIcon': { default: () => null } }).default
  const render = () => { cursor = 0; effects.length = 0; return Cliente({ tareas: rows, semana: [], fecha, hoy, errorCarga }) }
  function all(tree, predicate) { if (!tree || typeof tree !== 'object') return []; return [...(predicate(tree) ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, predicate))] }
  const button = text => all(render(), n => n.type === 'button' && n.props.children === text)[0]
  const input = id => all(render(), n => n.type === 'input' && n.props.id === id)[0]
  const submit = () => all(render(), n => n.type === 'form')[1]?.props.onSubmit({ preventDefault() {} })
  const html = () => require('react-dom/server').renderToStaticMarkup(render())
  return { cells, effects, render, all, button, input, submit, html, rows: value => { rows = value }, refreshes: () => refreshes, pushes: () => pushes }
}
const frame = () => { const previous = global.requestAnimationFrame; global.requestAnimationFrame = fn => fn(); return () => { global.requestAnimationFrame = previous } }
const response = (row, ok = true, status = 200, error) => ({ ok, status, json: async () => ok ? { ok: true, tarea: row } : { error } })
test('reprogramación requiere confirmación, muestra destino y no cambia la tarea antes del guardado', async () => {
  const restore = frame(), before = global.fetch; let calls = 0
  global.fetch = async () => { calls++; throw new Error('no debería llamar') }
  try {
    const ui = view(); ui.button('Reprogramar').props.onClick()
    assert.equal(calls, 0); assert.equal(ui.input('fecha-reprogramar').props.value, '2026-10-23')
    assert.match(ui.html(), /viernes, 23 de octubre/); assert.match(ui.html(), /Va a quedar pendiente/)
    assert.equal(ui.all(ui.render(), n => n.props?.role === 'checkbox').length, 1)
    assert.equal(ui.input('fecha-mi-dia').props.disabled, true)
    assert.equal(ui.all(ui.render(), n => n.props?.['aria-label'] === 'Día siguiente')[0].props.disabled, true)
    ui.button('Cancelar reprogramación').props.onClick(); assert.equal(ui.input('fecha-reprogramar'), undefined); assert.equal(calls, 0); assert.equal(ui.input('fecha-mi-dia').props.disabled, false)
  } finally { restore(); global.fetch = before }
})
test('éxito mueve el mismo ID, sigue pendiente y deja enlace a la fecha elegida sin duplicar', async () => {
  const restore = frame(), before = global.fetch, entradas = []
  global.fetch = async (_, options) => { entradas.push({ method: options.method, ...JSON.parse(options.body) }); return response({ ...fila, fecha: '2026-11-01', version: 2 }) }
  try {
    const ui = view(); ui.button('Reprogramar').props.onClick(); ui.input('fecha-reprogramar').props.onChange({ target: { value: '2026-11-01' } }); await ui.submit()
    assert.deepEqual(entradas, [{ method: 'PATCH', texto: fila.texto, categoria: fila.categoria, fecha: '2026-11-01', completada: false, archivada: false, id: ID, version: 1 }])
    assert.equal(ui.input('fecha-reprogramar'), undefined); assert.equal(ui.all(ui.render(), n => n.props?.role === 'checkbox').length, 0)
    assert.match(ui.html(), /Tarea reprogramada para domingo, 1 de noviembre. Sigue pendiente./)
    assert.match(ui.html(), /href="\/checklist\?fecha=2026-11-01"/); assert.equal(ui.refreshes(), 1); assert.equal(ui.pushes(), 0)
  } finally { restore(); global.fetch = before }
})
test('errores conservan fecha y tarea, reintento conserva identidad y doble envío se bloquea', async () => {
  const restore = frame(), before = global.fetch; let finish, calls = 0; const inputs = []
  global.fetch = (_, options) => { calls++; inputs.push(JSON.parse(options.body)); return new Promise(resolve => { finish = resolve }) }
  try {
    const ui = view(); ui.button('Reprogramar').props.onClick(); ui.input('fecha-reprogramar').props.onChange({ target: { value: '2026-10-30' } })
    const first = ui.submit(), second = ui.submit(); assert.equal(calls, 1)
    finish(response(null, false, 503, 'No pudimos guardar')); await first; await second
    assert.equal(ui.input('fecha-reprogramar').props.value, '2026-10-30'); assert.equal(ui.all(ui.render(), n => n.props?.role === 'checkbox').length, 1)
    assert.match(ui.html(), /No pudimos guardar/); assert.equal(ui.refreshes(), 0)
    const retry = ui.submit(); finish(response({ ...fila, fecha: '2026-10-30', version: 2 })); await retry
    assert.equal(calls, 2); assert.equal(inputs[0].id, inputs[1].id); assert.equal(inputs[0].version, inputs[1].version)
  } finally { restore(); global.fetch = before }
})
test('409 bloquea reenvío hasta recargar y reabrir una versión más reciente', async () => {
  const restore = frame(), before = global.fetch; let calls = 0; const entradas = []
  global.fetch = async (_, options) => { entradas.push(JSON.parse(options.body)); calls++; return calls === 1 ? response(null, false, 409, 'La tarea cambió') : response({ ...fila, texto: 'Texto actualizado', fecha: '2026-10-23', version: 3 }) }
  try {
    const ui = view(); ui.button('Reprogramar').props.onClick(); await ui.submit(); await ui.submit()
    assert.equal(calls, 1); assert.match(ui.html(), /Primero recargá y reabrí/); assert.equal(ui.refreshes(), 1)
    ui.button('Reabrir tarea actualizada').props.onClick(); await ui.submit(); assert.equal(calls, 1)
    ui.rows([{ ...fila, texto: 'Texto actualizado', version: 2 }]); ui.button('Reabrir tarea actualizada').props.onClick(); await ui.submit()
    assert.equal(calls, 2); assert.equal(entradas[1].version, 2); assert.equal(entradas[1].texto, 'Texto actualizado')
  } finally { restore(); global.fetch = before }
})
test('respuesta incoherente no retira fila ni afirma éxito; ofrece recarga y bloquea confirmación', async () => {
  const restore = frame(), before = global.fetch
  try {
    for (const cambio of [{ id: 'otra' }, { alumna_id: 'otra' }, { texto: 'Otro texto' }, { categoria: 'trabajo' }, { fecha: fila.fecha }, { version: 1 }, { completada: true }, { archivada: true }, { creado_en: '2020-01-01' }]) {
      let calls = 0; global.fetch = async () => { calls++; return response({ ...fila, fecha: '2026-10-23', version: 2, ...cambio }) }
      const ui = view(); ui.button('Reprogramar').props.onClick(); await ui.submit(); await ui.submit()
      assert.equal(calls, 1); assert.equal(ui.all(ui.render(), n => n.props?.role === 'checkbox').length, 1)
      assert.match(ui.html(), /No pudimos confirmar la nueva fecha/); assert.ok(ui.button('Recargar tareas')); assert.ok(ui.button('Reabrir tarea actualizada')); assert.ok(!ui.html().includes('Tarea reprogramada para'))
    }
  } finally { restore(); global.fetch = before }
})
test('solo pendientes activas; fecha inválida/igual y borrador no se pierden ni envían', async () => {
  const restore = frame(), before = global.fetch; let calls = 0; global.fetch = async () => { calls++; throw new Error('no') }
  try {
    assert.equal(view({ tareas: [{ ...fila, completada: true }] }).button('Reprogramar'), undefined)
    const ui = view(); ui.input('tarea-mi-dia').props.onChange({ target: { value: 'Borrador en curso' } }); assert.equal(ui.button('Reprogramar').props.disabled, true); ui.button('Reprogramar').props.onClick(); assert.equal(ui.input('tarea-mi-dia').props.value, 'Borrador en curso'); assert.equal(ui.input('fecha-reprogramar'), undefined)
    const nuevo = view(); nuevo.button('Reprogramar').props.onClick()
    for (const value of [fila.fecha, '', '2026-02-30']) { nuevo.input('fecha-reprogramar').props.onChange({ target: { value } }); await nuevo.submit(); assert.equal(calls, 0) }
    const limite = view({ tareas: [{ ...fila, fecha: '2099-12-31' }], fecha: '2099-12-31', hoy: '2099-12-31' }); limite.button('Reprogramar').props.onClick(); await limite.submit(); assert.equal(calls, 0)
    assert.equal(nuevo.input('fecha-reprogramar').props.className.includes('text-base'), true); assert.match(nuevo.html(), /min-h-11/)
  } finally { restore(); global.fetch = before }
})
test('mañana usa el hoy Argentina recibido, no el día histórico seleccionado; salto de año correcto', () => {
  const restore = frame()
  try {
    const ui = view({ tareas: [{ ...fila, fecha: '2026-12-29' }], fecha: '2026-12-29', hoy: '2026-12-31' }); ui.button('Reprogramar').props.onClick(); assert.equal(ui.input('fecha-reprogramar').props.value, '2027-01-01')
    ui.all(ui.render(), n => n.type === 'button' && n.props.children === 'Hoy').at(-1).props.onClick(); assert.equal(ui.input('fecha-reprogramar').props.value, '2026-12-31')
    ui.button('Mañana').props.onClick(); assert.equal(ui.input('fecha-reprogramar').props.value, '2027-01-01')
  } finally { restore() }
})
test('advertencia al cerrar/recargar se activa solo al reprogramar y limpia su listener', () => {
  const restore = frame(), previous = global.window, events = []
  global.window = { addEventListener: (name, fn) => events.push(['add', name, fn]), removeEventListener: (name, fn) => events.push(['remove', name, fn]) }
  try {
    const ui = view(); ui.render(); assert.equal(ui.effects.at(-1)(), undefined); assert.equal(events.length, 0)
    ui.button('Reprogramar').props.onClick(); ui.render(); const cleanup = ui.effects.at(-1)()
    assert.equal(events[0][1], 'beforeunload'); let prevented = false; const event = { preventDefault() { prevented = true } }; events[0][2](event)
    assert.equal(prevented, true); assert.equal(event.returnValue, ''); cleanup(); assert.equal(events[1][0], 'remove'); assert.equal(events[1][2], events[0][2])
  } finally { restore(); global.window = previous }
})

function apiFixture({ lost = false } = {}) {
  let row = { ...fila }, writes = 0
  const filters = []
  const db = { auth: { getUser: async () => ({ data: { user: { id: USER } } }) }, from: table => {
    assert.equal(table, 'checklist_tareas'); let op = 'read', patch, condiciones = {}
    const q = { select: () => q, eq: (key, value) => { condiciones[key] = value; filters.push([key, value]); return q }, update: value => { op = 'update'; patch = value; return q }, maybeSingle: async () => {
      if (!row || Object.entries(condiciones).some(([key, value]) => row[key] !== value)) return { data: null, error: null }
      if (op === 'update') { writes++; row = { ...row, ...patch, version: row.version + 1 }; if (lost) return { data: null, error: { code: 'response_lost' } } }
      return { data: { ...row }, error: null }
    } }; return q
  } }
  const api = load('src/app/api/checklist/route.ts', { 'next/server': { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status ?? 200 }) } }, '@/lib/supabase/server': { createClient: async () => db }, '@/lib/my-day-server': { permisoMiDia: async () => ({ permitido: true, error: false }) }, '@/lib/my-day': day, '@/lib/metrics': metrics })
  const call = payload => api.PATCH({ headers: new Headers({ origin: 'https://app.test' }), nextUrl: { origin: 'https://app.test' }, json: async () => payload })
  return { call, filters, writes: () => writes, row: () => row, change: value => { row = { ...row, ...value } } }
}
const mover = { id: ID, version: 1, texto: fila.texto, categoria: fila.categoria, fecha: '2026-10-23', completada: false, archivada: false }
test('API existente persiste solo fecha del mismo ID/propietaria con versión y reintento idempotente', async () => {
  const a = apiFixture(); assert.equal((await a.call(mover)).status, 200); assert.equal((await a.call(mover)).status, 200)
  assert.equal(a.writes(), 1); assert.equal(a.row().id, ID); assert.equal(a.row().alumna_id, USER); assert.equal(a.row().creado_en, fila.creado_en); assert.equal(a.row().fecha, mover.fecha); assert.equal(a.row().completada, false); assert.equal(a.row().version, 2)
  assert.ok(a.filters.some(([key, value]) => key === 'version' && value === 1)); assert.ok(a.filters.filter(([key]) => key === 'alumna_id').every(([, value]) => value === USER))
  const lost = apiFixture({ lost: true }); assert.equal((await lost.call(mover)).body.ok, true); assert.equal(lost.writes(), 1)
  const conflict = apiFixture(); conflict.change({ version: 2, texto: 'Cambió en otra pestaña' }); assert.equal((await conflict.call(mover)).status, 409); assert.equal(conflict.writes(), 0)
  const invalid = apiFixture(); assert.equal((await invalid.call({ ...mover, fecha: '2026-02-30' })).status, 400); assert.equal(invalid.writes(), 0)
})
