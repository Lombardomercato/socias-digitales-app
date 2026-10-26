/* eslint-disable @typescript-eslint/no-require-imports */
// Fixtures aislados: no hay alumnas, escrituras ni comunicaciones reales.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const React = require('react')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const community = load('src/lib/community.ts')
const ID = '11111111-1111-4111-8111-111111111111', COM = '22222222-2222-4222-8222-222222222222', OTRO = '33333333-3333-4333-8333-333333333333'
const FECHA = '2026-10-26T12:00:00Z'
const post = (extra = {}) => ({ id: ID, contenido: 'Hoy terminé mi primera tarea', tipo: 'avance', created_at: FECHA, actualizado_at: FECHA, version: 1, retirada: false, oculta: false, autor: { nombre: 'Socia de ensayo', avatar_url: null, es_admin: false }, propia: false, total_comentarios: 1, total_felicitaciones: 2, felicitada: false, ...extra })
const comentario = (extra = {}) => ({ id: COM, publicacion_id: ID, contenido: '¡Vamos juntas!', created_at: FECHA, actualizado_at: FECHA, version: 1, retirada: false, oculta: false, autor: { nombre: 'Otra socia', avatar_url: null, es_admin: false }, propia: false, ...extra })
const lista = (publicaciones = [post()], siguiente = null) => ({ estado: 'lista', publicaciones, siguiente })
const pregunta = () => ({ id: ID, titulo: 'Pregunta anterior', contenido: '¿Cómo organizo mi día?', estado: 'abierta', created_at: FECHA, perfiles: { nombre: 'Alumna de ensayo', avatar_url: null }, respuestas: [] })
function ui(props = {}, db = {}) {
  const cells = [], effects = [], deps = [], cleanups = new Map(); let cursor = 0, refreshes = 0
  const hooks = {
    useState: initial => { const n = cursor++; if (!(n in cells)) cells[n] = typeof initial === 'function' ? initial() : initial; return [cells[n], value => { cells[n] = typeof value === 'function' ? value(cells[n]) : value }] },
    useRef: initial => { const n = cursor++; if (!(n in cells)) cells[n] = { current: initial }; return cells[n] },
    useCallback: callback => callback,
    useEffect: (effect, next) => { const n = cursor++; if (!deps[n] || next.some((v, i) => !Object.is(v, deps[n][i]))) { deps[n] = next; effects.push(() => { cleanups.get(n)?.(); cleanups.set(n, effect()) }) } },
  }
  const SharedPost = p => React.createElement('article', { 'data-shared-post': true },
    React.createElement('p', null, 'Un avance · ', p.publicacion.contenido),
    React.createElement('p', null, `${p.publicacion.total_comentarios} comentarios · ${p.publicacion.total_felicitaciones} felicitaciones`),
    React.createElement('button', { onClick: () => p.onModerarPublicacion(p.publicacion), disabled: p.lecturaPendiente }, p.publicacion.oculta ? 'Revisar para mostrar' : 'Ocultar publicación'),
    React.createElement('button', { onClick: () => p.onModerarComentario(comentario()), disabled: p.lecturaPendiente }, 'Ocultar comentario'),
    p.comentarioActualizado?.oculta ? React.createElement('p', null, 'Comentario confirmado oculto') : null,
    React.createElement('button', { onClick: () => p.onBorrador(`comentarios:${p.publicacion.id}`, true) }, 'Ensayar borrador de comentario'),
    React.createElement('button', { onClick: () => p.onBorrador(`comentarios:${p.publicacion.id}`, false) }, 'Cancelar borrador de comentario'),
    React.createElement('button', { onClick: () => p.onActualizada({ ...p.publicacion, total_comentarios: 2 }) }, 'Ensayar respuesta confirmada'),
  )
  const SharedComposer = p => React.createElement('section', { 'data-shared-composer': true },
    React.createElement('button', { disabled: p.lecturaPendiente, onClick: () => p.onGuardada(post({ id: OTRO, propia: true, autor: { nombre: p.nombre, avatar_url: null, es_admin: true }, contenido: 'Bienvenidas a la comunidad' })) }, 'Ensayar publicación confirmada'),
    React.createElement('button', { onClick: () => p.onAcceso() }, 'Ensayar sesión perdida'),
  )
  const Component = load('src/app/admin/comunidad/ComunidadAdmin.tsx', { react: hooks, 'next/navigation': { useRouter: () => ({ refresh: () => refreshes++ }) }, '@/components/AdminSectionMenu': { default: () => null }, '@/components/NavigationIcon': { default: () => null }, '@/components/community/CommunityComposer': { default: SharedComposer }, '@/components/community/CommunityPostCard': { default: SharedPost }, '@/lib/supabase/client': { createClient: () => db }, '@/lib/community': community }).default
  const actual = { initial: lista(), preguntas: [], consultasError: false, totalPreguntas: 0, sinResponder: 0, adminId: 'administradora', nombre: 'Flor de ensayo', ...props }
  function render() { cursor = 0; return Component(actual) }
  function text(n) { return typeof n === 'string' || typeof n === 'number' ? String(n) : n && typeof n === 'object' ? [n.props?.children].flat(Infinity).map(text).join('') : '' }
  function all(n, pred) { if (!n || typeof n !== 'object') return []; if (typeof n.type === 'function') return all(n.type(n.props), pred); return [...(pred(n) ? [n] : []), ...[n.props?.children].flat(Infinity).flatMap(child => all(child, pred))] }
  return { render, html: () => renderToStaticMarkup(render()), button: label => all(render(), n => n.type === 'button' && text(n) === label)[0], buttons: label => all(render(), n => n.type === 'button' && text(n) === label), field: id => all(render(), n => n.props?.id === id)[0], dialog: () => all(render(), n => n.type === 'dialog')[0], refreshes: () => refreshes, flush: async () => { while (effects.length) effects.shift()(); await Promise.resolve(); await Promise.resolve() } }
}
function respuesta(data, ok = true) { return { ok, json: async () => data } }
async function withFetch(fn, task) { const old = globalThis.fetch; globalThis.fetch = fn; try { await task() } finally { globalThis.fetch = old } }

