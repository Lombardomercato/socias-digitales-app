const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const read = file => fs.readFileSync(path.join(__dirname,'..',file),'utf8')
function load(file,deps={},env={}) {
  const m={exports:{}}
  const code=ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  new Function('require','module','exports','process',code)(name=>name==='server-only'?{}:name in deps?deps[name]:require(name),m,m.exports,{env})
  return m.exports
}
const management=load('src/lib/class-management.ts')
const env={R2_S3_ACCOUNT_ID:'test-account',R2_BUCKET_NAME:'private-videos',R2_ACCESS_KEY_ID:'fixture-access',R2_SECRET_ACCESS_KEY:'fixture-secret-not-a-real-key'}
const r2=load('src/lib/r2-upload.ts',{'./class-management':management},env)
const state={userId:'admin',claseId:'2d0df184-c4a0-4072-bf9e-80734b876b35',key:'clases/2d0df184-c4a0-4072-bf9e-80734b876b35/11111111-1111-1111-1111-111111111111.mp4',uploadId:'upload+/=id',bytes:100,anterior:null,exp:Date.now()+60000}
test('la carga acepta MP4 con tamaño real y limitado, no MOV/HTML/vacío',()=>{
  for(const [name,size,valid] of [['video.MP4',1,true],['video.mov',100,false],['video.html',100,false],['video.mp4',0,false],['video.mp4',management.MAX_VIDEO_BYTES+1,false],['video.mp4','100',false],['video.mp4',1.5,false]])assert.equal(management.validarVideo(name,size),valid)
})
test('la ficha valida programas, orden y Vimeo, sin confiar claves de video del cliente',()=>{
  const data={titulo:' Clase 1 ',modulo:'Desafío   Socias en vivo',orden:0,descripcion:'Presentación',activo:false,acceso_gratuito:false,video_key:'otra-cuenta.mp4',rol:'admin'}
  const parsed=management.datosClase(data)
  assert.equal(parsed.modulo,'Desafío Socias en vivo');assert.equal(parsed.titulo,'Clase 1')
  assert.equal('video_key' in parsed,false);assert.equal('rol' in parsed,false)
  assert.equal(management.datosClase({...data,orden:-1}),null)
  assert.equal(management.datosClase({...data,vimeo_url:'https://vimeo.com.evil.test/123'}),null)
  assert.equal(management.datosClase({...data,vimeo_url:'javascript:alert(1)'}),null)
  assert.equal(management.datosClase({...data,vimeo_url:'https://vimeo.com/123456'}).vimeo_url,'https://vimeo.com/123456')
})
test('token de carga no permite otro admin, otro archivo, vencimiento o alteración',()=>{
  const token=r2.tokenCarga(state)
  assert.deepEqual(r2.leerTokenCarga(token,'admin'),state)
  assert.equal(r2.leerTokenCarga(token,'alumna'),null)
  assert.equal(r2.leerTokenCarga(token+'x','admin'),null)
  assert.equal(r2.leerTokenCarga(r2.tokenCarga({...state,exp:1}),'admin'),null)
  assert.equal(r2.leerTokenCarga(r2.tokenCarga({...state,key:'clases/otra/archivo.mp4'}),'admin'),null)
  assert.equal(r2.leerTokenCarga(r2.tokenCarga({...state,bytes:management.MAX_VIDEO_BYTES+1}),'admin'),null)
})
test('firma de parte restringe a una operación, objeto y sesión sin mostrar el secreto',()=>{
  const url=new URL(r2.firmarParte(state.key,state.uploadId,1))
  assert.equal(url.hostname,'test-account.r2.cloudflarestorage.com')
  assert.equal(url.searchParams.get('uploadId'),state.uploadId)
  assert.equal(url.searchParams.get('partNumber'),'1')
  assert.equal(url.searchParams.get('X-Amz-Expires'),'900')
  assert.equal(url.searchParams.get('X-Amz-Signature').length,64)
  assert.equal(url.toString().includes(env.R2_SECRET_ACCESS_KEY),false)
})
test('la finalización comprueba partes consecutivas, tamaño y ETags reales',()=>{
  const xml='<ListPartsResult><Part><PartNumber>1</PartNumber><ETag>&quot;abcdef&quot;</ETag><Size>100</Size></Part></ListPartsResult>'
  const parts=r2.leerPartes(xml)
  assert.equal(r2.partesCompletas(parts,100),true)
  assert.equal(r2.partesCompletas(parts,99),false)
  assert.equal(r2.partesCompletas([{...parts[0],number:2}],100),false)
  assert.equal(r2.partesCompletas([{...parts[0],etag:'<bad>'}],100),false)
  const two=[{number:1,size:management.TAMANO_PARTE,etag:'"abcdef"'},{number:2,size:50,etag:'"123abc"'}]
  assert.equal(r2.partesCompletas(two,management.TAMANO_PARTE+50),true)
})
const json={NextResponse:{json:(body,options={})=>({body,status:options.status??200})}}
test('la autorización administrativa usa usuario verificado y rol de base, no metadata',async()=>{
  for(const [user,role,status] of [[null,'admin',401],[{id:'u',user_metadata:{rol:'admin'}},'alumna',403],[{id:'u'},'admin',undefined]]) {
    const auth=load('src/lib/admin-auth.ts',{'next/server':json,'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{rol:role}})})})})})}})
    const result=await auth.autorizarAdmin(new Request('https://app.sociasdigitales.com/api/admin/clases',{method:'POST',headers:{origin:'https://app.sociasdigitales.com'}}))
    assert.equal(result.error?.status,status)
    if(!status)assert.equal(result.user.id,'u')
    assert.equal((await auth.autorizarAdmin(new Request('https://app.sociasdigitales.com/api/admin/clases',{method:'POST',headers:{origin:'https://otro.test'}}))).error.status,403)
  }
})
test('publicar sin video falla y una clave inventada no se guarda',async()=>{
  let written=false
  const api=load('src/app/api/admin/clases/route.ts',{'next/server':json,'@/lib/class-management':management,'@/lib/admin-auth':{autorizarAdmin:async()=>({supabase:{from:()=>({insert:()=>{written=true;throw new Error('no escribir')}})}})}})
  const response=await api.POST(new Request('https://app.test',{method:'POST',body:JSON.stringify({titulo:'Clase 1',modulo:'En vivo',orden:0,activo:true,video_key:'inventado.mp4'})}))
  assert.equal(response.status,400);assert.equal(written,false)
})
test('alumnas y anónimos nunca inician ni completan cargas',async()=>{
  for(const status of [401,403]) {
    const api=load('src/app/api/admin/clases/video/route.ts',{'next/server':json,'@/lib/class-management':management,'@/lib/r2-upload':r2,'@/lib/admin-auth':{autorizarAdmin:async()=>({error:{status}})}})
    assert.equal((await api.POST(new Request('https://app.test',{method:'POST',body:'{}'}))).status,status)
  }
})
test('flujo de video no pasa el archivo por Vercel y no publica ni elimina automáticamente',()=>{
  const ui=read('src/app/admin/classroom/VideoUpload.tsx'),api=read('src/app/api/admin/clases/video/route.ts')
  assert.ok(ui.includes('file.slice('));assert.match(ui,/request\.open\(['"]PUT['"],\s*url\)/)
  assert.ok(!api.includes('arrayBuffer('));assert.ok(!api.includes('formData('));assert.ok(!api.includes('activo: true'))
  assert.ok(api.includes('partesCompletas'));assert.ok(api.includes("select('id')")||api.includes('select("id")'))
})
test('invitación admin confirma email con tipo invite y dirige al inicio según rol',()=>{
  const team=read('src/app/api/admin/equipo/route.ts'),confirm=read('src/app/confirmar/page.tsx'),password=read('src/app/crear-contrasena/CrearContrasenaCliente.tsx')
  assert.ok(team.includes('autorizarAdmin(request)'));assert.ok(team.includes('generateLink'))
  assert.ok(team.includes('email_confirmed_at'));assert.ok(team.includes('EMAIL_HEADER'))
  assert.ok(confirm.includes("invite ? 'invite'"));assert.ok(password.includes("cambiar ? '/perfil' : '/'"))
})
test('finalizar verifica R2 antes de vincular y nunca activa una clase borrador',async()=>{
  const calls=[]
  let heads=0, written=null
  const mockR2={...r2,pedirR2:async(method,key,query)=>{
    calls.push(method)
    if(method==='HEAD')return new Response(null,{status:++heads===1?404:200,headers:{'content-length':'100','content-type':'video/mp4'}})
    if(method==='GET')return new Response('<ListPartsResult><Part><PartNumber>1</PartNumber><ETag>&quot;abcdef&quot;</ETag><Size>100</Size></Part></ListPartsResult>')
    return new Response('<CompleteMultipartUploadResult/>')
  }}
  const api=load('src/app/api/admin/clases/video/route.ts',{'next/server':json,'@/lib/class-management':management,'@/lib/r2-upload':mockR2,'@/lib/admin-auth':{autorizarAdmin:async()=>({user:{id:'admin'},supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{id:state.claseId,video_key:null}})})}),update:payload=>{written=payload;const query={eq:()=>query,is:()=>query,select:()=>query,maybeSingle:async()=>({data:{id:state.claseId},error:null})};return query}})}})}})
  const response=await api.POST(new Request('https://app.test',{method:'POST',body:JSON.stringify({action:'finalizar',token:r2.tokenCarga(state)})}))
  assert.equal(response.status,200);assert.deepEqual(calls,['HEAD','GET','POST','HEAD'])
  assert.deepEqual(written,{video_key:state.key,vimeo_url:null});assert.equal('activo' in written,false)
})
test('un email sin verificar no puede elevarse a administrador',async()=>{
  let writes=0
  const admin={auth:{admin:{getUserById:async()=>({data:{user:{id:state.claseId,email_confirmed_at:null}}})}},from:()=>{writes++;throw Error('no escribir')}}
  const api=load('src/app/api/admin/equipo/route.ts',{'next/server':json,'@/lib/class-management':management,'@/lib/admin-team':{},'@/lib/admin-auth':{autorizarAdmin:async()=>({user:{id:'admin'}})},'@/lib/supabase/admin':{createAdminClient:()=>admin,isAdminSupabaseConfigured:()=>true},'@/lib/perfil-preguntas':{normalizarNombre:s=>s},'@/lib/registration-mail':{},'@/lib/email-brand':{EMAIL_HEADER:'banner'}},env)
  const response=await api.POST(new Request('https://app.test',{method:'POST',body:JSON.stringify({action:'promover',id:state.claseId,confirmar:true})}))
  assert.equal(response.status,400);assert.equal(writes,0)
})
test('el directorio de equipo lee emails de Auth, nunca una columna inexistente en perfiles',async()=>{
  const directory=load('src/lib/admin-team.ts')
  const admin={auth:{admin:{listUsers:async()=>({data:{users:[{id:'a',email:'admin@example.test'},{id:'b',email:'otra@example.test'}]},error:null})}}}
  const found=await directory.buscarCuentaEmail(admin,'admin@example.test')
  assert.equal(found.id,'a');assert.equal(await directory.buscarCuentaEmail(admin,'nueva@example.test'),null)
  assert.deepEqual([...await directory.emailsDelEquipo(admin,['a'])],[['a','admin@example.test']])
  assert.ok(!read('src/app/admin/equipo/page.tsx').includes('id,nombre,email,rol'))
  assert.ok(!read('src/app/api/admin/equipo/route.ts').includes(".eq('email'"))
})
