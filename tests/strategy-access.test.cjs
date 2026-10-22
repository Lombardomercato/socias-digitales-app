/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function load(file, deps = {}) {
  const mod = { exports: {} }
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in deps ? deps[name] : require(name), mod, mod.exports)
  return mod.exports
}

const acceso = load('src/lib/class-access.ts')
const perfilId = '9c29f9ce-01fe-4a47-9d79-2d66359164be'
const adminId = 'c6d108d1-f27a-4d19-b631-790bb33e6f2a'
const endpoint = 'https://app.test/api/admin/estrategia/acceso'
const socia = { rol: 'alumna', tipo_usuario: 'socia', estado: 'activa', desafio_socias_habilitada: false }

function sistema(options = {}) {
  const calls = [], writes = []
  const user = options.user === undefined ? { id: adminId } : options.user
  const fail = stage => { if (options.throwAt === stage) throw new Error('Detalle privado de conexión') }
  const db = {
    auth: { getUser: async () => { fail('auth'); return { data: { user }, error: options.authError ?? null } } },
    from: table => {
      assert.equal(table, 'perfiles')
      return { select: columns => ({ eq: (key, value) => ({ maybeSingle: async () => {
        fail('caller')
        calls.push({ scope: 'caller', table, columns, key, value })
        return { data: options.caller === undefined ? { rol: 'admin' } : options.caller, error: options.callerError ?? null }
      } }) }) }
    },
  }
  const admin = { from: table => {
    if (table === 'perfiles') return { select: columns => ({ eq: (key, value) => ({ maybeSingle: async () => {
      fail('target')
      calls.push({ scope: 'target', table, columns, key, value })
      return { data: options.target === undefined ? { ...socia, desafio_socias_habilitada: true } : options.target, error: options.targetError ?? null }
    } }) }) }
    assert.equal(table, 'accesos_estrategia')
    return { upsert: (row, config) => {
      writes.push({ table, row, config })
      return { select: columns => ({ maybeSingle: async () => {
        fail('write')
        calls.push({ scope: 'write', table, columns })
        return { data: options.mapRow ? options.mapRow(row) : row, error: options.writeError ?? null }
      } }) }
    } }
  } }
  const route = load('src/app/api/admin/estrategia/acceso/route.ts', {
    'next/server': { NextResponse: { json: (data, config) => Response.json(data, config) } },
    '@/lib/supabase/server': { createClient: async () => { fail('client'); return db } },
    '@/lib/supabase/admin': {
      isAdminSupabaseConfigured: () => options.configured !== false,
      createAdminClient: () => { calls.push({ scope: 'admin-client' }); fail('admin-client'); return admin },
    },
    '@/lib/class-access': acceso,
  })
  const post = (body = { perfilId, habilitada: true }, origin = 'https://app.test', raw = false) => route.POST(new Request(endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json', ...(origin === null ? {} : { origin }) },
    body: raw ? body : JSON.stringify(body),
  }))
  return { post, calls, writes }
}

test('Estrategia: mantiene origen, sesión y rol administrativo del perfil protegido', async () => {
  for (const origin of ['https://otro.test', null]) {
    const s = sistema()
    assert.equal((await s.post(undefined, origin)).status, 403)
    assert.equal(s.calls.length, 0)
  }
  for (const [options, status] of [
    [{ user: null }, 401],
    [{ authError: { message: 'expired' } }, 401],
    [{ caller: null }, 403],
    [{ user: { id: adminId, user_metadata: { rol: 'admin' } }, caller: { rol: 'alumna' } }, 403],
    [{ callerError: { code: 'read_failed' } }, 503],
    [{ configured: false }, 503],
  ]) {
    const s = sistema(options)
    assert.equal((await s.post()).status, status)
    assert.equal(s.writes.length, 0)
    assert.ok(s.calls.every(call => call.scope !== 'admin-client'))
  }
})

test('Estrategia: cuerpos nulos, arrays, tipos incorrectos y JSON inválido se rechazan sin escribir', async () => {
  for (const body of [null, [], [perfilId, true], '', 1, true, {}, { perfilId }, { perfilId, habilitada: 'true' }, { perfilId: 3, habilitada: true }, { perfilId: 'no-uuid', habilitada: true }, { perfilId, habilitada: true, rol: 'admin' }]) {
    const s = sistema()
    assert.equal((await s.post(body)).status, 400, JSON.stringify(body))
    assert.equal(s.writes.length, 0)
    assert.ok(s.calls.every(call => call.scope !== 'admin-client'))
  }
  assert.equal((await sistema().post('{', 'https://app.test', true)).status, 400)
})

