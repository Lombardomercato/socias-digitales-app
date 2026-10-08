import LanzamientoCliente from '@/app/lanzamiento/LanzamientoCliente'

export default function LanzamientoPreviewPage() {
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
