const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
function load(file) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'server-only') return {}
    if (name === 'next/link') return { default: props => React.createElement('a', props) }
    if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.tsx'))
    return require(name)
  }, mod, mod.exports)
  return mod.exports
}
const { leerAvisosSinLeer } = load(path.resolve(__dirname, '../src/lib/unread-notices.ts'))
function cliente(result) {
  const llamadas = []
  const query = {}
  for (const metodo of ['select', 'eq', 'is', 'order', 'limit']) query[metodo] = (...args) => {
    llamadas.push([metodo, ...args])
    return metodo === 'limit' ? Promise.resolve(result) : query
  }
  return { llamadas, from: tabla => { llamadas.push(['from', tabla]); return query } }
}
test('cuenta todos los pendientes, no solo el título más reciente; aplica RLS y lectura propia', async () => {
  const db = cliente({ count: 152, data: [{ id: 'aviso', titulo: 'Cambio de fecha' }], error: null })
  assert.deepEqual(await leerAvisosSinLeer(db, 'mi-id'), { cantidad: 152, ultimoTitulo: 'Cambio de fecha', errorCarga: false })
  assert.ok(db.llamadas.some(x => x[0] === 'select' && x[2].count === 'exact'))
  assert.ok(db.llamadas.some(x => x[0] === 'eq' && x[1] === 'avisos_lecturas.usuaria_id' && x[2] === 'mi-id'))
  assert.ok(db.llamadas.some(x => x[0] === 'is' && x[1] === 'avisos_lecturas' && x[2] === null))
  assert.ok(db.llamadas.some(x => x[0] === 'eq' && x[1] === 'archivado' && x[2] === false))
  assert.ok(db.llamadas.some(x => x[0] === 'limit' && x[1] === 1))
})
test('cero pendientes y falla de consulta se distinguen', async () => {
  assert.deepEqual(await leerAvisosSinLeer(cliente({ count: 0, data: [], error: null }), 'mi-id'), { cantidad: 0, ultimoTitulo: null, errorCarga: false })
  assert.deepEqual(await leerAvisosSinLeer(cliente({ count: null, data: null, error: { message: 'red' } }), 'mi-id'), { cantidad: 0, ultimoTitulo: null, errorCarga: true })
})
const { UnreadNoticesProvider, UnreadNoticeLink } = load(path.resolve(__dirname, '../src/components/UnreadNotices.tsx'))
function vista(cantidad, variante, errorCarga = false) {
  return renderToStaticMarkup(React.createElement(UnreadNoticesProvider, { inicial: { cantidad, ultimoTitulo: 'Clase mañana', errorCarga } }, React.createElement(UnreadNoticeLink, { variante })))
}
test('campana y menú tienen número visible y nombre accesible; banner invita a leer', () => {
  for (const variante of ['header', 'menu', 'tarjeta']) {
    const html = vista(1, variante)
    assert.ok(html.includes('Notificaciones: 1 comunicado sin leer'))
    assert.ok(html.includes('tabular-nums text-white'))
    assert.ok(html.includes('>1</span>'))
    assert.ok(html.includes('href="/notificaciones"'))
  }
  const banner = vista(1, 'banner')
  assert.ok(banner.includes('Tenés 1 comunicado sin leer'))
  assert.ok(banner.includes('Clase mañana'))
  assert.ok(banner.includes('Leer comunicado'))
  assert.ok(banner.includes('role="status"'))
})
test('sin mensajes no hay banner ni falsa urgencia; 99+ no desborda el menú', () => {
  assert.equal(vista(0, 'banner'), '')
  assert.ok(!vista(0, 'header').includes('tabular-nums'))
  assert.ok(vista(137, 'menu').includes('>99+</span>'))
  assert.ok(vista(137, 'menu').includes('137 comunicados sin leer'))
  assert.ok(vista(0, 'banner', true).includes('No pudimos comprobar'))
})
test('Notificaciones conserva el tamaño y alineación del menú, con el contador fuera del flujo del texto', () => {
  for (const cantidad of [0, 1, 137]) {
    const html = vista(cantidad, 'menu')
    assert.ok(html.includes('gap-3 rounded-xl px-3 py-3 text-sm'))
    if (cantidad > 0) assert.ok(html.includes('absolute -right-1 -top-1'))
  }
})
test('actualización única con pestaña visible; no marca mensajes automáticamente ni pierde el último dato ante errores', () => {
  const ui = fs.readFileSync(path.resolve(__dirname, '../src/components/UnreadNotices.tsx'), 'utf8')
  assert.equal((ui.match(/setInterval/g) || []).length, 1)
  assert.ok(ui.includes("document.visibilityState !== 'visible'"))
  assert.ok(ui.includes("window.addEventListener('focus'"))
  assert.ok(ui.includes('if (!response.ok) return'))
  assert.ok(ui.includes('controller?.abort()'))
  assert.ok(!ui.includes('upsert'))
  const api = fs.readFileSync(path.resolve(__dirname, '../src/app/api/cuenta/avisos/route.ts'), 'utf8')
  assert.ok(api.includes('supabase.auth.getUser()'))
  assert.ok(api.includes('private, no-store'))
  assert.ok(!api.includes('createAdminClient'))
  const inicio = fs.readFileSync(path.resolve(__dirname, '../src/app/inicio/page.tsx'), 'utf8')
  assert.ok(!inicio.includes('<UnreadNoticeLink variante="banner"'))
  assert.ok(inicio.includes('<UnreadNoticeLink variante="header"'))
  assert.ok(inicio.includes('<UnreadNoticeLink variante="menu"'))
})
