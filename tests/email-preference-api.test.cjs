const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')

function endpoint({ user = { id: 'sesion-real' }, configured = true, error = null } = {}) {
  let escritura = null
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/app/api/cuenta/email/route.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  new Function('require', 'exports', code)(name => {
    if (name === 'next/server') return { NextResponse: { json: (body, opts = {}) => ({ body, status: opts.status ?? 200 }) } }
    if (name === '@/lib/supabase/server') return { createClient: async () => ({ auth: { getUser: async () => ({ data: { user } }) } }) }
    if (name === '@/lib/supabase/admin') return { isAdminSupabaseConfigured: () => configured, createAdminClient: () => ({ from: () => ({ upsert: async input => { escritura = input; return { error } } }) }) }
    throw new Error(name)
  }, exports)
  return { ...exports, escritura: () => escritura }
}
const req = (body, origin = 'https://app.sociasdigitales.com') => ({ headers: new Headers({ origin }), nextUrl: { origin: 'https://app.sociasdigitales.com' }, json: async () => body })
test('consentimiento solo modifica la usuaria autenticada, nunca el id enviado', async () => {
  const api = endpoint()
  assert.equal((await api.POST(req({ acepta_email: true, usuaria_id: 'otra' }))).status, 200)
  assert.deepEqual(api.escritura(), { usuaria_id: 'sesion-real', acepta_email: true, origen: 'perfil' })
})
test('baja voluntaria permite guardar false', async () => {
  const api = endpoint()
  assert.equal((await api.POST(req({ acepta_email: false }))).status, 200)
  assert.equal(api.escritura().acepta_email, false)
})
test('bloquea origen ajeno, sesión ausente, valor no booleano y servidor no configurado', async () => {
  assert.equal((await endpoint().POST(req({ acepta_email: true }, 'https://otro.com'))).status, 403)
  assert.equal((await endpoint({ user: null }).POST(req({ acepta_email: true }))).status, 401)
  assert.equal((await endpoint().POST(req({ acepta_email: 'true' }))).status, 400)
  assert.equal((await endpoint({ configured: false }).POST(req({ acepta_email: true }))).status, 503)
})
