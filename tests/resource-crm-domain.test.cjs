/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText)(name => name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const d = load('src/lib/resource-crm.ts'), id = '00000000-0000-4000-8000-000000000001', ahora = new Date('2026-10-26T12:00:00Z')
const resource = { id, nombre: 'Recurso de prueba local', slug: 'recurso-prueba-local', orientacion: 'ambas', url: '', estado: 'borrador' }
const contact = { id, nombre: 'Contacto ficticio local', email: ' PERSONA@EXAMPLE.INVALID ', telefono: '', fuente: 'manual', referencia_externa: '', segmento_camara: 'sin_definir' }
test('catálogo: solo borrador, enlace opcional HTTPS, campos exactos e identidad/version seguras', () => {
  const input = { id: resource.id, nombre: resource.nombre, slug: resource.slug, orientacion: resource.orientacion, url: resource.url }
  assert.deepEqual(d.validarRecursoCrm(input), { id, datos: { nombre: resource.nombre, slug: resource.slug, orientacion: 'ambas', url: null, estado: 'borrador' } })
  assert.equal(d.validarRecursoCrm({ ...input, url: 'https://example.invalid/material' }).datos.url, 'https://example.invalid/material')
  assert.equal(d.validarRecursoCrm({ ...input, version: 2 }, true).version, 2)
  for (const changed of [{ id: 'otro' }, { estado: 'publicado' }, { publicar: true }, { slug: 'sin espacios' }, { slug: '../privado' }, { orientacion: 'otro' }, { url: 'http://example.invalid' }, { url: 'javascript:alert(1)' }, { url: 'https://secreto:clave@example.invalid' }]) assert.throws(() => d.validarRecursoCrm({ ...input, ...changed }))
  for (const version of [0, -1, '1', 1.5, Infinity]) assert.throws(() => d.validarRecursoCrm({ ...input, version }, true))
})
test('contactos normalizan correo y teléfono sin crear vínculos ni afirmar compras', () => {
  const result = d.validarContactoCrm(contact)
  assert.equal(result.datos.email_normalizado, 'persona@example.invalid'); assert.equal(result.datos.telefono, null)
  assert.equal(d.validarContactoCrm({ ...contact, email: '', telefono: '+54 (351) 555-1111' }).datos.telefono, '+543515551111')
  for (const changed of [{ email: '', telefono: '' }, { email: 'no-es-email' }, { telefono: '+54abc' }, { perfil_id: id }, { vinculo_confirmado_en: ahora.toISOString() }, { cliente_confirmado: true }, { rol: 'admin' }, { fuente: 'desconocida' }, { segmento_camara: 'mejor' }]) assert.throws(() => d.validarContactoCrm({ ...contact, ...changed }))
  assert.deepEqual(d.validarSegmentoCrm({ version: 1, segmento_camara: 'no' }), { version: 1, segmento_camara: 'no' })
  assert.throws(() => d.validarSegmentoCrm({ version: 1, segmento_camara: 'no', cliente_confirmado: true }))
  assert.equal(d.etiquetaRelacionCrm({ perfil_id: null, vinculo_confirmado_en: null, cliente_confirmado: false }), 'Sin vínculo confirmado')
  assert.equal(d.etiquetaRelacionCrm({ perfil_id: id, vinculo_confirmado_en: ahora.toISOString(), cliente_confirmado: false }), 'Perfil vinculado')
  assert.equal(d.etiquetaRelacionCrm({ perfil_id: id, vinculo_confirmado_en: ahora.toISOString(), cliente_confirmado: true }), 'Cliente confirmado')
})
test('señales reales: fecha comprobable y recurso obligatorio en solicitud/clic/entrega, sin descargar/leer inventado', () => {
  const event = { id, tipo: 'solicitud', recurso_id: id, fuente: 'manual', referencia_externa: null, observado_en: '2026-10-25T12:00:00-03:00' }
  assert.equal(d.validarEventoCrm(event, ahora).datos.observado_en, '2026-10-25T15:00:00.000Z')
  for (const changed of [{ observado_en: '2027-01-01T00:00:00Z' }, { observado_en: 'invalida' }, { observado_en: '1999-01-01T00:00:00Z' }, { tipo: 'descarga_completada' }, { tipo: 'pdf_leido' }, { contacto_id: id }, { recurso_id: null }, { fuente: 'webhook-no-verificado' }]) assert.throws(() => d.validarEventoCrm({ ...event, ...changed }, ahora))
  for (const tipo of ['info_socias', 'interes_vigente']) assert.equal(d.validarEventoCrm({ ...event, tipo, recurso_id: null }, ahora).datos.recurso_id, null)
})
test('interés comercial tiene desglose transparente, recursos distintos con tope y vigencia explícita de 30 días', () => {
  assert.deepEqual(d.calcularInteresCrm({ recursos_distintos: 0, pidio_info: false, interes_vigente_en: null }, ahora), { puntos: 0, recursos: 0, informacion: 0, vigente: 0 })
  assert.deepEqual(d.calcularInteresCrm({ recursos_distintos: 50, pidio_info: true, interes_vigente_en: '2026-10-25T00:00:00Z' }, ahora), { puntos: 80, recursos: 30, informacion: 40, vigente: 10 })
  assert.equal(d.calcularInteresCrm({ recursos_distintos: 2, pidio_info: false, interes_vigente_en: '2026-08-01T00:00:00Z' }, ahora).puntos, 20)
  assert.equal(d.calcularInteresCrm({ recursos_distintos: 0, pidio_info: false, interes_vigente_en: '2027-01-01T00:00:00Z' }, ahora).puntos, 0)
  for (const value of [null, -1, 1.5, '3', NaN]) assert.throws(() => d.calcularInteresCrm({ recursos_distintos: value, pidio_info: false, interes_vigente_en: null }, ahora))
  // Ningún dato demográfico o de cámara participa del cálculo.
  assert.deepEqual(d.calcularInteresCrm({ recursos_distintos: 2, pidio_info: false, interes_vigente_en: null, ingresos: '10000', maternidad: true, genero: 'mujer', pais: 'Argentina', segmento_camara: 'si' }, ahora), d.calcularInteresCrm({ recursos_distintos: 2, pidio_info: false, interes_vigente_en: null, segmento_camara: 'no' }, ahora))
})
test('filtros/cursor no admiten IDs de alumnos ni inyección; preservan microsegundos', () => {
  const cursor = '2026-10-26T12:00:00.123456+00:00~' + id
  assert.equal(d.validarCursorCrm(cursor).fecha, '2026-10-26T12:00:00.123456+00:00')
  assert.equal(d.filtrosContactosCrm(new URLSearchParams({ fuente: 'manychat', segmento: 'no', relacion: 'sin_vinculo', cursor })).fuente, 'manychat')
  for (const query of ['alumna_id=otra', 'email=otro', 'fuente=manual&fuente=sndflow', 'segmento=otro', 'relacion=admin', 'cursor=x),id.neq.y']) assert.throws(() => d.filtrosContactosCrm(new URLSearchParams(query)))
})
test('migración CRM niega PII a alumnas, no crea contenido, no permite borrados ni vinculación por payload', () => {
  const sql = read('supabase/migrations/20261027020236_recursos_contactos_base_privada.sql')
  for (const table of ['crm_recursos', 'crm_contactos', 'crm_eventos']) {
    assert.ok(sql.includes(`alter table public.${table} enable row level security`))
    assert.ok(sql.includes(`${table}_admin_select`))
  }
  assert.ok(sql.includes('from public,anon,authenticated')); assert.ok(sql.includes('using((select public.es_admin()))'))
  assert.ok(!/grant[^;]*\bdelete\b/i.test(sql)); assert.ok(!/insert into public\./i.test(sql))
  assert.ok(sql.includes('El vínculo requiere un circuito de confirmación independiente.'))
  assert.ok(sql.includes("[.][^[:space:]@]+$")); assert.ok(sql.includes("'^[+]?[0-9]{7,15}$'"))
  const source = read('src/lib/resource-crm-server.ts')
  for (const denied of ['createAdminClient', 'SERVICE_ROLE', 'user_metadata', 'listUsers', '.delete(', 'auth.admin', 'from(\'resultados\')', 'from(\'encuesta\')']) assert.ok(!source.includes(denied))
})
test('UI vacía/error explica borradores y canales no conectados; sin datos ni recursos ficticios', () => {
  const React = require('react'), { renderToStaticMarkup } = require('react-dom/server')
  const helper = load('src/app/admin/recursos/crm-client.ts')
  assert.ok(helper.principalCrm.includes('bg-[#294A38]')); assert.ok(helper.principalCrm.includes('text-white'))
  assert.ok(!helper.principalCrm.includes('bg-[#FFFDFA]')); assert.ok(!helper.principalCrm.includes('text-[#294A38]'))
  const ui = load('src/app/admin/recursos/RecursosCrmPanel.tsx', { '@/components/AdminSectionMenu': { default: () => null }, '@/lib/resource-crm': d, './crm-client': helper })
  const html = renderToStaticMarkup(React.createElement(ui.default, { catalogoInicial: { estado: 'lista', recursos: [], limitado: false }, contactosIniciales: { estado: 'lista', contactos: [], siguiente: null } }))
  assert.ok(html.includes('El catálogo empieza cuando definan el primer recurso.')); assert.ok(html.includes('todavía no sincronizan ni envían'))
  assert.ok(html.includes('min-h-11')); assert.ok(html.includes('border-[#E7DDD5]')); assert.ok(!html.includes('Descargar PDF'))
  const error = renderToStaticMarkup(React.createElement(ui.default, { catalogoInicial: { estado: 'error', mensaje: 'Error de lectura comprobado' }, contactosIniciales: { estado: 'error', mensaje: 'Error' } }))
  assert.ok(error.includes('role="alert"')); assert.ok(error.includes('Error de lectura comprobado')); assert.ok(!error.includes('El catálogo empieza'))
  const editor = renderToStaticMarkup(React.createElement(ui.EditorRecursoCrm, { recurso: null, onCerrar() {}, onGuardado() {} }))
  assert.ok(editor.includes('Guardar borrador')); assert.ok(editor.includes('text-base')); assert.ok(!editor.includes('Publicar'))
})
test('reintentar una observación congelada no exige el checkbox deshabilitado y verifica todo el ACK', async () => {
  const React = require('react'), helper = load('src/app/admin/recursos/crm-client.ts'), contactoId = '00000000-0000-4000-8000-000000000002'
  const envio = { id, datos: { tipo: 'solicitud', recurso_id: id, fuente: 'manual', referencia_externa: null, observado_en: '2026-10-25T12:00:00.000Z' } }
  const originalFormData = global.FormData
  global.FormData = class { entries() { return [] } } // Un fieldset disabled no participa de FormData.
  try {
    for (const coherente of [true, false]) {
      let indice = 0, peticiones = 0, confirmadas = 0, resets = 0
      const ui = load('src/app/admin/recursos/RecursosCrmPanel.tsx', {
        react: { ...React, useEffect() {}, useRef: () => ({ current: false }), useState: () => [[envio.datos.tipo, envio, false, ''][indice++], () => {}] },
        '@/components/AdminSectionMenu': { default: () => null }, '@/lib/resource-crm': d,
        './crm-client': { ...helper, pedirCrm: async (_url, options) => { peticiones++; assert.deepEqual(JSON.parse(options.body), { id, ...envio.datos }); return { ok: true, evento: { id, contacto_id: contactoId, ...envio.datos, fuente: coherente ? 'manual' : 'manychat', creado_en: envio.datos.observado_en } } } },
      })
      const tree = ui.RegistroEventoCrm({ contactoId, catalogo: { estado: 'lista', recursos: [], limitado: false }, onGuardado: () => confirmadas++ })
      const form = React.Children.toArray(tree.props.children).find(e => React.isValidElement(e) && e.type === 'form')
      await form.props.onSubmit({ preventDefault() {}, currentTarget: { reset() { resets++ } } })
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(peticiones, 1); assert.equal(confirmadas, coherente ? 1 : 0); assert.equal(resets, coherente ? 1 : 0)
    }
  } finally { global.FormData = originalFormData }
})
test('Cargar más conserva los filtros aplicados y no mezcla el borrador de filtros con un cursor anterior', async () => {
  const React = require('react'), helper = load('src/app/admin/recursos/crm-client.ts')
  const dto = { id, nombre: 'Contacto ficticio', email_normalizado: 'a@example.invalid', telefono: null, fuente: 'sndflow', referencia_externa: null, segmento_camara: 'sin_definir', perfil_id: null, vinculo_confirmado_en: null, cliente_confirmado: false, version: 1, creado_en: ahora.toISOString(), actualizado_en: ahora.toISOString(), senales: { recursos_distintos: 0, pidio_info: false, interes_vigente_en: null }, interes: { puntos: 0, recursos: 0, informacion: 0, vigente: 0 } }
  const cursor = ahora.toISOString() + '~' + id; let indice = 0, url
  const ui = load('src/app/admin/recursos/RecursosCrmPanel.tsx', {
    react: { ...React, useEffect() {}, useRef: initial => ({ current: initial }), useState: initial => { const actual = indice++; return [actual === 2 ? 'contactos' : actual === 5 ? { fuente: 'manychat' } : actual === 7 ? { fuente: 'sndflow' } : initial, () => {}] } },
    '@/components/AdminSectionMenu': { default: () => null }, '@/lib/resource-crm': d,
    './crm-client': { ...helper, pedirCrm: async direccion => { url = direccion; return { estado: 'lista', contactos: [], siguiente: null } } },
  })
  const tree = ui.default({ catalogoInicial: { estado: 'lista', recursos: [], limitado: false }, contactosIniciales: { estado: 'lista', contactos: [dto], siguiente: cursor } })
  function buscar(node) { if (!React.isValidElement(node)) return null; if (node.type === 'button' && node.props.children === 'Cargar más contactos') return node; for (const child of React.Children.toArray(node.props.children)) { const found = buscar(child); if (found) return found } return null }
  const boton = buscar(tree); assert.ok(boton); boton.props.onClick(); await new Promise(resolve => setImmediate(resolve))
  const params = new URL(url, 'https://example.invalid').searchParams
  assert.equal(params.get('fuente'), 'sndflow'); assert.equal(params.get('cursor'), cursor)
})
test('recursos y altas manuales reintentan la intención congelada sin depender de campos disabled ni perder UUID', async () => {
  const React = require('react'), helper = load('src/app/admin/recursos/crm-client.ts'), original = global.FormData
  const resourceInput = d.validarRecursoCrm({ id, nombre: resource.nombre, slug: resource.slug, orientacion: 'ambas', url: null })
  const contactInput = d.validarContactoCrm(contact)
  global.FormData = class { entries() { return [] } }
  try {
    for (const tipo of ['recurso', 'contacto']) for (const exito of [true, false]) {
      let indice = 0, solicitudes = 0, confirmadas = 0; const updates = [], frozen = tipo === 'recurso' ? resourceInput : contactInput
      const ui = load('src/app/admin/recursos/RecursosCrmPanel.tsx', {
        react: { ...React, useEffect() {}, useRef: v => ({ current: v }), useState: () => { const i = indice++; return [[frozen, false, '', false][i], value => updates.push([i, value])] } },
        '@/components/AdminSectionMenu': { default: () => null }, '@/lib/resource-crm': d,
        './crm-client': { ...helper, pedirCrm: async (_url, options) => {
          solicitudes++; const body = JSON.parse(options.body); assert.equal(body.id, frozen.id)
          if (!exito) throw new helper.ErrorPeticionCrm(503, true, 'Respuesta no confirmada.')
          return tipo === 'recurso' ? { ok: true, recurso: { id, ...resourceInput.datos, version: 1, creado_en: ahora.toISOString(), actualizado_en: ahora.toISOString() } } : { ok: true, contacto: { id, ...contactInput.datos, perfil_id: null, vinculo_confirmado_en: null, cliente_confirmado: false, version: 1, creado_en: ahora.toISOString(), actualizado_en: ahora.toISOString(), senales: { recursos_distintos: 0, pidio_info: false, interes_vigente_en: null }, interes: { puntos: 0, recursos: 0, informacion: 0, vigente: 0 } } }
        } },
      })
      const Component = tipo === 'recurso' ? ui.EditorRecursoCrm : ui.AltaContactoCrm
      const tree = Component({ recurso: null, onCerrar() {}, onGuardado: () => confirmadas++ })
      tree.props.onSubmit({ preventDefault() {}, currentTarget: {} }); await new Promise(resolve => setImmediate(resolve))
      assert.equal(solicitudes, 1); assert.equal(confirmadas, exito ? 1 : 0)
      if (!exito) { assert.ok(updates.some(([i, value]) => i === 0 && value === frozen)); assert.ok(!updates.some(([i, value]) => i === 0 && value === null)) }
    }
  } finally { global.FormData = original }
})
