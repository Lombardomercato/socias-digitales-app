const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')

function loadModule(file) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  new Function('require', 'module', 'exports', code)(name => loadModule(path.resolve(path.dirname(file), `${name}.ts`)), module, module.exports)
  return module.exports
}
const { perteneceAudiencia, esDestinoValido, fechaAviso } = loadModule(path.resolve(__dirname, '../src/lib/notifications.ts'))

test('cada acceso recibe solo sus avisos; Desafío requiere habilitación', () => {
  assert.equal(perteneceAudiencia({rol:'alumna',tipo_usuario:'gratuito'}, ['gratuito']), true)
  assert.equal(perteneceAudiencia({rol:'alumna',tipo_usuario:'gratuito'}, ['desafio']), false)
  assert.equal(perteneceAudiencia({rol:'alumna',tipo_usuario:'desafio'}, ['desafio']), false)
  assert.equal(perteneceAudiencia({rol:'alumna',tipo_usuario:'desafio',desafio_socias_habilitada:true}, ['desafio']), true)
  assert.equal(perteneceAudiencia({rol:'alumna',tipo_usuario:'socia'}, ['socia']), true)
  assert.equal(perteneceAudiencia({rol:'afiliada',tipo_usuario:'gratuito'}, ['socia']), true)
  assert.equal(perteneceAudiencia({rol:'admin',tipo_usuario:'gratuito'}, ['gratuito','desafio','socia']), false)
})
test('no admite enlaces externos, JavaScript ni destinos de administración', () => {
  for (const destino of ['/clases','/lanzamiento','/inicio','/perfil','/notificaciones']) assert.equal(esDestinoValido(destino), true)
  for (const destino of ['//otro.com','https://otro.com','javascript:alert(1)','/admin','/productos',null,42]) assert.equal(esDestinoValido(destino), false)
})
test('las fechas usan Argentina y día/mes/año', () => {
  assert.match(fechaAviso('2026-10-09T00:03:00Z'), /08\/10\/2026/)
  assert.match(fechaAviso('2026-10-09T00:03:00Z'), /21:03/)
})
