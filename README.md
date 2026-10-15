# Socias Digitales — plataforma

Aplicación existente en Next.js 16.2.9 / React 19.2.4, Node 24, Supabase, Vercel, Cloudflare R2 y Resend.

Producción: https://app.sociasdigitales.com

## Entrega del 15/10/2026

El código de producción verificado para esta entrega es `cc1e1e1438cdf280c87d2206f56a4c818c2074ef`, rama `codex/progreso-clases-20261014`. Esta rama de entrega agrega documentación sobre el mismo código. Comprobar siempre el deployment actual antes de continuar: el checkpoint puede quedar superado.

El repositorio correcto es `Lombardomercato/socias-digitales-app`. No asumir que `main`, un remoto antiguo o un sitio de preview tienen la última versión.

```sh
git clone --branch codex/entrega-flor-20261015 https://github.com/Lombardomercato/socias-digitales-app.git
cd socias-digitales-app
git remote -v
```

## Documentación para continuar

- [CLAUDE.md](CLAUDE.md): instrucciones de continuidad para Claude.
- [Estado actual](docs/estado-plataforma.md): funciones reales, límites y próximos pasos.
- [Contrato de diseño](docs/diseno-plataforma.md): identidad, componentes y referencias visuales.
- [Operación y pruebas](docs/operacion-y-pruebas.md): uso del panel y criterios de aceptación.
- [Transferencia](docs/transferencia-plataforma.md): inventario, responsables y procedimiento sin perder colaboración.
- [AGENTS.md](AGENTS.md): instrucciones de Next.js y contrato mobile-first.

`docs/arquitectura-plataforma.md` conserva una propuesta histórica; no debe prevalecer sobre el estado verificado de esta entrega.

## Desarrollo local

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Completar `.env.local` por canal seguro y usar recursos de prueba autorizados. No apuntar un entorno de experimentación a producción para crear/borrar alumnas, enviar correos o modificar permisos. `.env.example` no incluye secretos; no subir el archivo local a Git.

```sh
node --test tests/*.test.cjs
npm run build
git diff --check
```

Base de pruebas verificada el 14/10: 166 casos. Ver el plan de pruebas antes de considerar un cambio terminado. Mantener el lockfile existente de npm; no introducir otro gestor de paquetes por accidente.

## Rutas principales

Alumna: `/inicio`, `/classroom` (`/clases` redirige allí), `/lanzamiento` (Estrategia), `/perfil`, `/notificaciones`, `/resultados`, `/metricas`, `/checklist` (Mi día) según autorización.

Flor: `/admin`, solicitudes, usuarias, clases/seguimiento, encuesta, avisos, invitaciones y equipo desde su menú administrativo. No confundir `/preview/*` con cuentas o datos reales.

El repositorio era público al revisar esta entrega. No guardar aquí directorios privados de accesos, contraseñas, secretos, backups ni respuestas de alumnas.
