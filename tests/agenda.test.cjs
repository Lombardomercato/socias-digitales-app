/* eslint-disable @typescript-eslint/no-require-imports */
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
  assert.equal(proximoHito([actual,siguiente], Date.parse('2026-10-14T12:00:00-03:00')).id, siguiente.id)
})
test('conserva el encuentro de hoy y no deja un contador vencido mañana', () => {
  assert.equal(proximoHito([actual], Date.parse('2026-10-13T23:30:00-03:00')).id, actual.id)
  assert.equal(proximoHito([actual], Date.parse('2026-10-14T00:00:00-03:00')), null)
  assert.equal(proximoHito([], Date.now()), null)
  assert.equal(proximoHito([{...actual,fecha:'invalida'}], Date.now()), null)
})
test('fecha completa y hora usan Argentina, independientemente de la zona del dispositivo', () => {
  assert.deepEqual(fechaHito(actual.fecha), { dia:'Martes', fecha:'13/10/2026', hora:'20:05' })
  assert.deepEqual(cuentaRegresiva(actual.fecha, Date.parse('2026-10-12T20:05:00-03:00')), { minutos:1440,dias:1,horas:0,mins:0 })
  assert.equal(cuentaRegresiva(actual.fecha, Date.parse('2026-10-14T12:00:00-03:00')).minutos,0)
})
test('contador en la barra izquierda y banner fino antes del campus; móvil mantiene el contador', () => {
  const inicio = fs.readFileSync(path.resolve(__dirname,'../src/app/inicio/page.tsx'),'utf8')
  const frame = fs.readFileSync(path.resolve(__dirname,'../src/components/StudentShellFrame.tsx'),'utf8')
  const lateral = fs.readFileSync(path.resolve(__dirname,'../src/components/StudentSidebar.tsx'),'utf8')
  assert.equal((inicio.match(/<ProximaClase /g) || []).length, 1)
  assert.equal((lateral.match(/<ProximaClase /g) || []).length, 1)
  assert.ok(lateral.includes('variante="contador"'))
  assert.ok(!inicio.includes('variante="contador"'))
  assert.ok(inicio.indexOf('<StudentShellFrame datos=') < inicio.indexOf('<main className="min-w-0'))
  assert.ok(frame.indexOf('<StudentSidebar datos={datos} />') < frame.indexOf('sd-student-shell__content'))
  assert.ok(frame.includes('<StudentSidebar datos={datos} onNavigate={cerrarMenu} />'))
  assert.ok(frame.includes('sd-student-shell__sidebar hidden'))
  assert.ok(frame.includes('sd-student-shell__dialog'))
  assert.ok(inicio.indexOf('variante="banner"') > inicio.indexOf('<main '))
  assert.ok(inicio.indexOf('<CampusFormation ') > 0)
  assert.ok(inicio.indexOf('variante="banner"') < inicio.indexOf('<CampusFormation '))
  const componente = fs.readFileSync(path.resolve(__dirname,'../src/app/inicio/ProximaClase.tsx'),'utf8')
  assert.ok(componente.includes('w-[88px] shrink-0 lg:hidden'))
  assert.ok(componente.includes('Agendá tu clase'))
  assert.ok(componente.includes('type="button" disabled'))
  assert.equal(actual.enlace, 'https://www.youtube.com/live/ReuW2yhi0PY')
})
test('botón y aviso del encuentro centrados; rosa oficial, enlace de clase publicado y destino pendiente protegido', () => {
  const componente = fs.readFileSync(path.resolve(__dirname,'../src/app/inicio/ProximaClase.tsx'),'utf8')
  assert.ok(componente.includes('flex shrink-0 flex-col items-center text-center'))
  assert.ok(componente.includes('mt-1 w-full text-center text-[9px]'))
  assert.equal((componente.match(/border-\[#EC9BB6\] bg-\[#EC9BB6\]/g) || []).length,2)
  assert.ok(componente.includes('type="button" disabled title="Flor todavía no publicó el enlace"'))
  assert.ok(componente.includes('min-h-11'))
  assert.ok(componente.includes('target="_blank" rel="noopener noreferrer"'))
})
