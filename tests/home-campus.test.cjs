/* eslint-disable @typescript-eslint/no-require-imports */
// SSR y datos simulados, sin suplantar la prueba de sesión/reproducción real.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript'), React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText)(n => n in deps ? deps[n] : require(n), m, m.exports); return m.exports }
const icon = { default: () => React.createElement('svg', { 'aria-hidden': true }) }
const progress = load('src/lib/class-progress.ts')
const { default: Campus, HomeCampusLoading } = load('src/components/HomeCampus.tsx', { 'next/link': { default: props => React.createElement('a', props) }, './ArrowIcon': icon, './NavigationIcon': icon, './UnreadNotices': { UnreadNoticeLink: ({ variante }) => React.createElement('a', { href: '/notificaciones', 'data-avisos': variante }, 'Avisos') }, '@/lib/class-progress': progress, '@/lib/my-day': load('src/lib/my-day.ts') })
const programa = { nombre: 'Desafío Socias', total: 3, completadas: 1, enCurso: 1, bloqueadas: 0, sinVideo: 0, completo: false, proxima: { id: '00000000-0000-4000-8000-000000000001', titulo: 'Elegí tu producto', programa: 'Desafío Socias', seccion: 'Clases', motivo: 'continuar', posicionSeg: 29 } }
const resumen = { estado: 'listo', programas: [programa], total: 3, completadas: 1, enCurso: 1, bloqueadas: 0, sinVideo: 0, programasCompletos: 0, proxima: programa.proxima }
const html = data => renderToStaticMarkup(React.createElement(Campus, { resumen: data }))
test('campus conecta el próximo paso y cada programa con la clase real, sin iframe o autoplay', () => {
  const body = html(resumen)
  assert.match(body, /Retomar mi clase/); assert.match(body, /Retomá desde 0:29/)
  assert.match(body, /href="\/classroom\?clase=00000000-0000-4000-8000-000000000001"/)
  assert.match(body, /aria-label="Retomar: Desafío Socias"/)
  assert.match(body, /role="progressbar"[^>]*aria-valuemax="3"[^>]*aria-valuenow="1"/)
  assert.match(body, /33%/); assert.match(body, /marcás como completadas/)
  for (const source of ['iframe', 'autoPlay', 'graduada', 'certificado', 'video_key']) assert.ok(!body.includes(source))
})
test('sin historial confirmado propone empezar, sin fingir retomar ni un minuto', () => {
  const proxima = { ...programa.proxima, motivo: 'empezar', posicionSeg: null }
  const body = html({ ...resumen, completadas: 0, enCurso: 0, proxima, programas: [{ ...programa, completadas: 0, enCurso: 0, proxima }] })
  assert.match(body, /Empezar mi clase/); assert.match(body, /Empezar programa/)
  assert.ok(!body.includes('Retomá desde')); assert.ok(!body.includes('Retomar mi clase'))
})
test('error de progreso conserva disponibilidad pero no inventa ceros, porcentaje ni próxima clase', () => {
  const body = html({ ...resumen, estado: 'error', completadas: null, enCurso: null, programasCompletos: null, proxima: null, programas: [{ ...programa, completadas: null, enCurso: null, completo: null, proxima: null }] })
  assert.match(body, /No pudimos reunir tus avances/); assert.match(body, /role="alert"/)
  assert.match(body, /Avance no disponible/); assert.match(body, /Reintentar/)
  assert.ok(!body.includes('progressbar')); assert.ok(!body.includes('%')); assert.ok(!body.includes('?clase='))
  assert.ok(!body.includes('Empezar programa')); assert.ok(!body.includes('0 de 3'))
  assert.match(body, /Clases disponibles<\/dt><dd[^>]*>3/)
  assert.match(body, /Completadas<\/dt><dd[^>]*>—/)
})
test('catálogo fallido no inventa disponibilidad ni muestra un vacío confirmado', () => {
  const body = html({ estado: 'error', programas: [], total: null, completadas: null, enCurso: null, bloqueadas: null, sinVideo: null, programasCompletos: null, proxima: null })
  assert.match(body, /No pudimos reunir tu formación/)
  assert.ok(!body.includes('Tu recorrido está por empezar')); assert.ok(!body.includes('Mis programas'))
  assert.match(body, /Clases disponibles<\/dt><dd[^>]*>—/)
})
test('vacío real y todas completadas tienen mensajes diferentes sin diplomas ni nuevas clases ficticias', () => {
  const vacio = html({ ...resumen, total: 0, completadas: 0, enCurso: 0, programas: [], proxima: null })
  assert.match(vacio, /Todavía no hay clases disponibles/); assert.ok(!vacio.includes('al día con las clases'))
  const completo = html({ ...resumen, completadas: 3, enCurso: 0, proxima: null, programas: [{ ...programa, completadas: 3, enCurso: 0, completo: true, proxima: null }] })
  assert.match(completo, /Tus clases están al día/); assert.match(completo, /Estás al día con las clases disponibles/); assert.match(completo, /100%/)
  assert.ok(!completo.includes('?clase='))
})
test('un recorte con clases bloqueadas o sin video no se celebra como programa terminado ni 100%', () => {
  for (const extra of [{ bloqueadas: 1 }, { sinVideo: 1 }]) {
    const body = html({ ...resumen, ...extra, completadas: 3, proxima: null, programas: [{ ...programa, ...extra, completadas: 3, completo: false, proxima: null }] })
    assert.ok(!body.replace(/<[^>]*>/g, '').includes('100%')); assert.ok(!body.includes('¡Mirá todo'))
    assert.match(body, /3 de 3 disponibles completadas/)
  }
})
test('títulos se escapan, controles accesibles y tarjetas móviles con fondo sólido y borde', () => {
  const body = html({ ...resumen, proxima: { ...programa.proxima, titulo: '<script>Privado</script>' }, programas: [{ ...programa, nombre: 'Programa <largo>' }] })
  assert.ok(!body.includes('<script>')); assert.match(body, /&lt;script&gt;/)
  assert.match(body, /border-\[#E7DDD5\]/); assert.match(body, /bg-\[#FFFDFA\]/)
  assert.match(body, /min-h-11/); assert.match(body, /break-words/)
  assert.ok(!body.includes('Cada paso cuenta')); assert.ok(!body.includes('Tu constancia'))
  assert.match(body, /Tu resumen/); assert.match(body, /data-avisos="resumen"/)
  assert.ok(!/<article class="[^"]*bg-\[#294A38\]/.test(body))
  const loading = renderToStaticMarkup(React.createElement(HomeCampusLoading))
  assert.match(loading, /role="status"/); assert.ok(!loading.includes('progressbar')); assert.ok(!loading.includes('%'))
})
test('wrapper servidor usa lector con identidad confiable y pasa únicamente el resumen a la vista', async () => {
  const db = { sesion: true }, perfil = { tipo_usuario: 'socia' }
  let calls = 0
  const permiso = { permitido: true }, miDia = { estado: 'listo', fecha: '2026-10-23', total: 0, completadas: 0, pendientes: 0, proximas: [] }
  let diaCalls = 0
  const wrapper = load('src/app/inicio/CampusFormation.tsx', { '@/components/HomeCampus': { default: Campus }, '@/lib/learning-campus-server': { leerCampusAprendizaje: async (...args) => { calls++; assert.deepEqual(args, [db, 'propia', perfil]); return resumen } }, '@/lib/home-operations-server': { leerResumenMiDiaInicio: async (...args) => { diaCalls++; assert.deepEqual(args, [db, 'propia', '2026-10-23', permiso]); return miDia } } }).default
  const element = await wrapper({ supabase: db, usuariaId: 'propia', perfil, fecha: '2026-10-23', permisoMiDia: permiso })
  assert.equal(calls, 1); assert.equal(diaCalls, 1); assert.deepEqual(Object.keys(element.props), ['resumen', 'miDia']); assert.equal(element.props.resumen, resumen); assert.equal(element.props.miDia, miDia)
})
test('Inicio resume Mi día sin modificar tareas y sin confundir error con día vacío', () => {
  const renderDia = miDia => renderToStaticMarkup(React.createElement(Campus, { resumen, miDia }))
  const dia = { estado: 'listo', fecha: '2026-10-23', total: 3, completadas: 1, pendientes: 2, proximas: [{ id: 'a', texto: 'Estudiar la clase' }, { id: 'b', texto: 'Preparar contenido' }] }
  const body = renderDia(dia)
  assert.match(body, /2 pendientes/); assert.match(body, /Estudiar la clase/); assert.match(body, /tareas completadas hoy/)
  assert.match(body, /href="\/checklist"/); assert.match(body, /href="\/checklist#plan-de-estudio"/)
  assert.ok(!body.includes('<button')); assert.ok(!body.includes('<input'))
  const vacio = renderDia({ ...dia, total: 0, completadas: 0, pendientes: 0, proximas: [] })
  assert.match(vacio, /Sin tareas para hoy/); assert.ok(!vacio.includes('Todo lo de hoy, completado'))
  const completo = renderDia({ ...dia, total: 3, completadas: 3, pendientes: 0, proximas: [] })
  assert.match(completo, /Todo lo de hoy, completado/)
  const error = renderDia({ estado: 'error' })
  assert.match(error, /No pudimos cargar tus tareas/); assert.ok(!error.includes('Sin tareas para hoy')); assert.ok(!error.includes('tareas completadas hoy'))
  assert.ok(!renderDia({ estado: 'no-habilitado' }).includes('Organizar mi día'))
})
