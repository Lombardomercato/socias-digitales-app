@AGENTS.md

# Socias Digitales — guía para continuar el mismo producto

Leer AGENTS.md, este archivo y docs/transferencia-plataforma.md antes de modificar.
Trabajar en este repositorio: no reconstruir la app como un artifact o un sitio independiente.

## Desarrollo y entrega

- Next.js 16.2.9 / React 19. Leer documentación de la versión instalada antes de cambiar rutas, cookies o componentes.
- Crear una rama, probar y entregar preview/PR. No publicar en producción ni modificar permisos, dominios o datos reales sin autorización expresa de la responsable.
- No guardar secretos ni contraseñas en código, documentación, chats, navegador o logs. Usar variables del servidor.
- Preservar cambios ajenos. No editar copias con sufijo ` 2` ni borrar archivos sin entender su origen.
- Ejecutar lint, TypeScript, pruebas y build. Verificar el circuito real, no solo las previews.
- Cambios de base: migraciones versionadas, RLS, restricciones y pruebas con rollback. No usar metadata del navegador para dar permisos.

## Producto y accesos

- Inicio real: /inicio; clases: /clases; lanzamiento: /lanzamiento; perfil: /perfil; admin: /admin.
- /registro crea cuenta gratuita. /registro/desafio solicita Desafío; Flor habilita, rechaza o cambia acceso.
- `rol` administra privilegios técnicos; `tipo_usuario` distingue gratuito/desafio/socia. Mantener compatibilidad con afiliada/afiliada_lanzamiento.
- Clases y lanzamiento exigen acceso correspondiente. Los módulos futuros siguen bloqueados aunque sus tarjetas sean visibles.
- /preview/* no es el producto operativo ni fuente de datos de producción.
- Avisos internos por audiencia. Emails de novedades solo con consentimiento; cuentas existentes sin preferencia = NO autorizado.
- Confirmación y recuperación de cuenta son correos de servicio: no dependen del opt-in de novedades.
- Preferencias se cambian por API autenticada y propia; baja firmada solo permite desactivar.

## Diseño aprobado

Manual: https://socias-digitales-identidad-v5.alekeiii.chatgpt.site/manual

- Crema/Paper #F4EFEA/#FAF7F3; Blush #F4CAD8; Rose #EC9BB6; verde #294A38 como acento.
- Evitar fucsia fuerte. Bordó #B01B30 solo para alertas, no decoración habitual.
- Playfair Display editorial sin abusar de italic; Poppins para impacto y números, con pesos equilibrados; DM Sans lectura/sistema; Playlist Script un acento ocasional.
- Logos e imágenes oficiales. No inventar personas ni logos. Favicon solo como icono pequeño.
- Simple, visual, práctico y accesible: sin glow, brillos o adornos tipo IA. Iconos consistentes, tarjetas claras con borde sutil.
- Mantener funciones de Flor y alumnas al adaptar diseño. No ofrecer botones falsos.

## Emails y seguridad

- Banner oficial centralizado en src/lib/email-brand.ts; conservar remitente del dominio Socias Digitales verificado.
- Cola persistente por aviso/usuaria, idempotencia y revalidación de acceso/consentimiento antes de enviar.
- Límite actual: 20 por ejecución. Pendientes continúan desde admin; no prometer envío masivo totalmente automático ni entrega en inbox.
- `aceptado` significa aceptado por Resend, no recibido. Webhooks de entrega y worker recurrente están pendientes.
- Mantener bajas, historial de consentimiento y separación de públicos. No activar emails retrospectivamente para todas.
