/* eslint-disable @typescript-eslint/no-require-imports */
// Datos ficticios y helpers reales. No sesión, red, R2 ni base de datos.
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) { const m = { exports: {} }; new Function('require', 'module', 'exports', ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(name => name in deps ? deps[name] : require(name), m, m.exports); return m.exports }
const management = load('src/lib/class-management.ts'), access = load('src/lib/class-access.ts')
const materials = load('src/lib/class-materials.ts', { './class-management': management })
const api = load('src/lib/resource-library.ts', { './class-access': access, './class-management': management, './class-materials': materials })
const uuid = n => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`
const SOCIA = { rol: 'alumna', tipo_usuario: 'socia', estado: 'activa', desafio_socias_habilitada: false }
const clase = (n, extra = {}) => ({ id: uuid(n), titulo: `Clase ${n}`, descripcion: null, orden: n, modulo: 'Desafío Socias', activo: true, acceso_gratuito: false, puede_ver: true, tiene_video_privado: true, vimeo_url: null, plan: '27', ...extra })
const material = (n, extra = {}) => ({ id: uuid(n), titulo: 'Guía de práctica', tipo: 'enlace', url: 'https://docs.example.test/privado?token=no-publicar', activo: true, creado: '2026-10-23T12:00:00Z', ...extra })
const contexto = { claseId: uuid(1), claseTitulo: 'Elegí tu nicho', programa: 'Desafío Socias', seccion: 'Clases', orden: 1 }

test('offset de biblioteca es un entero numérico seguro, no un valor coercionado', () => {
  assert.equal(api.CLASES_POR_PAGINA_RECURSOS, 20)
  for (const value of [0, 1, 20, Number.MAX_SAFE_INTEGER]) assert.equal(api.offsetRecursosValido(value), true)
  for (const value of [-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '0', '20', null, undefined, {}, []]) assert.equal(api.offsetRecursosValido(value), false)
})

test('solo clases activas, UUID y autorización explícita doble entran al índice', () => {
  const catalogo = [clase(1), clase(2, { activo: false }), clase(3, { puede_ver: false }), clase(4, { id: 'no-uuid' }), clase(1), clase(1, { id: uuid(1).toUpperCase() }), null]
  const result = api.clasesAutorizadasRecursos(catalogo, SOCIA)
  assert.deepEqual(result, [{ ...contexto, claseTitulo: 'Clase 1' }])
  for (const perfil of [null, { rol: 'admin', estado: 'activa' }]) assert.deepEqual(api.clasesAutorizadasRecursos(catalogo, perfil), [])
  for (const perfil of [{ ...SOCIA, estado: 'pausada' }, { ...SOCIA, estado: 'cancelada' }, { ...SOCIA, estado: undefined }, { ...SOCIA, tipo_usuario: 'gratuito', rol: 'afiliada' }]) assert.deepEqual(api.clasesAutorizadasRecursos(catalogo, perfil), [])
})

test('muestras autorizadas conservan acceso gratuito/pausado aunque no tengan video', () => {
  const muestra = clase(1, { acceso_gratuito: true, tiene_video_privado: false, vimeo_url: null })
  for (const perfil of [{ rol: 'alumna', tipo_usuario: 'gratuito' }, { ...SOCIA, estado: 'pausada' }, { ...SOCIA, estado: 'cancelada' }]) assert.equal(api.clasesAutorizadasRecursos([muestra], perfil).length, 1)
  assert.equal(api.clasesAutorizadasRecursos([clase(1)], { rol: 'alumna', tipo_usuario: 'desafio', estado: 'activa', desafio_socias_habilitada: true }).length, 1)
  assert.equal(api.clasesAutorizadasRecursos([clase(1)], { rol: 'alumna', tipo_usuario: 'desafio', estado: 'activa', desafio_socias_habilitada: false }).length, 0)
})

test('orden usa programas y secciones existentes, alias heredados y desempate estable', () => {
  const rows = [clase(9, { modulo: 'Zeta', orden: 1 }), clase(8, { modulo: 'Álgebra', orden: 1 }), clase(7, { modulo: 'Desafío Socias › Material de apoyo', orden: 0 }), clase(6, { modulo: 'Desafío Socias en vivo', orden: 2 }), clase(5, { modulo: 'Desafío Socias', orden: 1 }), clase(4, { modulo: 'Introducción', orden: 2 }), clase(3, { modulo: 'Bienvenida', orden: 1 }), clase(2, { modulo: 'Bienvenida', orden: 1 })]
  const result = api.clasesAutorizadasRecursos(rows, SOCIA)
  assert.deepEqual(result.map(item => item.claseId), [2, 3, 4, 5, 6, 7, 8, 9].map(uuid))
  assert.deepEqual(api.clasesAutorizadasRecursos([...rows].reverse(), SOCIA), result)
  assert.equal(result[2].programa, 'Bienvenida'); assert.equal(result[4].programa, 'Desafío Socias'); assert.equal(result[5].seccion, 'Material de apoyo')
  assert.deepEqual(rows.map(row => row.id), [9, 8, 7, 6, 5, 4, 3, 2].map(uuid))
})

test('catálogo malformado no se convierte en una biblioteca vacía', () => {
  assert.throws(() => api.clasesAutorizadasRecursos(null, SOCIA))
  for (const extra of [{ titulo: '' }, { titulo: null }, { modulo: '' }, { modulo: null }, { modulo: ' › Material de apoyo' }, { orden: -1 }, { orden: 1.5 }, { orden: NaN }]) assert.throws(() => api.clasesAutorizadasRecursos([clase(1, extra)], SOCIA))
})

test('proyección whitelist solo entrega materiales activos y endpoints propios protegidos', () => {
  const archivo = material(2, { tipo: 'archivo', titulo: '  Planilla   práctica ', archivo: { nombre: 'Planilla.xlsx', bytes: 2048, mime: 'no-confiar', extension: 'no-confiar' }, url: undefined, key: 'secreto-r2' })
  const result = api.proyectarRecursosClase(contexto, [material(1, { administradora: 'privada', revision: 'no-filtrar' }), archivo, material(3, { activo: false, titulo: 'Retirado' })])
  assert.equal(result.length, 2)
  assert.deepEqual(result.map(item => item.href), [1, 2].map(n => `/api/classroom/${contexto.claseId}/materiales/${uuid(n)}`))
  assert.deepEqual(Object.keys(result[0]).sort(), ['id', 'titulo', 'tipo', 'detalle', 'href', 'clave', 'claseId', 'claseTitulo', 'programa', 'seccion'].sort())
  assert.equal(result[0].clave, `${contexto.claseId}:${uuid(1)}`); assert.equal(result[1].titulo, 'Planilla práctica')
  const json = JSON.stringify(result)
  for (const privado of ['no-publicar', '/privado', 'token=', 'administradora', 'revision', 'secreto-r2', 'creado', 'Retirado']) assert.ok(!json.includes(privado), privado)
  assert.equal(result[0].detalle, 'docs.example.test'); assert.match(result[1].detalle, /XLSX/)
  assert.notEqual(api.proyectarRecursosClase({ ...contexto, claseId: uuid(2) }, [material(1)])[0].clave, result[0].clave)
})

test('validación real rechaza índices corruptos, duplicados, enlaces inseguros y archivos inválidos', () => {
  for (const input of [null, {}, [material(1), material(1)], [material(1, { url: 'javascript:alert(1)' })], [material(1, { url: 'https://user:clave@example.test' })], [material(1, { tipo: 'archivo', archivo: { nombre: '../privado.pdf', bytes: 20 } })], [material(1, { tipo: 'archivo', archivo: { nombre: 'grande.pdf', bytes: materials.MAX_MATERIAL_BYTES + 1 } })]]) assert.throws(() => api.proyectarRecursosClase(contexto, input))
  assert.throws(() => api.proyectarRecursosClase({ ...contexto, claseId: 'invalido' }, [material(1)]))
})

test('búsqueda local sin acentos cruza nombre/clase/programa/tipo y combina filtros sin mutar', () => {
  const items = [
    ...api.proyectarRecursosClase(contexto, [material(1, { titulo: 'Guía de investigación', tipo: 'archivo', archivo: { nombre: 'Guía.PDF', bytes: 2048 } })]),
    ...api.proyectarRecursosClase({ ...contexto, claseId: uuid(2), claseTitulo: 'Abrí Hotmart', seccion: 'Material de apoyo' }, [material(2, { titulo: 'Recursos útiles' })]),
    ...api.proyectarRecursosClase({ ...contexto, claseId: uuid(3), programa: 'Bienvenida', claseTitulo: 'Empezá acá' }, [material(3, { titulo: 'Conocé a Flor' })]),
  ]
  const before = JSON.stringify(items)
  assert.deepEqual(api.filtrarRecursosBiblioteca(items), items)
  for (const buscar of ['  GUIA  investigacion  ', 'nicho pdf', 'desafio archivo', 'elegi guia']) assert.deepEqual(api.filtrarRecursosBiblioteca(items, { buscar }).map(item => item.id), [uuid(1)])
  assert.deepEqual(api.filtrarRecursosBiblioteca(items, { buscar: 'hotmart apoyo enlace', programa: 'Desafío Socias', tipo: 'enlace' }).map(item => item.id), [uuid(2)])
  assert.deepEqual(api.filtrarRecursosBiblioteca(items, { buscar: 'guia', tipo: 'enlace' }), [])
  assert.deepEqual(api.filtrarRecursosBiblioteca(items, { programa: 'Otro' }), [])
  assert.deepEqual(api.filtrarRecursosBiblioteca(items, { tipo: 'enlace' }).map(item => item.id), [uuid(2), uuid(3)])
  assert.equal(JSON.stringify(items), before)
})

test('modelo puro importable por cliente no contiene transporte, credenciales, hash ni almacenamiento', () => {
  const source = read('src/lib/resource-library.ts')
  for (const forbidden of ['server-only', 'node:', 'createHash', 'class-materials-store', 'class-catalog', 'process.env', 'fetch(', '.from(', '.rpc(', 'createAdminClient']) assert.ok(!source.includes(forbidden), forbidden)
})
