/* eslint-disable @typescript-eslint/no-require-imports */
// Integración con servicios y datos ficticios. No prueba sesión/RLS ni sustituye
// el recorrido real en móvil de la cuenta de prueba.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name === 'server-only' ? {} : name in deps ? deps[name] : require(name), m, m.exports)
  return m.exports
}
const link = { default: props => React.createElement('a', props) }
const access = load('src/lib/class-access.ts')
const perfil = { id: 'cuenta-propia', nombre: 'Socia Ficticia', rol: 'alumna', tipo_usuario: 'socia', estado: 'activa', desafio_socias_habilitada: false }
const resumen = { estado: 'listo', programas: [], total: 11, completadas: 1, enCurso: 1, bloqueadas: 2, sinVideo: 0, programasCompletos: 0, proxima: { id: '00000000-0000-4000-8000-000000000001', titulo: 'Mi próxima clase', programa: 'Desafío Socias', seccion: 'Clases', motivo: 'continuar', posicionSeg: 30 } }
function summary(reader = async () => resumen) {
  return load('src/app/perfil/ProfileLearningSummary.tsx', { 'next/link': link, '@/lib/class-access': access, '@/lib/learning-campus-server': { leerCampusAprendizaje: reader } })
}
const summaryUI = summary()
const htmlSummary = data => renderToStaticMarkup(React.createElement(summaryUI.ProfileLearningSummaryView, { resumen: data }))

test('perfil muestra el avance real sin porcentaje heredado ni declarar terminado el programa', () => {
  const html = htmlSummary(resumen)
  assert.match(html, /Tu avance en las clases/)
  assert.match(html, /Completadas<\/dt><dd[^>]*>1<\/dd>/)
  assert.match(html, /En curso<\/dt><dd[^>]*>1<\/dd>/)
  assert.match(html, /Disponibles<\/dt><dd[^>]*>11<\/dd>/)
  assert.match(html, /href="\/classroom\?clase=00000000-0000-4000-8000-000000000001"/)
  assert.match(html, /Retomar mi formación/)
  assert.match(html, /material bloqueado no se cuenta como completado/)
  for (const falso of ['Progreso del curso', '%', 'progressbar', 'certificado', 'graduada', 'autoPlay', 'iframe']) assert.ok(!html.includes(falso))
})

test('fallo de progreso conserva disponibilidad pero nunca inventa cero ni un próximo video', () => {
  const html = htmlSummary({ ...resumen, estado: 'error', completadas: null, enCurso: null, proxima: resumen.proxima })
  assert.match(html, /role="alert"/)
  assert.match(html, /No pudimos cargar todo tu avance/)
  assert.match(html, /Disponibles<\/dt><dd[^>]*>11<\/dd>/)
  assert.equal((html.match(/aria-label="Sin datos disponibles"/g) || []).length, 2)
  assert.match(html, /href="\/perfil"[^>]*>Reintentar/)
  assert.ok(!html.includes('?clase=')); assert.ok(!html.includes('Retomar mi formación'))
  assert.ok(!html.includes('>0</dd>')); assert.ok(!html.includes('%'))
})

test('catálogo desconocido, vacío real y completadas reales no se confunden', () => {
  const desconocido = htmlSummary(null)
  assert.equal((desconocido.match(/aria-label="Sin datos disponibles"/g) || []).length, 3)
  assert.ok(!desconocido.includes('Todavía no hay clases')); assert.ok(!desconocido.includes('>0</dd>'))
  const vacio = htmlSummary({ ...resumen, total: 0, completadas: 0, enCurso: 0, proxima: null })
  assert.equal((vacio.match(/>0<\/dd>/g) || []).length, 3)
  assert.match(vacio, /Todavía no hay clases disponibles con tu acceso actual/)
  assert.ok(!vacio.includes('role="alert"'))
  const completas = htmlSummary({ ...resumen, completadas: 11, enCurso: 0, proxima: null })
  assert.match(completas, /Completadas<\/dt><dd[^>]*>11<\/dd>/)
  assert.ok(!completas.includes('Todavía no hay clases')); assert.ok(!completas.includes('certificado')); assert.ok(!completas.includes('%'))
})

