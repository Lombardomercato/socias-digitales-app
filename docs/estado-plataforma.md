# Estado de Socias Digitales

Fecha de corte: **15 de octubre de 2026**. Documento de continuidad, no una certificación universal ni un anuncio comercial.

## 1. Versión y alcance

La app real está en https://app.sociasdigitales.com. Es un MVP operativo: registro, perfil obligatorio, clases, autorizaciones y comunicaciones, con módulos Socias ya desarrollados y otros pendientes de definición.

| Recurso | Identificación verificada |
| --- | --- |
| Repositorio correcto | `Lombardomercato/socias-digitales-app` (público en esta revisión) |
| Código de producción | `cc1e1e1438cdf280c87d2206f56a4c818c2074ef` |
| Rama de esa producción | `codex/progreso-clases-20261014` |
| Deployment Vercel | `dpl_5o5Y63u4kownqugCunUC7exPVFjN`, READY |
| Proyecto Vercel | `socias-digitales-flor-preview` / `prj_sSqoKpVKyh399hf0zgHH9dD7QIz7` |
| Dominio principal | `app.sociasdigitales.com` |
| Alias conservado | `flor.sociasdigitales.com` |
| Tecnología | Next.js 16.2.9, React 19.2.4, Node 24, Tailwind 4 |

La rama `codex/entrega-flor-20261015` parte del mismo contenido de aplicación y agrega las instrucciones de entrega. No se modificó `main` ni se publicó una nueva versión funcional durante la preparación documental. Validar nuevamente deployment/commit antes de futuros cambios.

## 2. Perfiles y accesos

| Perfil | Alta | Alcance |
| --- | --- | --- |
| Gratuito | `/registro`, sin aprobación para el acceso gratuito | Bienvenida, perfil y tres clases gratuitas; módulos de pago visibles pero restringidos |
| Desafío Socias | `/registro/desafio` | Solicitud que Flor habilita, rechaza o cambia; grabaciones privadas según permiso; Estrategia tiene autorización propia |
| Socias | `/registro/socias` | Alta vinculada a ese recorrido, sin compra ni desbloqueo automático; Flor asigna tipo, estado y permisos |
| Administración | Rol protegido | Panel de Flor, gestión de alumnas, solicitudes, contenido, avisos, equipo y análisis |

`rol` administrativo no es `tipo_usuario`. Se conserva compatibilidad con tipos heredados `afiliada` y `afiliada_lanzamiento`. Las APIs validan permisos: no basta ocultar una tarjeta. El administrador no debe navegar como alumna para suplir una cuenta de prueba real.

## 3. Funciones y etapa

| Función | Situación al corte |
| --- | --- |
| Registro, login, recuperación y cambio de contraseña | Circuitos implementados; autenticación Supabase. La recepción de cada correo depende del proveedor/casilla y debe comprobarse con destinatarios de prueba |
| Encuesta inicial | Paso a paso obligatorio; sin “completar después”; editable luego en Mi perfil; normalización de nombres |
| Aprobaciones | Flor puede habilitar, rechazar y modificar después; tipo de usuaria y permisos independientes |
| Inicio y navegación | Diseño editorial integrado, menú con iconos, experiencia mobile-first, avisos leídos/no leídos |
| Clases | Catálogo por programas, búsqueda, gratuitas/privadas, reproductor integrado y lectura privada de R2 |
| Progreso de clases | Minuto guardado, continuar, marcar/desmarcar completada, siguiente clase y seguimiento administrativo por programa |
| Gestión de contenido | Alta/edición, agrupación por programa, publicación/ocultación y subida multipart directa de videos desde el panel |
| Equipo administrativo | Invitación y promoción explícita de cuenta existente confirmada; no equivale a invitar a proveedores técnicos |
| Estrategia (`/lanzamiento`) | Etapas/tareas, objetivos y carga de métricas. Precio y comisión configurables por la alumna, no una comisión fija universal |
| Resultados | Desarrollado: ventas/comisiones y comprobantes privados, con revisión administrativa y autorización individual |
| Métricas | Desarrollado: inversión, grupo, reservas, ventas y gráficos; requiere Socia activa y habilitación |
| Mi día | Desarrollado: tareas/hábitos, vista diaria/semanal y resumen administrativo; requiere Socia activa y habilitación |
| Notificaciones internas | Borrador/publicación, audiencias, lectura, archivo y alerta visible; abrir el aviso elimina la condición no leída |
| Emails de novedades | Consentimiento, bajas y cola persistente por aviso/usuaria; hasta 20 en ejecución inicial, resto desde Procesar pendientes |
| Push web | Suscripción por dispositivo/navegador y permiso de la usuaria; no requiere app nativa, no está garantizada en todos los equipos |
| Encuesta: resultados | Panel con filtros, gráficos, CSV y perfil conjunto observado; excluye prueba/admin y no inventa intersecciones |
| Invitaciones | Apartado administrativo con links Gratuito, Desafío y Socias para copiar |
| Productos, Objetivos, Comunidad, Logros, Ranking | No entregados como módulos completos de alumna. Hay material heredado, tarjetas o páginas parciales; requiere alcance y auditoría antes de desbloquear |
| Compra de Socias | Destino comercial por definir; botón sin compra simulada ni cobro automático |

