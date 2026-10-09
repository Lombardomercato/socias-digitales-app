const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const mod = { exports: {} }
new Function('module','exports',ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/lib/perfil-preguntas.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText)(mod,mod.exports)
const preguntas=mod.exports
const ctx={userId:'alumna',supabaseUrl:'https://base.supabase.co'}
test('todas las alumnas completan bienvenida; solo admin está exenta',()=>{
  assert.equal(preguntas.necesitaBienvenida(null,'alumna'),true)
  assert.equal(preguntas.necesitaBienvenida({exenta:true},'alumna'),true)
  assert.equal(preguntas.necesitaBienvenida({completado_at:'2026-10-09'},'alumna'),false)
  assert.equal(preguntas.necesitaBienvenida(null,'admin'),false)
})
test('mismas preguntas y título condicional, sin forzar datos personales opcionales',()=>{
  assert.equal(preguntas.pasosVisibles({ocupacion:'Estudiante'}).length,9)
  assert.equal(preguntas.pasosVisibles({ocupacion:'Profesional'}).length,10)
  assert.equal(preguntas.pasosVisibles({ocupacion:'Estudiante',titulo_profesional:'Título existente'}).length,10)
  for(const campo of ['fecha_nacimiento','es_mama','ingresos_actuales','whatsapp','avatar_url'])assert.equal(preguntas.normalizarRespuesta(campo,null,ctx),null)
  for(const campo of ['nombre','ocupacion','pais'])assert.throws(()=>preguntas.normalizarRespuesta(campo,'',ctx))
})
test('valida tipos, fechas, teléfono, opciones y propiedad de la foto',()=>{
  assert.equal(preguntas.normalizarRespuesta('nombre','  Alex  ',ctx),'Alex')
  assert.equal(preguntas.normalizarRespuesta('fecha_nacimiento','2000-12-31',ctx),'2000-12-31')
  assert.throws(()=>preguntas.normalizarRespuesta('fecha_nacimiento','2000-02-30',ctx))
  assert.throws(()=>preguntas.normalizarRespuesta('fecha_nacimiento','2099-01-01',ctx))
  assert.throws(()=>preguntas.normalizarRespuesta('es_mama','false',ctx))
  assert.equal(preguntas.normalizarRespuesta('es_mama',false,ctx),false)
  assert.equal(preguntas.normalizarRespuesta('whatsapp','+54 351 555 1234',ctx),'+54 351 555 1234')
  assert.throws(()=>preguntas.normalizarRespuesta('whatsapp','abc123',ctx))
  assert.throws(()=>preguntas.normalizarRespuesta('ocupacion','inventada',ctx))
  assert.equal(preguntas.normalizarRespuesta('ocupacion','Valor anterior',{...ctx,anterior:'Valor anterior'}),'Valor anterior')
  assert.equal(preguntas.normalizarRespuesta('avatar_url','https://base.supabase.co/storage/v1/object/public/avatars/alumna/foto.jpg',ctx),'https://base.supabase.co/storage/v1/object/public/avatars/alumna/foto.jpg')
  assert.throws(()=>preguntas.normalizarRespuesta('avatar_url','https://base.supabase.co/storage/v1/object/public/avatars/otra/foto.jpg',ctx))
})