test('próxima clase nueva no finge reanudar; título escapado y controles táctiles sólidos', () => {
  const html = htmlSummary({ ...resumen, proxima: { ...resumen.proxima, id: 'id con ? & /', titulo: '<script>Clase muy larga</script>', motivo: 'empezar', posicionSeg: null } })
  assert.match(html, /Seguir mi formación/); assert.match(html, /Para seguir:/)
  assert.match(html, /clase=id%20con%20%3F%20%26%20%2F/)
  assert.match(html, /&lt;script&gt;Clase muy larga&lt;\/script&gt;/)
  assert.ok(!html.includes('<script>')); assert.ok(!html.includes('Retomar'))
  for (const clase of ['min-w-0', 'min-h-11', 'break-words', 'border-[#E7DDD5]', 'bg-white']) assert.ok(html.includes(clase))
  const loading = renderToStaticMarkup(React.createElement(summaryUI.ProfileLearningSummaryLoading))
  assert.match(loading, /role="status"/); assert.ok(!loading.includes('>0')); assert.ok(!loading.includes('%'))
})

test('resumen servidor delega al lector existente con identidad protegida sin pasar cliente a la vista', async () => {
  const db = { sesion: 'ficticia' }, calls = []
  const component = summary(async (...args) => { calls.push(args); return resumen }).default
  const element = await component({ supabase: db, usuariaId: 'cuenta-propia', perfil })
  assert.deepEqual(calls, [[db, 'cuenta-propia', perfil]])
  assert.deepEqual(Object.keys(element.props), ['resumen']); assert.equal(element.props.resumen, resumen)
  const failed = await summary(async () => { throw new Error('detalle privado') }).default({ supabase: db, usuariaId: 'cuenta-propia', perfil })
  const html = renderToStaticMarkup(failed)
  assert.match(html, /No pudimos cargar todo tu avance/); assert.ok(!html.includes('detalle privado')); assert.ok(!html.includes('>0</dd>'))
})

test('resumen nunca consulta formación privada para admin, acceso denegado o ID ausente', async () => {
  let calls = 0
  const component = summary(async () => { calls++; return resumen }).default
  for (const protegido of [{ ...perfil, rol: 'admin' }, { ...perfil, tipo_usuario: 'gratuito' }, { ...perfil, tipo_usuario: 'desafio' }, { ...perfil, estado: 'pausada', desafio_socias_habilitada: true }, { ...perfil, estado: 'cancelada' }, { ...perfil, estado: null }, null]) {
    assert.equal(await component({ supabase: {}, usuariaId: 'cuenta-propia', perfil: protegido }), null)
  }
  assert.equal(await component({ supabase: {}, usuariaId: '', perfil }), null)
  assert.equal(calls, 0)
})

function pageFixture({ protegido = perfil, errorPerfil = null, user = { id: 'cuenta-propia', email: 'socia@example.test' }, errorSesion = null } = {}) {
  const calls = [], clientes = []
  const db = {
    auth: { getUser: async () => { calls.push('sesion'); return { data: { user }, error: errorSesion } } },
    from(table) {
      calls.push(['tabla', table])
      return { select(columns) { calls.push(['select', columns]); return { eq(campo, id) { calls.push(['eq', campo, id]); return { single: async () => ({ data: protegido, error: errorPerfil }) } } } } }
    },
  }
  const Page = load('src/app/perfil/page.tsx', {
    'next/link': link, 'next/navigation': { redirect: to => { throw new Error('redirect:' + to) } },
    '@/lib/supabase/server': { createClient: async () => db }, '@/lib/class-access': access,
    './PerfilCliente': { default: props => { clientes.push(props); return React.createElement('div', { 'data-editor': true }, props.formacion) } },
    './ProfileLearningSummary': {
      default: props => { calls.push('formacion'); assert.equal(props.supabase, db); assert.equal(props.usuariaId, user.id); assert.equal(props.perfil, protegido); return React.createElement('section', { 'data-formacion': true }) },
      ProfileLearningSummaryLoading: () => React.createElement('p', { role: 'status' }, 'Cargando'),
    },
  }).default
  return { Page, calls, clientes }
}

