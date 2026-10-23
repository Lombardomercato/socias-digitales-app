/* eslint-disable @typescript-eslint/no-require-imports */
// Datos ficticios, SSR y eventos simulados. Sin navegador, permisos reales ni descargas.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => name in deps ? deps[name] : require(name), m, m.exports)
  return m.exports
}
const management = load('src/lib/class-management.ts'), access = load('src/lib/class-access.ts')
const materials = load('src/lib/class-materials.ts', { './class-management': management })
const library = load('src/lib/resource-library.ts', { './class-access': access, './class-management': management, './class-materials': materials })
const deps = {
  'next/link': { default: props => React.createElement('a', props) },
  './ArrowIcon': load('src/components/ArrowIcon.tsx'),
  './ClassMaterials': load('src/components/ClassMaterials.tsx'),
  '@/lib/resource-library': library,
  '@/lib/class-management': management,
}
const id = numero => `${numero.toString(16).padStart(8, '0')}-1111-4111-8111-111111111111`
const revision = 'a'.repeat(64)
const recurso = (numero, clase = 100, cambio = {}) => ({ clave: `${id(clase)}:${id(numero)}`, id: id(numero), titulo: `Guía ${numero}`, tipo: 'archivo', detalle: 'PDF · 12 KB', href: `/api/classroom/${id(clase)}/materiales/${id(numero)}`, claseId: id(clase), claseTitulo: 'Elegí tu nicho', programa: 'Desafío Socias', seccion: 'Clases', ...cambio })
function pagina(recursos = [], { offset = 0, mas = false, fallos = [], revisionCatalogo = revision } = {}) {
  const leidas = new Set(recursos.map(item => item.claseId)).size
  return { estado: fallos.length ? 'parcial' : 'listo', offset, nextOffset: mas ? offset + 20 : null, hayMas: mas, revisionCatalogo, recursos, fallos, resumen: { clasesRevisadas: mas ? 20 : leidas + fallos.length, clasesLeidas: mas ? 20 - fallos.length : leidas, materiales: recursos.length, archivos: recursos.filter(item => item.tipo === 'archivo').length, enlaces: recursos.filter(item => item.tipo === 'enlace').length } }
}
const fallo = clase => ({ claseId: id(clase), claseTitulo: 'Clase pendiente de lectura', programa: 'Desafío Socias', seccion: 'Material de apoyo' })
const respuesta = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const tick = () => new Promise(resolve => setImmediate(resolve))
function texto(elemento) { if (elemento == null || typeof elemento === 'boolean') return ''; if (typeof elemento !== 'object') return String(elemento); return [elemento.props?.children].flat(Infinity).map(texto).join('') }
function all(tree, predicate) { if (!tree || typeof tree !== 'object') return []; return [...(predicate(tree) ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, predicate))] }
function view(inicial) {
  const cells = [], cleanups = []; let cursor = 0, cambios = [], props = { inicial }
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value }] },
    useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] },
    useEffect(effect, deps) { const i = cursor++; if (!cells[i] || deps.some((dep, index) => dep !== cells[i].deps[index])) cambios.push(() => { cells[i]?.cleanup?.(); const cleanup = effect(); cells[i] = { deps, cleanup }; cleanups[i] = cleanup }) },
  }
  const Cliente = load('src/components/ResourceLibraryClient.tsx', { ...deps, react: hooks }).default
  const render = () => { cursor = 0; cambios = []; const tree = Cliente(props); cambios.forEach(effect => effect()); return tree }
  const button = nombre => all(render(), node => node.type === 'button' && texto(node).trim() === nombre)[0]
  const input = () => all(render(), node => node.type === 'input')[0]
  const selects = () => all(render(), node => node.type === 'select')
  return {
    render, button, input, selects, html: () => renderToStaticMarkup(render()),
    buscar: value => input().props.onChange({ target: { value } }),
    programa: value => selects()[0].props.onChange({ target: { value } }),
    tipo: value => selects()[1].props.onChange({ target: { value } }),
    update: inicial => { props = { inicial }; render() },
    unmount: () => cleanups.forEach(cleanup => cleanup?.()),
  }
}