test('Estrategia: Socia o Desafío activos con Desafío habilitado pueden recibir permiso individual', async () => {
  for (const target of [{ ...socia, desafio_socias_habilitada: true }, { rol: 'alumna', tipo_usuario: 'desafio', estado: 'activa', desafio_socias_habilitada: true }]) {
    const s = sistema({ target })
    const response = await s.post()
    assert.equal(response.status, 200)
    assert.deepEqual(await response.json(), { ok: true })
    assert.equal(s.writes.length, 1)
    const write = s.writes[0]
    assert.equal(write.table, 'accesos_estrategia')
    assert.deepEqual(write.config, { onConflict: 'usuaria_id' })
    assert.equal(write.row.usuaria_id, perfilId)
    assert.equal(write.row.habilitada, true)
    assert.equal(write.row.administradora_id, adminId)
    assert.ok(Number.isFinite(Date.parse(write.row.actualizada_en)))
    assert.deepEqual(Object.keys(write.row).sort(), ['actualizada_en', 'administradora_id', 'habilitada', 'usuaria_id'])
    assert.deepEqual(s.calls.find(call => call.scope === 'caller'), { scope: 'caller', table: 'perfiles', columns: 'rol', key: 'id', value: adminId })
    const consulta = s.calls.find(call => call.scope === 'target')
    assert.equal(consulta.value, perfilId)
    for (const campo of ['rol', 'tipo_usuario', 'estado', 'desafio_socias_habilitada']) assert.ok(consulta.columns.split(',').includes(campo))
    assert.equal(s.calls.find(call => call.scope === 'write').columns, 'usuaria_id,habilitada,administradora_id')
  }
})

test('Estrategia: no habilita Socia sin Desafío, planes inactivos, gratuitas, pendientes ni administradoras', async () => {
  const targets = [
    socia,
    { ...socia, estado: 'pausada' }, { ...socia, estado: 'cancelada' }, { ...socia, estado: undefined },
    { ...socia, estado: 'pausada', desafio_socias_habilitada: true },
    { ...socia, estado: 'cancelada', desafio_socias_habilitada: true },
    { ...socia, tipo_usuario: 'gratuito' },
    { ...socia, tipo_usuario: 'desafio', desafio_socias_habilitada: false },
    { ...socia, tipo_usuario: 'desafio', desafio_socias_habilitada: true, estado: 'pausada' },
    { rol: 'admin', estado: 'activa' },
  ]
  for (const target of targets) {
    const s = sistema({ target })
    const response = await s.post()
    assert.equal(response.status, 409)
    assert.match((await response.json()).error, /Desafío habilitado/)
    assert.equal(s.writes.length, 0)
  }
})

test('Estrategia: permite retirar el permiso a alumnas pausadas/canceladas sin cambiar plan, estado ni clases', async () => {
  for (const target of [{ ...socia, estado: 'pausada' }, { ...socia, estado: 'cancelada' }, { ...socia, tipo_usuario: 'gratuito' }]) {
    const s = sistema({ target })
    assert.equal((await s.post({ perfilId, habilitada: false })).status, 200)
    assert.equal(s.writes.length, 1)
    assert.equal(s.writes[0].row.habilitada, false)
    assert.equal(s.writes[0].table, 'accesos_estrategia')
  }
  const s = sistema({ target: { rol: 'admin' } })
  assert.equal((await s.post({ perfilId, habilitada: false })).status, 409)
  assert.equal(s.writes.length, 0)
})

test('Estrategia: lectura fallida, cuenta ausente y escritura sin fila confirmada no producen falsos éxitos', async () => {
  const absent = sistema({ target: null })
  assert.equal((await absent.post()).status, 404)
  assert.equal(absent.writes.length, 0)
  const denied = sistema({ targetError: { code: 'permission_denied' } })
  assert.equal((await denied.post()).status, 503)
  assert.equal(denied.writes.length, 0)
  for (const options of [
    { writeError: { code: 'denied' } }, { mapRow: () => null },
    { mapRow: row => ({ ...row, usuaria_id: adminId }) },
    { mapRow: row => ({ ...row, habilitada: false }) },
    { mapRow: row => ({ ...row, administradora_id: perfilId }) },
  ]) {
    const response = await sistema(options).post()
    assert.equal(response.status, 503)
    const data = await response.json()
    assert.ok(data.error)
    assert.equal(data.ok, undefined)
  }
})

test('Estrategia: excepciones de conexión se convierten en un error visible y no revelan el detalle interno', async () => {
  for (const throwAt of ['client', 'auth', 'caller', 'admin-client', 'target', 'write']) {
    const response = await sistema({ throwAt }).post()
    assert.equal(response.status, 503)
    const data = await response.json()
    assert.match(data.error, /Comprobá el acceso/)
    assert.ok(!JSON.stringify(data).includes('Detalle privado'))
  }
})
