# Preparación de Socias Digitales para compradoras

Revisión del 22 de octubre de 2026 para el primer webinar orgánico del 28 de octubre. La prioridad es entregar acceso, formación y acompañamiento en la app existente. No incluye activar cobros sin condiciones comerciales aprobadas.

## Estado y prioridades

| Prioridad | Circuito | Estado y siguiente comprobación |
| --- | --- | --- |
| 1 | Registro, confirmación y encuesta | Implementados; falta repetir un alta nueva con un email de prueba propio, recibir el correo real, confirmar, completar encuesta y volver a iniciar sesión. La cuenta de prueba ya existente no demuestra este circuito. |
| 1 | Activación de Socias | Manual desde Acceso y actividad. Registrar una cuenta en `/registro/socias` no acredita una compra ni activa Socias automáticamente. El guardado debe confirmar la fila persistida; un fallo o conflicto conserva el formulario. |
| 1 | Clases y materiales | Biblioteca actual con Bienvenida y Desafío Socias, clases ordenadas, apoyo, video privado, materiales y progreso. Se observaron diez clases disponibles para la prueba el 22/10; la cantidad puede cambiar cuando Flor publique. |
| 1 | Estado de la cuenta | Las solicitudes nuevas de video, miniatura, materiales y progreso comprueban el estado activo antes de entregar contenido privado. La suspensión conserva los avances. Falta comprobar y alinear las políticas de base reales; una URL de video emitida antes no se revoca de inmediato. |
| 1 | Celular | Mantener 320, 360, 390 y 430 px CSS, controles táctiles y reproducción dentro de la pantalla. Registrar las vistas efectivamente comprobadas, no afirmar compatibilidad universal. |
| 2 | Cobro y acceso automáticos | No existe todavía integración de suscripciones de Mercado Pago en esta app. Requiere condiciones, cuenta vendedora autorizada, esquema real y pruebas. |
| 2 | Administración y conciliación | Flor puede cambiar tipo/estado y aprobar Desafío. Acceso y actividad todavía busca por nombre/país, no por email; hace falta integrar el email canónico de Auth para identificar compradoras sin ambigüedad. Equipo y Solicitudes ya tienen directorio de emails, pero no sustituyen una conciliación de pagos. |
| 3 | Comunidad, comentarios y seguimiento | Etapa posterior. Resultados, Métricas y Mi día ya tienen desarrollo, pero conservan permisos individuales; cambiar el tipo a Socia no activa todos los módulos ni completa los pendientes. |

## Correcciones de esta entrega

Inicio de una Socia activa distingue Socias del Desafío y ofrece una entrada directa a sus clases aunque no tenga el permiso del Desafío. Una cuenta pausada o cancelada recibe una explicación sin perder perfil, avisos o avances. No se infiere autorización desde metadata editable ni se agregan permisos privados por roles heredados ambiguos.

La biblioteca actual reemplaza la navegación de módulos heredados, conserva programas y contenidos y abre Bienvenida para quien no tiene progreso real. Si ya hay una clase en curso, Continuar tiene prioridad. Los fallos de catálogo o del panel de Flor muestran recuperación, no cifras cero ni bibliotecas vacías ficticias.

La ficha administrativa usa sesión y permisos existentes, valida los campos, comprueba que la ficha no cambió mientras estaba abierta y solo confirma éxito con una fila guardada concordante. Pausar no elimina progreso. El guardado no envía un email de compra ni acredita un pago. Estrategia mantiene por ahora el requisito de Desafío habilitado y permiso individual: su guardado heredado todavía depende de esa condición en las políticas conocidas. No habilitarlo a nuevas Socias sin alinear y probar el backend autorizado; las clases de Socias no tienen esa dependencia.

## Entrega manual provisional

Hasta terminar y probar Mercado Pago, la operación requiere una persona responsable:

1. Comprobar el cobro en la cuenta vendedora real, no en una captura ni en la vuelta del checkout.
2. Identificar el email exacto de la compradora y su cuenta de la app. Si paga con otro email, resolver la vinculación antes de activar; no crear cuentas duplicadas por nombre.
3. Abrir su ficha en Acceso y actividad, elegir Socia y Activa y guardar. Comprobar la lectura tras recargar. No usar aprobación del Desafío como sustituto de Socias.
4. Pedir que complete la confirmación y la encuesta obligatoria, entre en Inicio, abra Bienvenida y reproduzca una clase privada con sus materiales.
5. Habilitar solo los módulos efectivamente incluidos y desarrollados. El email de confirmación de cuenta y los avisos del Desafío no equivalen a una bienvenida comercial de Socias.
6. Mantener un registro privado de conciliación y soporte. No incorporar pagos, comprobantes, directorios o datos personales al repositorio público.

Este procedimiento no es una integración de pagos y necesita una prueba controlada completa antes de usarlo para una tanda de compradoras. Si no se puede identificar o confirmar una cuenta, no afirmar que quedó habilitada.

## Decisiones pendientes de los tres pagos

Definir importe y moneda de cada cobro, periodicidad, momento del primer cobro, inicio y duración del acceso, contenido incluido, qué ocurre después del tercer pago, tolerancia ante un rechazo, cancelaciones, reembolsos y contracargos. También confirmar la cuenta de Mercado Pago de Flor y el modo autorizado de integración, sin pedir contraseñas por chat.

Tres cobros recurrentes no son lo mismo que tres cuotas financiadas por una tarjeta. La API de planes de Mercado Pago admite una cantidad finita de repeticiones; se debe verificar el comportamiento concreto en pruebas antes de publicarlo. Referencia oficial: [Crear un plan de suscripción](https://www.mercadopago.com.ar/developers/es/reference/online-payments/subscriptions/create-preapproval-plan/post).

La integración deberá vincular la compra con una cuenta identificada, validar la firma de eventos, consultar el pago real en servidor, evitar duplicados y tolerar eventos fuera de orden. No activar por la URL de retorno ni por el mero estado autorizado de una suscripción. Las reglas de acceso ante cada situación deben corresponder a las condiciones aprobadas, no a una deducción del desarrollo. Referencia oficial: [Webhooks de suscripciones](https://www.mercadopago.com.ar/developers/es/docs/subscriptions/additional-content/your-integrations/notifications/webhooks).

## Comprobación obligatoria antes de vender

- Alta nueva en gratuito y Socias, correo recibido en casilla, confirmación, contraseña, encuesta y segundo login.
- Socia activa sin permiso Desafío: Inicio correcto, clase privada, material, minuto guardado al recargar, completar/desmarcar y volver al panel.
- Flor activa, pausa y reactiva esa misma cuenta de prueba; comprobar efecto real sin borrar respuestas ni avances.
- Gratuita, pendiente y pausada no obtienen nuevas URLs privadas por API ni por consultas directas permitidas por las políticas de base.
- Registro, Inicio, biblioteca, reproductor, materiales y ficha de Flor en celular; carga, error, vacío y texto largo.
- Cuando exista Mercado Pago: primer pago aprobado, pendiente/rechazado, repetición de eventos, segundo/tercer cobro, vencimiento, cancelación y recuperación según las condiciones definidas.

El conector de Supabase no autorizó el proyecto real de la app en esta revisión. No se aplicaron migraciones ni se intentó eludir esa restricción. Hasta recuperar ese acceso y comprobar el alta con correo nuevo, no certificar el circuito completo ni una revocación integral en base. Las pruebas automáticas simuladas no sustituyen estas comprobaciones.

## Validación de esta entrega

Pasaron 269 pruebas automáticas, incluidas integración SSR simulada de Inicio, estados de acceso, permisos de APIs, ficha administrativa, conflictos y errores de lectura. El build de producción local fue correcto. ESLint de los archivos afectados no encontró errores; conserva siete avisos de imágenes nativas existentes.

La portada se revisó en un entorno visual local aislado con CSS del build, datos ficticios no persistidos y servicios simplificados: Socia sin Desafío, pausada, gratuita y error, en 320/360/390/430 y 1280 px CSS, sin desborde horizontal; también nombre largo a 320 px. Esta comprobación es de diseño, no de registro, pagos ni reproducción. La ruta de QA no forma parte de la app y el script está fuera del repositorio.
