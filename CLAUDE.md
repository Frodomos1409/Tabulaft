# Tabulaft — CLAUDE.md

Plataforma de portafolios académicos para estudiantes de diseño. Angular 21 + Supabase + Vercel. SPA standalone sin SSR.

---

## Stack y versiones

| Tecnología        | Versión      |
|-------------------|--------------|
| Angular           | 21.2         |
| TypeScript        | 5.9          |
| Supabase JS       | 2.x          |
| Node / npm        | 22 / 11.6    |
| Hosting           | Vercel        |
| Tests             | Vitest        |
| Linting / format  | Prettier      |

---

## Comandos

```bash
npm start              # dev server (ng serve)
npm run build          # build development
npm run build:prod     # build production
npm test               # karma (unit)
npm run test:unit      # vitest (project.service.spec)
npm run build:analyze  # bundle analyzer
```

---

## Arquitectura

### Shell dual desktop / mobile

El punto de entrada (`app.ts`) elige shell según `DeviceService.isMobile()` (breakpoint `≤768px`):

- `DesktopShellComponent` — loader animado, cursor custom (dot + trail + orbit "VER →"), view transitions flip 3D, navbar + footer.
- `MobileShellComponent` — bottom nav, drawer lateral, sin cursor ni loader.

**Regla:** todo efecto visual exclusivo de escritorio (cursor, loader, orbit, view transitions) vive dentro del `DesktopShellComponent`. No contaminar el shell móvil.

### Assets compartidos

Los mismos assets (`/public/`, SVGs, estilos SCSS) se usan en ambos shells. Las variables de diseño están en `src/styles/_variables.scss` y deben importarse desde ahí — nunca hardcodear colores o tokens directamente en componentes.

**Al agregar assets nuevos:**
1. Colocarlos en `tabulaft/public/`.
2. Referenciarlos con ruta relativa desde la raíz (`/nombre-archivo.svg`).
3. Verificar que funcionen en ambos shells antes de dar por terminada la tarea.

### Rutas

```
/               Landing (pública)
/inicio         Home (authGuard)
/explorar       Feed (pública)
/perfil/:id     Perfil público
/proyecto/:id   Detalle de proyecto
/publicar       Upload (authGuard)
/admin          Panel admin (adminGuard)
/auth           Login / registro
/auth/callback  OAuth callback
```

Lazy loading en todas las rutas excepto Landing. Los guards esperan `sessionReady` antes de evaluar.

### Capas del proyecto

```
src/app/
├── app.ts                         # Selector de shell
├── app.routes.ts                  # Rutas con lazy loading
├── shells/
│   ├── desktop/                   # Shell escritorio
│   └── mobile/                    # Shell móvil
├── features/                      # Páginas (landing, home, feed, upload, auth, admin, profile, project-detail, not-found)
├── shared/components/             # navbar, footer, toast, skeleton, search-modal, user-avatar, project-card
└── core/
    ├── guards/                    # authGuard, adminGuard
    ├── models/models.ts           # Tipos globales (Category, Project, User, Comment, Notification)
    ├── services/                  # auth, project, profile, admin, academic, theme, device, toast, notification, cache
    └── supabase.client.ts         # Cliente singleton de Supabase
```

---

## Diseño y estilos

### Paleta de marca (siempre usar las variables SCSS)

| Variable SCSS       | Valor hex  | Uso principal                        |
|---------------------|-----------|--------------------------------------|
| `$blue`             | `#2830eb` | Color primario, loader, cursor, CTA  |
| `$blue-dark`        | `#101663` | Fondos oscuros de marca              |
| `$accent-pink`      | `#ee41ba` | Decorativo: bordes hover, puntos     |
| `$dark-bg`          | `#0A0A0F` | Fondo principal dark                 |
| `$light-bg`         | `#FAFAFE` | Fondo principal light                |
| `$success`          | `#34d399` | Confirmaciones                       |
| `$error`            | `#f87171` | Errores                              |
| `$warning`          | `#fbbf24` | Advertencias                         |

### Efectos activos

- **Grain / noise** — pseudo-element en el hero de la landing.
- **Marquee** — galería animada en la landing.
- **Aurora navbar** — borde inferior con gradiente animado (`hue-rotate`).
- **Orbit cursor** — label "VER →" que orbita sobre imágenes de proyecto (solo desktop).
- **View transitions flip 3D** — `::view-transition-old/new(root)` al navegar (solo desktop).

**Regla:** no eliminar ni simplificar estos efectos sin pedido explícito del usuario.

### Tipografía

- Headings: `'Impact', 'Inter', sans-serif`
- Body: `'Inter', 'DM Sans', sans-serif`

---

## Seguridad — reglas no negociables

### Inputs y uploads

