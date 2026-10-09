const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const mod = { exports: {} }
const source = fs.readFileSync(path.resolve(__dirname, '../src/lib/meta-venta.ts'), 'utf8')
new Function('module', 'exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(mod, mod.exports)
const { calcularMetaVenta } = mod.exports

test('calcula usando el producto y la comisión propios; no una referencia fija', () => {
  assert.deepEqual(calcularMetaVenta(3000, 597, 50), { comision: 298.5, ventasNecesarias: 11 })
  assert.deepEqual(calcularMetaVenta(1000, 200, 25), { comision: 50, ventasNecesarias: 20 })
  assert.deepEqual(calcularMetaVenta(1000, 100, 100), { comision: 100, ventasNecesarias: 10 })
  assert.deepEqual(calcularMetaVenta(0, 200, 25), { comision: 50, ventasNecesarias: 0 })
})
test('no inventa precio/comisión; rechaza entradas inválidas', () => {
  for (const args of [[1000,null,50],[1000,597,null],[1000,0,50],[1000,597,0],[1000,597,101],[-1,597,50],[Infinity,597,50],[1000,NaN,50],[1000,0.001,0.001]]) {
    assert.equal(calcularMetaVenta(...args), null)
  }
})
test('conserva todas las preguntas originales del perfil y no borra el título al ocultarlo', () => {
  const perfil = fs.readFileSync(path.resolve(__dirname, '../src/app/perfil/PerfilCliente.tsx'), 'utf8')
  for (const campo of ['fecha_nacimiento','ocupacion','titulo_profesional','es_mama','ingresos_actuales','pais','provincia','whatsapp','avatar_url']) assert.ok(perfil.includes(campo))
  assert.ok(perfil.includes('Completá tu perfil'))
  assert.ok(perfil.includes('titulo_profesional: tituloProfesional || null'))
  assert.ok(!perfil.includes("ocupacion === 'Profesional' ? tituloProfesional : null"))
})
test('el acceso a Estrategia exige habilitación separada y no modifica las clases', () => {
  const migration = fs.readFileSync(path.resolve(__dirname, '../supabase/migrations/20261009132325_estrategia_individual_y_comisiones.sql'), 'utf8')
  assert.match(migration, /as restrictive for all to authenticated/)
  assert.match(migration, /grant select on public.accesos_estrategia to authenticated/)
  assert.doesNotMatch(migration, /drop |delete from |update public.perfiles/i)
  const route = fs.readFileSync(path.resolve(__dirname, '../src/app/api/admin/estrategia/acceso/route.ts'), 'utf8')
  assert.match(route, /perfil\?\.rol !== 'admin'/)
  assert.match(route, /headers.get\('origin'\)/)
  assert.doesNotMatch(route, /from\('perfiles'\)\.update/)
})
