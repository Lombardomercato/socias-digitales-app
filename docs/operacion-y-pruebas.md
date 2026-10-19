# Operación y pruebas de aceptación

Fecha: 15/10/2026. Complementa el inventario de `estado-plataforma.md`. No incluye credenciales ni autoriza envíos o cambios sobre usuarias reales.

## Operación de Flor

### Accesos de alumnas

1. Copiar el enlace correspondiente desde Invitaciones: Gratuito, Desafío o Socias.
2. Revisar Solicitudes para Desafío; habilitar/rechazar según corresponda. Se puede cambiar la decisión después.
3. En Usuarias / Acceso y actividad, revisar tipo, estado y permisos de la ficha. Gratis, Desafío y Socias no son roles administrativos.
4. Estrategia y los módulos Socias tienen autorizaciones propias. No promover a admin a una alumna para resolver un bloqueo.

### Subir y organizar una clase

Organización: **Programa → Sección → Clase**. Bienvenida es independiente del Desafío; su contenido se presenta directamente. Desafío Socias contiene **Clases** y **Material de apoyo**, con orden por sección. Los programas son plegables, sin portadas; las miniaturas corresponden a los videos. Elegir programa y sección en el editor o usar “Agregar a material de apoyo”. Mover una clase conserva su ID, archivo, publicación, acceso y progreso.

Compatibilidad sin cambiar esquema: el campo existente `clases.modulo` conserva el programa para Clases y serializa el apoyo como `Programa › Material de apoyo`. Usar `ubicacionClase`/`clasificacionClase`, no dividir o comparar el campo a mano. Los nombres anteriores Introducción y Desafío Socias en vivo se muestran como Bienvenida y Desafío Socias sin duplicar datos. La siguiente clase y los filtros respetan programa/sección; el seguimiento agrupa por programa. Límite de nombres nuevos: 75 caracteres, sin `›`.

Miniaturas automáticas de MP4 privados: captura local de un fotograma al elegir el archivo, JPEG de hasta 20 KB, guardado en R2 privado bajo `miniaturas/<clase>/<revisión>.jpg`. Para videos anteriores, la administración genera pendientes automáticamente al mostrar cada tarjeta, de a uno; no requiere diseñar o subir una portada. Las alumnas solo leen la imagen ya generada y autorizada, sin descargar el video para obtenerla. La revisión depende del archivo: reemplazar un video no reutiliza la miniatura anterior. GET/POST verifican usuario y acceso/rol; nunca hacer público el bucket. Si un codec/navegador impide la captura, se conserva un marcador neutro y el video sigue disponible. No se garantiza captura de enlaces externos de Vimeo ni transcodificación automática. Respaldar también `miniaturas/` al transferir.

1. Entrar en `/admin/classroom`; elegir o crear el programa y completar la ficha. El editor muestra **Ficha → Video → Publicar**. Sin video, **Guardar borrador y continuar al video** conserva la clase oculta y abre el selector de archivo dentro del mismo editor; la opción de publicación permanece deshabilitada.
2. Cargar el archivo desde ese panel. Preferir MP4 H.264/AAC. Esperar la finalización de la subida y del guardado antes de cerrar la ventana.
3. Si se interrumpe, usar los controles de reintento de esa carga, sin crear clases duplicadas. No se garantiza continuar después de cerrar la ventana.
4. Comprobar video, título, programa, orden y modalidad gratuita/privada. Activar **Publicar en la biblioteca al guardar** y presionar **Guardar y publicar clase**. Subir un video a un borrador no lo publica automáticamente. Un enlace de Vimeo válido también habilita la publicación; texto o enlaces incompletos no. Las clases ya publicadas conservan su estado al guardar cambios.
5. Revisar como alumna real autorizada, no solo como admin. Comprobar también que una cuenta sin acceso no recibe el video privado.
6. Seguimiento muestra progreso por programa. Completada es una marca de la alumna, no una certificación de reproducción íntegra.

