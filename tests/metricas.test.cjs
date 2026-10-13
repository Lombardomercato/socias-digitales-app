const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const ROOT=path.resolve(__dirname,'..')
function cargar(file,deps={}) {
  const m={exports:{}}
  const code=ts.transpileModule(fs.readFileSync(path.join(ROOT,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText
  new Function('require','module','exports',code)(name=>{
    if(name in deps)return deps[name]
    if(name==='server-only')return {}
    if(name==='@/lib/metrics')return helpers
    return require(name)
  },m,m.exports)
  return m.exports
}
const helpers=cargar('src/lib/metrics.ts')
const USER='06bb7999-997b-49c8-ba80-b8d05bca4a84'
const ID='71c6ab0b-914b-44ef-bd0c-0b5d690c025d'
const base={id:ID,version:null,campana:'  Mi   campaña  ',fecha:'2026-10-12',estrategia:'lanzamiento',comision_producto:100,inversion:300,inversion_por_dia:20,dias_captacion:15,gasto_acumulado:100,mensajes_recibidos:100,personas_grupo:50,reservas:20,ventas:5}
const fila={...helpers.validarMetrica(base,'crear').datos,id:ID,alumna_id:USER,version:1,created_at:'2026-10-12T20:00:00Z',actualizado_at:'2026-10-12T20:00:00Z'}
test('origen: acepta dirección real y local; rechaza sitios, puertos, esquemas y URLs manipulados',()=>{
  assert.equal(helpers.origenMetricasPermitido('http://127.0.0.1:3011','http://localhost:3011','127.0.0.1:3011'),true)
  assert.equal(helpers.origenMetricasPermitido('https://app.sociasdigitales.com','https://app.sociasdigitales.com','app.sociasdigitales.com'),true)
  for(const o of [null,'https://otro.com','http://app.sociasdigitales.com','https://app.sociasdigitales.com:444','https://app.sociasdigitales.com/path','https://evil@app.sociasdigitales.com'])assert.equal(helpers.origenMetricasPermitido(o,'https://app.sociasdigitales.com','app.sociasdigitales.com'),false)
})
test('guarda todos los campos y valida identidad, fecha, estrategia y conteos',()=>{
  const datos=helpers.validarMetrica(base,'crear').datos
  assert.equal(datos.campana,'Mi campaña');assert.equal(datos.gasto_acumulado,100);assert.equal(datos.inversion_por_dia,20);assert.equal(datos.dias_captacion,15)
  for(const x of [{alumna_id:USER},{rol:'admin'},{version:9},{id:'no'},{campana:''},{campana:'a'.repeat(101)},{fecha:'2026-02-30'},{fecha:'2099-01-01'},{fecha:'2026-00-01'},{estrategia:'otra'},{comision_producto:-1},{inversion:1.001},{gasto_acumulado:Infinity},{ventas:1.1},{reservas:-1},{dias_captacion:3651}])assert.throws(()=>helpers.validarMetrica({...base,...x},'crear'))
  assert.throws(()=>helpers.validarMetrica({...base,version:null},'editar'))
  assert.equal(helpers.validarMetrica({...base,version:1},'editar').version,1)
})
test('un importe vacío no se convierte en cero y un análisis vacío no se guarda',()=>{
  const vacio={...base,comision_producto:null,inversion:null,inversion_por_dia:null,gasto_acumulado:null,dias_captacion:null,mensajes_recibidos:0,personas_grupo:0,reservas:0,ventas:0}
  assert.throws(()=>helpers.validarMetrica(vacio,'crear'))
  assert.equal(helpers.validarMetrica({...vacio,inversion:0},'crear').datos.inversion,0)
  assert.equal(helpers.validarMetrica({...vacio,mensajes_recibidos:5},'crear').datos.inversion,null)
})
test('cálculos usan gasto acumulado real, nunca presupuesto; no inventan ROI si falta el gasto',()=>{
  const r=helpers.calcularMetricas(fila)
  assert.deepEqual(r,{comisiones:500,neto:400,roi:400,costoMensaje:1,alGrupo:50,cierre:25,disponible:200,diasPresupuesto:10,ventasPresupuesto:3})
  const desconocido=helpers.calcularMetricas({...fila,gasto_acumulado:null})
  assert.equal(desconocido.neto,null);assert.equal(desconocido.roi,null);assert.equal(desconocido.costoMensaje,null)
  const cero=helpers.calcularMetricas({...fila,gasto_acumulado:0})
  assert.equal(cero.neto,500);assert.equal(cero.costoMensaje,0);assert.equal(cero.roi,null)
  assert.equal(helpers.calcularMetricas({...fila,comision_producto:null}).neto,null)
})
test('no divide por cero ni muestra días negativos; la falta de comisión no da recuperación inventada',()=>{
  const r=helpers.calcularMetricas({...fila,comision_producto:0,mensajes_recibidos:0,reservas:0,gasto_acumulado:400})
  assert.equal(r.costoMensaje,null);assert.equal(r.alGrupo,null);assert.equal(r.cierre,null);assert.equal(r.ventasPresupuesto,null)
  assert.equal(r.disponible,-100);assert.equal(r.diasPresupuesto,0);assert.equal(r.neto,-400)
})
test('últimos valores por campaña no duplican acumulados y priorizan fecha, no carga tardía',()=>{
  const tarde={...fila,id:'otro',actualizado_at:'2026-10-14T12:00:00Z',ventas:5}
  const nueva={...fila,id:'nueva',campana:'MI CAMPAÑA',fecha:'2026-10-13',actualizado_at:'2026-10-13T12:00:00Z',ventas:6}
  assert.equal(helpers.ultimasMetricas([nueva,tarde]).length,1)
  assert.equal(helpers.ultimasMetricas([tarde,nueva])[0].ventas,6)
  assert.equal(helpers.ultimasMetricas([fila,{...nueva,estrategia:'automatica'}]).length,2)
  assert.equal(helpers.ultimasMetricas([fila,{...nueva,alumna_id:'otra'}]).length,2)
})
test('normaliza numeric del servidor y respeta la fecha Argentina cerca de medianoche',()=>{
  assert.equal(helpers.normalizarMetrica({...fila,comision_producto:'100.50',gasto_acumulado:null}).comision_producto,100.5)
  assert.equal(helpers.normalizarMetrica({...fila,gasto_acumulado:null}).gasto_acumulado,null)
  assert.equal(helpers.fechaArgentina(new Date('2026-10-13T01:00:00Z')),'2026-10-12')
})
function cliente(respuestas,llamadas=[]) {
  return {auth:{getUser:async()=>({data:{user:{id:USER}}})},from:tabla=>{
    const q={};let op='select'
    for(const key of ['select','eq','insert','update','upsert'])q[key]=(...args)=>{llamadas.push([tabla,key,...args]);if(['insert','update','upsert'].includes(key))op=key;return q}
    q.maybeSingle=async()=>{const r=respuestas[tabla+':'+op]??respuestas[tabla]??{data:null,error:null};return typeof r==='function'?r():r}
    return q
  }}
}
function api(file='src/app/api/metricas/route.ts',{user={id:USER},permitido=true,accesoError=false,respuestas={}}={}) {
  const llamadas=[];const db=cliente(respuestas,llamadas);db.auth.getUser=async()=>({data:{user}})
  return {...cargar(file,{'next/server':{NextResponse:{json:(body,opts={})=>({body,status:opts.status??200,headers:opts.headers})}},'@/lib/supabase/server':{createClient:async()=>db},'@/lib/metrics-server':{permisoMetricas:async()=>({permitido,error:accesoError})}}),llamadas}
}
function solicitud(datos=base,origin='https://app.sociasdigitales.com') {return {headers:new Headers({origin}),nextUrl:{origin:'https://app.sociasdigitales.com'},json:async()=>datos}}
test('API exige sesión, origen y permiso individual antes de guardar',async()=>{
  for(const [opts,status] of [[{user:null},401],[{permitido:false},403],[{accesoError:true},503]]) {
    const a=api(undefined,opts);assert.equal((await a.POST(solicitud())).status,status);assert.equal(a.llamadas.length,0)
  }
  assert.equal((await api().POST(solicitud(base,'https://otro.com'))).status,403)
  assert.equal((await api().POST(solicitud({...base,alumna_id:'otra'}))).status,400)
})
test('API fuerza cuenta de sesión, devuelve fila guardada y permite reintentos sin duplicar',async()=>{
  const a=api(undefined,{respuestas:{'metricas:insert':{data:fila,error:null}}})
  const r=await a.POST(solicitud());assert.equal(r.body.ok,true);assert.equal(r.body.metrica.id,ID);assert.equal(r.headers['Cache-Control'],'private, no-store')
  const payload=a.llamadas.find(x=>x[1]==='insert')[2]
  assert.equal(payload.alumna_id,USER);assert.equal(payload.gasto_acumulado,100);assert.equal(payload.inversion_por_dia,20)
  const b=api(undefined,{respuestas:{metricas:{data:fila,error:null}}})
  assert.equal((await b.POST(solicitud())).body.ok,true);assert.ok(!b.llamadas.some(x=>x[1]==='insert'))
  assert.equal((await b.POST(solicitud({...base,ventas:8}))).status,409)
})
test('errores y fecha duplicada no simulan guardado; una respuesta perdida se comprueba',async()=>{
  assert.equal((await api(undefined,{respuestas:{'metricas:insert':{data:null,error:{code:'23505'}}}}).POST(solicitud())).status,409)
  assert.equal((await api(undefined,{respuestas:{'metricas:insert':{data:null,error:{code:'x'}}}}).POST(solicitud())).status,503)
  let n=0
  const a=api(undefined,{respuestas:{'metricas:select':()=>({data:n++?fila:null,error:null}),'metricas:insert':{data:null,error:{code:'red'}}}})
  assert.equal((await a.POST(solicitud())).body.ok,true)
})
test('edición compara versión y dueño; conflicto no pisa otra pestaña y reintento se confirma',async()=>{
  const edit={...base,version:1,ventas:6}
  const actualizada={...fila,ventas:6,version:2}
  const a=api(undefined,{respuestas:{'metricas:select':{data:fila,error:null},'metricas:update':{data:actualizada,error:null}}})
  assert.equal((await a.PATCH(solicitud(edit))).body.metrica.version,2)
  assert.ok(a.llamadas.some(x=>x[1]==='eq'&&x[2]==='version'&&x[3]===1))
  assert.ok(a.llamadas.filter(x=>x[1]==='eq'&&x[2]==='alumna_id').every(x=>x[3]===USER))
  assert.equal((await api(undefined,{respuestas:{metricas:{data:{...fila,version:3},error:null}}}).PATCH(solicitud(edit))).status,409)
  const b=api(undefined,{respuestas:{metricas:{data:actualizada,error:null}}})
  assert.equal((await b.PATCH(solicitud(edit))).body.ok,true);assert.ok(!b.llamadas.some(x=>x[1]==='update'))
  assert.equal((await api().PATCH(solicitud(edit))).status,404)
})
test('permiso real exige Socia activa y habilitación, no metadata ni permiso de Resultados',async()=>{
  const {permisoMetricas}=cargar('src/lib/metrics-server.ts')
  for(const [perfil,habilitada,expected] of [[{rol:'alumna',tipo_usuario:'gratuito',estado:'activa'},true,false],[{rol:'alumna',tipo_usuario:'desafio',estado:'activa'},true,false],[{rol:'alumna',tipo_usuario:'socia',estado:'activa'},false,false],[{rol:'alumna',tipo_usuario:'socia',estado:'activa'},true,true],[{rol:'alumna',tipo_usuario:'socia',estado:'pausada'},true,false],[{rol:'admin'},false,true]])assert.equal((await permisoMetricas(cliente({perfiles:{data:perfil,error:null},accesos_metricas:{data:{habilitada},error:null}}),USER)).permitido,expected)
})
test('solo Flor habilita Socias activas; se verifica que el acceso realmente se guardó',async()=>{
  const file='src/app/api/admin/metricas/acceso/route.ts'
  assert.equal((await api(file).POST(solicitud({usuaria_id:USER,habilitada:true}))).status,403)
  for(const tipo of ['gratuito','desafio']) {
    let n=0;const a=api(file,{respuestas:{perfiles:()=>({data:n++?{rol:'alumna',tipo_usuario:tipo,estado:'activa'}:{rol:'admin'},error:null})}})
    assert.equal((await a.POST(solicitud({usuaria_id:USER,habilitada:true}))).status,400)
  }
  for(const [habilitada,data,status] of [[true,{usuaria_id:USER},200],[false,{usuaria_id:USER},200],[true,null,503]]) {
    let n=0;const a=api(file,{respuestas:{perfiles:()=>({data:n++?{rol:'alumna',tipo_usuario:habilitada?'socia':'gratuito',estado:'activa'}:{rol:'admin'},error:null}),'accesos_metricas:upsert':{data,error:null}}})
    assert.equal((await a.POST(solicitud({usuaria_id:USER,habilitada}))).status,status)
    assert.equal(a.llamadas.find(x=>x[1]==='upsert')[2].administradora_id,USER)
  }
})
function fixture(historial=[]) {
  const cells=[];let cursor=0;let refreshes=0
  const hooks={useState(initial){const i=cursor++;if(!(i in cells))cells[i]=typeof initial==='function'?initial():initial;return [cells[i],v=>cells[i]=typeof v==='function'?v(cells[i]):v]},useRef(initial){const i=cursor++;if(!(i in cells))cells[i]={current:initial};return cells[i]}}
  const comp=cargar('src/app/metricas/MetricasCliente.tsx',{'react':hooks,'next/navigation':{useRouter:()=>({refresh:()=>refreshes++})},'next/link':{default:()=>null},'@/components/ArrowIcon':{default:()=>null},'@/components/MetricsVisuals':{ResumenMetricas:()=>null,EvolucionMetricas:()=>null}})
  const render=()=>{cursor=0;return comp.default({historial,fechaInicial:'2026-10-13'})}
  function find(t,p){if(!t||typeof t!=='object')return null;if(p(t))return t;for(const child of [t.props?.children].flat(Infinity)){const r=find(child,p);if(r)return r}return null}
  const input=(label)=>{const l=find(render(),e=>e.type==='label'&&[e.props.children].flat().includes(label));return find(l,e=>e.type==='input')}
  function completar(){input('Campaña').props.onChange({target:{value:'Campaña prueba'}});input('Comisión por venta · USD').props.onChange({target:{value:'100'}});input('Gasto real acumulado · USD').props.onChange({target:{value:'50'}})}
  return {cells,render,find,input,completar,submit:()=>find(render(),e=>e.type==='form').props.onSubmit({preventDefault(){}}),refreshes:()=>refreshes}
}
test('UI conserva formulario ante fallo y no muestra guardado ni borra los datos',async()=>{
  const original=global.fetch;global.fetch=async()=>({ok:false,status:503,json:async()=>({error:'Sin conexión'})})
  try{const ui=fixture();ui.completar();await ui.submit();assert.equal(ui.cells[0].campana,'Campaña prueba');assert.equal(ui.cells[0].gasto_acumulado,'50');assert.equal(ui.cells[6],'');assert.match(ui.cells[5],/Sin conexión/);assert.equal(ui.refreshes(),0)}finally{global.fetch=original}
})
test('al volver abre el análisis de hoy; si es de ayer propone continuar sin sobrescribirlo',()=>{
  const ui=fixture([{...fila,fecha:'2026-10-13',ventas:7,version:2}]);ui.render()
  assert.equal(ui.cells[0].ventas,'7');assert.equal(ui.cells[1].version,2)
  const anterior=fixture([fila]);anterior.render()
  assert.equal(anterior.cells[0].fecha,'2026-10-13');assert.equal(anterior.cells[0].ventas,'5');assert.equal(anterior.cells[1],null)
})
test('UI no duplica clics y agrega respuesta al historial sin recargar ni borrar el formulario',async()=>{
  const original=global.fetch;let resolve;const promesa=new Promise(r=>resolve=r);let requests=0
  global.fetch=()=>{requests++;return promesa}
  try {
    const ui=fixture();ui.completar();const p=ui.submit();const q=ui.submit();assert.equal(requests,1)
    resolve({ok:true,status:200,json:async()=>({ok:true,metrica:{...fila,campana:'Campaña prueba'}})});await p;await q
    assert.equal(ui.cells[0].gasto_acumulado,'50');assert.ok(ui.cells[2][ID]);assert.equal(ui.cells[1].version,1);assert.match(ui.cells[6],/Análisis guardado/);assert.equal(ui.refreshes(),1)
  }finally{global.fetch=original}
})
test('vistas mantienen bordes, gráfico accesible y controles separados sin glow ni nuevos emails',()=>{
  const visual=fs.readFileSync(path.join(ROOT,'src/components/MetricsVisuals.tsx'),'utf8')
  assert.ok(visual.includes('Valores disponibles debajo del gráfico'));assert.ok(visual.includes('Ver valores del gráfico'));assert.ok(visual.includes('border-[#e7ddd5]'));assert.ok(!visual.includes('glow'))
  const api=fs.readFileSync(path.join(ROOT,'src/app/api/metricas/route.ts'),'utf8');assert.ok(!api.includes('createAdminClient'));assert.ok(!api.includes('email'))
  const menu=fs.readFileSync(path.join(ROOT,'src/components/LockedModules.tsx'),'utf8');assert.ok(menu.includes("id === 'metricas' && metricasHabilitadas"));assert.ok(menu.includes("id === 'resultados' && resultadosHabilitados"))
})
test('panel de Flor usa solo el último registro de cada campaña en los totales',()=>{
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server')
  const Admin=cargar('src/app/admin/metricas/MetricasAdmin.tsx',{
    'next/link':{default:props=>React.createElement('a',props)},
    'next/navigation':{useRouter:()=>({refresh(){}})},
    '@/components/AdminSectionMenu':{default:()=>null},
    '@/components/MetricsVisuals':{ResumenMetricas:()=>null,EvolucionMetricas:()=>null},
  }).default
  const html=renderToStaticMarkup(React.createElement(Admin,{metricas:[{...fila,perfiles:{nombre:'Prueba'}},{...fila,id:'otra',fecha:'2026-10-13',ventas:7,gasto_acumulado:150,perfiles:{nombre:'Prueba'}}],socias:[]}))
  assert.match(html,/Ventas declaradas<\/p><p[^>]*>7<\/p>/)
  assert.match(html,/Campañas visibles<\/p><p[^>]*>1<\/p>/)
  assert.ok(html.includes('US$ 700,00'));assert.ok(!html.includes('US$ 1.200,00'))
})
