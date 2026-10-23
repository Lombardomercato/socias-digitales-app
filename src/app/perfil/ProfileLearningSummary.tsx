import 'server-only'

import Link from 'next/link'
import { puedeVerClasesPrivadas } from '@/lib/class-access'
import { leerCampusAprendizaje } from '@/lib/learning-campus-server'
import type { ResumenCampus } from '@/lib/learning-campus'

type Props = {
  supabase: Parameters<typeof leerCampusAprendizaje>[0]
  usuariaId: string
  perfil: Parameters<typeof leerCampusAprendizaje>[2]
}

const surface = 'min-w-0 rounded-2xl border border-[#E7DDD5] bg-white p-5 sm:p-6'

export function ProfileLearningSummaryLoading() {
  return (
    <section className={surface} aria-label="Tu avance en las clases">
      <h2 className="text-base font-semibold text-[#171413]">Tu avance en las clases</h2>
      <p role="status" className="mt-2 text-sm leading-6 text-[#655B56]">Reuniendo tu avance guardado…</p>
    </section>
  )
}

export function ProfileLearningSummaryView({ resumen }: { resumen: ResumenCampus | null }) {
  const fallo = !resumen || resumen.estado === 'error'
  const proxima = !fallo ? resumen.proxima : null
  const link = proxima ? `/classroom?clase=${encodeURIComponent(proxima.id)}` : '/classroom'

  return (
    <section className={surface} aria-labelledby="perfil-avance-titulo">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#294A38]">Mi formación</p>
      <h2 id="perfil-avance-titulo" className="mt-2 text-lg font-semibold text-[#171413]">Tu avance en las clases</h2>
      <p className="mt-2 text-sm leading-6 text-[#655B56]">Las clases que marcaste como completadas y las que empezaste, igual que en tu biblioteca.</p>

      <dl className="mt-5 grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
        {[
          { nombre: 'Completadas', valor: resumen?.completadas },
          { nombre: 'En curso', valor: resumen?.enCurso },
          { nombre: 'Disponibles', valor: resumen?.total },
        ].map(({ nombre, valor }) => (
          <div key={nombre} className="min-w-0 rounded-xl border border-[#E7DDD5] bg-[#FAF7F3] px-2 py-3 text-center sm:px-3">
            <dt className="break-words text-xs leading-5 text-[#655B56]">{nombre}</dt>
            <dd className="mt-1 font-impact text-2xl font-semibold text-[#294A38]">
              {valor ?? <span aria-label="Sin datos disponibles">—</span>}
            </dd>
          </div>
        ))}
      </dl>

      {fallo ? (
        <div role="alert" className="mt-4 rounded-xl border border-[#E7DDD5] bg-[#FAF7F3] p-3 text-sm leading-6 text-[#655B56]">
          <p>No pudimos cargar todo tu avance. Tus datos guardados no se modificaron.</p>
          <Link href="/perfil" className="mt-1 inline-flex min-h-11 items-center font-semibold text-[#294A38] underline underline-offset-4">Reintentar</Link>
        </div>
      ) : resumen.total === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[#655B56]">Todavía no hay clases disponibles con tu acceso actual.</p>
      ) : (
        <p className="mt-4 text-xs leading-5 text-[#655B56]">Solo cuentan las clases disponibles con tu acceso actual; el material bloqueado no se cuenta como completado.</p>
      )}

      {proxima && (
        <p className="mt-4 min-w-0 break-words text-sm leading-6 text-[#171413]">
          <span className="font-semibold">{proxima.motivo === 'continuar' ? 'Para retomar: ' : 'Para seguir: '}</span>{proxima.titulo}
        </p>
      )}
      <Link href={link} className="mt-4 inline-flex min-h-11 max-w-full items-center justify-center rounded-full bg-[#294A38] px-5 py-2.5 text-center text-sm font-semibold text-white">
        {proxima ? (proxima.motivo === 'continuar' ? 'Retomar mi formación' : 'Seguir mi formación') : 'Ver mis clases'}
      </Link>
    </section>
  )
}

export default async function ProfileLearningSummary({ supabase, usuariaId, perfil }: Props) {
  if (!usuariaId || perfil?.rol === 'admin' || !puedeVerClasesPrivadas(perfil)) return null

  let resumen: ResumenCampus | null = null
  try {
    resumen = await leerCampusAprendizaje(supabase, usuariaId, perfil)
  } catch {
    console.error('profile_learning_read_failed')
  }
  return <ProfileLearningSummaryView resumen={resumen} />
}
