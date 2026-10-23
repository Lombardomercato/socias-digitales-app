/* eslint-disable @typescript-eslint/no-require-imports */
// Render y handlers simulados. El padre conserva el permiso y la navegación real.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts'), week = load('src/lib/my-day-week.ts', { './my-day': day })
const Summary = load('src/components/WeeklyPlanSummary.tsx', { './NavigationIcon': { default: () => React.createElement('svg', { 'aria-hidden': true }) }, '@/lib/my-day': day, '@/lib/my-day-week': week }).default
const fila = { alumna_id: 'propia', fecha: '2026-10-23', total: 3, completadas: 1, generales: 1, generales_completadas: 0, negocio: 2, negocio_completadas: 1 }
const props = { semana: [fila], fecha: fila.fecha, onElegir() {} }
const html = extra => renderToStaticMarkup(React.createElement(Summary, { ...props, ...extra }))
function all(node, predicate) { if (!node || typeof node !== 'object') return []; return [...(predicate(node) ? [node] : []), ...[node.props?.children].flat(Infinity).flatMap(child => all(child, predicate))] }
test('SSR muestra tres cifras reales y siete días accesibles, sin porcentajes ni textos de tareas', () => {
  const body = html()
  assert.match(body, /Tu semana/); assert.match(body, /Planeadas/); assert.match(body, /Completadas/); assert.match(body, /Por hacer/)
  assert.equal((body.match(/<button/g) ?? []).length, 7); assert.equal((body.match(/aria-current="date"/g) ?? []).length, 1)
  assert.match(body, /viernes, 23 de octubre: 2 por hacer, 1 completadas de 3/)
  assert.match(body, /Tenés acciones en 1 día/)
  for (const token of ['%', 'progressbar', 'cuenta-propia', 'alumna_id', 'racha', 'certificado']) assert.ok(!body.includes(token))
})
test('error desconoce cifras, no dibuja progreso cero y conserva navegación a los siete días', () => {
  for (const extra of [{ error: true }, { semana: [fila, fila] }, { semana: [{ ...fila, total: -1 }] }]) {
    const body = html(extra)
    assert.match(body, /role="alert"/); assert.match(body, /No la contamos como cero/)
    assert.match(body, /Avance no disponible/); assert.equal((body.match(/<button/g) ?? []).length, 7)
    assert.ok(!body.includes('Tu semana tiene espacio')); assert.ok(!body.includes('0 pend.')); assert.ok(!body.includes('%'))
  }
})
test('vacío real es amable y distinto de error, sin fingir acciones planeadas', () => {
  const body = html({ semana: [] })
  assert.match(body, /Tu semana tiene espacio para lo que viene/)
  assert.match(body, /Elegí un día y sumá tu primer paso/)
  assert.equal((body.match(/>Libre<\/span>/g) ?? []).length, 7)
  assert.ok(!body.includes('role="alert"')); assert.ok(!body.includes('No pudimos'))
})
test('onElegir solo dispara por acción explícita; bloqueada no navega ni cambia datos', () => {
  const clicks = []
  for (const bloqueada of [false, true]) {
    const tree = Summary({ ...props, bloqueada, onElegir: fecha => clicks.push(fecha) }), buttons = all(tree, n => n.type === 'button')
    assert.equal(buttons.length, 7); assert.equal(clicks.length, bloqueada ? 1 : 0)
    assert.ok(buttons.every(button => button.props.disabled === bloqueada))
    buttons[0].props.onClick(); assert.equal(clicks.length, 1)
    if (bloqueada) assert.match(html({ bloqueada }), /Terminá o cancelá la acción actual/)
  }
  assert.deepEqual(clicks, ['2026-10-19'])
})
test('componente usa marca y bordes, foco y objetivos 44px adaptables al ancho disponible', () => {
  const body = html(), source = read('src/components/WeeklyPlanSummary.tsx')
  for (const token of ['bg-[#FFFDFA]', 'border-[#EC9BB6]/65', 'bg-[#F4CAD8]', 'min-w-[44px]', 'min-h-11', 'focus-visible:outline', 'repeat(auto-fit,minmax(44px,1fr))']) assert.ok(body.includes(token))
  for (const token of ['fetch(', 'localStorage', 'sessionStorage', 'setTimeout(', 'useEffect', 'new Date()', 'overflow-x-hidden', 'supabase']) assert.ok(!source.includes(token))
})
