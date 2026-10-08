import { notFound } from 'next/navigation'
import UsuarioPreview from './UsuarioPreview'

export default function UsuarioPreviewPage() {
  const previewHabilitada =
    process.env.NODE_ENV === 'development' ||
    process.env.ENABLE_PUBLIC_PREVIEW === 'true'

  if (!previewHabilitada) notFound()

  return <UsuarioPreview />
}
