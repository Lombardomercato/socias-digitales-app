/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated fictitious files, canvas, hooks and HTTP responses. No real uploads.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => name in deps ? deps[name] : require(name), m, m.exports)
  return m.exports
}
const domain = load('src/lib/community.ts'), shared = load('src/components/community/community-client.ts'), preparation = load('src/lib/community-photo-client.ts')
const id = n => `${n.toString(16).padStart(8, '0')}-1010-4010-8010-101010101010`
const foto = (n = 20, changes = {}) => ({ id: id(n), ancho: 800, alto: 600, ...changes })
const post = (changes = {}) => ({ id: id(1), contenido: 'Mi avance', tipo: 'avance', created_at: '2026-10-26T16:00:00+00:00', actualizado_at: '2026-10-26T16:00:00+00:00', version: 1, retirada: false, oculta: false, propia: true, autor: { nombre: 'Socia de muestra', avatar_url: null, es_admin: false }, total_comentarios: 0, total_felicitaciones: 0, felicitada: false, fotos: [], ...changes })
const archivo = (name = 'foto.jpg', type = 'image/jpeg') => new File(['Contenido ficticio para probar eventos'], name, { type })
const blob = () => new Blob(['WebP ficticio para probar el circuito'], { type: 'image/webp' })
const tick = () => new Promise(resolve => setImmediate(resolve))
const response = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
function all(tree, predicate) { if (!tree || typeof tree !== 'object') return []; return [...(predicate(tree) ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, predicate))] }
function text(tree) { if (typeof tree === 'string' || typeof tree === 'number') return String(tree); return !tree || typeof tree !== 'object' ? '' : [tree.props?.children].flat(Infinity).map(text).join('') }
function PickerStub() { return null }
function PhotosStub() { return null }
function view(file, props = {}, prepare = async () => ({ archivo: blob(), ancho: 800, alto: 600 })) {
  const cells = [], pending = [], cleanups = new Map(); let cursor = 0
  const events = { guardadas: [], borradores: [], accesos: 0 }
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial; return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value }] },
    useRef(initial) { const i = cursor++; if (!(i in cells)) cells[i] = { current: initial }; return cells[i] },
    useEffect(effect, deps) { const i = cursor++, previous = cells[i]; if (!previous || deps.some((value, n) => !Object.is(value, previous[n]))) { cells[i] = deps; pending.push([i, effect]) } },
  }
  const deps = {
    react: hooks, '@/components/ArrowIcon': { default: () => null }, '@/components/NavigationIcon': { default: () => null }, '@/lib/community': domain,
    '@/lib/community-photo-client': { ...preparation, prepararFotoComunidad: prepare }, './community-client': shared,
    './CommunityAvatar': { default: () => null }, './CommunityPhotoPicker': { default: PickerStub }, './CommunityPhotos': { default: PhotosStub },
    './CommunityComposer': { default: () => null }, './CommunityComments': { default: () => null },
  }
  const Component = load(file, deps).default
  const current = { nombre: 'Socia de muestra', onGuardada: value => events.guardadas.push(value), onBorrador: value => events.borradores.push(value), onAcceso: () => events.accesos++, onActualizada() {}, ...props }
  const render = () => { cursor = 0; return Component(current) }
  const find = predicate => all(render(), predicate)[0]
  const button = label => find(node => node.type === 'button' && text(node).trim() === label)
  const flush = () => { render(); while (pending.length) { const [i, effect] = pending.shift(); cleanups.get(i)?.(); cleanups.set(i, effect()) } }
  flush()
  return { events, render, find, button, flush, props: current, picker: () => find(node => node.type === PickerStub), textarea: () => find(node => node.type === 'textarea'), html: () => renderToStaticMarkup(render()), submit: value => find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { elements: { namedItem: () => ({ value: value ?? find(node => node.type === 'textarea').props.value }) } } }), unmount: () => { for (const cleanup of cleanups.values()) cleanup?.() } }
}
function network(impl) {
  const original = global.fetch, calls = []
  global.fetch = async (url, options = {}) => { const call = { url, options, body: typeof options.body === 'string' ? JSON.parse(options.body) : options.body }; calls.push(call); return impl(call, calls.length) }
  return { calls, restore: () => { global.fetch = original } }
}
function urls() {
  const create = URL.createObjectURL, revoke = URL.revokeObjectURL, created = [], revoked = []
  URL.createObjectURL = value => { const url = `blob:qa-foto-${created.length + 1}`; created.push({ value, url }); return url }
  URL.revokeObjectURL = url => revoked.push(url)
  return { created, revoked, restore: () => { URL.createObjectURL = create; URL.revokeObjectURL = revoke } }
}
const previousWindow = global.window
test.before(() => { global.window = { addEventListener() {}, removeEventListener() {}, confirm: () => true } })
test.after(() => { global.window = previousWindow })
const composer = 'src/components/community/CommunityComposer.tsx', gallery = 'src/components/community/CommunityPhotos.tsx', picker = 'src/components/community/CommunityPhotoPicker.tsx'

