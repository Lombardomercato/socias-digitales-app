# Estado de Socias Digitales

Fecha de corte: **15 de octubre de 2026**. Documento de continuidad, no una certificación universal ni un anuncio comercial.

**Programas, secciones y miniaturas — 16/10/2026:** producción `e4f17775e01f914402223b36d24c2edb1e5ed6ca`, rama `codex/programas-secciones-20261016`, deployment `dpl_CojWiEYYsWpPwm6faFqdian674Gn`, READY y con el dominio final. Tus clases y administración presentan programas plegables sin portadas. Bienvenida es independiente; Desafío Socias tiene Clases y Material de apoyo. El editor permite elegir la sección y su orden. La clase nueva **Abri tu cuenta en hotmart** se movió desde Clases a Material de apoyo mediante la interfaz administrativa, se guardó como primera de esa sección y se verificó de nuevo tras recargar; no se movió la anterior Hotmart desde cero. Se conservaron ID, video, publicación y acceso privado. La biblioteca real sigue con 8 clases publicadas, 3 gratuitas; no se crearon clases ficticias.

Se generaron automáticamente y verificaron las 8 miniaturas reales de los videos existentes. Las nuevas cargas capturan un fotograma del archivo; las alumnas solo leen la imagen privada y no generan miniaturas. Las miniaturas usan `miniaturas/<id>/<revisión>.jpg` en R2 y respetan sesión/permisos; no hay portadas en los programas. SQL fue denegado nuevamente por el conector: no se intentó eludirlo ni cambiar esquema/RLS. La jerarquía se serializa de forma compatible en el campo de clasificación existente; ver operación. Pasaron 197 pruebas, build y ESLint (sin errores; avisos de img nativo). Vistas local y publicada revisadas en 320/360/390/430 y 1280 px CSS, sin desbordes. Se verificó como alumna real la nueva ubicación, miniatura y disponibilidad del video Hotmart (179,87 s, listo y pausado, sin modificar progreso); el avance previo de la prueba sigue presente. Sin errores/fatal en el intervalo de logs revisado del deployment. La ruta de QA local fue eliminada antes del build. No hubo emails/push ni cambios de usuarias.

**Corrección del editor de clases — 16/10/2026:** producción `a895362afa9550293205049da09e89990c5d4000`, rama `codex/clases-carga-clara-20261016`, deployment `dpl_7ntL2d73fJ1HEYU7gDLMnZKGabT1`, READY y con el dominio final. Se separan Ficha → Video → Publicar: sin video se guarda un borrador, se lleva el foco al selector después del primer guardado y la publicación queda deshabilitada hasta tener archivo cargado o Vimeo válido. Las clases existentes conservan publicación/acceso y la API sigue rechazando publicar sin video; no se tocaron permisos, esquema, archivos ni contenido real. Pasaron 188 pruebas, build y ESLint de archivos afectados. Se verificaron nueva ficha y estado de Bienvenida en producción, y anchos CSS reales de 320/360/390/430 y 1280 px sin desbordes. El selector de un borrador se comprobó con fixture local aislado, eliminado antes del build; guardado/errores y finalización protegida se cubren con pruebas automatizadas. No se creó una clase ficticia ni se subió un video de prueba a producción durante esta corrección.

**Actualización funcional posterior a la entrega documental:** `85f405fd0cfcdb5ffc95f200f2d5b67242cf3067`, rama `codex/agenda-hitos-20261015`, deployment `dpl_39KgoGE7ifZsXQqMKnQKjRpxFomv`, READY y asignado a `app.sociasdigitales.com`. Incorpora el editor Próximo hito y el control acotado de módulos de la cuenta de prueba en Equipo. Pasaron 178 pruebas y build. Se verificó el contador real de Clase 2 (15/10, 19:30 Argentina) en 320/360/390/430 y 1280 px, sin desbordes. APIs anónimas rechazadas (401); sin errores en el intervalo revisado de logs del nuevo deployment. Pendiente al registrar esta nota: comprobar el guardado administrativo en R2 y ejecutar la habilitación de la alumna de prueba desde una sesión admin en esta versión. No confundir código publicado con permisos ya modificados.

El aviso de Clase 2 fue publicado el 15/10 a las 18:20 Argentina desde la interfaz, una sola vez: 12 emails aceptados por el proveedor, 0 pendientes y 11 dispositivos notificados. No acredita recepción en casilla ni que todos los dispositivos hayan mostrado el aviso; no recrear la campaña. El enlace nuevo de la clase no fue suministrado y el botón sigue deshabilitado.

**Cierre de comprobación del 15/10, posterior a la nota anterior:** se habilitó efectivamente la cuenta real de prueba desde Equipo (Socia activa, Desafío y permisos individuales de Estrategia, Resultados, Métricas y Mi día), conservando rol no administrativo, datos, respuestas y progreso. Se ingresó como alumna y se comprobaron las cinco rutas, incluidas las 7 clases; los módulos no desarrollados permanecen bloqueados. La prueba sigue excluida de estadísticas. Se verificaron también creación, actualización y recarga del próximo hito desde administración. Se corrigió el formato/compresión del ETag: lectura sin compresión y, de ser necesario, HEAD del mismo objeto para obtener un validador fuerte antes de If-Match. No se elimina el control de concurrencia ni se deriva una versión inventada del contenido. Esta corrección está en `d85189f81b84c4b64f5d2e229c1929e5907d5998`, deployment `dpl_H8Qfn71oNt5m7GHB7UNpYkDeNJrm`, READY en el dominio final. Pasaron 180 pruebas y build; editor revisado con texto largo en 320/360/390/430 y 1280 px CSS reales. La fecha sigue siendo 15/10/2026 a las 19:30 Argentina, sin reenviar comunicaciones al guardar la agenda.

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

El corte documental inicial tenía agenda fija del 13/10 en código. La incorporación funcional del 15/10 agrega `/admin/agenda`: edición por Flor de título, fecha, hora Argentina, enlace y audiencia; persistencia privada en R2 con control de concurrencia. Ver operación y límites en `operacion-y-pruebas.md`. Estado inicial autorizado: **Clase 2 · Elegí nicho y producto ganador, 15/10/2026 a las 19:30 Argentina**, sin enlace confirmado. No reutilizar automáticamente el YouTube del 13/10. Publicar un hito no envía email/push por sí solo. La automatización del evento del 13/10 quedó pausada: no reactivarla ni reenviar sus avisos.

La misma incorporación agrega un control administrativo acotado a la cuenta de prueba real en Equipo para activar los módulos desarrollados sin convertirla en admin ni incluirla en estadísticas. La documentación de versiones de la sección 1 corresponde al corte previo: verificar el deployment funcional que publique esta incorporación antes de usarlo como fuente actual.

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