- **Validación de tipo de archivo por magic bytes**, no solo por extensión ni `file.type` del browser. Ya implementado en `ProjectService.validateImageFile()`. Siempre mantener esta validación al agregar nuevas funciones de upload.
- **Tamaño máximo:** 10 MB por imagen. Nunca subir sin validar.
- **Sanitización de nombres:** `sanitizeFileName()` remueve caracteres peligrosos y trunca a 80 chars. Aplicar a cualquier nombre de archivo antes de usarlo en rutas de Supabase Storage.
- **Path traversal:** nunca construir rutas de storage concatenando input del usuario sin pasar por `sanitizeFileName`.
- **Comentarios:** longitud máxima 1000 caracteres, rate-limit de 5 segundos cliente + check de constraint `23514` en DB. No eliminar ninguna de las dos capas.

### Autenticación

- Los guards `authGuard` y `adminGuard` **siempre** awaitan `auth.sessionReady` antes de evaluar el estado. No modificar este patrón.
- El campo `is_admin` y `banned` vienen del perfil en Supabase, nunca del token JWT del cliente.
- Si `profile.banned === true` en el signIn, se hace signOut inmediato y se lanza error — nunca permitir acceso a cuentas baneadas.
- Las credenciales de Supabase (`url`, `anonKey`) solo viven en `environment.ts` / `environment.prod.ts`. Nunca hardcodearlas en código.

### XSS

- Nunca usar `innerHTML` con contenido de usuario. Usar interpolación de Angular (`{{ }}`) o `[textContent]`.
- No usar `bypassSecurityTrustHtml` a menos que sea estrictamente necesario y el contenido sea completamente controlado.
- Las URLs de imágenes de Supabase Storage son de dominio propio — aun así nunca renderizar URLs de usuario directamente en `src` sin validar que sean del dominio esperado.

### CSRF / auth flows

- El redirect OAuth usa `environment.appUrl` — nunca construir la URL de callback con input del usuario.
- La función `registerSessionOnlyUnload` limpia tokens de localStorage al cerrar la pestaña; no eliminarla.

### Exposición de datos

- Las queries de Supabase solo seleccionan columnas necesarias. Nunca usar `select('*')` en tablas de perfil o proyectos en producción sin justificación.
- El rol `admin` solo se lee del campo `is_admin` del perfil — el `adminGuard` lo verifica via `auth.isAdmin()` computed signal.

### Errores

- Nunca exponer stack traces ni mensajes de error internos de Supabase al usuario. Mostrar siempre mensajes genéricos a través de `ToastService`.
- Los `console.log` de debug están envueltos en `if (!environment.production)` — mantener este patrón.

---

## Mobile — reglas de desarrollo

- El breakpoint de corte es `768px` (definido en `DeviceService`). Cambiar este valor afecta el selector de shell completo — coordinar con UX antes.
- El shell móvil tiene su propio bottom nav + drawer — no reutilizar el `NavbarComponent` del desktop en mobile.
- Los assets SVG del desktop (logos, íconos) se reutilizan en mobile mediante las mismas rutas `/public/`.
- Al crear un componente nuevo que se muestre en ambos shells: asegurarse de que sea responsivo internamente con media queries en su propio SCSS, o crear variante dedicada si el layout difiere mucho.
- No usar `window.matchMedia` directamente en componentes — usar `DeviceService.isMobile()`.

---

## Convenciones de código

- Componentes standalone únicamente. No usar `NgModule`.
- Signals (`signal`, `computed`, `effect`) para estado local. No usar `BehaviorSubject` para estado de componente.
- Lazy loading en todas las rutas de feature. No importar componentes de feature directamente en `app.routes.ts`.
- No agregar comentarios que expliquen qué hace el código — solo comentar el **por qué** cuando no es obvio.
- No escribir docstrings multi-línea.
- Prettier ya configurado — respetar `.prettierrc` al formatear.
- No usar `any` salvo en tipos de respuesta de Supabase donde el esquema es dinámico y ya existe ese patrón.

---

## Supabase

- Cliente singleton en `core/supabase.client.ts`. No crear instancias adicionales.
- RLS activa en todas las tablas — no asumir que el cliente anon puede hacer cualquier operación.
- Las operaciones que requieren sesión verifican `supabase.auth.getSession()` antes de ejecutar (ver `createProject`).
- Funciones RPC: `toggle_like`, `toggle_save`, `increment_project_view`, `get_landing_stats`. Documentar cualquier RPC nueva en este archivo.
- Storage buckets: `avatars`, `projects`. Rutas: `{userId}/{uuid}-{safeName}`.

---

## Lo que NO hacer

- No eliminar los efectos visuales del desktop shell (loader, cursor, orbit, view transitions).
- No mover lógica de seguridad (validación de archivos, rate-limit de comentarios, ban check) al cliente sin mantener la capa de servidor/DB.
- No hacer `select('*')` en tablas con datos sensibles.
- No hardcodear colores, fuentes o tokens — siempre usar las variables de `_variables.scss`.
- No usar `innerHTML` con datos de usuario.
- No crear `NgModule` — el proyecto es 100% standalone.
- No pushear variables de entorno reales al repo.