test('seleccionar prepara fotos locales y no hace HTTP; quitar/reemplazar libera solo sus blobURLs', async () => {
  const u = urls(), n = network(() => { throw new Error('No network on selection') })
  try {
    const ui = view(composer); ui.textarea().props.onChange({ target: { value: 'Texto que se conserva' } })
    ui.picker().props.onSeleccion([archivo('uno.jpg'), archivo('dos.png', 'image/png')]); await tick()
    assert.equal(n.calls.length, 0); assert.equal(ui.picker().props.fotos.length, 2); assert.equal(u.created.length, 2)
    const first = ui.picker().props.fotos[0], second = ui.picker().props.fotos[1]
    ui.picker().props.onSeleccion([archivo('otra.webp', 'image/webp')], first.id); await tick()
    assert.notEqual(ui.picker().props.fotos[0].id, first.id); assert.equal(ui.picker().props.fotos[1].id, second.id)
    assert.deepEqual(u.revoked, [first.preview]); ui.picker().props.onQuitar(second.id)
    assert.deepEqual(u.revoked, [first.preview, second.preview]); assert.equal(ui.textarea().props.value, 'Texto que se conserva')
    ui.unmount(); assert.equal(u.revoked.length, 3)
  } finally { n.restore(); u.restore() }
})
test('hasta cuatro originales válidos; rechazar selección excesiva/HEIC/tamaño conserva fotos y texto previos', async () => {
  const u = urls(), n = network(() => { throw new Error() })
  try {
    const ui = view(composer); ui.picker().props.onSeleccion([archivo()]); await tick(); const selected = ui.picker().props.fotos[0].id
    ui.picker().props.onSeleccion([archivo(), archivo(), archivo(), archivo()]); await tick()
    assert.equal(ui.picker().props.fotos.length, 1); assert.equal(ui.picker().props.fotos[0].id, selected); assert.match(ui.html(), /hasta 4 fotos/)
    ui.picker().props.onSeleccion([archivo('foto.heic', 'image/heic')]); await tick(); assert.match(ui.html(), /HEIC/)
    ui.picker().props.onSeleccion([{ name: 'gigante.jpg', type: 'image/jpeg', size: 20 * 1024 * 1024 + 1 }]); await tick(); assert.match(ui.html(), /hasta 20 MB/)
    assert.equal(n.calls.length, 0); ui.unmount()
  } finally { n.restore(); u.restore() }
})
test('publicación solo fotos: sube WebP primero, confirma DTO y después publica sin texto ni URLs en JSON', async () => {
  const u = urls(), n = network(call => call.options.method === 'PUT' ? response({ foto: { ...foto(), id: call.url.split('/').at(-1) } }) : response({ ok: true, publicacion: post({ ...call.body }) }))
  try {
    const ui = view(composer); ui.picker().props.onSeleccion([archivo()]); await tick(); ui.submit(''); await tick()
    assert.equal(n.calls.length, 2); const upload = n.calls[0], publish = n.calls[1]
    assert.equal(upload.options.method, 'PUT'); assert.match(upload.url, /^\/api\/comunidad\/[a-f0-9-]+\/fotos\/[a-f0-9-]+$/)
    assert.equal(upload.options.headers['Content-Type'], 'image/webp'); assert.ok(upload.body instanceof Blob)
    assert.equal(upload.options.cache, 'no-store'); assert.equal(upload.options.credentials, 'same-origin')
    assert.equal(publish.body.contenido, ''); assert.deepEqual(publish.body.fotos, [{ id: upload.url.split('/').at(-1), ancho: 800, alto: 600 }]); assert.ok(upload.url.includes(publish.body.id))
    assert.equal(ui.events.guardadas.length, 1); assert.equal(ui.picker().props.fotos.length, 0); assert.equal(u.revoked.length, 1)
    assert.ok(!JSON.stringify(publish.body).includes('blob:')); assert.ok(!JSON.stringify(publish.body).includes('foto.jpg')); ui.unmount()
  } finally { n.restore(); u.restore() }
})
test('carga perdida congela texto/fotos y reintenta mismo postID, fotoID y Blob; jamás publica sin confirmar foto', async () => {
  const u = urls(), n = network((call, count) => count === 1 ? response({}, 503) : call.options.method === 'PUT' ? response({ foto: { ...foto(), id: call.url.split('/').at(-1) } }) : response({ ok: true, publicacion: post({ ...call.body }) }))
  try {
    const ui = view(composer); ui.textarea().props.onChange({ target: { value: 'Mi experiencia' } }); ui.picker().props.onSeleccion([archivo()]); await tick()
    const photoId = ui.picker().props.fotos[0].id
    ui.submit(); await tick(); assert.equal(n.calls.length, 1); assert.equal(ui.events.guardadas.length, 0); assert.equal(ui.picker().props.bloqueada, true)
    ui.picker().props.onQuitar(photoId); ui.picker().props.onSeleccion([archivo('otra.jpg')]); await tick(); assert.equal(ui.picker().props.fotos[0].id, photoId)
    ui.submit('No debe reemplazar la intención'); await tick()
    assert.equal(n.calls[1].url, n.calls[0].url); assert.equal(n.calls[1].body, n.calls[0].body); assert.equal(n.calls[2].body.contenido, 'Mi experiencia'); assert.equal(ui.events.guardadas.length, 1); ui.unmount()
  } finally { n.restore(); u.restore() }
})
test('ACK de publicación perdido conserva foto ya cargada y reintenta solo JSON exacto sin volver a subir', async () => {
  const u = urls(), n = network((call, count) => call.options.method === 'PUT' ? response({ foto: { ...foto(), id: call.url.split('/').at(-1) } }) : count === 2 ? response({}, 503) : response({ ok: true, publicacion: post({ ...call.body }) }))
  try {
    const ui = view(composer); ui.picker().props.onSeleccion([archivo()]); await tick(); ui.submit('Una foto'); await tick()
    assert.equal(ui.events.guardadas.length, 0); ui.submit('No cambiar'); await tick()
    assert.equal(n.calls.filter(call => call.options.method === 'PUT').length, 1); assert.deepEqual(n.calls[2].body, n.calls[1].body); assert.equal(ui.events.guardadas.length, 1); ui.unmount()
  } finally { n.restore(); u.restore() }
})
test('ACK incorrecto o con URL privada no habilita publicación; ACK post con fotos distintas no confirma éxito', async () => {
  for (const invalid of [null, { foto: foto() }, { foto: { ...foto(), url: 'https://privado.test/a' } }, { foto: { ...foto(), ancho: 3000 } }]) {
    const u = urls(), n = network(() => response(invalid))
    try { const ui = view(composer); ui.picker().props.onSeleccion([archivo()]); await tick(); ui.submit('Mi foto'); await tick(); assert.equal(n.calls.length, 1); assert.equal(ui.events.guardadas.length, 0); assert.equal(ui.picker().props.bloqueada, true); ui.unmount() } finally { n.restore(); u.restore() }
  }
  const u = urls(), n = network(call => call.options.method === 'PUT' ? response({ foto: { ...foto(), id: call.url.split('/').at(-1) } }) : response({ ok: true, publicacion: post({ ...call.body, fotos: [] }) }))
  try { const ui = view(composer); ui.picker().props.onSeleccion([archivo()]); await tick(); ui.submit('Mi foto'); await tick(); assert.equal(ui.events.guardadas.length, 0); assert.equal(ui.picker().props.fotos.length, 1); assert.equal(ui.picker().props.bloqueada, true); ui.unmount() } finally { n.restore(); u.restore() }
})
test('varias fotos: estado honesto, no sube dos veces la confirmada y bloquea clics simultáneos', async () => {
  let finish
  const u = urls(), n = network((call, count) => count === 1 ? new Promise(resolve => { finish = () => resolve(response({ foto: { ...foto(), id: call.url.split('/').at(-1) } })) }) : count === 2 ? response({}, 503) : call.options.method === 'PUT' ? response({ foto: { ...foto(), id: call.url.split('/').at(-1) } }) : response({ ok: true, publicacion: post({ ...call.body }) }))
  try {
    const ui = view(composer); ui.picker().props.onSeleccion([archivo('uno.jpg'), archivo('dos.jpg')]); await tick(); ui.submit('Dos pasos'); ui.submit('Doble'); await tick()
    assert.equal(n.calls.length, 1); assert.match(ui.html(), /Cargando foto 1 de 2/); assert.ok(!ui.html().includes('100%'))
    finish(); await tick(); assert.equal(n.calls.length, 2); assert.equal(ui.events.guardadas.length, 0)
    ui.submit(); await tick(); assert.equal(n.calls[2].url, n.calls[1].url); assert.equal(n.calls.filter(call => call.url === n.calls[0].url).length, 1); assert.equal(ui.events.guardadas.length, 1); ui.unmount()
  } finally { n.restore(); u.restore() }
})
test('rechazo definitivo de una foto permite reemplazar/quitar sin perder texto ni cambiar UUID del borrador', async () => {
  const u = urls(), n = network((call, count) => count === 1 ? response({}, 415) : call.options.method === 'PUT' ? response({ foto: { ...foto(), id: call.url.split('/').at(-1) } }) : response({ ok: true, publicacion: post({ ...call.body }) }))
  try {
    const ui = view(composer); ui.textarea().props.onChange({ target: { value: 'Mi texto' } }); ui.picker().props.onSeleccion([archivo()]); await tick(); ui.submit(); await tick()
    const old = ui.picker().props.fotos[0].id; assert.equal(ui.picker().props.bloqueada, false); ui.picker().props.onSeleccion([archivo('nueva.jpg')], old); await tick(); ui.submit(); await tick()
    assert.equal(ui.textarea().props.value, ''); assert.equal(n.calls[0].url.split('/')[3], n.calls[1].url.split('/')[3]); assert.notEqual(n.calls[0].url.split('/').at(-1), n.calls[1].url.split('/').at(-1)); assert.equal(n.calls[2].body.contenido, 'Mi texto'); ui.unmount()
  } finally { n.restore(); u.restore() }
})
test('cuota429 permite quitar fotos y compartir el texto conservado sin congelar el borrador', async () => {
  const u = urls(), n = network(call => call.options.method === 'PUT' ? response({}, 429) : response({ ok: true, publicacion: post({ ...call.body }) }))
  try {
    const ui = view(composer); ui.textarea().props.onChange({ target: { value: 'Mi avance sin foto' } }); ui.picker().props.onSeleccion([archivo()]); await tick(); ui.submit(); await tick()
    assert.equal(ui.events.guardadas.length, 0); assert.equal(ui.picker().props.bloqueada, false); assert.match(ui.html(), /límite de fotos de hoy/)
    ui.picker().props.onQuitar(ui.picker().props.fotos[0].id); assert.equal(ui.textarea().props.value, 'Mi avance sin foto'); ui.submit(); await tick()
    assert.equal(n.calls.length, 2); assert.equal(n.calls[1].options.method, 'POST'); assert.equal(n.calls[1].body.contenido, 'Mi avance sin foto'); assert.deepEqual(n.calls[1].body.fotos, []); assert.equal(ui.events.guardadas.length, 1); ui.unmount()
  } finally { n.restore(); u.restore() }
})
test('edición conserva fotos existentes sin resubir; quitar/reemplazar confirma el array con la misma versión', async () => {
  const original = post({ fotos: [foto(20), foto(21)] }), n = network(call => response({ ok: true, publicacion: { ...original, contenido: call.body.contenido, tipo: call.body.tipo, fotos: call.body.fotos, version: 2 } }))
  try {
    const ui = view(composer, { publicacion: original }); assert.equal(ui.picker().props.fotos[0].preview, `/api/comunidad/${original.id}/fotos/${id(20)}`)
    ui.picker().props.onQuitar(id(20)); ui.submit('Una foto queda'); await tick()
    assert.equal(n.calls.length, 1); assert.equal(n.calls[0].options.method, 'PATCH'); assert.deepEqual(n.calls[0].body.fotos, [foto(21)]); assert.equal(n.calls[0].body.version, 1); assert.equal(ui.events.guardadas.length, 1); ui.unmount()
  } finally { n.restore() }
})
test('desmontar aborta preparación o carga; limpia previews y no confirma respuestas tardías', async () => {
  let finish, signal
  const u = urls(), n = network(call => new Promise(resolve => { finish = () => resolve(response({ foto: { ...foto(), id: call.url.split('/').at(-1) } })) }))
  try {
    const ui = view(composer); ui.picker().props.onSeleccion([archivo()]); await tick(); ui.submit('Mi foto'); ui.unmount()
    assert.equal(n.calls[0].options.signal.aborted, true); assert.equal(u.revoked.length, 1); finish(); await tick(); assert.equal(ui.events.guardadas.length, 0)
    let prepareDone
    const second = view(composer, {}, (_file, inputSignal) => { signal = inputSignal; return new Promise(resolve => { prepareDone = resolve }) })
    second.picker().props.onSeleccion([archivo()]); second.unmount(); assert.equal(signal.aborted, true); prepareDone({ archivo: blob(), ancho: 800, alto: 600 }); await tick(); assert.equal(u.created.length, 1)
  } finally { n.restore(); u.restore() }
})
test('galería usa solo endpoints propios, es compatible sin fotos y permite diálogo nativo sin impedir zoom', () => {
  const empty = view(gallery, { publicacionId: id(1) }); assert.equal(empty.html(), ''); empty.unmount()
  const ui = view(gallery, { publicacionId: id(1), fotos: [foto(20), foto(21)] }), html = ui.html()
  assert.match(html, /Ver foto 1 de 2/); assert.ok(html.includes(`src="/api/comunidad/${id(1)}/fotos/${id(20)}"`)); assert.ok(!html.includes('https://'))
  ui.find(node => node.props?.['aria-label'] === 'Ver foto 1 de 2').props.onClick()
  let opens = 0, closes = 0
  ui.find(node => node.type === 'dialog').props.ref.current = { open: false, showModal() { this.open = true; opens++ }, close() { this.open = false; closes++ } }
  ui.flush(); assert.equal(opens, 1); assert.match(ui.html(), /100dvh/); assert.match(ui.html(), /env\(safe-area-inset-bottom\)/)
  ui.button('Siguiente').props.onClick(); ui.flush(); assert.equal(opens, 1); assert.equal(closes, 0); assert.match(ui.html(), /Foto 2 de 2/)
  assert.equal(ui.button('Siguiente').props.disabled, true); ui.button('Cerrar').props.onClick(); ui.flush(); assert.equal(closes, 1)
  assert.ok(!read(gallery).includes('touch-action: none')); assert.ok(!read(gallery).includes('preventDefault')); assert.match(html, /loading="lazy"/); ui.unmount()
})
test('galería rechaza DTO con URL, muestra reintento honesto ante imagen fallida y respeta historial propio/admin', () => {
  const bad = view(gallery, { publicacionId: id(1), fotos: [{ ...foto(), url: 'https://ajeno.test' }] }); assert.equal(bad.html(), ''); bad.unmount()
  const ui = view(gallery, { publicacionId: id(1), fotos: [foto()] }); ui.find(node => node.type === 'img').props.onError(); assert.match(ui.html(), /No pudimos mostrar/)
  ui.button('Reintentar foto 1').props.onClick(); assert.ok(ui.find(node => node.type === 'img')); ui.unmount()
  const card = 'src/components/community/CommunityPostCard.tsx'
  for (const [changes, visible] of [[{}, true], [{ retirada: true, propia: true }, true], [{ oculta: true, propia: false }, false]]) {
    const item = view(card, { publicacion: post({ fotos: [foto()], ...changes }) }); assert.equal(Boolean(item.find(node => node.type === PhotosStub)), visible); item.unmount()
  }
})
test('selector accesible limita cuatro fotos y no cambia selección durante envío incierto', () => {
  const selections = [], ui = view(picker, { fotos: [], bloqueada: false, preparando: false, onSeleccion: (...args) => selections.push(args), onQuitar() {} })
  const input = ui.find(node => node.type === 'input'); assert.equal(input.props.accept, 'image/jpeg,image/png,image/webp'); assert.match(ui.html(), /min-h-11/)
  const event = { currentTarget: { files: [archivo()], value: 'original' } }; input.props.onChange(event); assert.equal(selections.length, 1); assert.equal(event.currentTarget.value, '')
  ui.props.bloqueada = true; ui.find(node => node.type === 'input').props.onChange(event); assert.equal(selections.length, 1); assert.equal(ui.button('Agregar fotos a mi publicación').props.disabled, true); ui.unmount()
})

