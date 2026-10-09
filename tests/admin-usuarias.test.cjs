const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const moduleFixture = { exports: {} }
new Function('module', 'exports', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib/admin-usuarias.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(moduleFixture, moduleFixture.exports)
const { contarTipos, filtrarUsuarias, tipoAcceso } = moduleFixture.exports
const usuarias = [
  { id: 'admin', nombre: 'Administración', rol: 'admin', tipo_usuario: 'gratuito', estado: 'activa' },
  { id: 'gratis', nombre: 'Ana', pais: 'Argentina', rol: 'alumna', tipo_usuario: 'gratuito', estado: 'activa' },
  { id: 'desafio', nombre: 'María', pais: 'Chile', rol: 'alumna', tipo_usuario: 'desafio', estado: 'activa' },
  { id: 'socia', nombre: 'Laura', pais: 'Argentina', rol: 'afiliada', tipo_usuario: 'socia', estado: 'pausada' },
  { id: 'legado', nombre: 'Luisa', rol: 'afiliada_lanzamiento', tipo_usuario: null, estado: 'activa' },
  { id: 'sin-tipo', nombre: 'Sofía', rol: 'alumna', tipo_usuario: null, estado: 'cancelada' },
]
test('cantidades por tipo excluyen administradoras y contemplan perfiles anteriores', () => {
  assert.deepEqual(contarTipos(usuarias), { gratuito: 2, desafio: 1, socia: 2 })
  assert.deepEqual(contarTipos([]), { gratuito: 0, desafio: 0, socia: 0 })
  assert.equal(tipoAcceso(usuarias[4]), 'socia')
  assert.equal(tipoAcceso(usuarias[5]), 'gratuito')
  assert.equal(tipoAcceso({ rol: 'afiliada', tipo_usuario: 'desafio' }), 'desafio')
})
test('tipo, estado y búsqueda se combinan sin modificar usuarias o accesos', () => {
  const anterior = JSON.stringify(usuarias)
  assert.deepEqual(filtrarUsuarias(usuarias, { busqueda: '', estado: 'todas', tipo: 'socia' }).map(x => x.id), ['socia', 'legado'])
  assert.deepEqual(filtrarUsuarias(usuarias, { busqueda: '', estado: 'activa', tipo: 'socia' }).map(x => x.id), ['legado'])
  assert.deepEqual(filtrarUsuarias(usuarias, { busqueda: '  ARGENTINA ', estado: 'todas', tipo: 'socia' }).map(x => x.id), ['socia'])
  assert.deepEqual(filtrarUsuarias(usuarias, { busqueda: 'María', estado: 'activa', tipo: 'desafio' }).map(x => x.id), ['desafio'])
  assert.equal(filtrarUsuarias(usuarias, { busqueda: '', estado: 'todas', tipo: 'todas' }).length, 5)
  assert.equal(filtrarUsuarias(usuarias, { busqueda: 'Argentina', estado: 'todas', tipo: 'desafio' }).length, 0)
  assert.equal(JSON.stringify(usuarias), anterior)
})
test('contadores de filtros se calculan dentro del otro filtro y no alteran totales', () => {
  const activas = filtrarUsuarias(usuarias, { busqueda: '', estado: 'activa', tipo: 'todas' })
  assert.deepEqual(contarTipos(activas), { gratuito: 1, desafio: 1, socia: 1 })
  assert.deepEqual(contarTipos(usuarias), { gratuito: 2, desafio: 1, socia: 2 })
})
