# Entrega y transferencia — Socias Digitales

Actualizado: 08/10/2026 (Argentina). Preparación, NO transferencia ejecutada.

## 1. Qué se entrega

El producto real en https://app.sociasdigitales.com, su código, historial de migraciones y documentación. La preview antigua no debe reconstruirse como otra app: Flor trabajará sobre este mismo repositorio con Claude Code y entregará ramas/PRs.

Este documento no contiene credenciales. La transferencia legal de derechos, contratos con proveedores, derechos de materiales y tratamiento de datos personales debe acordarse entre las partes; transferir proyectos técnicos no sustituye esos acuerdos.

## 2. Inventario técnico

| Recurso | Identificación actual | Tratamiento recomendado |
| --- | --- | --- |
| GitHub | Lombardomercato/socias-digitales-app — repo 1411000015 | Dar acceso colaborador primero; transferir a usuario/organización receptora después |
| Vercel | socias-digitales-flor-preview — prj_sSqoKpVKyh399hf0zgHH9dD7QIz7 | Transferir proyecto al equipo receptor; no toda la cuenta |
| Equipo Vercel actual | team_MtCKfyDkoBd20Qtc5HdJrTEw | Mantener acceso técnico acordado tras entrega |
| Dominio final | app.sociasdigitales.com | Preservar URL, DNS, SSL y redirects Auth |
| Alias actual | flor.sociasdigitales.com | Decidir si se conserva; no retirar sin revisar dependencias |
| Supabase de la app | yfsyotuykanbugxwxefv | Preferir transferencia del proyecto sin migrar usuarios a otra base |
| Base de marketing | kxwqevrmiznycmtgmxiz | FUERA de esta entrega; no mover ni mezclar |
| Videos | Cloudflare R2, bucket sd-desafio-socias-videos | Acceso/credencial limitada al bucket; resolver titularidad compartida |
| Emails | Resend, remitente verificado del dominio Socias Digitales | Acceso del equipo o credencial específica; preservar dominio y banner |
| DNS | Zona sociasdigitales.com en Cloudflare | Gestionar subdominio sin transferir servicios ajenos |
| Branding | Manual y recursos oficiales en public/ | Preservar assets, fuentes y favicon |

Última producción anterior a esta entrega: deployment dpl_9MBS6mQsjkTjWhaztNkqVdu9L9aA, commit 8e7703795cf16eac6d151c14bb3cdee06bd5134e. El deployment de esta entrega debe identificarse en Vercel por su commit; no usar este checkpoint anterior como si ya incluyera el consentimiento.

## 3. Cuentas receptoras pendientes

- Usuario/organización GitHub de Flor.
- Equipo Vercel receptor y responsable de facturación.
- Organización Supabase receptora y responsable de facturación.
- Responsable de Cloudflare/Resend si los servicios se separan.
- Responsable y contacto de privacidad; términos, aviso de privacidad y alcance de comunicaciones comerciales.

No se han enviado invitaciones, cambiado propietarios, trasladado dominios ni exportado datos personales para esta preparación.

## 4. Acceso para Flor desde Claude

1. Conceder acceso al repositorio correcto, limitado al proyecto. No compartir cuentas personales ni contraseñas.
2. Conectar GitHub a Claude Code con los permisos adecuados para ese repositorio.
3. Leer CLAUDE.md y AGENTS.md; trabajar en ramas y abrir PRs.
4. Revisar preview, funcionalidad y aprobación antes de publicar.
5. Dar acceso al proyecto Vercel y Supabase según tareas reales. Administrar permisos técnicos separados del rol admin dentro de la app.
6. Mantener secretos del servidor fuera de Claude, archivos versionados y frontend. Para desarrollo usar variables entregadas por canal seguro y entorno de pruebas.

## 5. Configuración que debe conservarse

Inventario de nombres, NO valores:

- NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.
- SUPABASE_SERVICE_ROLE_KEY: servidor únicamente.
- NEXT_PUBLIC_SITE_URL: https://app.sociasdigitales.com.
- RESEND_API_KEY / RESEND_FROM.
- R2_S3_ACCOUNT_ID / R2_BUCKET_NAME / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY.
- NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT.

Verificar cada entorno (producción/preview/desarrollo) en el gestor de secretos, sin volcar valores a este documento. Mantener el par VAPID si se quieren conservar suscripciones push; rotarlo puede exigir nueva suscripción. Los enlaces de baja actuales usan una firma derivada de la clave del servidor: rotarla invalida enlaces anteriores, pero las preferencias siguen disponibles en el perfil.

Revisar también: Site URL y redirects de Auth; plantilla/remitente de correos; políticas RLS, funciones y triggers; permisos del bucket y reproducción firmada; dominios de Vercel; integración GitHub; cuotas y planes del equipo receptor.

## 6. Circuito vigente

