import { notFound } from 'next/navigation'
import AdminPreview from './AdminPreview'

export default function AdminPreviewPage() {
  const previewHabilitada =
    process.env.NODE_ENV === 'development' ||
    process.env.ENABLE_PUBLIC_PREVIEW === 'true'

  if (!previewHabilitada) notFound()

  return <AdminPreview />
}
