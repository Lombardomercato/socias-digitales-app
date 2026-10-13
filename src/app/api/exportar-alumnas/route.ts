import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { FILTRO_CUENTAS_PRUEBA } from '@/lib/test-accounts'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  if (perfil?.rol !== 'admin') return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const { data: alumnas } = await supabase
    .from('perfiles')
    .select('nombre, pais, provincia, ocupacion, titulo_profesional, es_mama, ingresos_actuales, fecha_nacimiento, created_at')
    .neq('rol', 'admin')
    .not('id', 'in', FILTRO_CUENTAS_PRUEBA)
    .order('created_at', { ascending: false })

  if (!alumnas) return NextResponse.json({ error: 'Error al obtener datos' }, { status: 500 })

  const columnas = [
    'Nombre', 'País', 'Provincia', 'Ocupación', 'Título profesional',
    '¿Es mamá?', 'Ingresos actuales', 'Fecha de nacimiento', 'Fecha de registro'
  ]

  const filas = alumnas.map(a => [
    a.nombre ?? '',
    a.pais ?? '',
    a.provincia ?? '',
    a.ocupacion ?? '',
    a.titulo_profesional ?? '',
    a.es_mama === true ? 'Sí' : a.es_mama === false ? 'No' : '',
    a.ingresos_actuales ?? '',
    a.fecha_nacimiento ?? '',
    a.created_at ? new Date(a.created_at).toLocaleDateString('es-AR') : '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))

  const csv = [columnas.join(','), ...filas].join('\n')
  const fecha = new Date().toISOString().slice(0, 10)

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="alumnas-socias-digitales-${fecha}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
