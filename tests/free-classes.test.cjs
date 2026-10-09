const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const mod={exports:{}}
new Function('module','exports',ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/lib/class-access.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod,mod.exports)
const {puedeVerClase,claseParaCatalogo}=mod.exports
const libre={rol:'alumna',tipo_usuario:'gratuito',desafio_socias_habilitada:false}
const privada={activo:true,acceso_gratuito:false}
test('gratis reproduce solo muestras activas; Desafío y Socias mantienen las privadas',()=>{
  assert.equal(puedeVerClase(libre,{activo:true,acceso_gratuito:true}),true)
  assert.equal(puedeVerClase(libre,privada),false)
  assert.equal(puedeVerClase(libre,{activo:false,acceso_gratuito:true}),false)
  assert.equal(puedeVerClase(null,{activo:true,acceso_gratuito:true}),false)
  assert.equal(puedeVerClase({...libre,tipo_usuario:'desafio'},privada),false)
  assert.equal(puedeVerClase({...libre,desafio_socias_habilitada:true},privada),true)
  assert.equal(puedeVerClase({...libre,tipo_usuario:'socia'},privada),true)
  assert.equal(puedeVerClase({rol:'admin'},{activo:false}),true)
})
test('el catálogo no filtra claves privadas ni enlaces de clases bloqueadas',()=>{
  const clase={...privada,id:'clase',titulo:'Título',descripcion:null,orden:0,modulo:'Desafío',plan:'27',video_key:'privado.mp4',vimeo_url:'https://vimeo.com/1234'}
  const bloqueada=claseParaCatalogo(clase,libre)
  assert.equal(bloqueada.puede_ver,false)
  assert.equal(bloqueada.vimeo_url,null)
  assert.equal('video_key' in bloqueada,false)
  const gratuita=claseParaCatalogo({...clase,acceso_gratuito:true},libre)
  assert.equal(gratuita.puede_ver,true)
  assert.equal(gratuita.vimeo_url,clase.vimeo_url)
  assert.equal('video_key' in gratuita,false)
})
test('solo biblioteca y muestras se abren: Estrategia y módulos privados mantienen sus controles',()=>{
  const proxy=fs.readFileSync(path.resolve(__dirname,'../src/proxy.ts'),'utf8')
  assert.ok(proxy.includes("pathname.startsWith('/lanzamiento') || pathname.startsWith('/classroom/')"))
  const classes=fs.readFileSync(path.resolve(__dirname,'../src/components/FreeClasses.tsx'),'utf8')
  assert.ok(classes.includes('if(!clase.puede_ver || cargando) return'))
  const módulos=fs.readFileSync(path.resolve(__dirname,'../src/components/LockedModules.tsx'),'utf8')
  assert.ok(!módulos.includes('Próximamente'))
  assert.ok(módulos.includes('type="button" disabled'))
  assert.ok(módulos.includes('Enlace de inscripción por confirmar.'))
})
function apiVideo({perfil=libre,clase={...privada,video_key:'clase.mp4'},user={id:'alumna'}}={}) {
  const exports={}
  const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/app/api/classroom/[id]/video/route.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  new Function('require','exports','process',code)(name=>{
    if(name==='node:crypto')return require(name)
    if(name==='next/server')return {NextResponse:{json:(body,opts={})=>({body,status:opts.status??200})}}
    if(name==='@/lib/class-access')return mod.exports
    if(name==='@/lib/supabase/server')return {createClient:async()=>({auth:{getUser:async()=>({data:{user}})},from:table=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==='perfiles'?perfil:clase})})})})})}
    throw Error(name)
  },exports,{env:{}})
  return exports
}
const contexto={params:Promise.resolve({id:'2d0df184-c4a0-4072-bf9e-80734b876b35'})}
test('la API vuelve a autorizar antes de firmar: no basta manipular el catálogo',async()=>{
  assert.equal((await apiVideo({user:null}).GET({},contexto)).status,401)
  assert.equal((await apiVideo({perfil:null}).GET({},contexto)).status,403)
  assert.equal((await apiVideo().GET({},contexto)).status,403)
  assert.equal((await apiVideo({clase:null}).GET({},contexto)).status,404)
  assert.equal((await apiVideo({clase:{...privada,activo:false,acceso_gratuito:true,video_key:'video.mp4'}}).GET({},contexto)).status,404)
  // 503 es el firmador ausente en el fixture: la autorización de la muestra pasó.
  assert.equal((await apiVideo({clase:{...privada,acceso_gratuito:true,video_key:'video.mp4'}}).GET({},contexto)).status,503)
  assert.equal((await apiVideo({perfil:{...libre,desafio_socias_habilitada:true}}).GET({},contexto)).status,503)
})