test('moderación usa identidad nueva sólida, conserva consultas y no tiene borrado, imágenes o comprobantes', () => {
  const view = ui(), html = view.html(), source = read('src/app/admin/comunidad/ComunidadAdmin.tsx')
  assert.match(html, /Comunidad/); assert.match(html, /Un avance/); assert.match(html, /Ocultar publicación/)
  assert.match(html, /1 comentarios · 2 felicitaciones/); assert.ok(html.includes('border-[#E7DDD5]')); assert.ok(html.includes('bg-[#FFFDFA]'))
  assert.ok(!source.includes('.delete(')); assert.ok(!source.includes('imagen_url')); assert.ok(!source.includes('<img')); assert.ok(!source.includes('resultados/'))
  assert.ok(!html.includes('Total preguntas')); assert.ok(!html.includes('Posts este mes'))
  view.button('Consultas anteriores').props.onClick(); assert.match(view.html(), /Se conserva el historial/)
  const error = ui({ initial: { estado: 'error', mensaje: 'Lectura no disponible' } }).html()
  assert.match(error, /role="alert"/); assert.match(error, /Lectura no disponible/); assert.ok(!error.includes('La conversación empieza acá'))
})
test('ocultar pide confirmación y motivo; confirma entidad/version antes de actualizar sin DELETE', async () => {
  const view = ui(), calls = []
  await withFetch(async (url, init) => { calls.push({ url, init }); return respuesta({ ok: true, publicacion: post({ oculta: true, version: 2 }) }) }, async () => {
    view.button('Ocultar publicación').props.onClick()
    assert.equal(calls.length, 0); assert.equal(view.button('Confirmar ocultar').props.disabled, true)
    view.field('motivo-moderacion').props.onChange({ target: { value: 'Revisión del equipo' } })
    await view.button('Confirmar ocultar').props.onClick()
    assert.equal(calls.length, 1); assert.equal(calls[0].url, `/api/comunidad/${ID}`); assert.equal(calls[0].init.method, 'PATCH')
    assert.deepEqual(JSON.parse(calls[0].init.body), { version: 1, accion: 'ocultar', motivo: 'Revisión del equipo' })
    assert.match(view.html(), /Contenido oculto/); assert.match(view.html(), /Revisar para mostrar/); assert.equal(view.dialog(), undefined)
  })
})
test('una respuesta equivocada no finge moderación; reintento conserva motivo y versión', async () => {
  const view = ui(), calls = []
  await withFetch(async (_url, init) => { calls.push(JSON.parse(init.body)); return respuesta({ ok: true, publicacion: post({ id: OTRO, oculta: true, version: 2 }) }) }, async () => {
    view.button('Ocultar publicación').props.onClick(); view.field('motivo-moderacion').props.onChange({ target: { value: 'Necesita revisión' } })
    await view.button('Confirmar ocultar').props.onClick()
    assert.match(view.html(), /El cambio no se pudo confirmar/); assert.equal(view.field('motivo-moderacion').props.value, 'Necesita revisión'); assert.equal(view.field('motivo-moderacion').props.disabled, true)
    assert.ok(!view.html().includes('Contenido oculto. Podés'))
    await view.button('Confirmar ocultar').props.onClick(); assert.deepEqual(calls[0], calls[1])
  })
})
test('doble clic no duplica moderación; Escape no cierra mientras guarda', async () => {
  let resolver, calls = 0
  const view = ui()
  await withFetch(() => { calls++; return new Promise(resolve => { resolver = resolve }) }, async () => {
    view.button('Ocultar publicación').props.onClick(); view.field('motivo-moderacion').props.onChange({ target: { value: 'Control de contenido' } })
    const button = view.button('Confirmar ocultar'), pending = button.props.onClick(); button.props.onClick()
    assert.equal(calls, 1); let prevented = false; view.dialog().props.onCancel({ preventDefault: () => { prevented = true } }); assert.equal(prevented, true)
    resolver(respuesta({ ok: true, publicacion: post({ oculta: true, version: 2 }) })); await pending
    assert.equal(view.dialog(), undefined)
  })
})
test('mostrar no restaura la retirada de autora y no pide motivo nuevo', async () => {
  const view = ui({ initial: lista([post({ oculta: true, retirada: true, version: 3 })]) }), calls = []
  await withFetch(async (_url, init) => { calls.push(JSON.parse(init.body)); return respuesta({ ok: true, publicacion: post({ oculta: false, retirada: true, version: 4 }) }) }, async () => {
    view.button('Revisar para mostrar').props.onClick(); assert.equal(view.field('motivo-moderacion'), undefined)
    await view.button('Confirmar que vuelva a mostrarse').props.onClick()
    assert.deepEqual(calls, [{ version: 3, accion: 'mostrar' }]); assert.match(view.html(), /Sigue sin mostrarse porque su autora/)
  })
})
test('fallo de filtro conserva lectura; paginación deduplica y no acepta cursor repetido', async () => {
  const cursor = `${FECHA}~${ID}`, view = ui({ initial: lista([post()], cursor) }); let n = 0
  await withFetch(async () => ++n === 1 ? respuesta({ mensaje: 'Sin conexión' }, false) : respuesta(lista([post(), post({ id: OTRO })], null)), async () => {
    await view.button('Ocultas').props.onClick(); assert.match(view.html(), /Sin conexión/); assert.match(view.html(), /Hoy terminé/); assert.equal(view.button('Todas').props['aria-pressed'], true)
    await view.button('Cargar más publicaciones').props.onClick(); assert.equal(view.buttons('Ocultar publicación').length, 2); assert.match(view.html(), /2 publicaciones cargadas/)
  })
  const repeated = ui({ initial: lista([post()], cursor) })
  await withFetch(async () => respuesta(lista([post()], cursor)), async () => { await repeated.button('Cargar más publicaciones').props.onClick(); assert.match(repeated.html(), /La lectura no se pudo confirmar/) })
})
test('la moderación de comentarios reutiliza la tarjeta compartida y confirma por su endpoint propio', async () => {
  const view = ui(), calls = []
  await withFetch(async (url, init) => { calls.push({ url, init }); return respuesta({ ok: true, comentario: comentario({ oculta: true, version: 2 }) }) }, async () => {
    view.button('Ocultar comentario').props.onClick(); view.field('motivo-moderacion').props.onChange({ target: { value: 'Revisión comentario' } }); await view.button('Confirmar ocultar').props.onClick()
    assert.equal(calls[0].url, `/api/comunidad/comentarios/${COM}`); assert.match(view.html(), /Comentario confirmado oculto/)
  })
})
test('Flor publica y responde mediante componentes compartidos; solo incorpora acuses confirmados', () => {
  const view = ui()
  assert.ok(view.html().includes('data-shared-composer')); assert.ok(!view.html().includes('Bienvenidas a la comunidad'))
  view.button('Ensayar publicación confirmada').props.onClick()
  assert.match(view.html(), /Bienvenidas a la comunidad/); assert.match(view.html(), /Publicación compartida con las Socias/)
  view.buttons('Ensayar respuesta confirmada')[0].props.onClick()
  assert.match(view.html(), /2 comentarios · 2 felicitaciones/)
  const error = ui({ initial: { estado: 'error', mensaje: 'Sin lectura' } })
  assert.equal(error.button('Ensayar publicación confirmada').props.disabled, true)
  error.button('Ensayar sesión perdida').props.onClick(); assert.match(error.html(), /comprobar tu sesión administrativa/); assert.equal(error.button('Actualizar').props.disabled, true)
})
test('un borrador compartido impide cambiar de filtro y moderar hasta cancelarlo', () => {
  const view = ui()
  view.button('Ensayar borrador de comentario').props.onClick()
  assert.equal(view.button('Ocultas').props.disabled, true); assert.equal(view.button('Actualizar').props.disabled, true)
  view.button('Ocultar publicación').props.onClick(); assert.equal(view.dialog(), undefined)
  view.button('Cancelar borrador de comentario').props.onClick(); assert.equal(view.button('Ocultas').props.disabled, false)
  view.button('Ocultar publicación').props.onClick(); assert.ok(view.dialog())
})
function qaDB({ falloEstado = false, falloInsert = false } = {}) {
  const writes = [], reads = []; let fila = null, estados = 0
  return { writes, reads, from(tabla) {
    let accion = 'select', payload
    const q = { select() { return q }, eq() { return q }, abortSignal() { return q }, insert(body) { accion = 'insert'; payload = body; return q }, update(body) { accion = 'update'; payload = body; return q },
      async maybeSingle() { reads.push(tabla); return { data: fila, error: null } },
      async single() {
        writes.push({ tabla, accion, payload })
        if (accion === 'insert') { if (falloInsert) return { data: null, error: { message: 'red' } }; fila = payload; return { data: payload, error: null } }
        estados++; return falloEstado && estados === 1 ? { data: null, error: { message: 'red' } } : { data: { id: ID, estado: 'respondida' }, error: null }
      } }
    return q
  } }
}
test('Q&A conserva texto en fallo parcial y reintenta solo el estado sin duplicar respuesta', async () => {
  const db = qaDB({ falloEstado: true }), view = ui({ preguntas: [pregunta()], totalPreguntas: 1, sinResponder: 1 }, db)
  view.button('Consultas anteriores').props.onClick(); view.button('Responder consulta').props.onClick(); view.field(`respuesta-${ID}`).props.onChange({ target: { value: 'Probá planificar una tarea.' } })
  await view.button('Responder oficialmente').props.onClick()
  assert.match(view.html(), /Tu respuesta ya quedó guardada/); assert.equal(view.field(`respuesta-${ID}`).props.value, 'Probá planificar una tarea.'); assert.equal(view.field(`respuesta-${ID}`).props.disabled, true)
  assert.equal(db.writes.filter(w => w.accion === 'insert').length, 1)
  await view.button('Reintentar mismo envío').props.onClick()
  assert.equal(db.writes.filter(w => w.accion === 'insert').length, 1); assert.equal(db.writes.filter(w => w.accion === 'update').length, 2)
  assert.equal(view.refreshes(), 1); assert.match(view.html(), /Respuesta oficial guardada/)
})
test('Q&A no marca respondida ni pierde borrador si insertar falla; estadísticas fallidas son desconocidas', async () => {
  const db = qaDB({ falloInsert: true }), view = ui({ preguntas: [pregunta()], totalPreguntas: null, sinResponder: null }, db)
  view.button('Consultas anteriores').props.onClick(); assert.match(view.html(), /Total sin comprobar/); assert.match(view.html(), /Pendientes sin comprobar/)
  view.button('Responder consulta').props.onClick(); view.field(`respuesta-${ID}`).props.onChange({ target: { value: 'Texto a conservar' } }); await view.button('Responder oficialmente').props.onClick()
  assert.match(view.html(), /No se confirmó el guardado/); assert.equal(view.field(`respuesta-${ID}`).props.value, 'Texto a conservar'); assert.equal(db.writes.some(w => w.accion === 'update'), false); assert.equal(view.refreshes(), 0)
})
function paginaAdmin({ status = 200, admin = true, consultas = [], feed = lista() } = {}) {
  const llamadas = []; let consulta = 0
  const supabase = { from: tabla => {
    const n = consulta++; llamadas.push({ tabla, n })
    const q = { select: () => q, not: () => q, eq: () => q, order: () => q, limit: () => q,
      then(resolve, reject) { return Promise.resolve(consultas[n] ?? { data: [], count: 0, error: null }).then(resolve, reject) } }
    return q
  } }
  const sentinel = new Error('NEXT_DYNAMIC_SENTINEL')
  const page = load('src/app/admin/comunidad/page.tsx', {
    'next/navigation': { redirect: url => { throw new Error(`redirect:${url}`) }, unstable_rethrow: error => { if (error === sentinel) throw error } },
    './ComunidadAdmin': { default: () => null }, '@/lib/test-accounts': { FILTRO_CUENTAS_PRUEBA: '(test-excluded)' },
    '@/lib/community-server': { autorizarComunidad: async () => status === 200 ? { supabase, userId: 'admin-propia', admin, perfil: { nombre: 'Flor' } } : { error: { status, mensaje: 'Sin acceso' } }, leerComunidad: async () => feed },
  })
  return { ...page, llamadas, sentinel }
}
test('página administrativa exige rol y sesión antes de leer historial; fallo de acceso no da ceros falsos', async () => {
  for (const [args, url] of [[{ status: 401 }, '/login?next=%2Fadmin%2Fcomunidad'], [{ status: 403 }, '/inicio'], [{ admin: false }, '/inicio']]) {
    const page = paginaAdmin(args); await assert.rejects(page.default(), error => error.message === `redirect:${url}`); assert.equal(page.llamadas.length, 0)
  }
  const error = await paginaAdmin({ status: 503 }).default()
  assert.equal(error.props.initial.estado, 'error'); assert.equal(error.props.consultasError, true); assert.equal(error.props.totalPreguntas, null); assert.equal(error.props.adminId, '')
})
test('página conserva errores independientes y consultas, sin convertir recuentos fallidos en cero', async () => {
  const page = paginaAdmin({ consultas: [{ data: [pregunta()], error: null }, { data: null, count: null, error: { message: 'No disponible' } }, { data: null, count: 1, error: null }], feed: { estado: 'error', mensaje: 'Fallo comunidad' } })
  assert.equal(page.dynamic, 'force-dynamic')
  const result = await page.default()
  assert.equal(result.props.preguntas.length, 1); assert.equal(result.props.consultasError, false); assert.equal(result.props.totalPreguntas, null); assert.equal(result.props.sinResponder, 1); assert.equal(result.props.nombre, 'Flor'); assert.equal(result.props.initial.estado, 'error')
  assert.deepEqual(page.llamadas.map(x => x.tabla), ['preguntas', 'preguntas', 'preguntas'])
  const falloConsultas = await paginaAdmin({ consultas: [{ data: null, error: { message: 'Error historial' } }] }).default()
  assert.equal(falloConsultas.props.consultasError, true); assert.deepEqual(falloConsultas.props.preguntas, []); assert.equal(falloConsultas.props.initial.estado, 'lista')
})
