const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
function transpile(file){return ts.transpileModule(fs.readFileSync(path.resolve(__dirname,file),'utf8'),{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText}
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve}}
function fixture(pasoInicial=0){
  const cells=[];let cursor=0
  const hooks={useState(initial){const i=cursor++;if(!(i in cells))cells[i]=initial;return [cells[i],value=>cells[i]=typeof value==='function'?value(cells[i]):value]},useRef(initial){const i=cursor++;if(!(i in cells))cells[i]={current:initial};return cells[i]},useEffect(){}}
  const preguntas={exports:{}};new Function('module','exports',transpile('../src/lib/perfil-preguntas.ts'))(preguntas,preguntas.exports)
  const exported={};new Function('require','exports',transpile('../src/app/bienvenida/BienvenidaCliente.tsx'))(name=>{
    if(name==='react')return hooks
    if(name==='react/jsx-runtime')return require(name)
    if(name==='next/image'||name==='@/components/ArrowIcon')return {default:()=>null}
    if(name==='@/lib/supabase/client')return {createClient:()=>{throw Error('No debe tocar permisos')}}
    if(name==='@/lib/perfil-preguntas')return preguntas.exports
    throw Error(name)
  },exported)
  const datos=Object.fromEntries(preguntas.exports.PASOS_PERFIL.map(p=>[p.campo,null]));Object.assign(datos,{nombre:'Alumna de prueba',ocupacion:'Estudiante',pais:'Argentina'})
  const render=()=>{cursor=0;return exported.default({userId:'prueba',datosIniciales:datos,pasoInicial})}
  function find(tree,predicate){if(!tree||typeof tree!=='object')return null;if(predicate(tree))return tree;for(const child of [tree.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found}return null}
  return {cells,render,find,submit:tree=>find(tree,e=>e.type==='form').props.onSubmit({preventDefault(){}}),input:tree=>find(tree,e=>e.type==='input'&&e.props.type==='text')}
}
const tick=()=>new Promise(r=>setImmediate(r))
test('avanza antes de la red, permite completar la próxima y evita envíos simultáneos',async()=>{
  const oldFetch=global.fetch,oldFrame=global.requestAnimationFrame;const response=deferred();let requests=0
  global.fetch=()=>{requests++;return response.promise};global.requestAnimationFrame=f=>f()
  try{
    const ui=fixture();ui.submit(ui.render())
    assert.equal(ui.cells[1],1);assert.equal(ui.cells[2],true)
    const next=ui.find(ui.render(),e=>e.type==='input'&&e.props.type==='tel')
    assert.equal(next.props.disabled,false);next.props.onChange({target:{value:'+54 351 555 1234'}})
    ui.submit(ui.render());assert.equal(requests,1)
    response.resolve({ok:true,json:async()=>({paso:1,completado:false})});await tick()
    assert.equal(ui.cells[2],false);assert.equal(ui.cells[0].whatsapp,'+54 351 555 1234')
  }finally{global.fetch=oldFetch;global.requestAnimationFrame=oldFrame}
})
test('un error vuelve al paso pendiente sin borrar lo escrito en la pregunta siguiente',async()=>{
  const oldFetch=global.fetch,oldFrame=global.requestAnimationFrame;const response=deferred()
  global.fetch=()=>response.promise;global.requestAnimationFrame=f=>f()
  try{
    const ui=fixture();ui.submit(ui.render());ui.find(ui.render(),e=>e.type==='input'&&e.props.type==='tel').props.onChange({target:{value:'+54 351 555 1234'}})
    response.resolve({ok:false,json:async()=>({error:'Servidor no disponible'})});await tick()
    assert.equal(ui.cells[1],0);assert.equal(ui.cells[0].nombre,'Alumna De Prueba');assert.equal(ui.cells[0].whatsapp,'+54 351 555 1234');assert.match(ui.cells[4],/Tus respuestas siguen acá/)
  }finally{global.fetch=oldFetch;global.requestAnimationFrame=oldFrame}
})
test('la última pregunta no abre inicio hasta confirmar el guardado real',async()=>{
  const oldFetch=global.fetch,oldFrame=global.requestAnimationFrame,oldWindow=global.window;const response=deferred();const destinos=[]
  global.fetch=()=>response.promise;global.requestAnimationFrame=f=>f();global.window={location:{assign:x=>destinos.push(x)}}
  try{
    const ui=fixture(9);ui.find(ui.render(),e=>e.type==='button'&&e.props.children==='Usar mi inicial como foto').props.onClick();assert.deepEqual(destinos,[])
    response.resolve({ok:true,json:async()=>({completado:true,paso:10})});await tick();assert.deepEqual(destinos,['/inicio'])
  }finally{global.fetch=oldFetch;global.requestAnimationFrame=oldFrame;global.window=oldWindow}
})
test('no aparece completar después y una respuesta vacía no avanza ni llama al servidor',()=>{
  const oldFetch=global.fetch;let requests=0;global.fetch=()=>{requests++}
  try {
    const ui=fixture(1);const tree=ui.render()
    assert.equal(ui.find(tree,e=>e.type==='button'&&/Completar después|Agregar después/.test(String(e.props.children))),null)
    ui.submit(tree)
    assert.equal(ui.cells[1],1);assert.equal(requests,0);assert.match(ui.cells[4],/Completá esta respuesta/)
  }finally{global.fetch=oldFetch}
})
