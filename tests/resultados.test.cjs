const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const ROOT = path.resolve(__dirname, '..')
function cargar(file, deps = {}) {
  const m = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(ROOT, file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  new Function('require','module','exports','process',code)(name => {
    if (name in deps) return deps[name]
    if (name === 'server-only') return {}
    if (name === '@/lib/results') return datos
    return require(name)
  }, m, m.exports, { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://app.supabase.co' } })
  return m.exports
}
const datos = cargar('src/lib/results.ts')
const ID = '978b67ea-a440-4c98-a782-dbd44a50b6b2'
const USER = '06bb7999-997b-49c8-ba80-b8d05bca4a84'
const base = { id: ID, descripcion: ' Mi primer resultado ', monto: 100.25, periodo: '2026-10', producto_id: null }
test('valida campos y no acepta identidad, estado o importes manipulados', () => {
  assert.deepEqual(datos.validarResultado(base), { id: ID, descripcion: 'Mi primer resultado', monto: 100.25, mes: 'Octubre 2026', producto_id: null })
  for (const cambio of [{ alumna_id: USER }, { estado:'aprobado' }, { monto:-1 }, { monto:NaN }, { monto:1.001 }, { periodo:'2026-13' }, { descripcion:' ' }, { id:'no' }, { producto_id:'no' }, { descripcion:'a'.repeat(2001) }]) assert.throws(() => datos.validarResultado({ ...base, ...cambio }))
  assert.equal(datos.validarResultado({ ...base, monto:null }).monto, null)
})
test('capturas: tamaño y firma real, sin admitir SVG o tipo inventado', () => {
  const png = Uint8Array.from([137,80,78,71,13,10,26,10])
  assert.equal(datos.formatoCaptura(png,'image/png'),'png')
  assert.equal(datos.formatoCaptura(Uint8Array.from([255,216,255]),'image/jpeg'),'jpg')
  for (const mime of ['image/svg+xml','image/jpeg','text/html']) assert.throws(() => datos.formatoCaptura(png,mime))
  assert.equal(datos.MAX_CAPTURA, 3*1024*1024)
})
test('convierte archivos antiguos sin aceptar dominios externos ni rutas manipuladas', () => {
  assert.equal(datos.claveCaptura('https://app.supabase.co/storage/v1/object/public/resultados/resultado-1.png','https://app.supabase.co'),'resultado-1.png')
  assert.equal(datos.claveCaptura(USER+'/'+ID+'/hash.png','https://app.supabase.co'),USER+'/'+ID+'/hash.png')
  for (const x of ['https://otro.com/a.png','../a.png','/a.png','a.svg','https://app.supabase.co/storage/v1/object/public/resultados/%ZZ.png']) assert.equal(datos.claveCaptura(x,'https://app.supabase.co'),null)
})
test('el resumen cuenta resultados, no inventa ventas ni incluye comisiones rechazadas', () => {
  assert.deepEqual(datos.resumenResultados([{ estado:'aprobado',monto:'25.5' },{estado:'pendiente',monto:200},{estado:'rechazado',monto:1000}]),{total:3,aprobados:1,pendientes:1,monto:25.5})
})
function cliente(respuestas, llamadas = []) {
  return { auth:{ getUser:async()=>({data:{user:{id:USER}}}) }, from:tabla => {
    const q = {}; let op = 'select'
    for (const key of ['select','eq','insert','update','upsert']) q[key] = (...args) => { llamadas.push([tabla,key,...args]); if (['insert','update','upsert'].includes(key)) op=key; return q }
    q.then = (resolve,reject) => Promise.resolve(respuestas[tabla+':'+op] ?? respuestas[tabla] ?? {data:null,error:null}).then(resolve,reject)
    q.maybeSingle = q.single = async () => {
      const r = respuestas[tabla+':'+op] ?? respuestas[tabla] ?? {data:null,error:null}
      return typeof r === 'function' ? r() : r
    }
    return q
  } }
}
const respuesta = { json:(body,opts={})=>({body,status:opts.status??200,headers:opts.headers}), redirect:(url,opts)=>({url,...opts}) }
function api(file, { user={id:USER}, permitido=true, admin=false, accesoError=false, respuestas={}, privilegiadas={}, uploadError=null, firmado={data:{signedUrl:'https://app.supabase.co/signed'},error:null} }={}) {
  const llamadas = [], storage=[]
  const db = cliente(respuestas,llamadas); db.auth.getUser=async()=>({data:{user}})
  const privileged = cliente(privilegiadas,llamadas)
  privileged.storage = { from:bucket=>({
    upload:async(key,bytes,opts)=>{storage.push(['upload',bucket,key,opts]);return {error:uploadError}},
    remove:async(keys)=>{storage.push(['remove',bucket,keys]);return {error:null}},
    createSignedUrl:async(key,seconds)=>{storage.push(['sign',bucket,key,seconds]);return firmado}
  }) }
  const handler = cargar(file,{
    'next/server':{NextResponse:respuesta},
    '@/lib/supabase/server':{createClient:async()=>db},
    '@/lib/supabase/admin':{createAdminClient:()=>privileged,isAdminSupabaseConfigured:()=>true},
    '@/lib/results-server':{permisoResultados:async()=>({permitido,admin,error:accesoError})}
  })
  return {...handler,llamadas,storage}
}
function solicitud(valor=base,{origin='https://app.sociasdigitales.com',file=null}={}) {
  return {headers:new Headers({origin}),nextUrl:{origin:'https://app.sociasdigitales.com'},json:async()=>valor,formData:async()=>{
    const f=new FormData(); f.set('datos',JSON.stringify(valor)); if(file)f.set('captura',file);return f
  }}
}
const POST='src/app/api/resultados/route.ts'
test('API: exige sesión, permiso propio y origen; no escribe cuando falla el acceso',async()=>{
  for(const [opts,expected] of [[{user:null},401],[{permitido:false},403],[{permitido:false,accesoError:true},503]]) {
    const a=api(POST,opts); assert.equal((await a.POST(solicitud())).status,expected);assert.equal(a.llamadas.length,0)
  }
  assert.equal((await api(POST).POST(solicitud(base,{origin:'https://otro.com'}))).status,403)
})
test('guardar fuerza identidad de sesión y revisión; reintento confirmado no duplica',async()=>{
  const a=api(POST,{respuestas:{'resultados:insert':{data:{id:ID},error:null}}})
  assert.equal((await a.POST(solicitud())).body.ok,true)
  const creado=a.llamadas.find(x=>x[1]==='insert')[2]
  assert.equal(creado.alumna_id,USER);assert.equal(creado.estado,'pendiente');assert.equal(creado.tipo,'testimonio')
  const existente={...datos.validarResultado(base),alumna_id:USER,archivo_url:null}
  const b=api(POST,{privilegiadas:{resultados:{data:existente,error:null}}})
  assert.equal((await b.POST(solicitud())).body.ok,true)
  assert.ok(!b.llamadas.some(x=>x[1]==='insert'))
  const c=api(POST,{privilegiadas:{resultados:{data:{...existente,alumna_id:'otra'},error:null}}})
  assert.equal((await c.POST(solicitud())).status,409)
})
test('API: validación, producto inexistente y fallo de guardado no simulan éxito',async()=>{
  assert.equal((await api(POST).POST(solicitud({...base,estado:'aprobado'}))).status,400)
  assert.equal((await api(POST).POST(solicitud({...base,producto_id:ID}))).status,400)
  assert.equal((await api(POST,{respuestas:{'resultados:insert':{data:null,error:{message:'red'}}}}).POST(solicitud())).status,503)
  const png=new File([Uint8Array.from([137,80,78,71,13,10,26,10])],'prueba.png',{type:'image/png'})
  const a=api(POST,{uploadError:{statusCode:'500'}})
  assert.equal((await a.POST(solicitud(base,{file:png}))).status,503)
  assert.ok(!a.llamadas.some(x=>x[1]==='insert'))
  assert.equal((await api(POST).POST(solicitud(base,{file:new File(['<svg/>'],'x.png',{type:'image/png'})}))).status,400)
})
test('captura enviada usa carpeta propia, no permite sobrescribir ni devuelve URL pública',async()=>{
  const a=api(POST,{respuestas:{'resultados:insert':{data:{id:ID},error:null}}})
  const file=new File([Uint8Array.from([137,80,78,71,13,10,26,10])],'prueba.png',{type:'image/png'})
  const r=await a.POST(solicitud(base,{file})); assert.equal(r.body.ok,true)
  assert.ok(a.storage[0][2].startsWith(USER+'/'+ID+'/'));assert.equal(a.storage[0][3].upsert,false)
  assert.equal(Object.keys(r.body).sort().join(','),'id,ok')
})
const PATCH='src/app/api/admin/resultados/route.ts'
test('solo administración revisa, compara estado anterior y comunica conflictos o errores',async()=>{
  assert.equal((await api(PATCH).PATCH(solicitud({id:ID,estado:'aprobado',anterior:'pendiente'}))).status,403)
  const perfil={data:{rol:'admin'},error:null}
  for(const [r,status] of [[{data:{id:ID},error:null},200],[{data:null,error:null},409],[{data:null,error:{}},503]]) {
    const a=api(PATCH,{respuestas:{perfiles:perfil,'resultados:update':r}})
    assert.equal((await a.PATCH(solicitud({id:ID,estado:'aprobado',anterior:'pendiente'}))).status,status)
    assert.ok(a.llamadas.some(x=>x[1]==='eq'&&x[2]==='estado'&&x[3]==='pendiente'))
  }
  assert.equal((await api(PATCH,{respuestas:{perfiles:perfil}}).PATCH(solicitud({id:ID,estado:'inventado',anterior:'pendiente'}))).status,400)
})
const ACCESO='src/app/api/admin/resultados/acceso/route.ts'
test('habilita solo Socias activas; se puede cerrar después y no hay acceso automático',async()=>{
  for(const destino of [{rol:'alumna',tipo_usuario:'gratuito',estado:'activa'},{rol:'alumna',tipo_usuario:'desafio',estado:'activa'},{rol:'alumna',tipo_usuario:'socia',estado:'pausada'}]) {
    let n=0;const a=api(ACCESO,{respuestas:{perfiles:()=>({data:n++?destino:{rol:'admin'},error:null})}})
    assert.equal((await a.POST(solicitud({usuaria_id:USER,habilitada:true}))).status,400)
  }
  for(const habilitada of [true,false]) {
    let n=0;const a=api(ACCESO,{respuestas:{perfiles:()=>({data:n++?{rol:'alumna',tipo_usuario:habilitada?'socia':'gratuito',estado:'activa'}:{rol:'admin'},error:null}),accesos_resultados:{error:null}}})
    assert.equal((await a.POST(solicitud({usuaria_id:USER,habilitada}))).body.ok,true)
    const payload=a.llamadas.find(x=>x[1]==='upsert')[2];assert.equal(payload.administradora_id,USER);assert.equal(payload.habilitada,habilitada)
  }
  assert.equal((await api(ACCESO).POST(solicitud({usuaria_id:USER,habilitada:true}))).status,403)
})
const ARCHIVO='src/app/api/resultados/[id]/archivo/route.ts'
const ctx={params:Promise.resolve({id:ID})}
test('solo dueña habilitada o admin acceden; firma temporal sin caché ni URLs ajenas',async()=>{
  for(const [opts,status] of [[{user:null},401],[{permitido:false},403],[{respuestas:{resultados:{data:{alumna_id:'otra',archivo_url:'x.png'}}}},404]]) assert.equal((await api(ARCHIVO,opts).GET({},ctx)).status,status)
  const a=api(ARCHIVO,{respuestas:{resultados:{data:{alumna_id:USER,archivo_url:'https://app.supabase.co/storage/v1/object/public/resultados/resultado-'+USER+'-12345.png'},error:null}}})
  const r=await a.GET({},ctx);assert.equal(r.status,307);assert.equal(r.headers['Cache-Control'],'private, no-store');assert.equal(a.storage[0][3],180)
  const b=api(ARCHIVO,{respuestas:{resultados:{data:{alumna_id:USER,archivo_url:'https://ajeno.com/x.png'}}}})
  assert.equal((await b.GET({},ctx)).status,404);assert.equal(b.storage.length,0)
  const c=api(ARCHIVO,{respuestas:{resultados:{data:{alumna_id:USER,archivo_url:'resultado-37cde110-6dc0-457f-adf2-aca62746788f-12345.png'}}}})
  assert.equal((await c.GET({},ctx)).status,404);assert.equal(c.storage.length,0)
  assert.equal(datos.capturaPertenece(USER+'/'+ID+'/'+'a'.repeat(64)+'.png',USER,ID),true)
  assert.equal(datos.capturaPertenece(USER+'/'+ID+'/'+'a'.repeat(64)+'.png',USER,'37cde110-6dc0-457f-adf2-aca62746788f'),false)
})
test('permiso real lee rol y plan del perfil, nunca metadata del navegador',async()=>{
  const {permisoResultados}=cargar('src/lib/results-server.ts')
  for(const [perfil,habilitada,expected] of [[{rol:'alumna',tipo_usuario:'gratuito',estado:'activa'},true,false],[{rol:'alumna',tipo_usuario:'desafio',estado:'activa'},true,false],[{rol:'alumna',tipo_usuario:'socia',estado:'activa'},false,false],[{rol:'alumna',tipo_usuario:'socia',estado:'activa'},true,true],[{rol:'alumna',tipo_usuario:'socia',estado:'pausada'},true,false],[{rol:'admin'},false,true]]) {
    const db=cliente({perfiles:{data:perfil,error:null},accesos_resultados:{data:{habilitada},error:null}})
    assert.equal((await permisoResultados(db,USER)).permitido,expected)
  }
})
test('las vistas no usan URLs públicas; solo Resultados se desbloquea individualmente',()=>{
  const leer=f=>fs.readFileSync(path.join(ROOT,f),'utf8')
  assert.ok(leer('src/app/comunidad/ComunidadCliente.tsx').includes('/api/resultados/'))
  assert.ok(!leer('src/app/comunidad/ComunidadCliente.tsx').includes('src={r.archivo_url}'))
  for(const f of ['src/app/resultados/page.tsx','src/app/admin/resultados/page.tsx','src/app/comunidad/page.tsx']) assert.ok(leer(f).includes("archivo_url: r.archivo_url ? 'privada' : null"))
  assert.ok(leer('src/components/LockedModules.tsx').includes("modulo.id === 'resultados' && resultadosHabilitados"))
  assert.ok(leer('src/app/resultados/page.tsx').includes("supabase\n      .from('resultados')"))
})
