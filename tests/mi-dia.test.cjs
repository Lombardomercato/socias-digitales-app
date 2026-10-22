const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const ROOT = path.resolve(__dirname, '..')
function cargar(file, deps = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(ROOT, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(n => {
    if (n in deps) return deps[n]
    if (n === 'server-only') return {}
    if (n === '@/lib/my-day' || n === './my-day') return helpers
    if (n === '@/lib/metrics') return metricas
    return require(n)
  }, m, m.exports)
  return m.exports
}
const helpers = cargar('src/lib/my-day.ts')
const metricas = cargar('src/lib/metrics.ts')
const USER = '06bb7999-997b-49c8-ba80-b8d05bca4a84'
const ID = '85c4f8b8-21df-4772-9c7b-0ba2ea52efa5'
const base = { id: ID, version: null, texto: '  Preparar   contenido  ', categoria: 'negocio_digital', fecha: '2026-10-13', completada: false, archivada: false }
const fila = { ...helpers.validarTarea(base, 'crear').datos, id: ID, alumna_id: USER, version: 1, creado_en: '2026-10-13T18:00:00Z', actualizada_en: '2026-10-13T18:00:00Z' }
test('tareas: normaliza texto, mantiene categorías y valida fecha/estados sin permitir permisos', () => {
  assert.equal(helpers.validarTarea(base, 'crear').datos.texto, 'Preparar contenido')
  for (const categoria of Object.keys(helpers.CATEGORIAS_DIA)) assert.equal(helpers.validarTarea({ ...base, categoria }, 'crear').datos.categoria, categoria)
  for (const cambio of [{ id: 'no' }, { texto: ' ' }, { texto: 'a'.repeat(301) }, { categoria: 'otra' }, { categoria: 'toString' }, { fecha: '2026-02-30' }, { fecha: '2026-13-01' }, { fecha: '2000-02-30' }, { fecha: '2026-01-00' }, { completada: 'true' }, { completada: true }, { archivada: true }, { version: 2 }, { alumna_id: 'otra' }, { rol: 'admin' }]) assert.throws(() => helpers.validarTarea({ ...base, ...cambio }, 'crear'))
  assert.throws(() => helpers.validarTarea(base, 'editar'))
  assert.equal(helpers.validarTarea({ ...base, version: 1, completada: true }, 'editar').datos.completada, true)
  assert.equal(helpers.validarTarea({ ...base, fecha: '2028-02-29' }, 'crear').datos.fecha, '2028-02-29')
  assert.equal(helpers.validarTarea({ ...base, fecha: '2027-01-01' }, 'crear').datos.fecha, '2027-01-01')
})
test('fechas usan Argentina; semana cruza mes/año y no depende de la zona del navegador', () => {
  assert.equal(metricas.fechaArgentina(new Date('2026-10-14T01:30:00Z')), '2026-10-13')
  assert.equal(helpers.moverDia('2026-12-31', 1), '2027-01-01')
  assert.equal(helpers.moverDia('2028-03-01', -1), '2028-02-29')
  assert.deepEqual(helpers.semanaDia('2027-01-01'), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03'])
  assert.equal(helpers.nombreDia('2026-10-13'), 'martes, 13 de octubre')
})
test('progreso separa negocio/general, omite archivadas y no inventa 100% para días vacíos', () => {
  const r = helpers.resumenTareas([fila, { ...fila, id: '2', categoria: 'habitos', completada: true }, { ...fila, id: '3', categoria: 'pagos' }, { ...fila, id: '4', categoria: 'trabajo', archivada: true, completada: true }, { ...fila, fecha: '2026-10-12' }], fila.fecha)
  assert.deepEqual(r, { alumna_id: USER, fecha: fila.fecha, total: 3, completadas: 1, generales: 2, generales_completadas: 1, negocio: 1, negocio_completadas: 0 })
  assert.equal(helpers.progresoDia(0, 0), null); assert.equal(helpers.progresoDia(1, 2), 50)
})
function cliente(respuestas = {}, llamadas = []) {
  return { auth: { getUser: async () => ({ data: { user: { id: USER } } }) }, from(tabla) {
    let op = 'select'
    const q = {}
    for (const name of ['select', 'eq', 'insert', 'update', 'upsert', 'order', 'limit']) q[name] = (...args) => { llamadas.push([tabla, name, ...args]); if (['insert', 'update', 'upsert'].includes(name)) op = name; return q }
    q.maybeSingle = async () => { const r = respuestas[`${tabla}:${op}`] ?? respuestas[tabla] ?? { data: null, error: null }; return typeof r === 'function' ? r() : r }
    return q
  } }
}
function api(file = 'src/app/api/checklist/route.ts', { user = { id: USER }, permitido = true, accesoError = false, respuestas = {} } = {}) {
  const llamadas = []; const db = cliente(respuestas, llamadas); db.auth.getUser = async () => ({ data: { user } })
  return { ...cargar(file, { 'next/server': { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status ?? 200, headers: opts.headers }) } }, '@/lib/supabase/server': { createClient: async () => db }, '@/lib/my-day-server': { permisoMiDia: async () => ({ permitido, error: accesoError }) } }), llamadas }
}
const solicitud = (datos = base, origin = 'https://app.sociasdigitales.com') => ({ headers: new Headers({ origin }), nextUrl: { origin: 'https://app.sociasdigitales.com' }, json: async () => datos })
test('API exige sesión y permiso individual, bloquea origen externo y datos ajenos', async () => {
  for (const [opts, status] of [[{ user: null }, 401], [{ permitido: false }, 403], [{ accesoError: true }, 503]]) { const a = api(undefined, opts); assert.equal((await a.POST(solicitud())).status, status); assert.equal(a.llamadas.length, 0) }
  assert.equal((await api().POST(solicitud(base, 'https://otro.com'))).status, 403)
  assert.equal((await api().POST(solicitud({ ...base, alumna_id: 'otra' }))).status, 400)
})
test('API guarda fila confirmada con dueño de sesión; el mismo envío no duplica tareas', async () => {
  const a = api(undefined, { respuestas: { 'checklist_tareas:insert': { data: fila, error: null } } })
  const r = await a.POST(solicitud()); assert.equal(r.body.ok, true); assert.equal(r.body.tarea.id, ID); assert.equal(r.headers['Cache-Control'], 'private, no-store')
  assert.equal(a.llamadas.find(x => x[1] === 'insert')[2].alumna_id, USER)
  const b = api(undefined, { respuestas: { checklist_tareas: { data: fila, error: null } } })
  assert.equal((await b.POST(solicitud())).body.ok, true); assert.ok(!b.llamadas.some(x => x[1] === 'insert'))
  assert.equal((await b.POST(solicitud({ ...base, texto: 'Otra tarea' }))).status, 409)
})
test('errores y filas ausentes no simulan éxito; recupera confirmación de respuesta perdida', async () => {
  assert.equal((await api().POST(solicitud())).status, 503)
  assert.equal((await api(undefined, { respuestas: { 'checklist_tareas:insert': { data: null, error: { code: 'x' } } } }).POST(solicitud())).status, 503)
  let n = 0
  const a = api(undefined, { respuestas: { 'checklist_tareas:select': () => ({ data: n++ ? fila : null, error: null }), 'checklist_tareas:insert': { data: null, error: { code: 'red' } } } })
  assert.equal((await a.POST(solicitud())).body.ok, true)
})
test('edita/completa/archiva con versión y dueño, no pisa otra pestaña y permite reintento', async () => {
  const edit = { ...base, version: 1, completada: true }, nueva = { ...fila, version: 2, completada: true }
  const a = api(undefined, { respuestas: { 'checklist_tareas:select': { data: fila, error: null }, 'checklist_tareas:update': { data: nueva, error: null } } })
  assert.equal((await a.PATCH(solicitud(edit))).body.tarea.version, 2)
  assert.ok(a.llamadas.some(x => x[1] === 'eq' && x[2] === 'version' && x[3] === 1))
  assert.ok(a.llamadas.filter(x => x[1] === 'eq' && x[2] === 'alumna_id').every(x => x[3] === USER))
  assert.equal((await api().PATCH(solicitud(edit))).status, 404)
  assert.equal((await api(undefined, { respuestas: { checklist_tareas: { data: { ...fila, version: 3 }, error: null } } }).PATCH(solicitud(edit))).status, 409)
  const b = api(undefined, { respuestas: { checklist_tareas: { data: nueva, error: null } } })
  assert.equal((await b.PATCH(solicitud(edit))).body.ok, true); assert.ok(!b.llamadas.some(x => x[1] === 'update'))
})
test('permiso: gratuito/desafío/pausada no abren Mi día aunque tengan una fila habilitada', async () => {
  const { permisoMiDia } = cargar('src/lib/my-day-server.ts')
  for (const [perfil, habilitada, expected] of [[{ rol: 'alumna', tipo_usuario: 'gratuito', estado: 'activa' }, true, false], [{ rol: 'alumna', tipo_usuario: 'desafio', estado: 'activa' }, true, false], [{ rol: 'alumna', tipo_usuario: 'socia', estado: 'activa' }, false, false], [{ rol: 'alumna', tipo_usuario: 'socia', estado: 'activa' }, true, true], [{ rol: 'alumna', tipo_usuario: 'socia', estado: 'pausada' }, true, false], [{ rol: 'admin' }, false, true]]) assert.equal((await permisoMiDia(cliente({ perfiles: { data: perfil, error: null }, accesos_mi_dia: { data: { habilitada }, error: null } }), USER)).permitido, expected)
})
test('Flor es la única que habilita Socias activas; puede cerrar un acceso sin borrar tareas', async () => {
  const file = 'src/app/api/admin/checklist/acceso/route.ts'
  assert.equal((await api(file).POST(solicitud({ usuaria_id: USER, habilitada: true }))).status, 403)
  for (const tipo of ['gratuito', 'desafio']) { let n = 0; const a = api(file, { respuestas: { perfiles: () => ({ data: n++ ? { rol: 'alumna', tipo_usuario: tipo, estado: 'activa' } : { rol: 'admin' }, error: null }) } }); assert.equal((await a.POST(solicitud({ usuaria_id: USER, habilitada: true }))).status, 400) }
  for (const [habilitada, data, status] of [[true, { usuaria_id: USER }, 200], [false, { usuaria_id: USER }, 200], [true, null, 503]]) {
    let n = 0; const a = api(file, { respuestas: { perfiles: () => ({ data: n++ ? { rol: 'alumna', tipo_usuario: habilitada ? 'socia' : 'gratuito', estado: 'activa' } : { rol: 'admin' }, error: null }), 'accesos_mi_dia:upsert': { data, error: null } } })
    assert.equal((await a.POST(solicitud({ usuaria_id: USER, habilitada }))).status, status)
    assert.equal(a.llamadas.find(x => x[1] === 'upsert')[2].administradora_id, USER)
  }
})
function fixture(tareas = []) {
  const cells = []; let cursor = 0, refreshes = 0
  const hooks = { useEffect() {}, useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], v => cells[i] = typeof v === 'function' ? v(cells[i]) : v] }, useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] } }
  const comp = cargar('src/app/checklist/ChecklistCliente.tsx', { react: hooks, 'next/navigation': { useRouter: () => ({ refresh: () => refreshes++, push() {} }) }, 'next/link': { default: () => null }, '@/components/ArrowIcon': { default: () => null }, '@/components/NavigationIcon': { default: () => null } })
  const render = () => { cursor = 0; return comp.default({ tareas, semana: [], fecha: fila.fecha, hoy: fila.fecha }) }
  function find(t, p) { if (!t || typeof t !== 'object') return null; if (p(t)) return t; for (const child of [t.props?.children].flat(Infinity)) { const r = find(child, p); if (r) return r } return null }
  const input = () => find(render(), e => e.props?.id === 'tarea-mi-dia')
  return { cells, render, find, input, submit: () => find(render(), e => e.type === 'form').props.onSubmit({ preventDefault() {} }), refreshes: () => refreshes }
}
test('UI conserva texto ante fallo, no agrega una tarea ficticia y reusa el intento para reintentar', async () => {
  const original = global.fetch, ids = []
  global.fetch = async (url, opts) => { ids.push(JSON.parse(opts.body).id); return { ok: false, status: 503, json: async () => ({ error: 'Sin conexión' }) } }
  try { const ui = fixture(); ui.input().props.onChange({ target: { value: 'Prueba sin red' } }); await ui.submit(); await ui.submit(); assert.equal(ui.cells[0], 'Prueba sin red'); assert.equal(Object.keys(ui.cells[3]).length, 0); assert.match(ui.cells[7], /Sin conexión/); assert.equal(ui.cells[8], ''); assert.equal(ids[0], ids[1]); assert.equal(ui.refreshes(), 0) } finally { global.fetch = original }
})
test('UI no cambia el check hasta confirmar y muestra errores sin falso progreso', async () => {
  const original = global.fetch; global.fetch = async () => ({ ok: false, status: 503, json: async () => ({ error: 'No guardado' }) })
  try { const ui = fixture([fila]); await ui.find(ui.render(), e => e.props?.role === 'checkbox').props.onClick(); assert.equal(ui.find(ui.render(), e => e.props?.role === 'checkbox').props['aria-checked'], false); assert.equal(Object.keys(ui.cells[3]).length, 0) } finally { global.fetch = original }
})
test('UI bloquea doble clic y limpia el formulario solo después del guardado confirmado', async () => {
  const original = global.fetch; let resolve, requests = 0; const p = new Promise(r => resolve = r)
  global.fetch = () => { requests++; return p }
  try { const ui = fixture(); ui.input().props.onChange({ target: { value: fila.texto } }); const a = ui.submit(), b = ui.submit(); assert.equal(requests, 1); resolve({ ok: true, json: async () => ({ ok: true, tarea: fila }) }); await a; await b; assert.equal(ui.cells[0], ''); assert.ok(ui.cells[3][ID]); assert.match(ui.cells[8], /Tarea guardada/); assert.equal(ui.refreshes(), 1) } finally { global.fetch = original }
})
test('UI conserva cambios si otra pestaña actualizó la tarea, pide abrir la versión guardada', async () => {
  const original = global.fetch; global.fetch = async () => ({ ok: false, status: 409, json: async () => ({ error: 'La tarea cambió' }) })
  try { const ui = fixture([fila]); ui.find(ui.render(), e => e.type === 'button' && e.props.children === 'Editar').props.onClick(); ui.input().props.onChange({ target: { value: 'Mi cambio' } }); await ui.submit(); assert.equal(ui.cells[0], 'Mi cambio'); assert.equal(ui.cells[9], true); assert.equal(ui.cells[8], ''); assert.equal(ui.refreshes(), 1) } finally { global.fetch = original }
})
test('render servidor: tarjetas con bordes, SVG accesible y sin tipografía/glow inventados', () => {
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
  const comp = cargar('src/app/checklist/ChecklistCliente.tsx', { 'next/link': { default: props => React.createElement('a', props) }, 'next/navigation': { useRouter: () => ({ refresh() {}, push() {} }) }, '@/components/ArrowIcon': { default: () => null }, '@/components/NavigationIcon': { default: () => null } }).default
  const html = renderToStaticMarkup(React.createElement(comp, { tareas: [fila], semana: [], fecha: fila.fecha, hoy: fila.fecha }))
  assert.ok(html.includes('border-[#e7ddd5]')); assert.ok(html.includes('Negocio digital: 0 de 1 completadas')); assert.ok(html.includes('Tu semana')); assert.ok(!html.includes('glow')); assert.ok(!html.includes('/perfil'))
})
test('panel Flor muestra solo resúmenes, no contenido de tareas, y controla acceso independiente', () => {
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
  const Admin = cargar('src/app/admin/checklist/MiDiaAdmin.tsx', { 'next/link': { default: props => React.createElement('a', props) }, 'next/navigation': { useRouter: () => ({ refresh() {}, push() {} }) }, '@/components/AdminSectionMenu': { default: () => null } }).default
  const html = renderToStaticMarkup(React.createElement(Admin, { socias: [{ id: USER, nombre: 'Prueba', estado: 'activa', habilitada: false }], resumen: [helpers.resumenTareas([fila, { ...fila, completada: true }], fila.fecha)], fecha: fila.fecha }))
  assert.ok(html.includes('1 de 2 tareas')); assert.ok(html.includes('Habilitar Mi día')); assert.ok(!html.includes(fila.texto))
})
test('base conserva tareas históricas y resumen aplica RLS, excluye archivadas y no permite borrado directo', () => {
  const sql = fs.readFileSync(path.join(ROOT, 'supabase/migrations/20261013152711_mi_dia_tareas_guardado_seguro_y_accesos.sql'), 'utf8')
  assert.ok(sql.includes('security invoker')); assert.ok(sql.includes('and not t.archivada')); assert.ok(sql.includes('grant select,insert,update on public.checklist_tareas'))
  assert.ok(!/delete from|truncate/i.test(sql)); assert.ok(!sql.includes('update public.checklist_tareas set fecha'))
})