No recrear “Clase 1” vacío: Flor publicó **Bienvenida** en Desafío Socias en vivo. No eliminar archivos del bucket para ocultar una tarjeta: ocultar y borrar son operaciones diferentes.

### Materiales de cada clase

En el editor de una clase guardada, debajo de Video, aparece **Materiales de la clase**. Elegir el tipo **Archivo** o **Enlace**, escribir un nombre para las alumnas y usar **Adjuntar archivo** o **Guardar enlace**. “Dirección del enlace” es el destino del suplemento, no el video de Vimeo. Esta acción se guarda por separado de la ficha; si la clase ya está publicada, el material queda disponible con el acceso actual de esa clase. En una clase nueva primero se guarda el borrador, sin necesidad de salir del editor. La sección de programa **Material de apoyo** sigue agrupando videos; los materiales adjuntos pertenecen a un video concreto.

Con dos o más materiales activos aparecen flechas para moverlos arriba/abajo. Cada movimiento se guarda al instante, respeta la revisión de otra administradora y se refleja en el orden de la alumna; no modifica documentos, enlaces ni historial retirado. Los extremos quedan deshabilitados. Los cambios de nombre/destino y los materiales nuevos se guardan con su propio botón. Cerrar el editor o cambiar de tipo con datos pendientes pide confirmación; recargar/cerrar la pestaña solicita la advertencia nativa si el navegador la admite. No hay autoguardado ni recuperación de un archivo tras cerrar la pestaña. El formulario se conserva ante errores de guardado; un bloqueo inmediato evita doble envío simultáneo, sin prometer idempotencia de enlaces ante respuestas de red perdidas.

Se admiten PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG/JPEG y WebP, hasta 25 MiB por archivo y 30 materiales activos por clase. Los enlaces requieren HTTPS; los permisos externos de Drive/Docs no se cambian desde la app. **Editar** modifica nombre y, para enlaces, destino. **Retirar** deja de mostrar el material sin borrar el archivo; **Materiales retirados → Restaurar** revierte esa acción. El historial tiene un límite de 100 entradas por clase. Usar material de confianza: la validación de formato no es un antivirus.

Las alumnas encuentran los adjuntos debajo del reproductor. La lista, el enlace y cada descarga verifican sesión y el mismo permiso que el video. Los archivos se descargan, no se ejecutan como páginas de la plataforma. Un error de materiales muestra su propio reintento sin impedir la reproducción. No se envían emails o push al agregar un material.

Persistencia privada en el bucket R2 existente: `materiales-clases/<clase>/indice-v1.json` y `archivos/<material>.<ext>`, con escrituras condicionales para no pisar otra edición. Los archivos pasan primero por `temporales/`, con URL de carga breve y ticket firmado ligado a administradora/clase. Al confirmar se valida tamaño y firma de formato y se crea otro objeto inmutable: reutilizar la URL temporal no cambia el material publicado. El reintento de confirmación no duplica ni restaura materiales retirados. Las cargas interrumpidas pueden dejar temporales; no existe limpieza automática en esta versión. Respaldar índices y archivos al transferir. No se agrega una tabla ni se cambian Auth/RLS, permisos de clases, videos o progreso.

### Administradoras

Usar `/admin/equipo` para invitar a una persona o promover explícitamente una cuenta existente y confirmada. Confirmar la dirección antes de enviar. Una invitación administrativa concede poder sobre la app y sus alumnas: no es un alta Socias ni una invitación a Vercel/GitHub. La responsable debe probar aceptación/login con la nueva persona; no se envió una invitación real nueva durante esta entrega documental.

### Avisos y emails

En `/admin/notificaciones`: elegir audiencia, redactar, revisar y guardar borrador. Publicar solo con autorización para ese mensaje y público. La publicación crea el aviso interno y procesa la cola de email solicitada bajo consentimiento; revisar el historial y continuar con Procesar pendientes del mismo aviso. No recrearlo para forzar un reenvío. Push requiere dispositivos suscriptos y permiso del navegador.

