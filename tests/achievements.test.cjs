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
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(n => n === 'server-only' ? {} : n in deps ? deps[n] : require(n), m, m.exports)
  return m.exports
}
const management = load('src/lib/class-management.ts'), day = load('src/lib/my-day.ts')
const logic = load('src/lib/achievements.ts', { './class-management': management, './my-day': day })
const socia = { rol: 'alumna', tipo_usuario: 'socia', estado: 'activa' }
const base = { fecha: '2026-10-19', desde: '2026-09-20', clases: { estado: 'lista', datos: { completadas: 1, disponibles: 9, programas: 0 } }, metricas: { estado: 'lista', datos: { analisis: 0 } }, dia: { estado: 'lista', datos: { tareas: 0, dias: 0, racha: 0 } } }
const clase = (id, modulo = 'Bienvenida', extra = {}) => ({ id, modulo, activo: true, tiene_video_privado: true, puede_ver: true, ...extra })
test('logros: solo Socias activas; gratuitos, desafío, pausadas y admin no se habilitan', () => {
  assert.equal(logic.puedeVerLogros(socia), true)
  for (const rol of ['afiliada', 'afiliada_lanzamiento']) assert.equal(logic.puedeVerLogros({ rol, estado: 'activa' }), true)
  for (const p of [null, {}, { ...socia, estado: 'pausada' }, { ...socia, tipo_usuario: 'gratuito' }, { ...socia, tipo_usuario: 'desafio', desafio_socias_habilitada: true }, { ...socia, rol: 'admin' }]) assert.equal(logic.puedeVerLogros(p), false)
})
test('clases: no cuenta duplicados, ocultas, sin video ni bloqueadas; un programa incluye su apoyo', () => {
  const clases = [clase('a', 'Introducción'), clase('a', 'Bienvenida'), clase('b', 'Bienvenida › Material de apoyo'), clase('c', 'Otro', { puede_ver: false }), clase('d', 'Oculto', { activo: false }), clase('e', 'Sin video', { tiene_video_privado: false })]
  const progreso = ['a', 'a', 'c', 'd', 'e', 'ajena'].map(clase_id => ({ clase_id, completada: true }))
  assert.deepEqual(logic.resumenClasesLogros(clases, progreso), { completadas: 1, disponibles: 2, programas: 0 })
  assert.deepEqual(logic.resumenClasesLogros(clases, [...progreso, { clase_id: 'b', completada: true }]), { completadas: 2, disponibles: 2, programas: 1 })
  assert.deepEqual(logic.resumenClasesLogros([], progreso), { completadas: 0, disponibles: 0, programas: 0 })
  assert.equal(logic.resumenClasesLogros([clase('a'), clase('vimeo-bloqueado', 'Bienvenida', { tiene_video_privado: false, vimeo_url: null, puede_ver: false })], progreso).programas, 0)
})
test('Mi día: período de 30 días, sin fechas futuras ni datos ajenos; racha hoy o ayer', () => {
  const fila = (fecha, completadas = 1, alumna_id = 'yo') => ({ fecha, completadas, total: completadas, alumna_id })
  const filas = [fila('2026-10-19', 2), fila('2026-10-18'), fila('2026-10-17'), fila('2026-09-20'), fila('2026-09-19', 100), fila('2026-10-20', 100), fila('2026-10-19', 100, 'otra')]
  assert.deepEqual(logic.resumenDiasLogros(filas, 'yo', base.fecha), { tareas: 5, dias: 4, racha: 3 })
  assert.equal(logic.resumenDiasLogros(filas.filter(f => f.fecha !== base.fecha), 'yo', base.fecha).racha, 2)
  assert.equal(logic.resumenDiasLogros([fila('2026-10-17')], 'yo', base.fecha).racha, 0)
  assert.throws(() => logic.resumenDiasLogros([fila('2026-10-17'), fila('2026-10-17')], 'yo', base.fecha))
  assert.throws(() => logic.resumenDiasLogros([{ ...fila('2026-10-17'), total: 0 }], 'yo', base.fecha))
  for (const n of [null, undefined, '', true, -1, 0.5, Infinity, NaN, 'mal']) assert.throws(() => logic.enteroLogros(n))
  assert.equal(logic.enteroLogros('0'), 0)
})
test('hitos: umbrales reales, errores desconocidos y módulos bloqueados nunca se vuelven ceros', () => {
  assert.equal(logic.hitosLogros(base).filter(h => h.estado === 'alcanzado').length, 1)
  const all = logic.hitosLogros({ ...base, clases: { estado: 'lista', datos: { completadas: 3, disponibles: 3, programas: 1 } }, metricas: { estado: 'lista', datos: { analisis: 5 } }, dia: { estado: 'lista', datos: { tareas: 10, dias: 3, racha: 1 } } })
  assert.equal(all.filter(h => h.estado === 'alcanzado').length, 8)
  const unknown = logic.hitosLogros({ ...base, clases: { estado: 'error' }, metricas: { estado: 'bloqueada' }, dia: { estado: 'error' } })
  assert.ok(unknown.every(h => h.actual === null && ['error', 'bloqueado'].includes(h.estado)))
})
function server({ permisoM = true, permisoD = true, falloM = false, falloD = false, falloClases = false, falloProgreso = false, count = 6, rpcError = null } = {}) {
  const calls = []
  const supabase = {
    from: tabla => ({ select: (campos, opciones) => ({ eq: async (campo, id) => { calls.push({ tabla, campos, opciones, campo, id }); return { count, error: falloM ? {} : null } } }) }),
    rpc: async (nombre, args) => { calls.push({ nombre, args }); return { error: rpcError, data: [{ alumna_id: 'yo', fecha: base.fecha, total: 2, completadas: 1 }, { alumna_id: 'ajena', fecha: base.fecha, total: 999, completadas: 999 }] } },
  }
  const s = load('src/lib/achievements-server.ts', {
    './achievements': logic, './my-day': day,
    './class-catalog': { leerCatalogoClases: async () => { if (falloClases) throw new Error(); return [clase('a')] } },
    './class-progress-server': { leerProgresoClases: async (_s, id) => { calls.push({ progreso: id }); if (falloProgreso) throw new Error(); return [{ clase_id: 'a', completada: true }] } },
    './metrics-server': { permisoMetricas: async () => ({ permitido: permisoM, error: falloM }) },
    './my-day-server': { permisoMiDia: async () => ({ permitido: permisoD, error: falloD }) },
  })
  return { s, calls, supabase }
}
test('lector usa sesión propia, recuento exacto y RPC existente sin nuevas escrituras', async () => {
  const { s, calls, supabase } = server()
  const result = await s.leerLogros(supabase, 'yo', socia, base.fecha)
  assert.equal(result.clases.datos.completadas, 1); assert.equal(result.metricas.datos.analisis, 6); assert.equal(result.dia.datos.tareas, 1)
  assert.deepEqual(calls.find(c => c.tabla), { tabla: 'metricas', campos: 'id', opciones: { count: 'exact', head: true }, campo: 'alumna_id', id: 'yo' })
  assert.deepEqual(calls.find(c => c.nombre), { nombre: 'resumen_mi_dia', args: { desde: base.desde, hasta: base.fecha } })
  assert.deepEqual(calls.find(c => c.progreso), { progreso: 'yo' })
  const denied = server()
  await assert.rejects(() => denied.s.leerLogros(denied.supabase, 'yo', { ...socia, tipo_usuario: 'gratuito' }, base.fecha))
  assert.equal(denied.calls.length, 0)
})
test('lector no consulta módulos no habilitados y conserva las otras fuentes ante fallos', async () => {
  const no = server({ permisoM: false, permisoD: false })
  const blocked = await no.s.leerLogros(no.supabase, 'yo', socia, base.fecha)
  assert.equal(blocked.metricas.estado, 'bloqueada'); assert.equal(blocked.dia.estado, 'bloqueada')
  assert.ok(!no.calls.some(c => c.tabla || c.nombre))
  for (const config of [{ falloM: true }, { count: null }, { falloD: true }, { rpcError: {} }, { falloClases: true }, { falloProgreso: true }]) {
    const x = server(config), result = await x.s.leerLogros(x.supabase, 'yo', socia, base.fecha)
    assert.ok([result.clases, result.metricas, result.dia].some(f => f.estado === 'error'))
    assert.ok([result.clases, result.metricas, result.dia].some(f => f.estado === 'lista'))
  }
})
test('API de logros: anónimas 401, plan no autorizado/admin 403, perfil fallido 503; sin ID elegible del cliente', async () => {
  for (const [user, perfil, fallo, status] of [[null, socia, false, 401], [{ id: 'yo' }, { ...socia, tipo_usuario: 'gratuito' }, false, 403], [{ id: 'yo' }, { ...socia, rol: 'admin' }, false, 403], [{ id: 'yo' }, socia, true, 503], [{ id: 'yo' }, socia, false, 200]]) {
    let called
    const db = { auth: { getUser: async () => ({ data: { user } }) }, from: () => ({ select: () => ({ eq: (_k, id) => { assert.equal(id, 'yo'); return { maybeSingle: async () => ({ data: perfil, error: fallo }) } } }) }) }
    const api = load('src/app/api/logros/route.ts', { 'next/server': { NextResponse: { json: (v, o) => Response.json(v, o) } }, '@/lib/supabase/server': { createClient: async () => db }, '@/lib/achievements': logic, '@/lib/achievements-server': { leerLogros: async (_s, id) => { called = id; return base } }, '@/lib/metrics': { fechaArgentina: () => base.fecha } })
    const response = await api.GET(new Request('https://app.test/api/logros?usuaria=ajena'))
    assert.equal(response.status, status); assert.equal(response.headers.get('cache-control'), 'private, no-store')
    assert.equal(called, status === 200 ? 'yo' : undefined)
  }
})
const uiDeps = { 'next/link': { default: ({ prefetch, ...props }) => React.createElement('a', props) }, '@/components/NavigationIcon': { default: () => null }, '@/components/ArrowIcon': { default: () => null }, '@/lib/achievements': logic }
test('tarjetas accesibles: progreso auténtico, estados sin datos, bordes y acciones de 44px', () => {
  const ui = load('src/app/logros/LogrosCliente.tsx', uiDeps)
  for (const h of logic.hitosLogros(base)) {
    const html = renderToStaticMarkup(React.createElement(ui.TarjetaLogro, { hito: h }))
    assert.ok(html.includes('min-h-11')); assert.ok(html.includes('border-'))
    assert.ok(html.includes('progress')); assert.ok(html.includes('aria-label="Avance de '))
  }
  for (const estado of ['bloqueado', 'error']) {
    const html = renderToStaticMarkup(React.createElement(ui.TarjetaLogro, { hito: { ...logic.hitosLogros(base)[0], estado, actual: null } }))
    assert.ok(!html.includes('<progress')); assert.ok(!html.includes('0 /'))
    assert.ok(estado === 'error' ? !html.includes('href=') : html.includes('Ver mi acceso'))
  }
  const html = renderToStaticMarkup(React.createElement(ui.default, { inicial: base }))
  assert.ok(html.includes('Mis logros')); assert.ok(html.includes('Filtrar logros')); assert.ok(html.includes('hora Argentina'))
  assert.ok(!html.includes('Comisiones totales')); assert.ok(!html.includes('/ranking'))
})
test('inicio muestra Logros solo por acceso y no abre Objetivos/Productos ni cambia permisos de prueba', () => {
  assert.ok(!fs.existsSync(path.join(__dirname, '../src/app/qa-logros/page.tsx')))
  const src = read('src/app/inicio/page.tsx')
  assert.ok(src.includes('logrosHabilitados={puedeVerLogros(perfil)}'))
  assert.ok(read('src/app/logros/page.tsx').includes("perfil.rol === 'admin') redirect('/admin')"))
  for (const file of ['src/app/logros/page.tsx', 'src/app/api/logros/route.ts', 'src/lib/achievements-server.ts']) {
    const source = read(file)
    for (const mutation of ['.insert(', '.update(', '.upsert(', '.delete(', 'signOut(']) assert.ok(!source.includes(mutation))
    assert.ok(!source.includes('user_metadata'))
  }
})
test('actualizar evita doble lectura y conserva los datos si falla; éxito reemplaza la lectura', async () => {
  const before = global.fetch
  function view() {
    const updates = []
    const Component = load('src/app/logros/LogrosCliente.tsx', { ...uiDeps, react: { ...React, useRef: value => ({ current: value }), useState: initial => { const i = updates.states++; return [initial, value => updates.push([i, value])] } } }).default
    updates.states = 0
    const tree = Component({ inicial: base })
    function find(node) {
      if (!node || typeof node !== 'object') return null
      if (node.type === 'button' && node.props.children === 'Actualizar avances') return node
      for (const c of React.Children.toArray(node.props?.children)) { const result = find(c); if (result) return result }
    }
    return { button: find(tree), updates }
  }
  try {
    for (const ok of [true, false]) {
      let calls = 0, finish
      global.fetch = () => { calls++; return new Promise(resolve => { finish = resolve }) }
      const v = view()
      v.button.props.onClick(); v.button.props.onClick()
      assert.equal(calls, 1)
      finish({ ok, json: async () => ok ? { ...base, fecha: '2026-10-20' } : { error: 'Se interrumpió la conexión.' } })
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(v.updates.some(([i]) => i === 0), ok)
      assert.ok(v.updates.some(([i, value]) => i === 2 && value === false))
      if (!ok) assert.ok(v.updates.some(([i, value]) => i === 3 && value === 'Se interrumpió la conexión.'))
    }
  } finally { global.fetch = before }
})
test('página no mezcla admin/alumna ni confunde un fallo de acceso con un módulo bloqueado', async () => {
  for (const [user, perfil, error, resultado] of [[null, null, null, '/login?next=%2Flogros'], [{ id: 'yo' }, { ...socia, rol: 'admin' }, null, '/admin'], [{ id: 'yo' }, { ...socia, tipo_usuario: 'desafio' }, null, 'bloqueado'], [{ id: 'yo' }, null, true, 'error'], [{ id: 'yo' }, socia, null, 'lista']]) {
    let reads = 0
    const Component = load('src/app/logros/page.tsx', {
      '@/lib/supabase/server': {
        createClient: async () => ({
          auth: { getUser: async () => ({ data: { user } }) },
          from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: perfil, error }) }) }) }),
        }),
      },
      '@/components/ModuleLocked': { default: () => React.createElement('div', null, 'bloqueado') },
      '@/lib/achievements': logic, '@/lib/achievements-server': { leerLogros: async () => { reads++; return base } },
      '@/lib/metrics': { fechaArgentina: () => base.fecha }, 'next/navigation': { redirect: ruta => { throw new Error(ruta) } },
      './LogrosCliente': { default: () => React.createElement('div', null, 'lista') },
    }).default
    if (resultado.startsWith('/')) await assert.rejects(Component, { message: resultado })
    else {
      const html = renderToStaticMarkup(await Component())
      assert.ok(resultado === 'error' ? html.includes('No pudimos comprobar') : html.includes(resultado))
    }
    assert.equal(reads, resultado === 'lista' ? 1 : 0)
  }
})
