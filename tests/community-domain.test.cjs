/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(require, m, m.exports); return m.exports }
const c = load('src/lib/community.ts')
const id = '00000000-0000-4000-8000-000000000001', fecha = '2026-10-26T17:31:29.123456+00:00'
const autor = { nombre: 'Socia de prueba local', avatar_url: null, es_admin: false }
const post = { id, tipo: 'avance', contenido: 'Mi avance ficticio.', created_at: fecha, actualizado_at: fecha, version: 1, retirada: false, oculta: false, propia: true, autor, total_comentarios: 0, total_felicitaciones: 0, felicitada: false }
const comment = { id, publicacion_id: id, contenido: 'Una respuesta ficticia.', created_at: fecha, actualizado_at: fecha, version: 1, retirada: false, oculta: false, propia: true, autor }

test('Comunidad exige Socias activo y respeta la asignación explícita de Flor por sobre roles heredados', () => {
  for (const perfil of [null, {}, { tipo_usuario: 'socia' }, { rol: 'alumna', tipo_usuario: 'socia', estado: 'pausada' }, { rol: 'afiliada', tipo_usuario: 'gratuito', estado: 'activa' }, { rol: 'afiliada_lanzamiento', tipo_usuario: 'desafio', estado: 'activa' }]) assert.equal(c.puedeUsarComunidad(perfil), false)
  for (const perfil of [{ rol: 'admin' }, { rol: 'alumna', tipo_usuario: 'socia', estado: 'activa' }, { rol: 'afiliada', tipo_usuario: null, estado: 'activa' }, { rol: 'afiliada_lanzamiento', estado: 'activa' }]) assert.equal(c.puedeUsarComunidad(perfil), true)
})
test('nuevos textos normalizan NFC y saltos sin convertir párrafos en una sola línea', () => {
  assert.deepEqual(c.validarNuevaPublicacion({ id: id.toUpperCase(), tipo: 'idea', contenido: '  Cafe\u0301\r\n\r\nOtra idea.  ' }), { id, tipo: 'idea', contenido: 'Café\n\nOtra idea.' })
  assert.deepEqual(c.validarNuevoComentario({ id, contenido: '\tMi mensaje\t' }), { id, contenido: 'Mi mensaje' })
  assert.equal(c.validarNuevaPublicacion({ id, tipo: 'avance', contenido: 'x'.repeat(2000) }).contenido.length, 2000)
  assert.equal(c.validarNuevoComentario({ id, contenido: 'x'.repeat(1000) }).contenido.length, 1000)
  // char_length de Postgres cuenta puntos de código, no unidades UTF-16.
  assert.equal(c.esPublicacionComunidad({ ...post, contenido: '💕'.repeat(2000), autor: { ...autor, nombre: '💕'.repeat(200) } }), true)
  assert.equal(c.validarNuevaPublicacion({ id, tipo: 'avance', contenido: '💕'.repeat(2000) }).contenido, '💕'.repeat(2000))
})
test('no se aceptan IDs/autoría/HTML remotos en campos ocultos, textos vacíos, controles o límites excedidos', () => {
  for (const data of [null, [], { id: 'ajeno', tipo: 'idea', contenido: 'Hola' }, { id, tipo: 'constructor', contenido: 'Hola' }, { id, tipo: 'idea', contenido: '' }, { id, tipo: 'idea', contenido: 'x'.repeat(2001) }, { id, tipo: 'idea', contenido: 'Hola\u0000' }, { id, tipo: 'idea', contenido: 'Hola', alumna_id: id }, { id, tipo: 'idea', contenido: 'Hola', imagen_url: 'https://example.test/privada' }, { id, tipo: 'idea', contenido: 'Hola', version: 1 }]) assert.throws(() => c.validarNuevaPublicacion(data))
  assert.throws(() => c.validarNuevoComentario({ id, contenido: 'x'.repeat(1001) }))
  assert.throws(() => c.validarNuevoComentario({ id, contenido: 'Hola', publicacion_id: id }))
  // Es texto plano; la UI debe escaparlo, no confiar en una limpieza parcial.
  assert.equal(c.validarNuevaPublicacion({ id, tipo: 'idea', contenido: '<script>ficticio</script>' }).contenido, '<script>ficticio</script>')
})
test('cada acción admite únicamente sus campos y requiere una versión entera comprobable', () => {
  assert.deepEqual(c.validarCambioComunidad({ version: 2, accion: 'editar', tipo: 'pregunta', contenido: '¿Cómo sigo?' }), { version: 2, accion: 'editar', tipo: 'pregunta', contenido: '¿Cómo sigo?' })
  assert.deepEqual(c.validarCambioComunidad({ version: 2, accion: 'editar', contenido: 'Nueva respuesta' }, true), { version: 2, accion: 'editar', contenido: 'Nueva respuesta' })
  for (const accion of ['retirar', 'restaurar', 'mostrar']) assert.deepEqual(c.validarCambioComunidad({ version: 2, accion }), { version: 2, accion })
  assert.deepEqual(c.validarCambioComunidad({ version: 2, accion: 'ocultar', motivo: 'Fuera de tema' }), { version: 2, accion: 'ocultar', motivo: 'Fuera de tema' })
  for (const data of [{ version: 0, accion: 'retirar' }, { version: 1.5, accion: 'retirar' }, { version: '1', accion: 'retirar' }, { version: 1, accion: 'borrar' }, { version: 1, accion: 'retirar', contenido: 'Cambio' }, { version: 1, accion: 'ocultar', motivo: 'no' }, { version: 1, accion: 'editar', contenido: 'Sin tipo' }, { version: 1, accion: 'mostrar', moderada_por: id }]) assert.throws(() => c.validarCambioComunidad(data))
  assert.throws(() => c.validarCambioComunidad({ version: 1, accion: 'editar', tipo: 'idea', contenido: 'Texto' }, true))
  for (const valor of [null, { activo: 'true' }, { activo: true, alumna_id: id }]) assert.throws(() => c.validarFelicitacion(valor))
  assert.equal(c.validarFelicitacion({ activo: false }), false)
})
test('cursor conserva microsegundos y no permite inyección, fechas imposibles, identidades o filtros repetidos', () => {
  const cursor = c.cursorComunidad(post)
  assert.equal(cursor, `${fecha}~${id}`)
  assert.deepEqual(c.leerCursorComunidad(cursor), { fecha, id })
  assert.deepEqual(c.validarFiltrosComunidad(new URLSearchParams({ cursor, vista: 'mias', tipo: 'idea' })), { cursor, vista: 'mias', tipo: 'idea' })
  for (const valor of ['', `${fecha}~${id}~extra`, `2026-02-30T12:00:00Z~${id}`, `${fecha}),id.neq.x~${id}`, `2026-10-26~${id}`, `${fecha}~otro`]) assert.throws(() => c.leerCursorComunidad(valor))
  for (const query of ['usuaria_id=otra', 'tipo=__proto__', 'vista=otra', 'cursor=', 'tipo=idea&tipo=avance', 'vista=todas&vista=mias', 'cursor=x&cursor=y']) assert.throws(() => c.validarFiltrosComunidad(new URLSearchParams(query)))
  assert.throws(() => c.validarFiltroComentarios(new URLSearchParams('autor_id=otro')))
})
test('DTO estricto no acepta perfiles completos, pruebas/ingresos, recuentos inventados o páginas incoherentes', () => {
  assert.equal(c.esPublicacionComunidad(post), true); assert.equal(c.esComentarioComunidad(comment), true)
  for (const extra of [{ email: 'privado@example.test' }, { monto: 100 }, { archivo_url: '/prueba' }, { alumna_id: id }, { perfiles: { ingresos: 'privado' } }]) assert.equal(c.esPublicacionComunidad({ ...post, ...extra }), false)
  for (const changed of [{ autor: { ...autor, email: 'privado@example.test' } }, { autor: { ...autor, avatar_url: 'https://example.test/photo' } }, { total_comentarios: -1 }, { total_felicitaciones: '1' }, { version: 0 }, { tipo: 'venta' }, { created_at: 'invalida' }]) assert.equal(c.esPublicacionComunidad({ ...post, ...changed }), false)
  assert.equal(c.esPaginaComunidad({ estado: 'lista', publicaciones: [post], siguiente: null }), true)
  assert.equal(c.esPaginaComentarios({ estado: 'lista', comentarios: [comment], siguiente: null }), true)
  assert.equal(c.esPaginaComunidad({ estado: 'error', mensaje: 'Error de prueba' }), true)
  assert.equal(c.esPaginaComunidad({ estado: 'lista', publicaciones: [post, post], siguiente: null }), false)
  assert.equal(c.esPaginaComunidad({ estado: 'lista', publicaciones: [post], siguiente: 'inventado' }), false)
  assert.equal(c.esPaginaComunidad({ estado: 'lista', publicaciones: Array.from({ length: 21 }, () => post), siguiente: null }), false)
  assert.equal(c.esPaginaComentarios({ estado: 'lista', comentarios: [comment], siguiente: null, perfil: {} }), false)
})
