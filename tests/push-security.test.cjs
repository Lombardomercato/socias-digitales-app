const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
const path = require('node:path')
function load(file, deps = require) {
  const exports = {}
  new Function('require', 'exports', ts.transpileModule(fs.readFileSync(path.resolve(__dirname, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(deps, exports)
  return exports
}
const validation = load('../src/lib/push-validation.ts')
const valid = { endpoint: 'https://fcm.googleapis.com/test', keys: { p256dh: 'a'.repeat(87), auth: 'b'.repeat(22) } }
test('admite proveedores web push oficiales y rechaza destinos externos o locales', () => {
  for (const host of ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com', 'wns2.notify.windows.com']) assert.equal(validation.esEndpointPushValido('https://' + host + '/test'), true)
  for (const url of ['http://fcm.googleapis.com/test', 'https://localhost/test', 'https://127.0.0.1/test', 'https://fcm.googleapis.com.evil.com/test', 'https://user:password@fcm.googleapis.com/test']) assert.equal(validation.esEndpointPushValido(url), false)
  assert.equal(validation.esSuscripcionPushValida(valid), true)
  assert.equal(validation.esSuscripcionPushValida({ ...valid, keys: { auth: 'invalid' } }), false)
})
function api(user = { id: 'sesion-real' }) {
  let written, deleted = []
  const chain = { eq: (key, value) => { deleted.push([key, value]); return chain }, then: resolve => resolve({ error: null }) }
  return { ...load('../src/app/api/push/subscribe/route.ts', name => {
    if (name === 'node:crypto') return require(name)
    if (name === '@/lib/push-validation') return validation
    if (name === 'next/server') return { NextResponse: { json: (body, options = {}) => ({ body, status: options.status ?? 200 }) } }
    if (name === '@/lib/supabase/server') return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: () => ({ upsert: async (input, options) => { written = { input, options }; return { error: null } }, delete: () => chain }) }) }
    throw new Error(name)
  }), written: () => written, deleted: () => deleted }
}
const req = (body, origin = 'https://app.sociasdigitales.com') => ({ headers: new Headers({ origin }), nextUrl: { origin: 'https://app.sociasdigitales.com' }, json: async () => body })
test('guarda varios dispositivos usando solo la identidad de la sesión', async () => {
  const endpoint = api()
  assert.equal((await endpoint.POST(req({ ...valid, alumna_id: 'otra' }))).status, 200)
  assert.equal(endpoint.written().input.alumna_id, 'sesion-real')
  assert.equal(endpoint.written().options.onConflict, 'alumna_id,endpoint')
})
test('desactivar no borra los otros dispositivos o usuarias', async () => {
  const endpoint = api()
  assert.equal((await endpoint.DELETE(req({ endpoint: valid.endpoint, alumna_id: 'otra' }))).status, 200)
  assert.deepEqual(endpoint.deleted(), [['alumna_id', 'sesion-real'], ['endpoint', valid.endpoint]])
})
test('rechaza origen ajeno, sesión ausente y datos inválidos', async () => {
  assert.equal((await api().POST(req(valid, 'https://otro.com'))).status, 403)
  assert.equal((await api(null).POST(req(valid))).status, 401)
  assert.equal((await api().POST(req({ endpoint: 'https://localhost' }))).status, 400)
})
