const test = require('node:test')
const assert = require('node:assert/strict')
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
function load(file) {
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  new Function('require','module','exports',code)(name => load(path.resolve(path.dirname(file), name + '.ts')),mod,mod.exports)
  return mod.exports
}
const { AGENDA_SOCIAS, proximoHito, cuentaRegresiva, fechaHito } = load(path.resolve(__dirname,'../src/lib/agenda.ts'))
const actual = AGENDA_SOCIAS[0]
const siguiente = { ...actual, id: 'semanal', titulo: 'Clase semanal', fecha: '2026-10-19T20:05:00-03:00' }
test('muestra el primer hito futuro, incluso si la agenda está desordenada', () => {
  assert.equal(proximoHito([siguiente,actual], Date.parse('2026-10-09T12:00:00-03:00')).id, actual.id)
  assert.equal(proximoHito([actual,siguiente], Date.parse('2026-10-13T12:00:00-03:00')).id, siguiente.id)
})
test('conserva el encuentro de hoy y no deja un contador vencido mañana', () => {
  assert.equal(proximoHito([actual], Date.parse('2026-10-12T23:30:00-03:00')).id, actual.id)
  assert.equal(proximoHito([actual], Date.parse('2026-10-13T00:00:00-03:00')), null)
  assert.equal(proximoHito([], Date.now()), null)
  assert.equal(proximoHito([{...actual,fecha:'invalida'}], Date.now()), null)
})
test('fecha completa y hora usan Argentina, independientemente de la zona del dispositivo', () => {
  assert.deepEqual(fechaHito(actual.fecha), { dia:'Lunes', fecha:'12/10/2026', hora:'20:05' })
  assert.deepEqual(cuentaRegresiva(actual.fecha, Date.parse('2026-10-09T20:05:00-03:00')), { minutos:4320,dias:3,horas:0,mins:0 })
  assert.equal(cuentaRegresiva(actual.fecha, Date.parse('2026-10-13T12:00:00-03:00')).minutos,0)
})
test('contador en la barra izquierda y banner fino antes de estrategia; móvil mantiene el contador', () => {
  const inicio = fs.readFileSync(path.resolve(__dirname,'../src/app/inicio/page.tsx'),'utf8')
  assert.equal((inicio.match(/<ProximaClase /g) || []).length, 2)
  assert.ok(inicio.indexOf('variante="contador"') < inicio.indexOf('<main '))
  assert.ok(inicio.indexOf('variante="banner"') > inicio.indexOf('<main '))
  assert.ok(inicio.indexOf('variante="banner"') < inicio.indexOf('Avanzá con tu estrategia'))
  const componente = fs.readFileSync(path.resolve(__dirname,'../src/app/inicio/ProximaClase.tsx'),'utf8')
  assert.ok(componente.includes('w-[88px] shrink-0 lg:hidden'))
  assert.ok(componente.includes('Agendá tu clase'))
  assert.ok(componente.includes('type="button" disabled'))
  assert.equal(actual.enlace, null)
})
test('botón y aviso del encuentro centrados; rosa oficial sin activar un enlace pendiente', () => {
  const componente = fs.readFileSync(path.resolve(__dirname,'../src/app/inicio/ProximaClase.tsx'),'utf8')
  assert.ok(componente.includes('flex shrink-0 flex-col items-center text-center'))
  assert.ok(componente.includes('mt-1 w-full text-center text-[9px]'))
  assert.equal((componente.match(/border-\[#EC9BB6\] bg-\[#EC9BB6\]/g) || []).length,2)
  assert.ok(componente.includes('type="button" disabled title="Flor todavía no publicó el enlace"'))
})