No se realizó hoy una auditoría integral de todas las páginas administrativas heredadas. “Desarrollado” no significa que todo escenario imaginable esté validado ni que una función de negocio pendiente esté resuelta.

## 4. Biblioteca actual

Verificada nuevamente el 15/10 en administración y catálogo de la cuenta de prueba real: **7 clases, 7 publicadas, 0 borradores y 3 gratuitas**.

| Programa | Clase | Acceso |
| --- | --- | --- |
| Introducción | Quién soy y cómo genero comisiones en USD | Gratuita |
| Introducción | Qué son los negocios digitales | Gratuita |
| Introducción | Cómo cobro las comisiones | Gratuita |
| Introducción | Productos digitales | Privada; archivo MOV heredado |
| Introducción | Hotmart desde cero | Privada |
| Introducción | Herramientas | Privada |
| Desafío Socias en vivo | Bienvenida | Privada, subida/publicada por Flor |

El borrador vacío precargado “Clase 1” fue eliminado a pedido el 14/10. No recrearlo. **Bienvenida** de Flor debe permanecer. Los números anteriores son un corte histórico: el panel debe calcular sus valores reales, nunca fijarlos en código.

Videos privados en bucket `sd-desafio-socias-videos`. Nuevas subidas: MP4 recomendado (H.264/AAC), máximo actual 8 GiB, partes de 16 MiB. No hay transcodificación ni streaming adaptativo: R2 almacena y entrega el archivo. El reintento conserva el proceso en la ventana abierta; no se promete continuar después de cerrarla. Comprobar uso/costo actual en Cloudflare antes de aumentar volumen; la medición de 3,75 GB del 14/10 precedía a la nueva Bienvenida.

## 5. Encuesta y datos

Preguntas vigentes definidas en `src/lib/perfil-preguntas.ts`: nombre, WhatsApp, nacimiento opcional, ocupación, título si corresponde, maternidad opcional, ingresos opcionales, país, provincia y foto opcional. La obligatoriedad del recorrido no convierte todos los datos personales en obligatorios: conservar elecciones explícitas de no informar donde correspondan.

El panel `/admin/encuesta` lee Supabase. El perfil predominante se construye con respuestas efectivamente observadas juntas; no sumar mayorías independientes como si pertenecieran a una misma persona. Mostrar tamaño de muestra y respuestas sin datos. La cuenta de prueba se excluye mediante `src/lib/test-accounts.ts`.

Existe un Sheet dedicado, referenciado en `src/lib/survey.ts`, como copia/exportación de trabajo. **No hay sincronización automática implementada**. El último corte documentado del Sheet fue el 13/10, no una validación de sus filas actuales. La fuente de verdad es Supabase y el CSV del panel. Tampoco hay editor visual de preguntas: sus cambios requieren código, compatibilidad y migración de respuestas cuando corresponda.

## 6. Comunicaciones y agenda

El banner oficial de emails está centralizado en `src/lib/email-brand.ts`. El remitente es la configuración `RESEND_FROM` del dominio verificado de Socias; no reemplazarlo por una dirección inventada.

