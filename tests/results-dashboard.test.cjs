/* eslint-disable @typescript-eslint/no-require-imports -- Pruebas CommonJS del runner nativo de Node. */
const test=require('node:test')
const assert=require('node:assert/strict')
const fs=require('node:fs')
const path=require('node:path')
const ts=require('typescript')
const ROOT=path.resolve(__dirname,'..')
const read=f=>fs.readFileSync(path.join(ROOT,f),'utf8')
const m={exports:{}}
new Function('module','exports',ts.transpileModule(read('src/lib/results-dashboard.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m,m.exports)
const {periodoResultado,moverMes,tableroResultados,dineroTablero}=m.exports
const r=(mes,monto,extra={})=>({mes,monto,estado:'aprobado',archivo_url:'privada',...extra})
test('reconoce el mes del resultado, no inventa fecha con created_at',()=>{
  assert.equal(periodoResultado(' Octubre 2026 '),'2026-10')
  assert.equal(periodoResultado('JULIO 2026'),'2026-07')
  for(const v of [null,'Octubre','Octubre 26','2026-10','no','Octubre 2026 hola']) assert.equal(periodoResultado(v),null)
  assert.equal(moverMes('2026-01',-1),'2025-12')
})
test('incluye solo montos aprobados con comprobante y suma centavos sin ruido decimal',()=>{
  const data=tableroResultados([
    r('Octubre 2026',0.1),r('Octubre 2026',0.2),r('Septiembre 2026',100),
    r('Octubre 2026',900,{estado:'pendiente'}),r('Octubre 2026',700,{estado:'rechazado'}),
    r('Octubre 2026',50,{archivo_url:null}),r('no',20),r('Octubre 2026',null),r('Octubre 2026',-1),r('Octubre 2026','NaN'),r('Octubre 2026',0.001)
  ],'2026-10')
  assert.equal(data.total,10030);assert.equal(data.registros,3);assert.equal(data.excluidos,6)
  assert.equal(data.mejorMes.periodo,'2026-09');assert.equal(data.meses[5].centavos,30)
  assert.equal(data.meses[0].centavos,0);assert.equal(data.promedio,1672)
  assert.equal(data.variacion,null)
  assert.ok(dineroTablero(30).includes('0,30'))
})
test('compara ventanas iguales cruzando años; un cero previo no genera 100% ficticio',()=>{
  const data=tableroResultados([r('Enero 2026',100),r('Julio 2025',50),r('Diciembre 2024',9000),r('Febrero 2026',999)],'2026-01')
  assert.equal(data.total,10000);assert.equal(data.anterior,5000);assert.equal(data.variacion,100)
  assert.equal(data.meses[0].periodo,'2025-08');assert.equal(data.meses[5].periodo,'2026-01')
  const empty=tableroResultados([],'2026-10',12)
  assert.equal(empty.total,0);assert.equal(empty.mejorMes,null);assert.equal(empty.variacion,null);assert.equal(empty.meses.length,12)
  assert.throws(()=>tableroResultados([],'2026-13'));assert.throws(()=>tableroResultados([],'2026-10',24))
})
test('exportación recibe solo agregados, sin PII, descripciones, IDs ni comprobantes',()=>{
  const d=tableroResultados([r('Octubre 2026',100,{id:'secreto',alumna_id:'privado',descripcion:'email@privado.test',perfiles:{nombre:'No exportar'}})],'2026-10')
  const serializado=JSON.stringify(d)
  for(const secreto of ['secreto','privado','archivo_url','descripcion','perfiles']) assert.ok(!serializado.includes(secreto))
  const src=read('src/components/ResultsShare.tsx')
  assert.ok(src.includes('elemento.width=1080'));assert.ok(src.includes("?1920:1080"));assert.ok(src.includes('document.fonts.ready'))
  assert.ok(src.includes('navigator.canShare'));assert.ok(src.includes('image/png'));assert.ok(!src.includes('fetch('))
  assert.ok(src.includes('archivo?.key===key'));assert.ok(src.includes('No se publica automáticamente'))
})
test('cambios de aprobación se reflejan y el tablero incompleto nunca es compartible',()=>{
  const lista=[r('Octubre 2026',50)]
  assert.equal(tableroResultados(lista,'2026-10').total,5000)
  assert.equal(tableroResultados(lista.map(r=>({...r,estado:'rechazado'})),'2026-10').total,0)
  const src=read('src/components/ResultsDashboard.tsx'), css=read('src/components/ResultsDashboard.module.css')
  assert.ok(src.includes('errorCarga?<p'));assert.ok(src.includes('disabled={!data.registros}'))
  assert.ok(src.includes('no equivale a cantidad de ventas'));assert.ok(src.includes('Ver todos los valores'))
  assert.ok(css.includes('min-height:44px'));assert.ok(css.includes('font-size:16px'));assert.ok(!css.includes('overflow-x:hidden'))
  assert.ok(read('src/app/admin/resultados/page.tsx').includes(".not('alumna_id', 'in', FILTRO_CUENTAS_PRUEBA)"))
  assert.ok(read('src/app/resultados/page.tsx').includes('totalResultados ?? 0) > resultados.length'))
  assert.ok(!fs.existsSync(path.join(ROOT,'src/app/preview/results-qa/page.tsx')))
})
