import { obtenerNivelAcceso } from './access'
import { puedeVerClasesPrivadas, type PerfilClases } from './class-access'

// La portada refleja el mismo acceso protegido que los videos. El Desafío no es el plan Socias.
export function accesoInicio(perfil: PerfilClases | null) {
  const tipo = perfil?.tipo_usuario
  const nivel = perfil?.rol !== 'admin' && (tipo === 'gratuito' || tipo === 'desafio' || tipo === 'socia') ? tipo : obtenerNivelAcceso(perfil?.rol, tipo)
  const formacion = perfil?.rol !== 'admin' && puedeVerClasesPrivadas(perfil)
  const sociaActiva = nivel === 'socia' && formacion
  const suspendido = Boolean(perfil && (perfil.estado === 'pausada' || perfil.estado === 'cancelada') &&
    (nivel !== 'gratuito' || perfil.desafio_socias_habilitada))
  return { nivel, formacion, sociaActiva, suspendido,
    gratuito: nivel === 'gratuito' && !formacion && !suspendido,
    etiqueta: sociaActiva ? 'Socias Digitales' : formacion || nivel === 'desafio' ? 'Desafío Socias' : nivel === 'socia' ? 'Socias Digitales' : 'Acceso gratuito',
  }
}
