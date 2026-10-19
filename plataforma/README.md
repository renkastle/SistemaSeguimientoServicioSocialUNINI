# Plataforma de Servicio Social para Asociaciones

Sistema multi-organización para que una asociación civil (empezando por **Fundación Aprende con Reyhan**) tenga:

1. **Sitio web público** con su identidad, misión, visión, cifras en vivo, blog y convocatoria de servicio social.
2. **Seguimiento de servicio social** para estudiantes, tutores y administración.
3. **Alta de estudiantes** (individual o masiva por CSV) con universidad, sede, país e información general.
4. **Cohortes** y **proyectos** propuestos por el estudiante con flujo de **aprobación del tutor**.
5. **Asistente IA** que responde con la **base de conocimiento** de la organización.
6. **Herramientas del tutor**: tablero consolidado, bitácora de seguimiento, alertas de riesgo, reportes imprimibles y exportación CSV.

## Arranque rápido

```bash
cd plataforma
npm install
cp .env.example .env        # agrega IA_API_KEY, IA_MODELO y un SESSION_SECRET aleatorio
npm run setup               # crea la base de datos y carga datos de ejemplo
npm run dev                 # http://localhost:3000
```

Usuarios de ejemplo (contraseña definida en `prisma/seed.ts`):

| Rol | Correo |
|---|---|
| Administración | `admin@reyhan.org` |
| Tutora | `tutor@reyhan.org` |
| Estudiante | `estudiante@reyhan.org` (también `camila@`, `diego@`, …) |

Hay una segunda organización, **`/demo`**, para mostrar que el sistema es replicable.

## Cómo replicarlo para otra asociación

Todo está aislado por `Organization` (cada tabla cuelga de `organizationId`) y las rutas son `/{slug}/…`.

1. Crea la organización: copia el bloque `createOrganization({...})` en `prisma/seed.ts` con su `slug`, textos y colores (o crea solo el registro y un usuario ADMIN).
2. La administración entra a `/{slug}/panel/sitio` y edita nombre, logo, colores, misión, visión, redes, cifras, blog e indicaciones del asistente — sin tocar código.
3. Carga su base de conocimiento en `/{slug}/panel/conocimiento` (reglamentos, guías, FAQ…).
4. Da de alta universidades, tutores, cohortes y estudiantes.

Para un dominio propio por asociación (p. ej. `serviciosocial.aprendeconreyhan.org`) basta un `middleware.ts` que mapee el host al `slug`; `DEFAULT_ORG` define qué organización se muestra en `/`.

## Roles y flujo

```
Estudiante ── propone proyecto ──► En revisión ──► Tutor: Aprobar / Pedir cambios / Rechazar
    │                                                    │
    ├── registra horas + evidencia ──► Tutor valida ◄────┤
    ├── marca hitos                                      ├── bitácora privada (seguimiento, reunión, alerta, logro) + % avance
    └── pregunta al Asistente IA                         └── Concluir proyecto ──► liberación
```

| Sección | Estudiante | Tutor | Admin |
|---|:-:|:-:|:-:|
| Inicio (tablero por rol) | ✔ | ✔ | ✔ |
| Proyectos | los suyos | los de sus cohortes | todos |
| Horas | registrar | validar en bloque | validar |
| Asistente IA | ✔ (KB + su avance) | ✔ (KB + consolidado de proyectos) | ✔ |
| Cohortes, Estudiantes, Reportes, Base de conocimiento | | ✔ | ✔ |
| Universidades, Equipo, Sitio web | | | ✔ |

## Arquitectura

- **Next.js 15** (App Router, Server Components y Server Actions) + **Tailwind CSS 4**.
- **Prisma** con **SQLite** en desarrollo. En producción cambia `provider = "postgresql"` en `prisma/schema.prisma` y `DATABASE_URL` (Supabase, Neon, RDS…).
- **Sesiones** con cookie JWT firmada (`jose`) y contraseñas con `bcrypt`. Cada server action valida rol y pertenencia a la organización.
- **Asistente IA** (`src/lib/agent.ts`): modelo de lenguaje en un bucle de herramientas con streaming:
  - `buscar_conocimiento` / `leer_documento` → base de conocimiento de la organización (`src/lib/knowledge.ts`, búsqueda léxica por fragmentos sin dependencias externas).
  - `mi_avance` (estudiante) o `consolidar_proyectos` (tutor/admin) → datos reales de la plataforma, siempre filtrados por permisos.
  - Historial de conversación persistido por usuario; indicaciones extra configurables por organización.
  - Para bases de conocimiento grandes, reemplaza `searchKnowledge` por búsqueda vectorial (pgvector) manteniendo la misma firma.

```
src/
  app/
    [org]/                 sitio público, blog y login de cada organización
    [org]/panel/           plataforma (proyectos, horas, cohortes, estudiantes, reportes, asistente…)
    api/agent/             endpoint de streaming del asistente
    api/[org]/export/      CSV de estudiantes y proyectos
  lib/
    actions/               server actions (people, service, content)
    agent.ts               agente IA con herramientas
    knowledge.ts           búsqueda en la base de conocimiento
    auth.ts                sesión, roles y alcance de datos
prisma/schema.prisma       modelo de datos
prisma/seed.ts             organizaciones y datos de ejemplo
```

Probar la búsqueda de la base de conocimiento sin gastar en IA:

```bash
npx tsx scripts/probar-busqueda.mts "requisitos para liberar el servicio social"
```

## Despliegue sugerido

Vercel (o cualquier hosting Node) + PostgreSQL administrado. Variables: `DATABASE_URL`, `SESSION_SECRET`, `IA_API_KEY`, `IA_MODELO`, `DEFAULT_ORG`.

## Ideas para siguientes fases

**Para estudiantes**
- Constancia de liberación en PDF con folio y código QR de verificación pública.
- Informe intermedio y final con plantilla; el asistente revisa el borrador contra la rúbrica antes de entregarlo.
- Subida de evidencias (fotos, listas de asistencia) a almacenamiento en la nube, con consentimiento de uso de imagen.
- Registro de horas desde el celular (PWA) con geolocalización y check-in en la escuela.
- Recordatorios por correo/WhatsApp: horas sin registrar, fechas de hitos, cambios solicitados.

**Para tutores**
- Resumen semanal automático por IA de cada cohorte (avances, riesgos, a quién contactar), enviado por correo.
- Rúbricas de evaluación configurables y calificación del desempeño del estudiante.
- Agenda de asesorías con calendario y minutas que se convierten en notas de seguimiento.
- Detección temprana de deserción (horas a la baja, sin respuesta) con alertas.

**Para la organización**
- Indicadores de impacto por proyecto (beneficiarios, encuestas pre/post, peso/talla, consumo de agua) y tablero público de impacto para donantes y transparencia.
- Convocatoria en línea: los estudiantes se postulan desde el sitio y la administración los acepta en una cohorte.
- Portal de universidades: el responsable de servicio social de cada universidad consulta el avance de sus alumnos y descarga constancias.
- Banco de proyectos e "ideas de la comunidad" que escuelas y empresas proponen y los estudiantes adoptan.
- Biblioteca de materiales didácticos generados por estudiantes, reutilizables entre cohortes.
- Donativos en línea y recibos deducibles; registro de voluntariado corporativo (sector laboral).
- Multi-idioma (español/inglés/portugués) para estudiantes internacionales.
- Panel "super-admin" para dar de alta nuevas asociaciones en minutos (modelo SaaS para otras fundaciones).
