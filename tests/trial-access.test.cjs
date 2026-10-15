const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const read=f=>fs.readFileSync(path.resolve(__dirname,'..',f),'utf8')
function load(file,deps={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(n=>n==='server-only'?{}:n in deps?deps[n]:require(n),m,m.exports);return m.exports}
const accounts=load('src/lib/test-accounts.ts'),logic=load('src/lib/trial-access.ts',{'./test-accounts':accounts})
function fixture({role='alumna',failTable=null}={}) {
  const profile={id:accounts.CUENTAS_PRUEBA_IDS[0],nombre:'Prueba',rol:role,tipo_usuario:'desafio',estado:'activa',desafio_socias_habilitada:true,desafio_socias_estado:'habilitada',respuestas:'preservar'}
  const flags={},writes=[],targets=[]
  const admin={from:table=>{
    let payload=null,op='read'
    const q={select:()=>q,eq:(key,value)=>{if(key==='id'||key==='usuaria_id')targets.push(value);return q},update:x=>{payload=x;op='update';return q},upsert:x=>{payload=x;op='upsert';return q},maybeSingle:async()=>{
      if(op!=='read'){if(table===failTable)return{error:{message:'fallo'}};writes.push([table,payload]);if(table==='perfiles')Object.assign(profile,payload);else flags[table]=payload}
      return{data:table==='perfiles'?{...profile}:flags[table]||null,error:null}
    }};return q
  }}
  return{admin,profile,flags,writes,targets}
}
test('habilita solo cuenta de prueba explícita; conserva rol, respuestas y exclusión estadística',async()=>{
  const f=fixture();const result=await logic.habilitarAccesosPrueba(f.admin,'actor')
  assert.equal(result.rol,'alumna');assert.equal(result.plan,'socia');assert.equal(result.desafio,true);assert.ok(result.modulos.every(m=>m.habilitada))
  assert.equal(f.profile.respuestas,'preservar');assert.ok(f.targets.every(x=>x===accounts.CUENTAS_PRUEBA_IDS[0]))
  assert.equal('rol' in f.writes[0][1],false);assert.equal(f.writes.length,5)
  assert.ok(f.writes.slice(1).every(([,x])=>x.administradora_id==='actor'))
  await logic.habilitarAccesosPrueba(f.admin,'actor');assert.ok((await logic.leerAccesosPrueba(f.admin)).modulos.every(m=>m.habilitada))
  assert.equal(accounts.esCuentaPrueba(f.profile.id),true)
})
test('no actúa sobre cuenta administrativa ni afirma éxito con permisos parciales; reintento conserva datos',async()=>{
  const admin=fixture({role:'admin'});await assert.rejects(()=>logic.habilitarAccesosPrueba(admin.admin,'actor'));assert.equal(admin.writes.length,0)
  const partial=fixture({failTable:'accesos_metricas'});await assert.rejects(()=>logic.habilitarAccesosPrueba(partial.admin,'actor'),/solo parte/)
  assert.equal(partial.profile.rol,'alumna');assert.equal(partial.profile.respuestas,'preservar')
  assert.ok(!partial.flags.accesos_mi_dia)
})
test('API exige admin verificada y origen; ignora ningún id, rol o payload adicional del cliente',async()=>{
  let calls=0
  const json={NextResponse:{json:(body,options={})=>({body,status:options.status??200})}}
  const deps={'next/server':json,'@/lib/supabase/admin':{isAdminSupabaseConfigured:()=>true,createAdminClient:()=>({})},'@/lib/trial-access':{habilitarAccesosPrueba:async()=>{calls++;return{}},leerAccesosPrueba:async()=>({})}}
  for(const status of [401,403]){const api=load('src/app/api/admin/prueba/accesos/route.ts',{...deps,'@/lib/admin-auth':{autorizarAdmin:async()=>({error:{status}})}});assert.equal((await api.POST(new Request('https://app.test',{method:'POST',body:'{"habilitar":true}'}))).status,status);assert.equal((await api.GET()).status,status)}
  const api=load('src/app/api/admin/prueba/accesos/route.ts',{...deps,'@/lib/admin-auth':{autorizarAdmin:async()=>({user:{id:'actor'}})}})
  for(const body of [{habilitar:true,id:'ajena'},{habilitar:true,rol:'admin'},{habilitar:false},null])assert.equal((await api.POST(new Request('https://app.test',{method:'POST',body:JSON.stringify(body)}))).status,400)
  assert.equal(calls,0)
  assert.equal((await api.POST(new Request('https://app.test',{method:'POST',body:'{"habilitar":true}'}))).status,200);assert.equal(calls,1)
  assert.ok(read('src/app/api/admin/prueba/accesos/route.ts').includes('autorizarAdmin(request)'))
  assert.ok(!read('src/lib/trial-access.ts').includes('generateLink'));assert.ok(!read('src/lib/trial-access.ts').includes('.delete('))
})
