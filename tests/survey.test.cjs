const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const ROOT = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8')
function cargar(file, deps = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in deps ? deps[name] : name === 'server-only' ? {} : name.startsWith('.') ? cargar(path.join(path.dirname(file), `${name}.ts`), deps) : require(name), m, m.exports)
  return m.exports
}
const h = cargar('src/lib/survey.ts')
const trial = h.SURVEY_TEST_IDS[0]
const perfil = (patch = {}) => ({ id: 'real-1', nombre: 'Alumna real', rol: 'alumna', tipo_usuario: 'desafio', estado: 'activa', created_at: '2026-10-09T01:00:00Z', whatsapp: '+549123456789', fecha_nacimiento: '1991-10-14', ocupacion: 'Emprendedora', titulo_profesional: null, es_mama: false, ingresos_actuales: null, pais: 'Argentina', provincia: 'Córdoba', avatar_url: 'https://example.com/foto-privada.jpg', ...patch })
const welcome = (id = 'real-1', patch = {}) => ({ usuaria_id: id, completado_at: '2026-10-09T04:00:00Z', actualizado_at: '2026-10-09T04:00:00Z', exenta: false, respondidas: ['nombre','whatsapp','fecha_nacimiento','ocupacion','es_mama','ingresos_actuales','pais','provincia','avatar_url'], ...patch })
test('calendario argentino y edad cumplen años, rechazan fechas falsas/futuras, sin usar zona del navegador', () => {
  assert.equal(h.fechaEncuestaArgentina('2026-10-09T01:00:00Z'), '2026-10-08')
  assert.equal(h.edadEncuesta('1991-10-14', '2026-10-13'), 34)
  assert.equal(h.edadEncuesta('1991-10-14', '2026-10-14'), 35)
  for (const date of [null, '2026-02-30', '2026-12-01', 'no', '1800-01-01']) assert.equal(h.edadEncuesta(date, '2026-10-13'), null)
  assert.equal(h.edadEncuesta('2026-10-13', '2026-10-13'), 0)
})
test('no cuenta administradoras, distingue pruebas y no serializa teléfono, foto o nacimiento completos', () => {
  const raw = [perfil(), perfil({ id: trial }), perfil({ id: 'admin', rol: 'admin' })]
  const rows = h.construirEncuesta(raw, [welcome()], '2026-10-13')
  assert.equal(rows.length, 2); assert.equal(rows[1].prueba, true)
  assert.equal(h.filtrarEncuesta(rows, h.SURVEY_DEFAULT_FILTERS).length, 1)
  assert.equal(h.filtrarEncuesta(rows, { ...h.SURVEY_DEFAULT_FILTERS, pruebas: true }).length, 2)
  const json = JSON.stringify(rows)
  for (const data of ['+549123456789','1991-10-14','foto-privada.jpg']) assert.ok(!json.includes(data))
})
test('solo un registro de bienvenida finalizado significa encuesta completa; conserva perfiles anteriores/en curso', () => {
  const raw = [perfil(), perfil({id:'vieja'}),perfil({id:'nueva'})]
  const rows = h.construirEncuesta(raw, [welcome(),welcome('vieja',{completado_at:null,exenta:true})], '2026-10-13')
  assert.deepEqual(rows.map(r=>r.estadoEncuesta), ['completa','anterior','en_curso'])
  const r = h.resumenEncuesta(rows)
  assert.equal(r.completas,1); assert.equal(r.anteriores,1); assert.equal(r.enCurso,1)
})
test('bool false es No real; ausencia es Sin respuesta y opcional elegido no equivale a dato disponible', () => {
  const rows = h.construirEncuesta([perfil(),perfil({id:'2',es_mama:null})], [welcome()], '2026-10-13')
  const r = h.resumenEncuesta(rows)
  assert.deepEqual(r.maternidad.map(g=>[g.label,g.count,g.percent]), [['No',1,50],['Sin respuesta',1,50]])
  const mama = r.cobertura.find(p=>p.campo==='es_mama'), ingresos = r.cobertura.find(p=>p.campo==='ingresos_actuales')
  assert.equal(mama.conDatos,1); assert.equal(ingresos.conDatos,0); assert.equal(ingresos.contestadas,1)
})
test('agrupa variantes de mayúsculas/acentos sin modificar los datos; porcentajes usan todas las seleccionadas', () => {
  const g = h.agruparEncuesta([' argentina ', 'ARGENTINA', null, 'Perú', 'peru'])
  assert.equal(g.reduce((n,g)=>n+g.count,0),5)
  assert.deepEqual(g.find(g=>g.label==='Argentina'), { label:'Argentina',count:2,percent:40 })
  assert.equal(g.find(g=>g.label==='Perú').count,2)
  assert.equal(g.at(-1).label,'Sin respuesta')
})
test('título profesional se calcula solo para alumnas a quienes corresponde; todas las preguntas del formulario están cubiertas', () => {
  const rows = h.construirEncuesta([perfil(),perfil({id:'pro',ocupacion:'Profesional',titulo_profesional:'Abogada'})], [welcome()], '2026-10-13')
  const r = h.resumenEncuesta(rows)
  assert.equal(r.cobertura.length,10)
  assert.equal(r.cobertura.find(p=>p.campo==='titulo_profesional').total,1)
})
test('filtros por acceso/estado/registro son inclusivos y fecha de registro argentina', () => {
  const rows = h.construirEncuesta([perfil(),perfil({id:'2',tipo_usuario:'gratuito'})], [welcome()], '2026-10-13')
  const filters = h.validarFiltrosEncuesta(new URLSearchParams('tipo=desafio&estadoEncuesta=completa&desde=2026-10-08&hasta=2026-10-08'))
  assert.equal(h.filtrarEncuesta(rows,filters).length,1)
  for (const s of ['tipo=admin','estadoEncuesta=otro','desde=2026-02-30','desde=2026-10-09&hasta=2026-10-08','pruebas=yes']) assert.throws(()=>h.validarFiltrosEncuesta(new URLSearchParams(s)))
  assert.match(h.urlExportarEncuesta(filters), /tipo=desafio/)
})
test('sin datos no inventa porcentajes, edades o maternidad', () => {
  const r = h.resumenEncuesta([])
  assert.equal(r.total,0); assert.deepEqual(r.edades,[]); assert.deepEqual(r.maternidad,[])
  assert.ok(r.cobertura.every(p=>p.total===0 && p.conDatos===0))
})
test('CSV incluye todas las preguntas, booleanos, campos opcionales y evita inyección de fórmulas', () => {
  const raw = [perfil({ nombre:'=HYPERLINK("mal")', es_mama:false }),perfil({id:trial}),perfil({id:'admin',rol:'admin'})]
  const rows = h.filtrarEncuesta(h.construirEncuesta(raw,[welcome()],'2026-10-13'),h.SURVEY_DEFAULT_FILTERS)
  const csv = h.csvEncuesta(raw,rows)
  assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('¿Cuáles son tus ingresos actuales?'))
  assert.ok(csv.includes('"\'=HYPERLINK(""mal"")"')); assert.ok(csv.includes('"\'+549123456789"')); assert.ok(csv.includes('"No"'))
  assert.ok(!csv.includes(trial)); assert.equal(csv.split('\r\n').length,2)
})
function sdk(pages = {}) {
  const calls = []
  return { calls, from(table) { const q = {}; for (const method of ['select','neq','order']) q[method]=(...args)=>{calls.push([table,method,...args]);return q};q.range=async(start,end)=>{calls.push([table,'range',start,end]);return pages[`${table}:${start}`] ?? {data:[],error:null}};return q } }
}
test('lectura usa paginación estable y paralela, excluye admins y falla completa ante cualquier error', async () => {
  const s = cargar('src/lib/survey-server.ts', {'./supabase/server': {createClient:async()=>null}})
  const db = sdk({'perfiles:0':{data:Array.from({length:1000},()=>perfil()),error:null},'perfiles:1000':{data:[perfil()],error:null}})
  assert.equal((await s.leerEncuesta(db)).perfiles.length,1001)
  assert.ok(db.calls.some(c=>c[1]==='neq'&&c[2]==='rol'&&c[3]==='admin'))
  assert.ok(db.calls.some(c=>c[0]==='perfiles'&&c[1]==='range'&&c[2]===1000))
  await assert.rejects(()=>s.leerEncuesta(sdk({'bienvenida_perfiles:0':{data:null,error:{message:'bad'}}})))
})
function api(status = 200, dataError = false) {
  return cargar('src/app/api/admin/encuesta/exportar/route.ts', { 'next/server':{NextResponse:Response},'@/lib/survey':h,'@/lib/survey-server':{permisoEncuesta:async()=>({status,supabase:null}),leerEncuesta:async()=>{if(dataError)throw new Error('fail');return{perfiles:[perfil(),perfil({id:trial})],bienvenida:[welcome()]}}} })
}
test('exportación exige admin, no se cachea, aplica filtros y no devuelve datos con errores', async () => {
  for (const status of [401,403,503]) assert.equal((await api(status).GET(new Request('https://app.sociasdigitales.com/api/admin/encuesta/exportar'))).status,status)
  assert.equal((await api().GET(new Request('https://app.sociasdigitales.com/api/admin/encuesta/exportar?tipo=admin'))).status,400)
  assert.equal((await api(200,true).GET(new Request('https://app.sociasdigitales.com/api/admin/encuesta/exportar'))).status,503)
  const r=await api().GET(new Request('https://app.sociasdigitales.com/api/admin/encuesta/exportar'))
  assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.ok(!(await r.text()).includes(trial))
})
const componentDeps = { 'next/image':{default:props=>React.createElement('img',props)},'next/link':{default:props=>React.createElement('a',props)},'next/navigation':{useRouter:()=>({refresh(){}})},'@/components/AdminSectionMenu':{default:()=>null},'@/components/NavigationIcon':{default:()=>null},'@/lib/survey':h,'@/lib/admin-usuarias':cargar('src/lib/admin-usuarias.ts') }
test('dashboard renderiza con datos reales y controles móviles, estados vacíos/error sin gráficos ficticios', () => {
  const Component = cargar('src/app/admin/encuesta/EncuestaAdmin.tsx',componentDeps).default
  const render = props=>renderToStaticMarkup(React.createElement(Component,{actualizado:'2026-10-13T19:00:00Z',...props}))
  const rows=h.construirEncuesta([perfil(),perfil({id:trial})],[welcome()],'2026-10-13')
  const html=render({rows})
  for (const label of ['Encuesta','Edades','Ingresos actuales','¿Son mamás?','Provincia / estado','Tipo de acceso','Incluir cuentas de prueba','Abrir Sheet','Descargar respuestas']) assert.ok(html.includes(label))
  assert.ok(html.includes('no tiene sincronización automática'));assert.ok(html.includes('min-w-0'))
  const error=render({rows:[],errorCarga:true});assert.ok(error.includes('role="alert"'));assert.ok(!error.includes('aria-label="Gráficos de las respuestas"'));assert.ok(error.includes('Base no disponible'))
  const empty=render({rows:[]});assert.ok(empty.includes('Sin respuestas en esta selección.'))
})
test('servidor comprueba rol antes de leer datos, no altera encuestas ni envía comunicaciones', () => {
  const src=read('src/app/admin/encuesta/page.tsx')
  assert.ok(src.indexOf("status === 403")<src.indexOf('await leerEncuesta'))
  for (const file of ['src/lib/survey-server.ts','src/app/api/admin/encuesta/exportar/route.ts']) {
    const s=read(file);assert.ok(!/\.(insert|upsert|update|delete)\(/.test(s));assert.ok(!s.includes('SERVICE_ROLE'));assert.ok(!s.includes('RESEND'))
  }
  assert.ok(!fs.existsSync(path.join(ROOT,'src/app/preview/survey-qa/page.tsx')))
})
test('permiso consulta el rol real y bloquea sesiones ausentes, alumnas o errores de lectura', async () => {
  for (const [user,profile,error,expected] of [[null,null,null,401],[{id:'u'},{rol:'alumna'},null,403],[{id:'u'},{rol:'admin'},null,200],[{id:'u'},null,{code:'red'},503]]) {
    const client={auth:{getUser:async()=>({data:{user},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:profile,error})})})})}
    const s=cargar('src/lib/survey-server.ts',{'./supabase/server':{createClient:async()=>client}})
    assert.equal((await s.permisoEncuesta()).status,expected)
  }
})