No afirmar recepción porque el estado diga aceptado. Ante un error, conservar el registro y comunicar el alcance real: publicado internamente, enviado al proveedor, pendiente o fallido. No reenviar los comunicados del evento pasado.

### Encuesta

Resultados en `/admin/encuesta`: filtros, gráficos y CSV. No contar cuenta de prueba ni admins. El Sheet es una copia de trabajo; su enlace no demuestra actualización automática. Cambiar preguntas hoy requiere desarrollo y compatibilidad con respuestas ya guardadas.

### Próximo hito (incorporación del 15/10)

En `/admin/agenda`, Flor puede reemplazar el próximo encuentro: título, fecha, hora Argentina, enlace HTTPS opcional y audiencia Desafío/Socias. **Publicar encuentro** actualiza el banner y el contador de las alumnas habilitadas, con refresco de hasta un minuto mientras la pestaña esté visible. **Guardar oculto** guarda el formulario pero retira ese encuentro de las alumnas; no es un segundo borrador paralelo al encuentro publicado. **Recargar última versión** descarta cambios locales con confirmación. Si otra administradora guardó primero, el conflicto no pisa sus cambios.

Publicar un hito NO envía comunicaciones. Usar Notificaciones por separado, revisar el público y consentimiento y no recrear avisos ya enviados. Si no hay enlace, “Entrar a la clase” se muestra deshabilitado; nunca reciclar un vivo anterior. Al día siguiente de un encuentro sin otro próximo, no queda un contador vencido.

Persistencia: objeto **privado** `plataforma/agenda-v1.json` en el bucket R2 existente, independiente de los videos. Lectura/escritura solo en servidor; validación de sesión, rol administrativo, origen, tamaño y campos; control de concurrencia ETag con `If-Match`/`If-None-Match`. No usar la tabla pública `configuracion` para enlaces privados. No requiere migración SQL ni nuevas credenciales. Respaldar ese objeto junto con el contenido operativo durante la transferencia; copiar solo el código no copia la agenda editada. El estado inicial autorizado, solo si el objeto no existe (404), es Clase 2 del 15/10/2026 a las 19:30, sin enlace.

Detalle de revisión: la lectura de agenda solicita `Accept-Encoding: identity` para conservar el ETag fuerte. Si aún llega `W/`, obtiene el validador fuerte por HEAD y verifica que corresponda al mismo objeto/cuerpo; de lo contrario falla sin sobrescribir. No enviar un ETag débil a If-Match ni quitar W/ a ciegas. Mantener las pruebas de conflictos y rechazo de comodines/listas/inyección.

### Cuenta de prueba

En `/admin/equipo`, “Cuenta de alumna de prueba” permite habilitar los módulos ya desarrollados para el identificador fijo definido en `test-accounts.ts`: clases del Desafío, Estrategia, Resultados, Métricas y Mi día. No permite elegir otra cuenta ni promover administradoras. Conserva respuestas, progreso y rol; asigna Socia activa y permisos individuales. Los módulos aún no desarrollados permanecen restringidos. La cuenta sigue excluida de estadísticas; las comunicaciones conservan sus reglas de audiencia y consentimiento, sin cambiar preferencias de email/push para habilitar módulos. Si falla un paso, se informa acceso parcial y se puede reintentar de forma idempotente, sin borrar datos.

Para probar ambos roles a la vez en Chrome, mantener la administración en `app.sociasdigitales.com` y abrir la alumna de prueba en el alias estable del mismo proyecto `socias-digitales-flor-preview-alex-santillan-projects.vercel.app`. Son dos sesiones por origen sobre la misma aplicación y base, no un preview ficticio. No compartir cookies ni tokens entre las dos. Los enlaces de alumnas, emails y recuperación siguen usando el dominio final; este alias es solo para la verificación interna. No usar las URLs inmutables de cada deployment como acceso habitual: exigirían volver a entrar en cada publicación.