test('SSR muestra material, procedencia y endpoints privados sin descargar automáticamente', () => {
  let llamadas = 0; const prev = global.fetch; global.fetch = async () => { llamadas++; throw new Error() }
  try {
    const ui = view(pagina([recurso(1), recurso(2, 101, { tipo: 'enlace', detalle: 'docs.ejemplo.test' })]))
    const body = ui.html()
    assert.match(body, /2 materiales visibles/); assert.match(body, /1 archivo · 1 enlace/)
    assert.ok(body.includes(`href="/api/classroom/${id(100)}/materiales/${id(1)}"`))
    assert.ok(body.includes(`href="/classroom?clase=${id(100)}"`))
    assert.match(body, /Desafío Socias/); assert.match(body, /Elegí tu nicho/)
    assert.match(body, /rel="noopener noreferrer"/); assert.match(body, /se abre en otra pestaña/)
    assert.match(body, /border-\[#E7DDD5\] bg-\[#FFFDFA\]/)
    assert.match(body, /text-base/); assert.match(body, /min-h-11/)
    assert.ok(!body.includes('<h1')); assert.ok(!body.includes('<iframe')); assert.equal(llamadas, 0)
    ui.unmount()
  } finally { global.fetch = prev }
})

test('búsqueda sin acentos combina programa y tipo, limpia solo al pedirlo', () => {
  const ui = view(pagina([recurso(1, 100, { titulo: 'Guía de acción' }), recurso(2, 101, { programa: 'Bienvenida', tipo: 'enlace', titulo: 'GUÍA de inicio' })]))
  ui.buscar('guia accion'); assert.match(ui.html(), /1 material visible/); assert.ok(!ui.html().includes('GUÍA de inicio'))
  ui.buscar('guia'); ui.programa('Bienvenida'); ui.tipo('enlace')
  assert.match(ui.html(), /1 material visible/); assert.ok(!ui.html().includes('Guía de acción'))
  assert.match(ui.html(), /Cargados: 1 archivo · 1 enlace/)
  assert.equal(ui.input().props.value, 'guia'); assert.equal(ui.selects()[0].props.value, 'Bienvenida'); assert.equal(ui.selects()[1].props.value, 'enlace')
  ui.button('Limpiar filtros').props.onClick()
  assert.match(ui.html(), /2 materiales visibles/); assert.equal(ui.input().props.value, ''); assert.equal(ui.selects()[0].props.value, ''); assert.equal(ui.selects()[1].props.value, 'todos')
  ui.unmount()
})

test('vacío confirmado, ninguna coincidencia y fallo global no son el mismo estado', () => {
  const vacio = view(pagina())
  assert.match(vacio.html(), /Todavía no hay materiales disponibles/); assert.match(vacio.html(), /0 materiales visibles/)
  const filtro = view(pagina([recurso(1)])); filtro.buscar('imposible')
  assert.match(filtro.html(), /No hay coincidencias en los materiales cargados/); assert.ok(!filtro.html().includes('Todavía no hay materiales disponibles'))
  const error = view({ estado: 'error', mensaje: 'Error interno que no mostramos' })
  assert.match(error.html(), /No pudimos cargar la biblioteca/); assert.ok(!error.html().includes('0 materiales')); assert.ok(!error.html().includes('Todavía no hay'))
  assert.ok(!error.html().includes('Error interno')); assert.ok(error.button('Reintentar materiales'))
  for (const ui of [vacio, filtro, error]) ui.unmount()
})

test('cargar más usa revisión y offset propios, deduplica y bloquea doble clic inmediato', async () => {
  const previous = global.fetch, llamadas = []; let terminar
  global.fetch = (url, options) => { llamadas.push({ url, options }); return new Promise(resolve => { terminar = resolve }) }
  try {
    const ui = view(pagina([recurso(1)], { mas: true }))
    assert.match(ui.html(), /Búsqueda en los materiales cargados/)
    const boton = ui.button('Cargar más materiales'); boton.props.onClick(); boton.props.onClick()
    assert.equal(llamadas.length, 1); assert.equal(llamadas[0].url, `/api/classroom/recursos?offset=20&revision=${revision}`)
    assert.equal(llamadas[0].options.cache, 'no-store'); assert.equal(llamadas[0].options.method, undefined)
    assert.equal(ui.button('Cargar más materiales').props.disabled, true); assert.match(ui.html(), /Cargando materiales/)
    terminar(respuesta(pagina([recurso(1), recurso(2, 101)], { offset: 20 }))); await tick()
    assert.match(ui.html(), /2 materiales visibles/); assert.equal((ui.html().match(/>Guía 1<\/h2>/g) || []).length, 1)
    assert.equal(ui.button('Cargar más materiales'), undefined); assert.ok(!ui.html().includes('Búsqueda en los materiales cargados'))
    ui.unmount()
  } finally { global.fetch = previous }
})

test('parcial conserva materiales conocidos y reintenta esa página sin perder filtros', async () => {
  const previous = global.fetch, urls = []
  global.fetch = async url => { urls.push(url); return respuesta(pagina([recurso(1), recurso(2, 101)], { offset: 0 })) }
  try {
    const ui = view(pagina([recurso(1)], { fallos: [fallo(101)] }))
    ui.buscar('guia'); ui.programa('Desafío Socias'); ui.tipo('archivo')
    assert.match(ui.html(), /Quedaron materiales sin comprobar/); assert.match(ui.html(), /Reintentá las clases pendientes/)
    assert.ok(!ui.html().includes('Cargá más para ampliar')); assert.equal(ui.button('Cargar más materiales'), undefined)
    ui.button('Reintentar estas clases').props.onClick(); await tick()
    assert.equal(urls[0], `/api/classroom/recursos?offset=0&revision=${revision}`)
    assert.match(ui.html(), /2 materiales visibles/); assert.ok(!ui.html().includes('Quedaron materiales sin comprobar'))
    assert.equal(ui.input().props.value, 'guia'); assert.equal(ui.selects()[0].props.value, 'Desafío Socias'); assert.equal(ui.selects()[1].props.value, 'archivo')
    ui.unmount()
  } finally { global.fetch = previous }
})

test('fallo de otra página mantiene las confirmadas y el reintento no borra los filtros', async () => {
  const previous = global.fetch; let calls = 0
  global.fetch = async () => ++calls === 1 ? respuesta({ estado: 'error', mensaje: 'Interno' }, 503) : respuesta(pagina([recurso(2, 101)], { offset: 20 }))
  try {
    const ui = view(pagina([recurso(1)], { mas: true })); ui.buscar('guia')
    ui.button('Cargar más materiales').props.onClick(); await tick()
    assert.match(ui.html(), /No pudimos cargar estos materiales/); assert.match(ui.html(), /1 material visible/)
    assert.equal(ui.input().props.value, 'guia'); assert.ok(!ui.html().includes('Interno'))
    ui.button('Reintentar materiales').props.onClick(); await tick()
    assert.match(ui.html(), /2 materiales visibles/); assert.equal(calls, 2); assert.equal(ui.input().props.value, 'guia')
    ui.unmount()
  } finally { global.fetch = previous }
})

test('catálogo actualizado exige reemplazo explícito desde cero conservando filtros', async () => {
  const previous = global.fetch, urls = []
  global.fetch = async url => { urls.push(url); return respuesta(urls.length === 1 ? { estado: 'actualizado', mensaje: 'Cambió' } : pagina([recurso(9)], { revisionCatalogo: 'b'.repeat(64) })) }
  try {
    const ui = view(pagina([recurso(1)], { mas: true })); ui.buscar('guia'); ui.programa('Desafío Socias'); ui.tipo('archivo')
    ui.button('Cargar más materiales').props.onClick(); await tick()
    assert.match(ui.html(), /Tu biblioteca cambió/); assert.ok(!ui.html().includes('Guía 1')); assert.ok(!ui.html().includes('0 materiales visibles'))
    ui.button('Actualizar biblioteca').props.onClick(); await tick()
    assert.equal(urls[1], '/api/classroom/recursos?offset=0')
    assert.match(ui.html(), /Guía 9/); assert.ok(!ui.html().includes('Guía 1'))
    assert.equal(ui.input().props.value, 'guia'); assert.equal(ui.selects()[0].props.value, 'Desafío Socias'); assert.equal(ui.selects()[1].props.value, 'archivo')
    ui.unmount()
  } finally { global.fetch = previous }
})

test('401/403 bloquean más cargas, no interpretan HTML y piden ingreso sin suplanta de cuenta', async () => {
  const previous = global.fetch
  try {
    for (const status of [401, 403]) {
      let calls = 0, json = 0
      global.fetch = async () => { calls++; return { status, ok: false, json: async () => { json++; throw new Error('html') } } }
      const ui = view(pagina([recurso(1)], { mas: true })); ui.button('Cargar más materiales').props.onClick(); await tick()
      assert.match(ui.html(), /No pudimos comprobar tu acceso/); assert.match(ui.html(), /href="\/login"/)
      assert.ok(!ui.html().includes('Guía 1')); assert.ok(!ui.html().includes('0 materiales'))
      assert.equal(ui.button('Cargar más materiales'), undefined); assert.equal(ui.button('Reintentar materiales'), undefined)
      assert.equal(calls, 1); assert.equal(json, 0); ui.unmount()
    }
  } finally { global.fetch = previous }
})

test('respuestas incoherentes no agregan recursos, hrefs externos ni supuestos totales', async () => {
  const previous = global.fetch, buena = pagina([recurso(2, 101)], { offset: 20 })
  const casos = [
    null, [], {}, { ...buena, offset: 0 }, { ...buena, revisionCatalogo: 'otra' }, { ...buena, hayMas: true, nextOffset: 20 },
    { ...buena, hayMas: true, nextOffset: 40 },
    { ...buena, hayMas: true, nextOffset: 21, resumen: { ...buena.resumen, clasesRevisadas: 0, clasesLeidas: 0 } },
    { ...buena, recursos: [recurso(2, 101, { href: 'javascript:alert(1)' })] },
    { ...buena, recursos: [recurso(2, 101, { href: 'https://externo.test/privado' })] },
    { ...buena, recursos: [recurso(2, 101, { clave: 'otra' })] },
    { ...buena, recursos: [recurso(2, 101, { claseId: 'otra' })] },
    { ...buena, recursos: [recurso(2, 101), recurso(2, 101)], resumen: { ...buena.resumen, materiales: 2, archivos: 2 } },
    { ...buena, resumen: { ...buena.resumen, materiales: 999 } },
    { ...buena, resumen: { ...buena.resumen, clasesRevisadas: 21 } },
    { ...buena, resumen: { ...buena.resumen, archivos: 0, enlaces: 1 } },
    pagina(Array.from({ length: 31 }, (_, index) => recurso(10 + index, 101)), { offset: 20 }),
    { ...buena, estado: 'parcial', fallos: [fallo(101)] },
  ]
  try {
    for (const body of casos) {
      global.fetch = async () => respuesta(body)
      const ui = view(pagina([recurso(1)], { mas: true })); ui.button('Cargar más materiales').props.onClick(); await tick()
      assert.match(ui.html(), /No pudimos cargar estos materiales/); assert.match(ui.html(), /1 material visible/)
      assert.ok(!ui.html().includes('Guía 2')); assert.ok(!ui.html().includes('javascript:')); assert.ok(!ui.html().includes('externo.test'))
      ui.unmount()
    }
  } finally { global.fetch = previous }
})

test('una revisión nueva debe ser SHA256 y UUIDs canónicos heredados siguen siendo válidos', async () => {
  const previous = global.fetch
  try {
    for (const revisionCatalogo of ['', 'revision-arbitraria', 'a'.repeat(63), 'A'.repeat(64), 'g'.repeat(64)]) {
      global.fetch = async () => respuesta(pagina([recurso(1)], { revisionCatalogo }))
      const ui = view({ estado: 'error', mensaje: 'Fallo' }); ui.button('Reintentar materiales').props.onClick(); await tick()
      assert.match(ui.html(), /No pudimos cargar estos materiales/); assert.ok(!ui.html().includes('Guía 1')); ui.unmount()
    }
    const claseId = '00000001-1111-7111-0111-111111111111', materialId = '00000002-1111-0111-f111-111111111111'
    const heredado = recurso(1, 100, { id: materialId, claseId, clave: `${claseId}:${materialId}`, href: `/api/classroom/${claseId}/materiales/${materialId}` })
    global.fetch = async () => respuesta(pagina([heredado]))
    const ui = view({ estado: 'error', mensaje: 'Fallo' }); ui.button('Reintentar materiales').props.onClick(); await tick()
    assert.match(ui.html(), /1 material visible/); assert.match(ui.html(), /Guía 1/); ui.unmount()
  } finally { global.fetch = previous }
})

test('desmontar o cambiar la lectura inicial aborta y descarta una respuesta anterior', async () => {
  const previous = global.fetch; let terminar, signal
  global.fetch = (_, options) => { signal = options.signal; return new Promise(resolve => { terminar = resolve }) }
  try {
    const ui = view(pagina([recurso(1)], { mas: true })); ui.button('Cargar más materiales').props.onClick()
    ui.update(pagina([recurso(9)])); assert.equal(signal.aborted, true)
    terminar(respuesta(pagina([recurso(2, 101)], { offset: 20 }))); await tick()
    assert.match(ui.html(), /Guía 9/); assert.ok(!ui.html().includes('Guía 2')); ui.unmount()
    const otro = view(pagina([recurso(1)], { mas: true })); otro.button('Cargar más materiales').props.onClick(); otro.unmount()
    assert.equal(signal.aborted, true); terminar(respuesta(pagina([recurso(2, 101)], { offset: 20 }))); await tick()
    assert.ok(!otro.html().includes('Guía 2')); otro.unmount()
  } finally { global.fetch = previous }
})

test('timeout90s permite reintento manual y una respuesta tardía no pisa el intento nuevo', async () => {
  const previousFetch = global.fetch, previousTimeout = global.setTimeout, previousClear = global.clearTimeout
  const pendientes = [], timers = []; let cleared = 0
  global.fetch = (_, options) => new Promise(resolve => pendientes.push({ resolve, signal: options.signal }))
  global.setTimeout = (callback, ms) => { assert.equal(ms, 90_000); timers.push(callback); return timers.length }
  global.clearTimeout = () => cleared++
  try {
    const ui = view(pagina([recurso(1)], { mas: true })); ui.button('Cargar más materiales').props.onClick()
    timers[0](); assert.equal(pendientes[0].signal.aborted, true)
    assert.match(ui.html(), /tardando más de lo esperado/); assert.ok(!ui.html().includes('Cargando materiales…'))
    ui.button('Reintentar materiales').props.onClick(); assert.equal(pendientes.length, 2)
    pendientes[0].resolve(respuesta(pagina([recurso(8, 108)], { offset: 20 }))); await tick()
    assert.ok(!ui.html().includes('Guía 8')); assert.match(ui.html(), /Cargando materiales/)
    pendientes[1].resolve(respuesta(pagina([recurso(2, 101)], { offset: 20 }))); await tick()
    assert.match(ui.html(), /2 materiales visibles/); assert.ok(!ui.html().includes('Guía 8')); assert.ok(cleared >= 2)
    ui.unmount()
  } finally { global.fetch = previousFetch; global.setTimeout = previousTimeout; global.clearTimeout = previousClear }
})