test('página compone resumen por permiso real para Socias y Desafío, sin nueva consulta de perfil', async () => {
  for (const protegido of [perfil, { ...perfil, tipo_usuario: 'desafio', desafio_socias_habilitada: true }, { ...perfil, tipo_usuario: 'gratuito', desafio_socias_habilitada: true }]) {
    const p = pageFixture({ protegido }), html = renderToStaticMarkup(await p.Page())
    assert.match(html, /data-editor="true"/); assert.match(html, /data-formacion="true"/)
    assert.equal(p.calls.filter(call => call === 'formacion').length, 1)
    assert.deepEqual(p.calls.filter(Array.isArray), [['tabla', 'perfiles'], ['select', '*'], ['eq', 'id', 'cuenta-propia']])
    assert.deepEqual(Object.keys(p.clientes[0]).sort(), ['formacion', 'perfil', 'user'])
    assert.ok(!Object.hasOwn(p.clientes[0], 'supabase'))
  }
})

test('gratuita, pendiente, rechazada, pausada, cancelada y admin conservan perfil sin resumen de alumna', async () => {
  for (const protegido of [
    { ...perfil, tipo_usuario: 'gratuito' },
    { ...perfil, tipo_usuario: 'desafio', desafio_socias_estado: 'pendiente' },
    { ...perfil, tipo_usuario: 'desafio', desafio_socias_estado: 'rechazada' },
    { ...perfil, estado: 'pausada', desafio_socias_habilitada: true },
    { ...perfil, estado: 'cancelada' }, { ...perfil, estado: null }, { ...perfil, rol: 'admin' },
  ]) {
    const p = pageFixture({ protegido }), html = renderToStaticMarkup(await p.Page())
    assert.match(html, /data-editor="true"/); assert.ok(!html.includes('data-formacion'))
    assert.ok(!p.calls.includes('formacion')); assert.equal(p.clientes[0].formacion, null)
  }
})

test('sesión ausente/fallida redirige antes de leer perfil; metadata no otorga formación', async () => {
  for (const options of [{ user: null }, { errorSesion: { code: 'simulado' } }]) {
    const p = pageFixture(options)
    await assert.rejects(p.Page, /redirect:\/login/); assert.deepEqual(p.calls, ['sesion'])
  }
  const p = pageFixture({ protegido: { ...perfil, tipo_usuario: 'gratuito' }, user: { id: perfil.id, user_metadata: { rol: 'admin', tipo_usuario: 'socia' } } })
  const html = renderToStaticMarkup(await p.Page())
  assert.ok(!html.includes('data-formacion')); assert.ok(!p.calls.includes('formacion'))
})

test('perfil ausente, equivocado o fallido muestra recuperación y no editor vacío ni avance falso', async () => {
  for (const options of [{ protegido: null }, { errorPerfil: { code: 'fallo' } }, { protegido: { ...perfil, id: 'otra-cuenta' } }]) {
    const p = pageFixture(options), html = renderToStaticMarkup(await p.Page())
    assert.match(html, /role="alert"/); assert.match(html, /No pudimos cargar tu perfil/)
    assert.match(html, /href="\/perfil"[^>]*>Reintentar/)
    assert.ok(!html.includes('data-editor')); assert.ok(!p.calls.includes('formacion')); assert.equal(p.clientes.length, 0)
    assert.ok(!html.includes('0%'))
  }
})

function profileClient({ admin = false, editando = true } = {}) {
  let index = 0
  const values = [], calls = []
  const react = { ...React, useEffect() {}, useState(initial) { const current = index++; values[current] ??= current === 13 ? editando : initial; return [values[current], value => { values[current] = value }] } }
  const p = { ...perfil, rol: admin ? 'admin' : 'alumna', nombre: 'Socia Ficticia', whatsapp: '+549000000000', fecha_nacimiento: '1990-01-01', ocupacion: 'Profesional', titulo_profesional: 'Diseñadora', es_mama: false, ingresos_actuales: 'Prefiero no responder', pais: 'Argentina', provincia: 'Córdoba', avatar_url: null, progreso: 87 }
  const db = {
    from(table) { return { update(fields) { calls.push(['update', table, fields]); return { eq(campo, id) { calls.push(['eq', campo, id]); return { select(columns) { calls.push(['select', columns]); return { maybeSingle: async () => ({ data: { id }, error: null }) } } } } } } } },
  }
  const Component = load('src/app/perfil/PerfilCliente.tsx', {
    react, 'next/link': link, 'next/navigation': { useRouter: () => ({ refresh() { calls.push('refresh') } }), useSearchParams: () => ({ get: () => null }) },
    '@/lib/supabase/client': { createClient: () => db },
    '@/components/EmailPreference': { default: () => React.createElement('section', { 'data-email-preference': true }) },
    '@/components/PushPreference': { default: () => React.createElement('section', { 'data-push-preference': true }) },
    '@/components/InvitationLinks': { default: () => React.createElement('section', { 'data-invitaciones': true }) },
    '@/lib/perfil-preguntas': load('src/lib/perfil-preguntas.ts'),
  }).default
  const element = Component({ user: { id: perfil.id, email: 'socia@example.test' }, perfil: p, formacion: React.createElement('section', { 'data-learning-slot': true }, 'Mi avance real') })
  return { element, calls }
}
function findElement(node, predicate) {
  if (!React.isValidElement(node)) return null
  if (predicate(node)) return node
  for (const child of React.Children.toArray(node.props.children)) { const found = findElement(child, predicate); if (found) return found }
  return null
}