function endpoint({user={id:'alumna'},rol='alumna',configured=true,estado=null,perfil={},saveError=null,stateError=null}={}) {
  let escritura=null,progreso=null
  const exports={}
  const profile={...Object.fromEntries(preguntas.PASOS_PERFIL.map(p=>[p.campo,null])),nombre:'Alumna',...perfil,rol}
  const code=ts.transpileModule(fs.readFileSync(path.resolve(__dirname,'../src/app/api/cuenta/bienvenida/route.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText
  new Function('require','exports',code)(name=>{
    if(name==='next/server')return {NextResponse:{json:(body,options={})=>({body,status:options.status??200})}}
    if(name==='@/lib/perfil-preguntas')return preguntas
    if(name==='@/lib/supabase/server')return {createClient:async()=>({auth:{getUser:async()=>({data:{user}})},from:table=>({
      select:()=>({eq:()=>({maybeSingle:async()=>({data:table==='perfiles'?profile:estado,error:stateError})})}),
      update:input=>{escritura=input;return {eq:(_,id)=>{assert.equal(id,user.id);return {select:()=>({maybeSingle:async()=>({data:saveError?null:{id},error:saveError})})}}}},
    })})}
    if(name==='@/lib/supabase/admin')return {isAdminSupabaseConfigured:()=>configured,createAdminClient:()=>({from:()=>({upsert:async input=>{progreso=input;return {error:null}}})})}
    throw Error(name)
  },exports)
  return {...exports,escritura:()=>escritura,progreso:()=>progreso}
}
const request=(body,origin='https://app.sociasdigitales.com')=>({url:'https://app.sociasdigitales.com/api/cuenta/bienvenida',headers:new Headers({origin}),json:async()=>body})
test('guarda solo en la cuenta de la sesión, sin aceptar roles ni ids del cliente',async()=>{
  const api=endpoint()
  assert.equal((await api.POST(request({campo:'nombre',valor:'Mi nombre',usuaria_id:'otra',rol:'admin'}))).status,200)
  assert.deepEqual(api.escritura(),{nombre:'Mi Nombre'})
  assert.equal(api.progreso().usuaria_id,'alumna')
  assert.equal(api.progreso().paso,1)
  assert.equal(api.progreso().completado_at,null)
  assert.deepEqual(api.progreso().respondidas,['nombre'])
})
test('rechaza origen ajeno, falta de sesión, saltos, roles, valores y errores de guardado',async()=>{
  assert.equal((await endpoint().POST(request({campo:'nombre',valor:'Alex'},'https://otro.com'))).status,403)
  assert.equal((await endpoint({user:null}).POST(request({campo:'nombre',valor:'Alex'}))).status,401)
  assert.equal((await endpoint({configured:false}).POST(request({campo:'nombre',valor:'Alex'}))).status,503)
  assert.equal((await endpoint().POST(request({campo:'rol',valor:'admin'}))).status,400)
  assert.equal((await endpoint().POST(request({campo:'pais',valor:'Argentina'}))).status,409)
  assert.equal((await endpoint().POST(request({campo:'nombre',valor:3}))).status,400)
  assert.equal((await endpoint({rol:'admin'}).POST(request({campo:'nombre',valor:'Alex'}))).status,409)
  assert.equal((await endpoint({saveError:{}}).POST(request({campo:'nombre',valor:'Alex'}))).status,500)
  assert.equal((await endpoint({stateError:{}}).POST(request({campo:'nombre',valor:'Alex'}))).status,503)
})
test('no completa sin pasar por las preguntas; finalizar no habilita clases ni estrategia',async()=>{
  assert.equal((await endpoint({estado:{paso:9,respondidas:[]}}).POST(request({campo:'avatar_url',valor:null,eleccion_explicita:true}))).status,409)
  const respondidas=preguntas.PASOS_PERFIL.filter(p=>!['avatar_url','titulo_profesional'].includes(p.campo)).map(p=>p.campo)
  const api=endpoint({estado:{paso:9,respondidas},perfil:{ocupacion:'Estudiante',pais:'Argentina',whatsapp:'+54 351 555 1234',provincia:'Córdoba'}})
  const res=await api.POST(request({campo:'avatar_url',valor:null,eleccion_explicita:true}))
  assert.equal(res.status,200)
  assert.equal(res.body.completado,true)
  assert.equal(api.progreso().paso,10)
  assert.ok(api.progreso().completado_at)
  assert.deepEqual(api.escritura(),{avatar_url:null})
})
test('no permite respuestas vacías; preferencias personales son elecciones explícitas',async()=>{
  for(const campo of ['nombre','whatsapp','ocupacion','titulo_profesional','pais','provincia']) {
    assert.throws(()=>preguntas.normalizarRespuestaBienvenida(campo,null,ctx,true))
  }
  for(const campo of ['fecha_nacimiento','es_mama','ingresos_actuales','avatar_url']) {
    assert.throws(()=>preguntas.normalizarRespuestaBienvenida(campo,null,ctx))
    assert.equal(preguntas.normalizarRespuestaBienvenida(campo,null,ctx,true),null)
  }
  assert.equal((await endpoint({estado:{paso:1,respondidas:['nombre']}}).POST(request({campo:'whatsapp',valor:null,eleccion_explicita:true}))).status,400)
  const respondidas=preguntas.PASOS_PERFIL.filter(p=>!['avatar_url','titulo_profesional'].includes(p.campo)).map(p=>p.campo)
  assert.equal((await endpoint({estado:{paso:9,respondidas},perfil:{ocupacion:'Estudiante',pais:'Argentina'}}).POST(request({campo:'avatar_url',valor:null,eleccion_explicita:true}))).status,400)
})
test('normaliza nombres, tildes, espacios y apellidos compuestos sin alterar otros campos',()=>{
  for(const [original,esperado] of [['  MARÍA   péREZ ','María Pérez'],['ana-mARÍA o’CONNOR','Ana-María O’Connor'],['JOSÉ de la CRUZ','José De La Cruz'],['  álEX santILLAN  ','Álex Santillan']]) {
    assert.equal(preguntas.normalizarNombre(original),esperado)
    assert.equal(preguntas.normalizarNombre(esperado),esperado)
    assert.equal(preguntas.normalizarRespuesta('nombre',original,ctx),esperado)
  }
  assert.equal(preguntas.normalizarRespuesta('pais','EE.UU.',ctx),'EE.UU.')
})
