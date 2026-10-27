import Link from 'next/link'
import NavigationIcon from './NavigationIcon'
import { MODULOS_SOCIAS, type ModuloSociaId } from '@/lib/modules'

export default function ModuleLocked({ id }: { id: ModuloSociaId }) {
  const modulo = MODULOS_SOCIAS.find(item => item.id === id)!
  const disponible = id === 'resultados' || id === 'metricas' || id === 'checklist'
  const nombre = id === 'checklist' ? 'Mi día' : id === 'metricas' ? 'Métricas' : 'Resultados'
  return <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
    <Link href="/inicio" data-student-section-header="true" className="text-sm font-medium text-[#294A38]">← Mi espacio</Link>
    <section className="mt-7 rounded-[26px] border border-[#e7ddd5] bg-[#FAF7F3] p-7 sm:p-10">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F4CAD8] text-[#294A38]"><NavigationIcon name={modulo.icon} /></span>
      <h1 className="mt-5 text-4xl">{modulo.nombre}</h1>
      <p className="mt-2 text-sm text-[#746a64]">{modulo.descripcion}</p>
      <div className="mt-7 flex items-center gap-3 rounded-2xl border border-[#EC9BB6]/60 bg-[#F4CAD8]/30 p-4 text-sm text-[#294A38]"><NavigationIcon name="bloqueo" /><span>{id === 'logros' ? 'Mis logros está incluido para alumnas con el plan Socias activo.' : disponible ? `${nombre} requiere el plan Socias y la habilitación de Flor.` : 'Activá Socias Digitales para acceder a este módulo.'}</span></div>
      <p className="mt-3 text-xs text-[#746a64]">{id === 'logros' ? 'Consultá tu plan y estado con Flor. Los avances respetan la habilitación de cada módulo de origen.' : disponible ? `Si ya sos Socia, pedile a Flor que habilite tu acceso a ${nombre}.` : 'Todavía no está disponible. Te avisaremos desde la plataforma cuando se habilite.'}</p>
      <Link href="/inicio" className="mt-6 inline-flex rounded-full bg-[#294A38] px-5 py-3 text-sm font-semibold text-white">Volver al inicio</Link>
    </section>
  </main>
}
