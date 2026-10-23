/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const ROOT = path.resolve(__dirname, '..')
function load(file, deps = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(ROOT, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in deps ? deps[name] : name === '@/lib/my-day' ? day : name === '@/lib/metrics' ? metrics : name === '@/components/StudyPlannerClient' ? { default: () => null } : name === '@/components/WeeklyPlanSummary' ? resumenSemanal : require(name), m, m.exports)
  return m.exports
}
const day = load('src/lib/my-day.ts'), metrics = load('src/lib/metrics.ts')
const semanaHelpers = load('src/lib/my-day-week.ts', { './my-day': day })
const resumenSemanal = load('src/components/WeeklyPlanSummary.tsx', {
  '@/lib/my-day-week': semanaHelpers,
  './NavigationIcon': { default: () => null },
})
const USER = '06bb7999-997b-49c8-ba80-b8d05bca4a84', ID = '85c4f8b8-21df-4772-9c7b-0ba2ea52efa5'
const fila = { id: ID, alumna_id: USER, texto: 'Preparar contenido', categoria: 'negocio_digital', fecha: '2026-10-22', completada: false, archivada: false, version: 1, creado_en: '2026-10-20T18:00:00Z', actualizada_en: '2026-10-20T18:00:00Z' }
function view(file, props) {
  const cells = [], celebrations = [], dismissals = []
  let cursor = 0
  const hooks = { useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], v => { cells[i] = typeof v === 'function' ? v(cells[i]) : v }] }, useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] }, useEffect() {} }
  const Component = load(file, { react: hooks, 'next/navigation': { useRouter: () => ({ refresh() {}, push() {} }) }, 'next/link': { default: () => null }, '@/components/SuccessCelebration': { default: () => null, useSuccessCelebration: () => ({ celebration: null, celebrate: input => celebrations.push(input), dismiss: () => dismissals.push(true) }) }, '@/components/ArrowIcon': { default: () => null }, '@/components/NavigationIcon': { default: () => null }, '@/components/CampaignMetricsDashboard': { default: () => null }, '@/components/MetricsVisuals': { ResumenMetricas: () => null, EvolucionMetricas: () => null } }).default
  const render = () => { cursor = 0; return Component(props) }
  function all(tree, predicate) { if (!tree || typeof tree !== 'object') return []; return [...(predicate(tree) ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, predicate))] }
  const find = predicate => all(render(), predicate)[0]
  return { cells, celebrations, dismissals, render, find, button: text => find(node => node.type === 'button' && node.props.children === text) }
}
const checklist = (tareas = [fila]) => view('src/app/checklist/ChecklistCliente.tsx', { tareas, semana: [], fecha: fila.fecha, hoy: fila.fecha })
const response = (key, row, ok = true, status = 200) => ({ ok, status, json: async () => ok ? { ok: true, [key]: row } : { error: 'No se pudo guardar' } })
test('Mi día celebra únicamente una transición pendiente a completada persistida con la misma identidad', async () => {
  const before = global.fetch
  global.fetch = async (url, opts) => { const payload = JSON.parse(opts.body); assert.equal(payload.id, ID); assert.equal(payload.completada, true); return response('tarea', { ...fila, completada: true, version: 2 }) }
  try {
    const ui = checklist(); await ui.find(node => node.props?.role === 'checkbox').props.onClick()
    assert.deepEqual(ui.celebrations, [{ key: `tarea:${ID}`, title: '¡Un paso más, Socia!', message: 'Tu tarea quedó completada.' }])
    assert.equal(ui.dismissals.length, 1)
  } finally { global.fetch = before }
})
test('Mi día no celebra fallos ni respuestas incoherentes aunque tengan HTTP 200', async () => {
  const before = global.fetch
  try {
    for (const row of [null, { ...fila, version: 2 }, { ...fila, version: 2, completada: true, id: crypto.randomUUID() }, { ...fila, version: 2, completada: true, alumna_id: crypto.randomUUID() }, { ...fila, version: 2, completada: true, categoria: 'habitos' }, { ...fila, version: 2, completada: true, texto: 'Otra tarea' }, { ...fila, version: 2, completada: true, fecha: '2026-10-23' }, { ...fila, version: 2, completada: true, creado_en: '2026-10-21T18:00:00Z' }, { ...fila, version: 3, completada: true }]) {
      global.fetch = async () => response('tarea', row)
      const ui = checklist(); await ui.find(node => node.props?.role === 'checkbox').props.onClick(); assert.equal(ui.celebrations.length, 0)
    }
    for (const status of [409, 503]) { global.fetch = async () => response('tarea', null, false, status); const ui = checklist(); await ui.find(node => node.props?.role === 'checkbox').props.onClick(); assert.equal(ui.celebrations.length, 0) }
  } finally { global.fetch = before }
})
test('Mi día no celebra desmarcar, archivar, crear ni reprogramar', async () => {
  const before = global.fetch, previousFrame = global.requestAnimationFrame
  global.requestAnimationFrame = fn => fn()
  global.fetch = async (url, opts) => { const { version, ...data } = JSON.parse(opts.body); return response('tarea', { ...fila, ...data, version: version ? version + 1 : 1 }) }
  try {
    const completa = checklist([{ ...fila, completada: true }]); await completa.find(node => node.props?.role === 'checkbox').props.onClick(); assert.equal(completa.celebrations.length, 0)
    const archivo = checklist(); await archivo.button('Archivar').props.onClick(); assert.equal(archivo.celebrations.length, 0)
    const nuevo = checklist([]); nuevo.find(node => node.props?.id === 'tarea-mi-dia').props.onChange({ target: { value: 'Nueva tarea' } }); await nuevo.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }); assert.equal(nuevo.celebrations.length, 0)
    const repro = checklist(); repro.button('Reprogramar').props.onClick(); await repro.find(node => node.type === 'section' && node.props['aria-labelledby'] === 'reprogramar-titulo').props.children.find(node => node?.type === 'form').props.onSubmit({ preventDefault() {} }); assert.equal(repro.celebrations.length, 0)
  } finally { global.fetch = before; global.requestAnimationFrame = previousFrame }
})
const metrica = { id: ID, alumna_id: USER, version: 1, campana: 'Campaña prueba', fecha: fila.fecha, estrategia: 'lanzamiento', comision_producto: 100, inversion: null, inversion_por_dia: null, gasto_acumulado: 50, dias_captacion: null, mensajes_recibidos: 0, personas_grupo: 0, reservas: 0, ventas: 0, created_at: fila.creado_en, actualizado_at: fila.creado_en }
function metricas(historial = []) {
  const ui = view('src/app/metricas/MetricasCliente.tsx', { historial, fechaInicial: fila.fecha })
  function input(label) { const group = ui.find(node => node.type === 'label' && [node.props.children].flat().includes(label)); return [group.props.children].flat().find(node => node?.type === 'input') }
  function completar() { input('Campaña').props.onChange({ target: { value: metrica.campana } }); input('Comisión por venta · USD').props.onChange({ target: { value: '100' } }); input('Gasto real acumulado · USD').props.onChange({ target: { value: '50' } }) }
  return { ...ui, completar, submit: () => ui.find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }) }
}
test('Métricas celebra creación y edición confirmadas con clave id+versión y sin afirmar ventas aprobadas', async () => {
  const before = global.fetch
  global.fetch = async (url, opts) => { const { version, ...data } = JSON.parse(opts.body); return response('metrica', { ...metrica, ...data, version: version ? version + 1 : 1 }) }
  try {
    const nuevo = metricas(); nuevo.completar(); await nuevo.submit()
    assert.equal(nuevo.celebrations.length, 1); assert.match(nuevo.celebrations[0].key, /^metrica:[0-9a-f-]+:1$/)
    assert.equal(nuevo.celebrations[0].variant, 'gentle'); assert.equal(nuevo.celebrations[0].message, 'Tu análisis quedó guardado.')
    const editar = metricas([metrica]); await editar.submit()
    assert.equal(editar.celebrations[0].key, `metrica:${ID}:2`)
  } finally { global.fetch = before }
})
test('Métricas no celebra fallos o filas sin confirmar id, versión o datos', async () => {
  const before = global.fetch
  try {
    for (const change of [{ id: crypto.randomUUID() }, { version: 3 }, { gasto_acumulado: 999 }, { campana: 'Otra' }]) {
      global.fetch = async (url, opts) => { const { version: _version, ...data } = JSON.parse(opts.body); void _version; return response('metrica', { ...metrica, ...data, version: 1, ...change }) }
      const ui = metricas(); ui.completar(); await ui.submit(); assert.equal(ui.celebrations.length, 0)
    }
    for (const status of [409, 503]) { global.fetch = async () => response('metrica', null, false, status); const ui = metricas(); ui.completar(); await ui.submit(); assert.equal(ui.celebrations.length, 0) }
    global.fetch = async () => response('metrica', null); const ui = metricas(); ui.completar(); await ui.submit(); assert.equal(ui.celebrations.length, 0)
  } finally { global.fetch = before }
})