test('avance está fuera del editor y sigue visible al plegarlo; encuesta y preferencias se conservan', () => {
  for (const editando of [true, false]) {
    const { element } = profileClient({ editando }), html = renderToStaticMarkup(element)
    assert.match(html, /data-learning-slot="true"/)
    assert.match(html, /data-email-preference="true"/); assert.match(html, /data-push-preference="true"/)
    assert.match(html, /href="\/cuenta\/contrasena"/)
    assert.ok(!html.includes('Progreso del curso')); assert.ok(!html.includes('87%')); assert.ok(!html.includes('0%'))
    const form = findElement(element, item => item.type === 'form')
    assert.equal(Boolean(form), editando)
    if (form) {
      assert.equal(findElement(form, item => item.props['data-learning-slot']), null)
      for (const campo of ['perfil-nombre', 'perfil-email', 'perfil-telefono', 'perfil-nacimiento', 'perfil-ocupacion', 'perfil-titulo', 'perfil-ingresos', 'perfil-pais', 'perfil-provincia']) assert.ok(findElement(form, item => item.props.id === campo))
      const email = findElement(form, item => item.props.id === 'perfil-email')
      assert.equal(email.props.value, 'socia@example.test'); assert.equal(email.props.disabled, true)
    }
  }
  const admin = renderToStaticMarkup(profileClient({ admin: true }).element)
  assert.ok(!admin.includes('data-learning-slot')); assert.match(admin, /data-invitaciones="true"/); assert.match(admin, /href="\/admin"/)
})

test('guardar la encuesta mantiene los campos existentes y nunca escribe ni borra progreso legado', async () => {
  const p = profileClient(), form = findElement(p.element, item => item.type === 'form')
  await form.props.onSubmit({ preventDefault() {} })
  const update = p.calls.find(call => Array.isArray(call) && call[0] === 'update')
  assert.equal(update[1], 'perfiles')
  assert.deepEqual(Object.keys(update[2]).sort(), ['nombre', 'whatsapp', 'avatar_url', 'fecha_nacimiento', 'ocupacion', 'titulo_profesional', 'es_mama', 'ingresos_actuales', 'pais', 'provincia'].sort())
  assert.equal(update[2].es_mama, false); assert.equal(update[2].titulo_profesional, 'Diseñadora')
  assert.deepEqual(p.calls.find(call => Array.isArray(call) && call[0] === 'eq'), ['eq', 'id', perfil.id])
  assert.deepEqual(p.calls.find(call => Array.isArray(call) && call[0] === 'select'), ['select', 'id'])
  assert.ok(p.calls.includes('refresh'))
  assert.ok(!read('src/app/perfil/PerfilCliente.tsx').includes('perfil?.progreso'))
})

test('lectura formativa reutiliza campus sin nuevas tablas, escrituras, credenciales ni estado cliente', () => {
  const source = read('src/app/perfil/ProfileLearningSummary.tsx')
  assert.ok(source.startsWith("import 'server-only'")); assert.match(source, /await leerCampusAprendizaje\(supabase, usuariaId, perfil\)/)
  for (const peligro of ['.from(', '.insert(', '.update(', '.upsert(', '.delete(', 'createAdminClient', 'user_metadata', 'process.env', 'useEffect(', 'useState(']) assert.ok(!source.includes(peligro))
  assert.ok(!source.includes('backdrop-blur')); assert.ok(!source.includes('overflow-hidden'))
})