Separar confirmación/recuperación de cuenta (servicio) de novedades (opt-in). En campañas, respetar consentimiento, baja y acceso vigente. La cola es persistente e idempotente, pero todavía faltan un worker recurrente consolidado y webhooks de entrega: “aceptado por Resend” no prueba recepción en casilla. Usar el historial y Procesar pendientes del aviso exacto, sin recrear campañas.

Agenda en `src/lib/agenda.ts` y `src/lib/clase-lanzamiento.ts`, aún sin editor administrativo. Último evento configurado: **13/10/2026, 20:05 Argentina**, enlace `https://www.youtube.com/live/ReuW2yhi0PY`. Al 15/10 ya pasó. No inventar una nueva fecha, mostrar un contador vencido ni anunciar una grabación como vivo. La automatización de ese evento quedó pausada: no reactivarla ni reenviar sus avisos.

## 7. Mapa de código

| Área | Referencia |
| --- | --- |
| Perfil/encuesta | `src/lib/perfil-preguntas.ts`, `src/lib/survey.ts`, `/admin/encuesta` |
| Exclusión de prueba | `src/lib/test-accounts.ts` |
| Clases | Buscar componentes `ClassroomCliente`, `ClassroomAdmin`, `ClassPlayer`, `ClassProgressAdmin`; rutas `/classroom`, `/admin/classroom` |
| Progreso | Tabla `progreso_clases` y RPC protegidas; no confundir con el modelo anterior `progreso_lecciones` |
| Resultados | `src/lib/results-server.ts` y sus verificaciones de autorización |
| Métricas | `src/lib/metrics-server.ts` |
| Mi día | `src/lib/my-day-server.ts` |
| Emails | `src/lib/email-brand.ts`, cola y rutas administrativas de notificaciones |
| Agenda | `src/lib/agenda.ts`, `src/lib/clase-lanzamiento.ts` |
| Diseño | `src/app/globals.css`, layout, `PlatformAppearance`, navegación e iconos existentes |

El admin no suma reproducción como alumna. El progreso por programa permite completar/desmarcar; cambiar el video inicia nueva revisión. Las visualizaciones del modelo histórico no se migraron automáticamente a `progreso_clases`.

## 8. Evidencia y límites de verificación

- 14/10: 166 pruebas y build de producción correctos; reproducción real de Introducción, reanudación a los 87 segundos, marcar/desmarcar y persistencia tras recargar; siguiente clase y recuperación ante pérdida de conexión.
- 14/10: biblioteca, reproductor y seguimiento administrativo revisados en 320/360/390/430 y escritorio; se corrigió el mensaje de error y contraste del reproductor. No hubo errores en el intervalo de logs revisado, no es monitoreo ilimitado.
- 15/10: producción/commit, administradores existentes y biblioteca actual nuevamente verificados por interfaz autenticada. Se tomaron referencias visuales actuales sin datos de alumnas.
- 15/10: volvieron a pasar las 166 pruebas existentes. La Bienvenida de Flor cargó metadatos sin error y quedó pausada; no se modificó su progreso durante esta revisión documental.
- La lectura SQL directa por el conector fue denegada el 15/10. No se eludió esa restricción ni se hizo una nueva auditoría completa de base o restauración de backups.
- Avisos de seguridad heredados documentados el 14/10: protección contra contraseñas filtradas sin habilitar; revisar funciones heredadas como `es_admin`/`generar_link_afiliada` y sus grants/propiedad antes de modificarlas. No revocar funciones a ciegas: pueden sostener RLS. Algunas tablas de historial/cola son de servidor, con RLS sin políticas de cliente deliberadamente.

## 9. Próximas prioridades

1. Recibir equipo Vercel de Flor e invitación técnica; preparar respaldo real, revisar costos/roles y transferir el proyecto conservando colaboración. No se ejecutó la transferencia en esta entrega.
2. Aceptación con Flor: nueva clase completa desde su equipo y nueva persona administradora elegida por ella, sin depender del desarrollador para operar.
3. Robustecer entregabilidad y procesamiento automático de cola, con métricas de error/entrega, sin omitir consentimiento.
4. Editor de agenda y definición comercial de Socias; sincronización del Sheet/editor de encuesta si se priorizan.
5. Auditar y desarrollar los módulos restantes, de a uno y conservando el sistema visual.
