const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const moduleEmail = { exports: {} }
const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib/email-consent.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
new Function('require', 'module', 'exports', code)(require, moduleEmail, moduleEmail.exports)
const { crearTokenBaja, verificarTokenBaja, contenidoEmailAviso } = moduleEmail.exports
const id = '06bb7999-997b-49c8-ba80-b8d05bca4a84'
const fecha = '2026-10-08T20:00:00Z'
const secret = 'secret-ficticio-solo-tests'

test('baja firmada: válida, estable y limitada en el tiempo', () => {
  const token = crearTokenBaja(id, fecha, secret)
  assert.equal(token, crearTokenBaja(id, fecha, secret))
  assert.equal(verificarTokenBaja(token, secret, Date.parse(fecha)), id)
  assert.equal(verificarTokenBaja(token, secret, Date.parse(fecha) + 91 * 86400000), null)
})
test('rechaza tokens alterados, secretos ajenos y entradas inválidas', () => {
  const token = crearTokenBaja(id, fecha, secret)
  assert.equal(verificarTokenBaja(token, 'otro', Date.parse(fecha)), null)
  assert.equal(verificarTokenBaja(token.replace(id, '4b07d2d8-c1e7-4663-8403-ff08c738fc55'), secret, Date.parse(fecha)), null)
  for (const invalido of [null, 15, '', 'x'.repeat(200), token + '.otra']) assert.equal(verificarTokenBaja(invalido, secret), null)
})
test('email escapa contenido y mantiene banner, bandeja y baja explícita', () => {
  const contenido = contenidoEmailAviso('<script>hola</script>', 'A & B\nsegunda línea', 'https://app.sociasdigitales.com', 'token', '<img alt="banner oficial">')
  assert.ok(contenido.html.includes('&lt;script&gt;'))
  assert.ok(!contenido.html.includes('<script>'))
  assert.ok(contenido.html.includes('A &amp; B<br>segunda línea'))
  assert.ok(contenido.html.includes('<img alt="banner oficial">'))
  assert.ok(contenido.html.includes('/emails/preferencias#token=token'))
  assert.ok(contenido.text.includes('/notificaciones'))
})
