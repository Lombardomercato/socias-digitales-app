/* eslint-disable @typescript-eslint/no-require-imports */
// Proyecciones y ACK con datos ficticios. Sin API, navegador ni persistencia.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name in deps ? deps[name] : require(name), m, m.exports)
  return m.exports
}
const day = load('src/lib/my-day.ts')
const management = load('src/lib/class-management.ts')
const progress = load('src/lib/class-progress.ts')
const campus = load('src/lib/learning-campus.ts', { './class-management': management, './class-progress': progress })
const planner = load('src/lib/study-planner.ts', { './my-day': day })
const clase = (id, modulo = 'Bienvenida', extra = {}) => ({ id, titulo: `Clase ${id}`, modulo, orden: 0, activo: true, puede_ver: true, tiene_video_privado: true, vimeo_url: null, acceso_gratuito: false, plan: '27', descripcion: null, ...extra })
const avance = (clase_id, extra = {}) => ({ clase_id, posicion_seg: 0, duracion_seg: 120, completada: false, actualizado_en: '2026-10-23T12:00:00Z', ...extra })
const plan = (clases, registros = []) => planner.planEstudioDesdeCampus(campus.resumirCampusAprendizaje(clases, registros))
test('propone solo la próxima pendiente de cada programa y no todas las clases ni una sola próxima global', () => {
  const result = plan([clase('b'), clase('b2', 'Bienvenida', { orden: 1 }), clase('d', 'Desafío Socias'), clase('d2', 'Desafío Socias', { orden: 1 }), clase('terminada', 'Otro')], [avance('d2', { posicion_seg: 25 }), avance('terminada', { completada: true })])
  assert.equal(result.estado, 'listo')
  assert.deepEqual(result.opciones.map(item => item.id), ['b', 'd2'])
  assert.deepEqual(result.opciones.map(item => item.motivo), ['empezar', 'continuar'])
  assert.deepEqual(result.opciones.map(item => item.posicionSeg), [null, 25])
})
test('el apoyo puede ser el siguiente paso real; ocultas, bloqueadas y sin video nunca son una opción', () => {
  const result = plan([clase('c', 'Desafío Socias'), clase('apoyo', 'Desafío Socias › Material de apoyo'), clase('bloqueada', 'Privado', { puede_ver: false }), clase('sin-video', 'En preparación', { tiene_video_privado: false }), clase('oculta', 'Oculto', { activo: false })], [avance('c', { completada: true }), avance('bloqueada', { posicion_seg: 99 })])
  assert.deepEqual(result.opciones.map(item => item.id), ['apoyo'])
  assert.equal(result.opciones[0].seccion, 'Material de apoyo')
})
test('vacío conocido o toda la formación completada es listo sin opciones; una lectura fallida nunca inventa pendientes', () => {
  assert.deepEqual(plan([]), { estado: 'listo', opciones: [] })
  assert.deepEqual(plan([clase('a')], [avance('a', { completada: true })]), { estado: 'listo', opciones: [] })
  for (const resumen of [campus.resumirCampusAprendizaje(null, []), campus.resumirCampusAprendizaje([clase('a')], null), campus.resumirCampusAprendizaje([clase('a')], [avance('a', { posicion_seg: NaN })])]) {
    assert.deepEqual(planner.planEstudioDesdeCampus(resumen), { estado: 'error', opciones: [] })
  }
})
test('proyección mantiene campos de ClaseCampus, excluye metadatos y no muta el resumen', () => {
  const resumen = campus.resumirCampusAprendizaje([clase('a')], [])
  Object.assign(resumen.programas[0].proxima, { url: 'https://privado.ejemplo.test/video?token=secreto', email: 'socia@ejemplo.test', alumna_id: 'cuenta-privada', video_key: 'objeto-privado' })
  const antes = JSON.stringify(resumen), result = planner.planEstudioDesdeCampus(resumen)
  assert.equal(JSON.stringify(resumen), antes)
  assert.deepEqual(Object.keys(result.opciones[0]).sort(), ['id', 'titulo', 'programa', 'seccion', 'motivo', 'posicionSeg'].sort())
  for (const privado of ['https:', 'token', 'secreto', 'socia@', 'cuenta-privada', 'video_key', 'objeto-privado']) assert.ok(!JSON.stringify(result).includes(privado))
  const repetida = { ...resumen, programas: [...resumen.programas, resumen.programas[0]] }
  assert.equal(planner.planEstudioDesdeCampus(repetida).opciones.length, 1)
})
test('texto de tarea es humano, normaliza blancos/NFC y no incorpora ID, minuto ni enlaces técnicos', () => {
  const opcion = { id: 'clase-id-no-persistir', titulo: '  Elegi\u0301   tu\n nicho ', programa: ' Desafío   Socias ', seccion: 'Clases', motivo: 'continuar', posicionSeg: 87, url: 'https://privado.ejemplo.test/token' }
  const texto = planner.textoTareaEstudio(opcion)
  assert.equal(texto, 'Estudiar: «Elegí tu nicho» · Desafío Socias')
  for (const privado of [opcion.id, '87', 'https:', 'token', '{', 'clase_id']) assert.ok(!texto.includes(privado))
  assert.equal(day.validarTarea({ id: 'a1111111-1111-4111-8111-111111111111', version: null, texto, fecha: '2026-10-23', categoria: 'negocio_digital', completada: false, archivada: false }, 'crear').datos.texto, texto)
})
test('textos heredados largos siguen siendo legibles y válidos dentro de 300 unidades UTF-16', () => {
  for (const titulo of ['Título extenso '.repeat(80), '💖'.repeat(300)]) {
    const texto = planner.textoTareaEstudio({ id: 'a', titulo, programa: 'Programa muy largo '.repeat(20), seccion: 'Clases', motivo: 'empezar', posicionSeg: null })
    assert.ok(texto.length <= 300)
    assert.ok(texto.startsWith('Estudiar: «')); assert.ok(texto.includes('» · ')); assert.ok(texto.includes('…'))
    assert.equal([...texto].some(char => char.length === 1 && char.charCodeAt(0) >= 0xD800 && char.charCodeAt(0) <= 0xDFFF), false)
  }
})
const ID = 'a1111111-1111-4111-8111-111111111111'
const OWNER = 'b2222222-2222-4222-8222-222222222222'
const datos = { texto: '  Estudiar:   «Clase de prueba» · Bienvenida ', fecha: '2026-10-23', categoria: 'negocio_digital', completada: false, archivada: false }
const normalizados = day.validarTarea({ ...datos, id: ID, version: null }, 'crear').datos
const fila = { ...normalizados, id: ID, alumna_id: OWNER, version: 1, creado_en: '2026-10-23T15:00:00.123456+00:00', actualizada_en: '2026-10-23T15:00:00Z' }
const confirmar = (respuesta, intencion = {}) => planner.confirmarTareaEstudioCreada(respuesta, { id: ID, alumnaId: OWNER, datos, ...intencion })
test('ACK confirma POST propio con datos normalizados y versiones de reintento, sin exigir version uno', () => {
  for (const version of [1, 2, 500]) {
    const tarea = confirmar({ ok: true, tarea: { ...fila, version } })
    assert.deepEqual(tarea, { ...fila, version })
    assert.equal(tarea.texto, normalizados.texto)
  }
  const nanosegundos = { ...fila, creado_en: '2026-10-23T15:00:00.123456789Z' }
  assert.deepEqual(confirmar({ ok: true, tarea: nanosegundos }), nanosegundos)
})
test('ACK rechaza sobres de éxito falsos, datos ausentes y campos cambiados de la intención pendiente', () => {
  for (const respuesta of [null, [], {}, { ok: 'true', tarea: fila }, { ok: 1, tarea: fila }, { ok: false, tarea: fila }, { ok: true }, { ok: true, tarea: [] }]) assert.equal(confirmar(respuesta), null)
  for (const cambio of [{ id: 'c3333333-3333-4333-8333-333333333333' }, { id: ID.toUpperCase() }, { alumna_id: 'otra-cuenta' }, { texto: 'Otro texto' }, { texto: datos.texto }, { fecha: '2026-10-24' }, { categoria: 'trabajo' }, { completada: true }, { completada: 'false' }, { archivada: true }, { archivada: 'false' }, { version: 0 }, { version: -1 }, { version: 1.2 }, { version: '1' }, { version: NaN }, { version: Infinity }, { version: Number.MAX_SAFE_INTEGER + 1 }]) {
    assert.equal(confirmar({ ok: true, tarea: { ...fila, ...cambio } }), null, JSON.stringify(cambio))
  }
})
test('ACK requiere timestamps ISO reales y una intención válida; no acepta IDs ajenos ni nuevas tareas ya hechas', () => {
  for (const fecha of ['', '2026-10-23', 'no es fecha', '2026-02-30T15:00:00Z', '2026-10-23T24:00:00Z', '2026-10-23T15:60:00Z', '2026-10-23T15:00:00+99:00', null, 123]) {
    for (const campo of ['creado_en', 'actualizada_en']) assert.equal(confirmar({ ok: true, tarea: { ...fila, [campo]: fecha } }), null)
  }
  for (const intencion of [{ id: 'no-es-uuid' }, { alumnaId: '' }, { datos: { ...datos, completada: true } }, { datos: { ...datos, archivada: true } }, { datos: { ...datos, fecha: '2026-02-30' } }, { datos: { ...datos, texto: 'a'.repeat(301) } }]) assert.equal(confirmar({ ok: true, tarea: fila }, intencion), null)
})
test('ACK devuelve solo TareaDia y no reinterpreta metadatos como relación clase–tarea', () => {
  const tarea = confirmar({ ok: true, tarea: { ...fila, clase_id: 'no-relacion', url: 'https://privado.ejemplo.test', perfil: { email: 'privado@ejemplo.test' } }, token: 'no-copiar' })
  assert.deepEqual(tarea, fila)
  assert.deepEqual(Object.keys(tarea).sort(), ['texto', 'fecha', 'categoria', 'completada', 'archivada', 'id', 'alumna_id', 'version', 'creado_en', 'actualizada_en'].sort())
})
