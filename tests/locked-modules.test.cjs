/* eslint-disable @typescript-eslint/no-require-imports */
// SSR con permisos simulados; no sustituye la autorización de cada ruta/API.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8')
function load(file, deps = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in deps ? deps[name] : require(name), m, m.exports)
  return m.exports
}
const modulos = load('src/lib/modules.ts')
const { default: LockedModules } = load('src/components/LockedModules.tsx', {
  'next/link': { default: props => React.createElement('a', props) },
  './NavigationIcon': load('src/components/NavigationIcon.tsx'),
  './ArrowIcon': load('src/components/ArrowIcon.tsx'),
  '@/lib/modules': modulos,
})
const html = props => renderToStaticMarkup(React.createElement(LockedModules, props))
const habilitados = { resultadosHabilitados: true, metricasHabilitadas: true, miDiaHabilitado: true, logrosHabilitados: true }
const etiquetas = body => [...body.matchAll(/<a\b[^>]*aria-label="([^"]+)"/g)].map(match => match[1])

test('modo por defecto conserva catálogo, orden, destinos y acceso restringido', () => {
  const body = html({})
  assert.match(body, /Tu espacio Socias Digitales/)
  assert.ok(!body.includes('<details')); assert.ok(!body.includes('Mis herramientas'))
  assert.deepEqual(etiquetas(body), modulos.MODULOS_SOCIAS.map(modulo => `${modulo.nombre}: bloqueado`))
  for (const modulo of modulos.MODULOS_SOCIAS) {
    assert.ok(body.includes(`href="${modulo.href}"`)); assert.ok(body.includes(modulo.descripcion))
  }
  assert.equal(body.match(/Acceso con Socias Digitales/g).length, modulos.MODULOS_SOCIAS.length)
  assert.ok(!body.includes('Quiero ser Socia'))
})

test('los cuatro accesos conocidos no abren módulos sin desarrollar', () => {
  const body = html(habilitados)
  for (const nombre of ['Mis resultados', 'Mis métricas', 'Mi día', 'Mis logros']) assert.ok(body.includes(`aria-label="${nombre}: habilitado"`))
  for (const nombre of ['Productos', 'Mis objetivos', 'Comunidad', 'Ranking']) assert.ok(body.includes(`aria-label="${nombre}: bloqueado"`))
  for (const accion of ['Abrir mis resultados', 'Abrir mis métricas', 'Abrir mi día', 'Ver mis logros']) assert.ok(body.includes(accion))
  assert.ok(!body.includes('próximamente')); assert.ok(!body.includes('pago confirmado'))
})

test('compacto presenta herramientas activas primero y el resto en plegado cerrado', () => {
  const body = html({ ...habilitados, compacto: true })
  assert.match(body, /Mis herramientas/); assert.ok(!body.includes('Tu espacio Socias Digitales'))
  const plegado = body.indexOf('<details')
  assert.ok(plegado > 0)
  const activas = body.slice(0, plegado), otras = body.slice(plegado)
  assert.deepEqual(etiquetas(activas), ['Mis resultados: habilitado', 'Mis métricas: habilitado', 'Mi día: habilitado', 'Mis logros: habilitado'])
  assert.deepEqual(etiquetas(otras), ['Productos: bloqueado', 'Mis objetivos: bloqueado', 'Comunidad: bloqueado', 'Ranking: bloqueado'])
  assert.match(otras, /<details class=/); assert.ok(!/<details\b[^>]*\bopen(?:\s|=|>)/.test(otras))
  assert.match(otras, /<summary[^>]*min-h-11/); assert.match(otras, /Otros espacios del plan Socias/)
  assert.match(activas, /border-\[#E7DDD5\] bg-\[#FFFDFA\]/)
  assert.equal((activas.match(/stroke-linecap="round"/g) || []).length, 8)
  assert.match(activas, /min-w-0/); assert.match(activas, /break-words/); assert.match(activas, /focus-visible:outline/)
})

test('sin habilitaciones, el plegado conserva todos los módulos sin inventar herramientas activas', () => {
  const body = html({ compacto: true })
  assert.match(body, /Mis herramientas/)
  assert.deepEqual(etiquetas(body), modulos.MODULOS_SOCIAS.map(modulo => `${modulo.nombre}: bloqueado`))
  assert.ok(!body.includes(': habilitado'))
  assert.ok(!body.includes('Abrir mis resultados')); assert.ok(!body.includes('Abrir mi día'))
})

test('error de permiso prima sobre una bandera habilitada y se distingue de bloqueo confirmado', () => {
  for (const [id, nombre] of [['resultados', 'Mis resultados'], ['metricas', 'Mis métricas'], ['checklist', 'Mi día']]) {
    for (const compacto of [false, true]) {
      const body = html({ ...habilitados, compacto, erroresPermiso: [id] })
      assert.ok(body.includes(`aria-label="${nombre}: acceso sin comprobar"`))
      assert.ok(!body.includes(`aria-label="${nombre}: habilitado"`))
      assert.ok(!body.includes(`aria-label="${nombre}: bloqueado"`))
      assert.equal(body.match(/No pudimos comprobar tu acceso/g).length, 1)
      assert.ok(body.includes('aria-label="Mis logros: habilitado"'))
      if (compacto) assert.ok(body.indexOf(`aria-label="${nombre}: acceso sin comprobar"`) > body.indexOf('<details'))
      assert.ok(body.includes(`href="${modulos.MODULOS_SOCIAS.find(modulo => modulo.id === id).href}"`))
    }
  }
})

test('varios permisos desconocidos no se convierten en acceso ni en una compra', () => {
  const body = html({ compacto: true, ...habilitados, erroresPermiso: ['resultados', 'metricas', 'checklist'] })
  assert.deepEqual(etiquetas(body).filter(etiqueta => etiqueta.endsWith(': habilitado')), ['Mis logros: habilitado'])
  assert.equal((body.match(/No pudimos comprobar tu acceso/g) || []).length, 3)
  assert.equal((body.match(/acceso sin comprobar/g) || []).length, 3)
  assert.ok(!body.includes('checkout')); assert.ok(!body.includes('Quiero ser Socia'))
})

test('venta gratuita conserva presentación y botón pendiente aunque se solicite compacto', () => {
  for (const compacto of [false, true]) {
    const body = html({ venta: true, compacto })
    assert.match(body, /Tu espacio Socias Digitales/); assert.ok(!body.includes('<details'))
    assert.match(body, /¿Seguimos juntas\?/)
    assert.match(body, /<button type="button" disabled="" aria-describedby="inscripcion-socias-pendiente"/)
    assert.match(body, /Quiero ser Socia/); assert.match(body, /Enlace de inscripción por confirmar/)
    assert.ok(!/<a\b[^>]*>Quiero ser Socia<\/a>/.test(body))
  }
})

test('ordenar la variante compacta no muta la fuente única de módulos', () => {
  const antes = JSON.stringify(modulos.MODULOS_SOCIAS)
  html({ compacto: true, miDiaHabilitado: true })
  html({ compacto: true, ...habilitados, erroresPermiso: ['metricas'] })
  assert.equal(JSON.stringify(modulos.MODULOS_SOCIAS), antes)
  assert.deepEqual(etiquetas(html({})), modulos.MODULOS_SOCIAS.map(modulo => `${modulo.nombre}: bloqueado`))
  const source = read('src/components/LockedModules.tsx')
  for (const sideEffect of ["'use client'", 'fetch(', 'localStorage', 'supabase', 'onClick=']) assert.ok(!source.includes(sideEffect))
})
