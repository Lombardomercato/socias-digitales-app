const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const path = require('node:path')
const exportsModule = {}
new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/lib/registration-mail.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(require, exportsModule)
const mail = { from: 'Flor <no-reply@sociasdigitales.com>', to: ['prueba@example.com'], subject: 'Confirmación', html: '<p>Prueba</p>', text: 'Prueba' }
const pause = async () => {}
test('reintenta errores temporales sin duplicar el correo', async () => {
  const calls = []
  const result = await exportsModule.enviarConfirmacion(mail, 'test', async (_, options) => {
    calls.push(options)
    return calls.length === 1 ? new Response('{}', { status: 503 }) : new Response('{"id":"test-mail"}', { status: 200 })
  }, pause)
  assert.deepEqual(result, { ok: true, messageId: 'test-mail', attempts: 2 })
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key'])
  assert.equal(calls[0].body, calls[1].body)
})
test('reintenta fallo de red y 429; termina después de tres intentos', async () => {
  let attempts = 0
  const result = await exportsModule.enviarConfirmacion(mail, 'test', async () => {
    attempts++
    if (attempts === 1) throw new Error('network')
    return new Response('{}', { status: 429 })
  }, pause)
  assert.equal(attempts, 3)
  assert.deepEqual(result, { ok: false, status: 429 })
})
test('no reintenta errores permanentes ni informa envío sin un id', async () => {
  let attempts = 0
  assert.deepEqual(await exportsModule.enviarConfirmacion(mail, 'test', async () => { attempts++; return new Response('{}', { status: 422 }) }, pause), { ok: false, status: 422 })
  assert.equal(attempts, 1)
  assert.equal((await exportsModule.enviarConfirmacion(mail, 'test', async () => new Response('{}', { status: 200 }), pause)).ok, false)
})
