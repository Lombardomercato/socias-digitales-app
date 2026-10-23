/* eslint-disable @typescript-eslint/no-require-imports */
// Session/readers are mocked. This verifies route orchestration, not live RLS.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts'), TODAY = '2026-10-23', USER = '06bb7999-997b-49c8-ba80-b8d05bca4a84'
const tasks = { tareas: [], semana: [], limitado: false, errorCarga: false }, plan = { estado: 'listo', opciones: [] }
function page({ user = { id: USER }, acceso = { permitido: true, admin: false, error: false }, leerDia = async () => tasks, leerPlan = async () => plan } = {}) {
  const calls = [], supabase = { from() { throw new Error('No debe agregar consultas a la página') }, auth: { getUser: async () => { calls.push(['auth']); return { data: { user } } } } }
  const Locked = () => null, Checklist = () => null
  const Page = load('src/app/checklist/page.tsx', { '@/lib/supabase/server': { createClient: async () => supabase }, 'next/navigation': { redirect: href => { throw new Error(`redirect:${href}`) } }, '@/components/ModuleLocked': { default: Locked }, './ChecklistCliente': { default: Checklist }, '@/lib/my-day': day, '@/lib/metrics': { fechaArgentina: () => TODAY }, '@/lib/my-day-server': { permisoMiDia: async (db, id) => { assert.equal(db, supabase); assert.equal(id, USER); calls.push(['permiso']); return acceso }, leerMiDia: (db, id, fecha) => { assert.equal(db, supabase); calls.push(['dia', id, fecha]); return leerDia() } }, '@/lib/study-planner-server': { leerPlanEstudio: (db, id) => { assert.equal(db, supabase); calls.push(['plan', id]); return leerPlan() } } }).default
  return { Page, calls, Locked, Checklist }
}
test('página deriva alumna de getUser y lee día/plan solo después del permiso Mi día', async () => {
  const ui = page(); const result = await ui.Page({ searchParams: Promise.resolve({ fecha: '2026-10-26', alumna_id: 'ajena' }) })
  assert.equal(result.type, ui.Checklist); assert.equal(result.props.alumnaId, USER); assert.equal(result.props.fecha, '2026-10-26'); assert.equal(result.props.hoy, TODAY)
  assert.equal(result.props.planEstudio, plan); assert.equal(result.props.tareas, tasks.tareas)
  assert.deepEqual(ui.calls, [['auth'], ['permiso'], ['dia', USER, '2026-10-26'], ['plan', USER]])
})
test('sin sesión no consulta permisos; gratuita/Desafío/sin habilitación/error no leen tareas ni plan', async () => {
  const anon = page({ user: null }); await assert.rejects(() => anon.Page({ searchParams: Promise.resolve({}) }), /redirect:\/login/); assert.deepEqual(anon.calls, [['auth']])
  for (const escenario of ['gratuita', 'desafio', 'socia-sin-habilitacion', 'socia-pausada', 'socia-cancelada']) {
    const ui = page({ user: { id: USER, user_metadata: { rol: 'admin', tipo_usuario: escenario } }, acceso: { permitido: false, admin: false, error: false } })
    assert.equal((await ui.Page({ searchParams: Promise.resolve({}) })).type, ui.Locked, escenario)
    assert.deepEqual(ui.calls, [['auth'], ['permiso']])
  }
  const fail = page({ acceso: { permitido: false, admin: false, error: true } }), markup = renderToStaticMarkup(await fail.Page({ searchParams: Promise.resolve({}) }))
  assert.match(markup, /No pudimos comprobar tu acceso/); assert.match(markup, /role="alert"/); assert.deepEqual(fail.calls, [['auth'], ['permiso']])
})
test('administración conserva lectura de Mi día pero no ejecuta lector de estudio ni recibe plan de alumna', async () => {
  const ui = page({ acceso: { permitido: true, admin: true, error: false } }), result = await ui.Page({ searchParams: Promise.resolve({}) })
  assert.equal(result.type, ui.Checklist); assert.equal(result.props.admin, true); assert.equal(result.props.planEstudio, null)
  assert.deepEqual(ui.calls, [['auth'], ['permiso'], ['dia', USER, TODAY]])
})
test('día y plan empiezan en paralelo; error parcial no altera tareas ni se disfraza de plan vacío', async () => {
  let finishDia, finishPlan
  const ui = page({ leerDia: () => new Promise(resolve => { finishDia = resolve }), leerPlan: () => new Promise(resolve => { finishPlan = resolve }) })
  const pending = ui.Page({ searchParams: Promise.resolve({}) }); await new Promise(resolve => setImmediate(resolve))
  assert.equal(ui.calls.some(call => call[0] === 'dia'), true); assert.equal(ui.calls.some(call => call[0] === 'plan'), true)
  finishPlan({ estado: 'error', opciones: [] }); finishDia({ ...tasks, errorCarga: true }); const result = await pending
  assert.equal(result.props.errorCarga, true); assert.deepEqual(result.props.planEstudio, { estado: 'error', opciones: [] })
})
test('fechas inválidas conservan hoy Argentina y una fecha histórica válida no se transforma en futuro', async () => {
  for (const fecha of ['', 'no-es-fecha', '2026-02-30', ['2026-10-26', TODAY]]) {
    const ui = page(), result = await ui.Page({ searchParams: Promise.resolve({ fecha }) })
    assert.equal(result.props.fecha, TODAY)
  }
  const ui = page(), result = await ui.Page({ searchParams: Promise.resolve({ fecha: '2026-10-01' }) })
  assert.equal(result.props.fecha, '2026-10-01'); assert.equal(result.props.hoy, TODAY)
})
test('Inicio expone Plan de estudio únicamente con permiso Mi día; no inicia otra lectura de formación', () => {
  const source = read('src/app/inicio/page.tsx')
  assert.match(source, /permisoMiDia=\{accesoMiDia\}/)
  const campus = read('src/components/HomeCampus.tsx')
  assert.match(campus, /miDia.estado !== 'no-habilitado' && <MiDia resumen=\{miDia\}/)
  assert.equal((campus.match(/href="\/checklist#plan-de-estudio"/g) ?? []).length, 1)
  assert.ok(!source.includes('leerPlanEstudio')); assert.ok(!source.includes('StudyPlannerClient'))
  const checklist = read('src/app/checklist/ChecklistCliente.tsx')
  assert.match(checklist, /!admin && planEstudio && <StudyPlannerClient/)
  assert.match(checklist, /alumnaId=\{alumnaId\}/)
})