function canvasBrowser({ width = 4000, height = 3000, encode, context = true } = {}) {
  const saved = new Map(['createImageBitmap', 'document', 'Image'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]))
  let closes = 0; const draws = [], encodes = [], canvases = []
  Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: async () => ({ width, height, close() { closes++ } }) })
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement: type => {
    assert.equal(type, 'canvas')
    const canvas = { width: 0, height: 0, getContext: () => context ? { drawImage: (...args) => draws.push(args.slice(-2)) } : null, toBlob: (callback, mime, quality) => { encodes.push({ mime, quality }); callback(encode ? encode(encodes.length) : blob()) } }
    canvases.push(canvas); return canvas
  } } })
  return { draws, encodes, canvases, get closes() { return closes }, restore: () => { for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key] } } }
}
test('preparación reduce lado a2048, mantiene proporción, WebP.84 y libera bitmap/canvas', async () => {
  const browser = canvasBrowser()
  try {
    const ready = await preparation.prepararFotoComunidad(archivo())
    assert.equal(ready.ancho, 2048); assert.equal(ready.alto, 1536); assert.equal(ready.archivo.type, 'image/webp')
    assert.deepEqual(browser.encodes, [{ mime: 'image/webp', quality: 0.84 }]); assert.deepEqual(browser.draws, [[2048, 1536]]); assert.equal(browser.closes, 1); assert.equal(browser.canvases[0].width, 0)
  } finally { browser.restore() }
})
test('preparación rechaza límites/originales inválidos sin decodificar y >25MP/canvasfallo sin dejar bitmapabierto', async () => {
  for (const candidate of [{ type: 'image/heic', size: 1 }, { type: 'image/jpeg', size: 0 }, { type: 'image/jpeg', size: 20 * 1024 * 1024 + 1 }]) assert.throws(() => preparation.validarArchivoFotoComunidad(candidate))
  for (const settings of [{ width: 6000, height: 5000 }, { context: false }]) {
    const browser = canvasBrowser(settings)
    try { await assert.rejects(preparation.prepararFotoComunidad(archivo())); assert.equal(browser.closes, 1); assert.equal(browser.encodes.length, 0) } finally { browser.restore() }
  }
})
test('preparación no entrega PNGfallback ni salida>4MiB y puede reducir más sin inventar dimensiones', async () => {
  const browser = canvasBrowser({ encode: number => number === 1 ? { size: 4 * 1024 * 1024 + 1, type: 'image/webp' } : blob() })
  try { const result = await preparation.prepararFotoComunidad(archivo()); assert.equal(result.ancho, 1600); assert.equal(result.alto, 1200); assert.equal(browser.encodes.length, 2) } finally { browser.restore() }
  const invalid = canvasBrowser({ encode: () => new Blob(['PNG fallback'], { type: 'image/png' }) })
  try { await assert.rejects(preparation.prepararFotoComunidad(archivo()), /navegador/); assert.equal(invalid.closes, 1) } finally { invalid.restore() }
})
test('preparación cancelada no deja imagenbitmapabierta ni producearchivo', async () => {
  const browser = canvasBrowser(), controller = new AbortController()
  try {
    controller.abort(); await assert.rejects(preparation.prepararFotoComunidad(archivo(), controller.signal), { name: 'AbortError' }); assert.equal(browser.closes, 0)
    let finish, closed = 0
    Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: () => new Promise(resolve => { finish = () => resolve({ width: 10, height: 10, close() { closed++ } }) }) })
    const next = new AbortController(), promise = preparation.prepararFotoComunidad(archivo(), next.signal); next.abort(); finish(); await assert.rejects(promise, { name: 'AbortError' }); assert.equal(closed, 1)
  } finally { browser.restore() }
})
test('fallback de Safari usa solo bloblocal, no agranda fotos pequeñas y revoca URL al terminar o cancelar', async () => {
  const browser = canvasBrowser(), u = urls()
  try {
    Object.defineProperty(globalThis, 'createImageBitmap', { configurable: true, value: undefined })
    class LocalImage {
      naturalWidth = 1200; naturalHeight = 900
      set src(value) { this.value = value; if (value.startsWith('blob:')) queueMicrotask(() => this.onload?.()) }
      get src() { return this.value }
    }
    Object.defineProperty(globalThis, 'Image', { configurable: true, value: LocalImage })
    const ready = await preparation.prepararFotoComunidad(archivo())
    assert.equal(ready.ancho, 1200); assert.equal(ready.alto, 900); assert.equal(u.created.length, 1); assert.deepEqual(u.revoked, [u.created[0].url])
    class WaitingImage {
      static active
      constructor() { WaitingImage.active = this }
      naturalWidth = 800; naturalHeight = 600
      set src(value) { this.value = value }
      get src() { return this.value }
    }
    Object.defineProperty(globalThis, 'Image', { configurable: true, value: WaitingImage })
    const controller = new AbortController(), pending = preparation.prepararFotoComunidad(archivo(), controller.signal)
    controller.abort(); await assert.rejects(pending, { name: 'AbortError' }); assert.equal(WaitingImage.active.src, ''); assert.equal(u.revoked.length, 2)
  } finally { u.restore(); browser.restore() }
})
test('fallar al crear canvas también libera bitmap y no deja un original abierto', async () => {
  const browser = canvasBrowser()
  try {
    Object.defineProperty(globalThis, 'document', { configurable: true, value: { createElement() { throw new Error('No canvas') } } })
    await assert.rejects(preparation.prepararFotoComunidad(archivo()), /No canvas/); assert.equal(browser.closes, 1)
  } finally { browser.restore() }
})
test('revocar acceso durante upload no publica ni presenta la foto como éxito', async () => {
  for (const status of [401, 403]) {
    const u = urls(), n = network(() => response({}, status))
    try {
      const ui = view(composer); ui.picker().props.onSeleccion([archivo()]); await tick(); ui.submit('No publicar'); await tick()
      assert.equal(n.calls.length, 1); assert.equal(ui.events.guardadas.length, 0); assert.equal(ui.events.accesos, 1); assert.equal(ui.picker().props.fotos.length, 1); ui.unmount()
    } finally { n.restore(); u.restore() }
  }
})
