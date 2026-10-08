import { notFound } from 'next/navigation'
import LanzamientoCliente from '@/app/lanzamiento/LanzamientoCliente'

export default function LanzamientoPreviewPage() {
  const previewHabilitada =
    process.env.NODE_ENV === 'development' ||
    process.env.ENABLE_PUBLIC_PREVIEW === 'true'

  if (!previewHabilitada) notFound()

  return (
    <LanzamientoCliente
      nombre="Flor"
      userId="preview-flor"
      modoDemo
      metricasGuardadas={{
        tipo_trafico: 'organico',
        inversion: 0,
        personas_grupo: 184,
        personas_seguimiento: 26,
        ventas_realizadas: 7,
        objetivo_septiembre: 2900,
      }}
    />
  )
}