## Preparación técnica de una modificación

Verificar deployment/commit, rama y remotos antes de editar. El repositorio correcto está en `Lombardomercato/socias-digitales-app`; no publicar sobre el origen heredado por error. Trabajar con configuración de prueba segura. Nunca copiar service role a cliente o consola de navegador.

```sh
npm ci
node --test tests/*.test.cjs
npm run build
git diff --check
```

Revisar además los archivos afectados con la configuración ESLint existente. No agregar un nuevo sistema de formato/lint para esta tarea. Leer la documentación de Next instalada antes de modificar APIs de Next 16. Si una prueba falla, determinar si es una regresión o una limitación previa y reportarlo: no eliminarla para obtener verde.

## Matriz mínima según cambio

| Circuito | Qué verificar |
| --- | --- |
| Alta gratuita | Registro real, correo de servicio, confirmación, login, encuesta obligatoria, acceso gratuito y sin privilegios de pago |
| Alta Desafío | Pendiente sin video privado; Flor aprueba/rechaza/cambia; acceso efectivo luego de aprobación; email correcto sin duplicación |
| Alta Socias | No confirma compra automáticamente; permisos respetados por API y UI |
| Perfil/contraseña | Solo edición propia, persistencia, recuperación/cambio sin romper sesión o redirecciones |
| Encuesta | Validación, avance ágil, guardado final, recarga, edición posterior, respuestas opcionales preservadas y exclusión de prueba |
| Clases | Gratuita/privada, búsqueda/programa, reproducción, minuto guardado tras recargar, completar/desmarcar, siguiente clase, video reemplazado |
| Subida admin | Guardado y multipart, reintento, finalización, límites y publicación sin duplicados; sesión sin permisos rechazada |
| Socias | Resultados/Métricas/Mi día: estado activo y permiso propio; denegar lectura/escritura ajena o sin acceso |
| Avisos | Audiencia correcta, borrador no visible, publicación única, badge no leído y limpieza tras lectura |
| Email/push | Opt-in, bajas, cola idempotente, pendientes, errores; permiso/dispositivo para push. No lanzar campañas reales como prueba |
| Equipo | Administradora invitada/confirmada y acceso correcto; una alumna no puede autopromoverse |
| Diseño | 320/360/390/430 px y escritorio; texto largo, vacío, carga/error, teclado, foco y contraste |

Usar la cuenta de prueba autorizada comunicada en el documento privado, no crear alumnas ficticias en producción ni exportar datos reales a fixtures. La exclusión está centralizada en `src/lib/test-accounts.ts`; no cambiar roles o desactivar RLS para pasar una prueba.

## Puerta de salida antes de publicar

- Diff acotado a la solicitud; sin secretos, archivos ` 2`, dumps ni lockfiles accidentales.
- Pruebas existentes y build correctos; registrar comandos, fecha y límites de la revisión.
- Capturas antes/después de las vistas afectadas con igual viewport y contenido comparable; revisar una pantalla vecina que use el mismo estilo.
- Migraciones revisadas contra el estado real, con respaldo/restauración y reversión acordados si hay datos en juego. No aplicar indiscriminadamente toda la historia heredada.
- Preview revisada y autorización de la responsable para producción. Registrar commit y deployment anterior recuperable.
- Tras publicar: login/roles, navegación, API, lectura privada de video, preferencias y aviso no leído. No una comprobación exclusiva de la portada.

## Rollback

Una regresión solo de código permite recuperar el deployment previo verificado. Eso no restaura datos, permisos, correos enviados ni archivos eliminados. Las migraciones y cambios de contenido requieren su reversión específica y un respaldo comprobado. No usar un reset global de base como supuesto rollback.

Ante un incidente: detener la acción que duplica o modifica datos; conservar logs sin secretos; comunicar qué está afectado y restaurar el alcance mínimo. No reenviar un email o borrar contenido por segunda vez para “probar”.
