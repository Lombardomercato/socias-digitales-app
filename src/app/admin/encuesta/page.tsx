import { redirect } from 'next/navigation'
import { permisoEncuesta, leerEncuesta } from '@/lib/survey-server'
import { construirEncuesta, fechaEncuestaArgentina, type SurveyRow } from '@/lib/survey'
import EncuestaAdmin from './EncuestaAdmin'

export const dynamic = 'force-dynamic'
export default async function EncuestaPage() {
  const { supabase, status } = await permisoEncuesta()
  if (status === 401) redirect('/login?next=%2Fadmin%2Fencuesta')
  if (status === 403) redirect('/inicio')
  const actualizado = new Date().toISOString()
  if (status !== 200) return <EncuestaAdmin rows={[]} actualizado={actualizado} errorCarga />
  let rows: SurveyRow[] = [], errorCarga = false
  try {
    const { perfiles, bienvenida } = await leerEncuesta(supabase)
    rows = construirEncuesta(perfiles, bienvenida, fechaEncuestaArgentina(actualizado))
  } catch {
    errorCarga = true
  }
  return <EncuestaAdmin rows={rows} actualizado={actualizado} errorCarga={errorCarga} />
}
