import { perfilEncuesta, type SurveyRow } from '@/lib/survey'

const porcentaje = (value: number) => `${value.toLocaleString('es-AR')}%`

export default function PerfilEncuesta({ rows }: { rows: SurveyRow[] }) {
  const perfil = perfilEncuesta(rows)
  return <div className="mt-5 space-y-4">
    <section aria-labelledby="perfil-comunidad" className="min-w-0 rounded-[24px] border border-[#EC9BB6]/60 bg-[#FFFDFA] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#294A38]">Perfil predominante</p><h2 id="perfil-comunidad" className="mt-2 font-serif text-3xl font-semibold sm:text-4xl">Así es tu comunidad hoy</h2></div>
        <p className="shrink-0 rounded-2xl border border-[#EC9BB6]/40 bg-[#F4CAD8] px-4 py-3 text-xs"><strong className="font-impact text-2xl font-semibold tabular-nums">{perfil.base}</strong><span className="ml-2">encuestas completas</span></p>
      </div>
      {!perfil.base ? <p className="mt-5 text-sm leading-6 text-[#746a64]">No hay encuestas completas en esta selección. El perfil aparecerá cuando terminen la bienvenida.</p> : <>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[#746a64]">Estos son los rasgos más frecuentes, considerados por separado. Describen a quienes respondieron; no definen todavía a la compradora ideal.</p>
        {perfil.base === 1 && <p className="mt-3 text-xs leading-5 text-[#746a64]">Hay una sola encuesta completa: todavía no podemos comparar tendencias.</p>}
        <dl className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">{perfil.rasgos.map(r => <div key={r.id} className="min-w-0 rounded-[18px] border border-[#EC9BB6]/40 bg-[#FAF7F3] p-4">
          <dt className="text-[10px] font-medium uppercase tracking-[.12em] text-[#746a64]">{r.title}</dt>
          <dd className="mt-3">
            {!r.ganadores.length ? <p className="text-sm text-[#746a64]">Sin datos informados</p> : <>
              <p className="break-words text-base font-medium leading-6">{r.ganadores.slice(0, 3).map(g => r.id === 'maternidad' ? g.label === 'Sí' ? 'Es mamá' : 'No es mamá' : r.id === 'edad' ? `${g.label} años` : g.label).join(' · ')}</p>
              {r.ganadores.length > 3 && <details className="mt-2 text-xs text-[#746a64]"><summary className="flex min-h-11 cursor-pointer items-center">Ver {r.ganadores.length - 3} respuestas más empatadas</summary><p className="break-words leading-5">{r.ganadores.slice(3).map(g => g.label).join(' · ')}</p></details>}
              <p className="mt-3 text-xs tabular-nums"><strong className="font-impact text-xl font-semibold text-[#294A38]">{r.ganadores[0].count}</strong><span className="ml-1 text-[#746a64]">de {perfil.base}{r.ganadores.length > 1 ? ' por respuesta' : ''}</span><span className="ml-2 text-[#294A38]">{porcentaje(r.ganadores[0].percent)}</span></p>
              <p className="mt-2 text-[11px] text-[#746a64]">{r.ganadores.length > 1 ? 'Empate: no hay un único rasgo predominante' : r.ganadores[0].count > perfil.base / 2 ? 'Mayoría de la selección' : 'Más frecuente, no es mayoría'}</p>
            </>}
            {r.conDato < perfil.base && <p className="mt-2 text-[11px] text-[#746a64]">{perfil.base - r.conDato} sin dato · no se interpreta como «No»</p>}
          </dd>
        </div>)}</dl>
        <div className="mt-5 rounded-[18px] border border-[#294A38]/20 bg-[#F4CAD8]/35 p-4 sm:p-5">
          <h3 className="text-sm font-semibold">¿Cuántas reúnen todos estos rasgos?</h3>
          <p className="mt-2 text-sm leading-6">{perfil.coincidencia === null ? 'Hay empates o datos faltantes: no armamos una única combinación de perfil.' : <><strong className="font-impact font-semibold">{perfil.coincidencia} de {perfil.base}</strong> alumnas reúnen los seis rasgos más frecuentes al mismo tiempo.</>}</p>
          <p className="mt-2 text-xs leading-5 text-[#746a64]">Las respuestas más frecuentes no necesariamente pertenecen a las mismas personas. Esta lectura es descriptiva, no una predicción de compra.</p>
        </div>
      </>}
      {perfil.excluidas > 0 && <p className="mt-4 text-xs leading-5 text-[#746a64]">{perfil.excluidas} perfiles de la selección aún no completaron la encuesta y no se incluyen en este resumen.</p>}
    </section>
    <section aria-labelledby="perfiles-compartidos" className="min-w-0 rounded-[24px] border border-[#EC9BB6]/55 bg-[#F4CAD8]/35 p-5 sm:p-7">
      <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#294A38]">Cruces reales</p><h2 id="perfiles-compartidos" className="mt-2 text-xl font-semibold sm:text-2xl">Perfiles que aparecen juntos</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[#746a64]">Combinaciones de maternidad, ocupación e ingresos compartidas por al menos dos alumnas. Mostramos hasta tres, ordenadas de mayor a menor.</p>
      {perfil.segmentos.length ? <div className="mt-5 grid min-w-0 gap-3 lg:grid-cols-3">{perfil.segmentos.map(g => <article key={`${g.maternidad}-${g.ocupacion}-${g.ingresos}`} className="min-w-0 rounded-[18px] border border-[#EC9BB6]/60 bg-[#FFFDFA] p-5">
        <p className="text-xs text-[#746a64]"><strong className="font-impact text-3xl font-semibold tabular-nums text-[#294A38]">{g.count}</strong><span className="ml-2">de {perfil.base} · {porcentaje(g.percent)}</span></p>
        <ul className="mt-4 space-y-2 text-sm leading-6"><li className="font-semibold">{g.maternidad}</li><li className="break-words">{g.ocupacion}</li><li className="break-words">{g.ingresos}</li></ul>
      </article>)}</div> : <p className="mt-5 rounded-[18px] border border-[#EC9BB6]/45 bg-[#FFFDFA] p-4 text-sm leading-6 text-[#746a64]">{perfil.base ? 'Todavía no hay una combinación de estos tres datos que se repita entre dos alumnas.' : 'Sin encuestas completas para calcular cruces.'}</p>}
      {perfil.base > 0 && <p className="mt-4 text-xs leading-5 text-[#746a64]">{perfil.conTresDatos} de {perfil.base} encuestas completas tienen los tres datos. Los porcentajes usan todas las completas de la selección como base.</p>}
    </section>
  </div>
}
