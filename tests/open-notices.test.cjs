const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function bandeja({ iniciales, errorCarga = false, fallo = null, rechazo = false }) {
  const effects = [], estados = [], envios = []
  let refresh = 0
  const mod = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../src/app/notificaciones/BandejaAvisos.tsx'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(name => {
    if (name === 'react') return {
      useState: valor => [valor, siguiente => estados.push(typeof siguiente === 'function' ? siguiente(valor) : siguiente)],
      useEffect: effect => effects.push(effect),
    }
    if (name === 'next/navigation') return { useRouter: () => ({ refresh: () => refresh++ }) }
    if (name === '@/lib/supabase/client') return { createClient: () => ({ from: tabla => ({ upsert: (filas, opciones) => {
      envios.push({ tabla, filas, opciones })
      return rechazo ? Promise.reject(new Error('Red caída')) : Promise.resolve({ error: fallo })
    } }) }) }
    if (name === '@/lib/notifications') return { fechaAviso: () => '13/10/2026' }
    if (name === '@/components/ArrowIcon' || name === 'next/link') return { default: () => null }
    return require(name)
  }, mod, mod.exports)
  mod.exports.default({ userId: 'usuaria-actual', iniciales, errorCarga })
  return { effects, estados, envios, get refresh() { return refresh } }
}
const aviso = (id, leido = false) => ({ id, titulo: 'Comunicado', mensaje: 'Mensaje', destino: null, leido, created_at: '2026-10-13T12:00:00Z' })
const terminar = () => new Promise(resolve => setImmediate(resolve))
test('abrir la bandeja guarda solo los mensajes sin leer de la sesión y refresca el contador', async () => {
  const ui = bandeja({ iniciales: [aviso('nuevo'), aviso('anterior', true)] })
  assert.equal(ui.envios.length, 0) // Precarga/render no registra lecturas.
  ui.effects[0]()
  await terminar()
  assert.deepEqual(ui.envios, [{ tabla: 'avisos_lecturas', filas: [{ aviso_id: 'nuevo', usuaria_id: 'usuaria-actual' }], opciones: { onConflict: 'aviso_id,usuaria_id', ignoreDuplicates: true } }])
  assert.deepEqual(ui.estados, [['nuevo']])
  assert.equal(ui.refresh, 1)
})
test('bandeja vacía, mensajes ya leídos y error de carga no marcan nada', async () => {
  for (const props of [{ iniciales: [] }, { iniciales: [aviso('viejo', true)] }, { iniciales: [aviso('nuevo')], errorCarga: true }]) {
    const ui = bandeja(props); ui.effects[0](); await terminar()
    assert.equal(ui.envios.length, 0); assert.equal(ui.refresh, 0)
  }
})
test('un fallo real no oculta la alerta ni da por leído el comunicado', async () => {
  for (const props of [{ fallo: { message: 'permiso' } }, { rechazo: true }]) {
    const ui = bandeja({ iniciales: [aviso('nuevo')], ...props }); ui.effects[0](); await terminar()
    assert.equal(ui.refresh, 0)
    assert.equal(ui.estados.length, 1)
    assert.equal(typeof ui.estados[0], 'string')
    assert.ok(!Array.isArray(ui.estados[0]))
  }
})
test('salir durante el guardado no actualiza un componente desmontado; las lecturas existentes no se sobrescriben', async () => {
  const ui = bandeja({ iniciales: [aviso('nuevo')] })
  ui.effects[0]()(); await terminar()
  assert.equal(ui.estados.length, 0); assert.equal(ui.refresh, 0)
  assert.equal(ui.envios[0].opciones.ignoreDuplicates, true)
})
