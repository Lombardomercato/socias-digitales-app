/* eslint-disable @typescript-eslint/no-require-imports -- Runner nativo Node/CommonJS del repositorio. */
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path'), ts=require('typescript')
const React=require('react'), {renderToStaticMarkup}=require('react-dom/server')
const root=path.join(__dirname,'..')
const read=f=>fs.readFileSync(path.join(root,f),'utf8')
function cargar(file,deps={}) {
  const m={exports:{}}
  new Function('require','module','exports',ts.transpileModule(read(file),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>{if(name in deps)return deps[name];if(['react','react/jsx-runtime'].includes(name))return require(name);throw new Error(name)},m,m.exports)
  return m.exports
}
const dashboard=cargar('src/lib/results-dashboard.ts'), chart=cargar('src/lib/results-chart.ts')
const imagen=cargar('src/lib/results-share-image.ts',{'./results-dashboard':dashboard,'./results-chart':chart})
const data=dashboard.tableroResultados([{estado:'aprobado',archivo_url:'privada',monto:135,mes:'Julio 2026'}],'2026-10')
test('línea y barras usan exactamente los mismos meses y la misma escala desde cero',()=>{
  const antes=JSON.stringify(data.meses), lim={izquierda:48,derecha:588,arriba:22,abajo:222}
  const g=chart.geometriaResultados(data.meses,lim)
  assert.equal(g.puntos.length,6);assert.equal(g.puntos[2].centavos,13500)
  assert.equal(g.puntos[0].y,222);assert.equal(g.maximo,15000)
  for(const p of g.puntos) {assert.ok(p.x>=48&&p.x<=588);assert.ok(p.y>=22&&p.y<=222);assert.ok(Number.isFinite(p.x+p.y))}
  assert.equal(g.linea.split(' ').length,6);assert.equal(g.area.split(' ').length,8)
  assert.equal(JSON.stringify(data.meses),antes)
  const vacio=chart.geometriaResultados([],lim)
  assert.equal(vacio.linea,'');assert.equal(vacio.area,'');assert.ok(vacio.maximo>0)
})
function contexto() {
  const textos=[], trazos=[]
  const ctx={measureText:s=>({width:s.length*10}),fillText:(s,x,y)=>textos.push({s,x,y}),
    beginPath(){},roundRect(...p){trazos.push(['caja',...p])},fill(){},stroke(){},fillRect(){},setLineDash(){},
    moveTo(...p){trazos.push(['mover',...p])},lineTo(...p){trazos.push(['linea',...p])},closePath(){},arc(...p){trazos.push(['punto',...p])}}
  return {ctx,textos,trazos}
}
test('imágenes de línea/barras, cuadradas/verticales: cifras concretas, revisión y sin promesas',()=>{
  for(const formato of ['historia','publicacion']) for(const grafico of ['linea','barras']) for(const comunidad of [false,true]) {
    const {ctx,textos,trazos}=contexto()
    assert.deepEqual(imagen.dibujarImagenResultados(ctx,data,{formato,grafico,comunidad,fuente:'Poppins',editorial:'Playfair'}),{ancho:1080,alto:formato==='historia'?1920:1080})
    const contenido=textos.map(t=>t.s).join(' ')
    assert.ok(contenido.includes('135,00'));assert.ok(contenido.includes('Julio 2026'))
    assert.ok(contenido.includes('1 de 6'));assert.ok(contenido.includes('Revisadas por Flor'))
    assert.ok(!contenido.includes('100%'));assert.ok(contenido.includes(comunidad?'Total de la comunidad':'no una promesa'))
    assert.ok(textos.every(t=>t.x>=0&&t.y>0&&t.y<(formato==='historia'?1920:1080)))
    assert.equal(trazos.some(t=>t[0]==='punto'),grafico==='linea')
  }
})
test('crecimiento se muestra solo con base previa real y la imagen no inventa plataformas',()=>{
  assert.ok(!fs.existsSync(path.join(root,'src/app/preview/graph-qa/page.tsx')),'La ruta de datos ficticios no se publica')
  const d=dashboard.tableroResultados([{estado:'aprobado',archivo_url:'privada',monto:200,mes:'Octubre 2026'},{estado:'aprobado',archivo_url:'privada',monto:100,mes:'Abril 2026'}],'2026-10')
  const {ctx,textos}=contexto()
  imagen.dibujarImagenResultados(ctx,d,{formato:'historia',grafico:'linea',comunidad:false,fuente:'Poppins',editorial:'Playfair'})
  const contenido=textos.map(t=>t.s).join(' ')
  assert.ok(contenido.includes('+100%'));assert.ok(contenido.includes('VS. PERÍODO ANTERIOR'))
  for(const proveedor of ['Hotmart','Mercado Pago','Whop','WhatsApp']) assert.ok(!contenido.includes(proveedor))
  const src=read('src/components/ResultsDashboard.tsx')
  assert.ok(src.includes("useState<TipoGraficoResultados>('linea')"));assert.ok(src.includes('Visualización del gráfico'))
  assert.ok(src.includes('graficoInicial={grafico}'));assert.ok(src.includes('data.mejorMes ??'))
  assert.ok(read('src/components/ResultsShare.tsx').includes('data,comunidad,formato,grafico'))
})
test('tablero renderizado destaca el mes real con mayor monto y conserva controles y errores accesibles',()=>{
  const Component=cargar('src/components/ResultsDashboard.tsx',{
    'next/dynamic':{default:()=>()=>null},'./NavigationIcon':{default:()=>null},
    '@/lib/results-dashboard':dashboard,'@/lib/results-chart':chart,
    './ResultsDashboard.module.css':{default:new Proxy({},{get:(_,key)=>String(key)})},
  }).default
  const rows=[{estado:'aprobado',archivo_url:'privada',monto:135,mes:'Julio 2026'}]
  const props={resultados:rows,periodoActual:'2026-10'}
  const html=renderToStaticMarkup(React.createElement(Component,props))
  assert.ok(html.includes('<polyline'));assert.ok(html.includes('Visualización del gráfico'))
  assert.ok(html.includes('aria-label="Julio 2026" aria-pressed="true"'))
  assert.ok(html.includes('Línea'));assert.ok(html.includes('Barras'));assert.ok(html.includes('Ver todos los valores'))
  const error=renderToStaticMarkup(React.createElement(Component,{...props,errorCarga:true}))
  assert.ok(!error.includes('<polyline'));assert.ok(!error.includes('Preparar imagen'))
  const empty=renderToStaticMarkup(React.createElement(Component,{...props,resultados:[]}))
  assert.ok(empty.includes('disabled=""'));assert.ok(empty.includes('primer resultado aprobado'))
})
