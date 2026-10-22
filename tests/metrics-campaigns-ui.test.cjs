/* eslint-disable @typescript-eslint/no-require-imports */
// Pruebas de componente con hooks simulados, no E2E ni datos financieros reales.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports)
  return m.exports
}
const metrics = load('src/lib/metrics.ts')
const campaigns = load('src/lib/metrics-campaigns.ts', { './metrics': metrics })
const base = { id: 'registro-a', alumna_id: 'socia-ficticia', campana: 'Campaña A', estrategia: 'lanzamiento', fecha: '2026-10-22', actualizado_at: '2026-10-22T12:00:00Z', created_at: '2026-10-22T12:00:00Z', version: 1, comision_producto: 20, inversion: 200, inversion_por_dia: 10, gasto_acumulado: 100, dias_captacion: 3, mensajes_recibidos: 100, personas_grupo: 50, reservas: 20, ventas: 10 }
const segunda = { ...base, id: 'registro-b', campana: 'Campaña B', fecha: '2026-10-20', gasto_acumulado: 40, ventas: 5 }
function ui(props = {}) {
  const cells = [], nuevas = [], vistas = []; let cursor = 0
  const Dashboard = load('src/components/CampaignMetricsDashboard.tsx', {
    react: { useState: initial => { const index = cursor++; if (!(index in cells)) cells[index] = typeof initial === 'function' ? initial() : initial; return [cells[index], value => { cells[index] = typeof value === 'function' ? value(cells[index]) : value }] } },
    './ArrowIcon': { default: () => null }, '@/lib/metrics-campaigns': campaigns, '@/lib/metrics': metrics,
  }).default
  const render = () => { cursor = 0; return Dashboard({ registros: [base, segunda], onNueva: () => nuevas.push(true), onVer: key => vistas.push(key), ...props }) }
  function all(node, predicate) { if (!node || typeof node !== 'object') return []; return [...(predicate(node) ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => all(child, predicate))] }
  function text(node) { if (typeof node === 'string' || typeof node === 'number') return String(node); if (!node || typeof node !== 'object') return ''; return [node.props?.children].flat(Infinity).map(text).join('') }
  return { render, nuevas, vistas, html: () => renderToStaticMarkup(render()), selects: () => all(render(), n => n.type === 'select'), button: title => all(render(), n => n.type === 'button').find(n => text(n) === title) }
}
test('tablero parte de la última foto guardada, ofrece comparar y permite ir a evolución con la clave exacta', () => {
  const view = ui({ registros: [base, segunda, { ...base, id: 'historia-anterior', fecha: '2026-10-19', ventas: 99 }] })
  const html = view.html()
  assert.match(html, /Tus campañas, en perspectiva/); assert.match(html, /Tu última foto guardada/)
  assert.ok(!html.includes('99')); assert.ok(!html.includes('Diferencia de A respecto de B'))
  view.button('Ver evolución de A ').props.onClick()
  assert.deepEqual(view.vistas, [metrics.claveCampana(base)])
})
test('seleccionar B muestra fechas y diferencias A menos B; cambiar A limpia B, sin ranking ni ganadora', () => {
  const view = ui()
  view.selects()[1].props.onChange({ target: { value: metrics.claveCampana(segunda) } })
  const html = view.html()
  assert.match(html, /Tus campañas, lado a lado/); assert.match(html, /Diferencia de A respecto de B/)
  assert.match(html, /22\/10\/2026/); assert.match(html, /20\/10\/2026/); assert.match(html, /no son ventas nuevas/)
  assert.ok(!html.includes('Campaña ganadora')); assert.ok(html.includes('Compará teniendo en cuenta la fecha'))
  view.button('Ver evolución de B ').props.onClick()
  assert.deepEqual(view.vistas, [metrics.claveCampana(segunda)])
  view.selects()[0].props.onChange({ target: { value: metrics.claveCampana(segunda) } })
  assert.ok(!view.html().includes('Diferencia de A respecto de B'))
  assert.equal(view.selects()[1].props.value, '')
})
test('otra dueña no aparece en selector B y no permite comparar consigo misma', () => {
  const view = ui({ registros: [base, { ...segunda, alumna_id: 'otra-socia-ficticia' }] })
  const selects = view.selects()
  assert.equal(selects[1].props.disabled, true)
  assert.match(view.html(), /Necesitás otra campaña para comparar/)
  assert.ok(!view.html().includes('Diferencia de A respecto de B'))
})
test('controles cambian ventas/gasto/neto y conservan null, cero y netos negativos con escala compartida', () => {
  const view = ui({ registros: [{ ...base, gasto_acumulado: 300 }, { ...segunda, gasto_acumulado: null, comision_producto: null }] })
  view.selects()[1].props.onChange({ target: { value: metrics.claveCampana(segunda) } })
  view.button('Neto estimado').props.onClick()
  let html = view.html()
  assert.match(html, /aria-pressed="true"[^>]*>Neto estimado/)
  assert.ok(html.includes(metrics.dineroMetrica(-100)))
  assert.ok(html.includes('—')); assert.ok(!html.includes('NaN')); assert.ok(!html.includes('Infinity'))
  assert.ok(!html.includes('>— pp<'))
  view.button('Gasto real').props.onClick(); html = view.html()
  assert.match(html, /aria-pressed="true"[^>]*>Gasto real/)
  assert.match(html, /misma escala desde cero/)
  const cero = ui({ registros: [{ ...base, gasto_acumulado: 0 }] })
  cero.button('Gasto real').props.onClick()
  assert.ok(cero.html().includes(metrics.dineroMetrica(0)))
  assert.ok(!cero.html().includes('NaN')); assert.ok(!cero.html().includes('Infinity'))
})
test('vacío ofrece crear análisis local, error no muestra cifras ni controles aunque lleguen filas, limitado se identifica', () => {
  const vacio = ui({ registros: [] })
  assert.match(vacio.html(), /Tu primera campaña empieza acá/)
  vacio.button('Crear mi primer análisis ').props.onClick(); assert.equal(vacio.nuevas.length, 1)
  assert.equal(vacio.selects().length, 0)
  const error = ui({ errorCarga: true })
  assert.match(error.html(), /no está disponible hasta recuperar el historial/)
  assert.equal(error.selects().length, 0)
  assert.ok(!error.html().includes('Costo por venta')); assert.ok(!error.html().includes('22/10/2026'))
  const parcial = ui({ limitado: true })
  assert.match(parcial.html(), /Vista parcial/); assert.match(parcial.html(), /No es un total de todo tu negocio/)
})
test('texto largo e importes desconocidos mantienen superficies, campos mobile y datos privados fuera de la proyección', () => {
  const largo = 'Campaña ficticia con un título extenso para probar la lectura en una pantalla muy pequeña'
  const view = ui({ registros: [{ ...base, campana: largo, gasto_acumulado: null, perfiles: { email: 'nunca-exportar@ejemplo.test' } }] })
  const html = view.html()
  assert.ok(html.includes(largo)); assert.ok(!html.includes('nunca-exportar@ejemplo.test'))
  assert.match(html, /break-words/); assert.match(html, /min-h-11/); assert.match(html, /text-base/)
  assert.ok(html.includes('Datos declarados y estimaciones en USD'))
})