- /registro: cuenta gratuita, sin aprobación para crear cuenta.
- /registro/desafio: cuenta vinculada a solicitud del Desafío. Flor habilita, rechaza o cambia luego el acceso.
- /inicio: panel de alumna; /admin: panel de Flor; /perfil: datos, contraseña y elección de emails.
- /clases y /lanzamiento: acceso según categoría y habilitación.
- /notificaciones: bandeja por audiencia; /admin/notificaciones: redactar, guardar borrador, publicar, archivar y canales opcionales.
- Productos, resultados, objetivos, métricas, checklist, comunidad, logros y ranking: tarjetas visibles, módulos futuros bloqueados. No confundir visibilidad de tarjeta con acceso a datos.
- /preview/*: muestras, no circuito real ni datos de producción.

El esquema usa rol para administración y tipo_usuario para gratuito/desafio/socia; conserva roles afiliada/afiliada_lanzamiento por compatibilidad. No otorgar permisos mediante metadata enviada por la clienta. docs/arquitectura-plataforma.md contiene propuestas anteriores, no certifica que todos sus módulos estén implementados.

## 7. Emails y consentimiento

Casilla opcional, desmarcada al registrarse: “Acepto recibir por email avisos de clases, recordatorios y novedades de Socias Digitales”. No condiciona crear cuenta. Confirmación/recuperación de cuenta siguen como servicio separado.

Cada usuaria cambia su elección en /perfil y puede darse de baja desde el email. Se conserva historial de fecha, versión y origen. Cuentas existentes sin preferencia explícita NO reciben novedades. Flor no puede marcar el consentimiento por otra persona desde su panel.

Avisos funcionales dentro de la app se muestran por acceso sin depender del email. Esto no autoriza campañas comerciales ilimitadas ni sustituye revisar el aviso de privacidad y normas aplicables al responsable.

En admin, “Enviar también por email” es opcional. Se crea una cola por aviso/usuaria consentida, confirmada y activa; Desafío requiere habilitación. Antes de enviar se revalida consentimiento y acceso. El email usa el banner oficial y enlaza a la bandeja.

Límite vigente: primer lote de hasta 20 en segundo plano. Otros lotes se continúan con “Procesar pendientes”. Hay idempotencia y hasta 4 intentos dentro de 23 horas; fallas persistentes requieren revisión técnica, no reenvío indiscriminado. Las nuevas autorizaciones no reciben retrospectivamente avisos antiguos. Archivar detiene futuros envíos pendientes, no retira correos ya enviados.

“Aceptado” significa aceptado por Resend, NO confirma entrega o lectura. Pendientes antes de un uso masivo: worker recurrente/durable, webhooks de entrega/rebote, gestión de supresiones y monitoreo. No se hicieron envíos masivos ni se activó consentimiento en todas las cuentas durante la preparación.

## 8. Secuencia de transferencia sin interrupción

1. Acordar receptor, propiedad, facturación, soporte y fecha de corte.
2. Inventariar dependencias y generar copias verificadas de repositorio, base, Auth y videos. Un backup NO está realizado solo porque este checklist exista; documentar fecha y probar recuperación.
3. Dar acceso colaborativo primero, comprobar que Flor puede abrir repo/proyecto y usar su panel.
4. Preparar equipo Vercel y organización Supabase receptores; revisar requisitos y costes antes de mover nada.
5. Transferir repo en ventana acordada y comprobar integración GitHub-Vercel, permisos y previews.
6. Transferir proyecto Vercel según guía vigente; verificar variables, dominios, aliases y despliegue. Integraciones y observabilidad pueden necesitar reconexión.
7. Transferir Supabase conservando proyecto, usuarios y datos, si cumple requisitos del proveedor. No crear base vacía ni recrear usuarios por comodidad.
8. Resolver R2, Resend y DNS separadamente sin afectar servicios compartidos de otros proyectos.
9. Repetir pruebas de aceptación con cuentas gratuitas, Desafío, Socias y admin.
10. Registrar nueva titularidad, commit/deployment de corte, backups, accesos retenidos y pendientes. Después rotar credenciales de forma coordinada.

## 9. Pruebas de aceptación

- Registro gratuito/Desafío con y sin opt-in; confirmación real en casilla de prueba.
- Login, recuperación y cambio de contraseña; salir/volver sin rutas al panel viejo.
- Flor ve solicitudes y puede habilitar/rechazar/cambiar tipo de acceso.
- Alumna habilitada reproduce clases y puede avanzar/buscar en video sin otro login.
- Lanzamiento, perfil, menú, iconos y favicon; diseño consistente y pantallas pequeñas.
- Avisos por audiencia, borradores, publicación, lectura y archivo; aislamiento entre usuarias.
- Preferencia email guardar/desactivar; baja desde enlace válido; enlace inválido no modifica datos.
- Email real de prueba: remitente, banner, enlace, baja e historial del proveedor.
- Push real en teléfono compatible; no basta comprobar que hay claves configuradas.
- Usuario gratuito y módulos bloqueados no acceden por URL ni API a datos restringidos.

## 10. Estado y pendientes conocidos

Pruebas técnicas de consentimiento, HTML/baja firmada y cola se realizan sin emails reales mediante transacciones revertidas. Hay que confirmar entrega real en casilla y envío desde una sesión administrativa antes de dar por probado el canal completo. No se guarda ninguna contraseña de prueba aquí.

Seguridad a revisar antes de transferencia definitiva: protección de contraseñas filtradas desactivada; helpers SECURITY DEFINER heredados señalados por Supabase (es_admin y generar_link_afiliada). Auditar el segundo para validar propiedad/autorización. No revocar es_admin sin revisar sus políticas RLS. Tablas de historial/límites de correo sin políticas públicas son intencionalmente solo servidor.

Rollback: volver al deployment estable anterior puede recuperar frontend/backend, pero no revierte migraciones ni correos ya enviados. Estas migraciones son aditivas; no borrar tablas de consentimiento para simular rollback. No cambiar producción, DNS o ownership durante un incidente sin registrar el alcance.

## Fuentes oficiales

- https://vercel.com/docs/projects/transferring-projects
- https://supabase.com/docs/guides/platform/project-transfer
- https://docs.github.com/en/enterprise-cloud@latest/repositories/creating-and-managing-repositories/transferring-a-repository
- https://support.claude.com/en/articles/12618689-claude-code-on-the-web
- https://resend.com/legal/acceptable-use
- https://resend.com/changelog/idempotency-keys
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
