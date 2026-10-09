export const TIPOS_ACCESO = [
  { id: 'gratuito', etiqueta: 'Gratuitas' },
  { id: 'desafio', etiqueta: 'Desafío Socias' },
  { id: 'socia', etiqueta: 'Socias' },
] as const

export type TipoAcceso = typeof TIPOS_ACCESO[number]['id']
type Usuaria = { tipo_usuario?: string | null; rol?: string | null; estado?: string | null; nombre?: string | null; pais?: string | null }

export function tipoAcceso(usuaria: Usuaria): TipoAcceso {
  if (usuaria.tipo_usuario === 'desafio' || usuaria.tipo_usuario === 'socia' || usuaria.tipo_usuario === 'gratuito') return usuaria.tipo_usuario
  return ['afiliada', 'afiliada_lanzamiento'].includes(usuaria.rol ?? '') ? 'socia' : 'gratuito'
}

export function contarTipos(usuarias: readonly Usuaria[]): Record<TipoAcceso, number> {
  const cantidades = { gratuito: 0, desafio: 0, socia: 0 }
  for (const usuaria of usuarias) if (usuaria.rol !== 'admin') cantidades[tipoAcceso(usuaria)]++
  return cantidades
}

export function filtrarUsuarias<T extends Usuaria>(usuarias: readonly T[], filtros: { busqueda: string; estado: string; tipo: TipoAcceso | 'todas' }): T[] {
  const consulta = filtros.busqueda.trim().toLocaleLowerCase('es-AR')
  return usuarias.filter(usuaria => usuaria.rol !== 'admin'
    && (filtros.estado === 'todas' || usuaria.estado === filtros.estado)
    && (filtros.tipo === 'todas' || tipoAcceso(usuaria) === filtros.tipo)
    && (!consulta || [usuaria.nombre, usuaria.pais].some(valor => valor?.toLocaleLowerCase('es-AR').includes(consulta))))
}
