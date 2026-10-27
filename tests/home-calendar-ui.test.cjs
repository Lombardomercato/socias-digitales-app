/* eslint-disable @typescript-eslint/no-require-imports */
// Estado local simulado; clases móviles se verifican como contrato, no píxeles.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const day = load('src/lib/my-day.ts'), calendar = load('src/lib/home-calendar.ts', { './my-day': day })
const HOY = '2026-10-26', range = calendar.resolverMesCalendario(undefined, HOY)
const tasks = calendar.resumirTareasCalendario([{ alumna_id: 'propia', fecha: '2026-10-29', total: 3, completadas: 1, generales: 1, generales_completadas: 0, negocio: 2, negocio_completadas: 1 }], 'propia', range)
const events = calendar.proyectarEncuentrosCalendario([{ id: 'encuentro', titulo: 'Clase para Socias', fecha: '2026-10-29T19:30:00-03:00', enlace: 'https://example.com/clase', accion: 'Entrar a la clase' }], range)
const base = { estado: 'listo', rango: range, hoy: HOY, tareas: tasks, encuentros: events }
function ui(datos = base, nombre = 'default') {
  const states = []; let cursor = 0
  const hooks = { useState: initial => { const n = cursor++; if (!(n in states)) states[n] = typeof initial === 'function' ? initial() : initial; return [states[n], value => { states[n] = typeof value === 'function' ? value(states[n]) : value }] } }
  const Link = ({ prefetch, children, ...props }) => { void prefetch; return React.createElement('a', props, children) }
  const Component = load('src/components/HomeCalendar.tsx', { react: hooks, 'next/link': { default: Link }, '@/components/ArrowIcon': { default: () => null }, '@/components/NavigationIcon': { default: () => null }, '@/lib/home-calendar': calendar, '@/lib/my-day': day })[nombre]
  function render() { cursor = 0; return Component({ datos }) }
  function text(n) { return typeof n === 'string' || typeof n === 'number' ? String(n) : n && typeof n === 'object' ? [n.props?.children].flat(Infinity).map(text).join('') : '' }
  function all(n, predicate) { if (!n || typeof n !== 'object') return []; return [...(predicate(n) ? [n] : []), ...[n.props?.children].flat(Infinity).flatMap(c => all(c, predicate))] }
  return { render, html: () => renderToStaticMarkup(render()), day: fecha => all(render(), n => n.props?.['data-fecha-calendario'] === fecha)[0], button: label => all(render(), n => n.type === 'button' && text(n) === label)[0], links: () => all(render(), n => n.props?.href), all: predicate => all(render(), predicate) }
}
test('calendario mensual marca tareas/encuentros y abre la fecha elegida sin guardar datos', () => {
  const view = ui()
  assert.match(view.html(), /Tu agenda/); assert.match(view.html(), /octubre de 2026/)
  assert.equal(view.all(n => n.props?.['data-fecha-calendario']).length, 31)
  assert.equal(view.day(HOY).props['aria-current'], 'date'); assert.equal(view.day(HOY).props['aria-pressed'], true)
  assert.match(view.day('2026-10-29').props['aria-label'], /2 tareas pendientes y 1 completada, 1 encuentro/)
  assert.ok(!view.links().some(link => link.props.href === 'https://example.com/clase'))
  view.day('2026-10-29').props.onClick()
  assert.equal(view.day('2026-10-29').props['aria-pressed'], true)
  assert.ok(view.links().some(link => link.props.href === '/checklist?fecha=2026-10-29'))
  assert.ok(view.links().some(link => link.props.href === 'https://example.com/clase' && link.props.rel === 'noopener noreferrer'))
  assert.match(view.html(), /19:30/); assert.match(view.html(), /2 por hacer · 1 completadas/)
  for (const link of view.links().filter(link => link.props.href.startsWith('/'))) assert.equal(link.props.prefetch, false)
  assert.ok(!read('src/components/HomeCalendar.tsx').includes('fetch(')); assert.ok(!read('src/components/HomeCalendar.tsx').includes('localStorage'))
})
test('navegación del mes respeta seis meses, usa SSR y no ofrece fechas de padding', () => {
  const futuro = calendar.resolverMesCalendario('2027-04', HOY), view = ui({ ...base, rango: futuro, tareas: calendar.resumirTareasCalendario([], 'propia', futuro), encuentros: { estado: 'lista', encuentros: [] } })
  assert.equal(view.all(n => n.props?.['data-fecha-calendario']).length, 30)
  assert.ok(view.links().some(link => link.props.href === '/inicio?mes=2027-03#mi-calendario'))
  assert.ok(view.links().some(link => link.props.href === '/inicio?mes=2026-10#mi-calendario'))
  assert.ok(!view.links().some(link => link.props.href.includes('2027-05')))
  assert.equal(view.all(n => n.type === 'button' && n.props['aria-label'] === 'Mes siguiente, límite de seis meses')[0].props.disabled, true)
  assert.ok(!view.day('2027-03-31'))
  const corregido = ui({ ...base, rango: calendar.resolverMesCalendario('2026-99', HOY) })
  assert.match(corregido.html(), /Abrimos el mes actual/)
})
test('fallos independientes no afirman vacío, cero o permiso; el encuentro confirmado sigue accesible', () => {
  const tareasError = ui({ ...base, tareas: { estado: 'error' } })
  tareasError.day('2026-10-29').props.onClick()
  assert.match(tareasError.html(), /No pudimos comprobar tus tareas/); assert.ok(!tareasError.html().includes('Sin tareas guardadas'))
  assert.ok(!tareasError.links().some(link => link.props.href.startsWith('/checklist')))
  assert.ok(tareasError.links().some(link => link.props.href === 'https://example.com/clase'))
  const agendaError = ui({ ...base, encuentros: { estado: 'error' } })
  agendaError.day('2026-10-29').props.onClick()
  assert.match(agendaError.html(), /No pudimos comprobar los encuentros/); assert.match(agendaError.html(), /2 por hacer/)
  const completo = ui({ estado: 'error' }).html(); assert.match(completo, /role="alert"/); assert.ok(!completo.includes('Sin tareas'))
})
test('sin Mi día ofrece los encuentros o clases, nunca inventa un bloqueo ni tareas a cero', () => {
  const view = ui({ ...base, tareas: { estado: 'no-habilitado' } })
  view.day('2026-10-29').props.onClick()
  assert.ok(!view.links().some(link => link.props.href.startsWith('/checklist'))); assert.match(view.html(), /Clase para Socias/)
  assert.ok(!view.html().includes('Sin tareas guardadas')); assert.ok(!view.html().includes('permiso denegado'))
  const vacio = ui({ ...base, tareas: { estado: 'no-habilitado' }, encuentros: { estado: 'lista', encuentros: [] } })
  assert.match(vacio.html(), /Los próximos encuentros que publique Flor/); assert.ok(vacio.links().some(link => link.props.href === '/clases'))
})
test('contrato móvil usa siete objetivos de44px, superficies sólidas y ninguna máscara de desborde', () => {
  const view = ui(), markup = view.html(), source = read('src/components/HomeCalendar.tsx')
  assert.ok(markup.includes('-mx-4')); assert.ok(markup.includes('grid-cols-[repeat(7,minmax(44px,1fr))]'))
  for (const node of view.all(n => n.type === 'button')) assert.ok(node.props.className.includes('min-h-11'))
  for (const node of view.all(n => n.props?.['data-fecha-calendario'])) assert.ok(node.props.className.includes('min-w-11'))
  assert.ok(source.includes('bg-[#FFFDFA]')); assert.ok(source.includes('border-[#E7DDD5]')); assert.ok(!source.includes('overflow-x-hidden')); assert.ok(!source.includes('backdrop-blur'))
  const loading = ui(undefined, 'HomeCalendarLoading').html(); assert.match(loading, /aria-busy="true"/); assert.match(loading, /Preparando tu calendario/); assert.ok(!loading.includes('0 tareas'))
})
