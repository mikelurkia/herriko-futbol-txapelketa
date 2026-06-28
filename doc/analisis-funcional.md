# Análisis Funcional — Herriko Futbol Txapelketa

## 1. Visión general

**Herriko Futbol Txapelketa** es el torneo de fútbol veteranos del municipio de Oñati. La aplicación web tiene como objetivo digitalizar la gestión del torneo y ofrecer a aficionados y participantes un punto centralizado de consulta de información.

La aplicación debe ser **multilingüe** (euskera y castellano) y **multitemporada**, dando soporte a ediciones sucesivas del torneo sin pérdida de histórico.

---

## 2. Roles de usuario

| Rol | Descripción |
|-----|-------------|
| **Público** | Cualquier visitante sin autenticación. Acceso de solo lectura. |
| **Gestor de equipo** | Usuario registrado vinculado a un equipo. Puede gestionar los datos de su propio equipo y jugadores. |
| **Administrador de liga** | Organizador del torneo. Acceso completo a toda la gestión. |

---

## 3. Estructura del torneo

- **Modalidad:** Fútbol 11
- **Participantes:** ~14 equipos por temporada
- **Formato:**
  - **Fase de grupos** inicial (todos los equipos)
  - **Eliminatoria superior:** para la mitad mejor clasificada de la fase de grupos
  - **Eliminatoria inferior:** para la mitad peor clasificada de la fase de grupos
- **Duración:** A lo largo de toda la temporada (varios meses)
- **Temporadas:** La aplicación gestiona múltiples ediciones del torneo, manteniendo el histórico completo

---

## 4. Módulos funcionales

### 4.1 Gestión de temporadas

- Crear una nueva temporada (año, nombre de edición)
- Activar/desactivar la temporada en curso
- Consultar temporadas anteriores (histórico)
- Cada temporada tiene su propia configuración de equipos, grupos, jornadas y clasificaciones

---

### 4.2 Gestión de equipos

**Administrador de liga:**
- Dar de alta / baja equipos en una temporada
- Asignar un gestor a cada equipo
- Editar datos del equipo (nombre, escudo, colores, información de contacto)

**Gestor de equipo:**
- Editar los datos de su propio equipo
- Gestionar la plantilla (añadir/eliminar jugadores)

**Datos de un equipo:**
- Nombre
- Escudo / imagen
- Colores
- Información de contacto (opcional)
- Gestor asignado

---

### 4.3 Gestión de jugadores

**Administrador de liga / Gestor de equipo:**
- Añadir jugadores a la plantilla
- Editar datos de jugadores
- Dar de baja jugadores (baja en temporada, no borrado)

**Datos de un jugador:**
- Nombre y apellidos
- Dorsal (opcional)
- Equipo al que pertenece en la temporada actual

**Página pública de jugador:**
- Foto / avatar
- Datos básicos (nombre, equipo)
- Estadísticas de la temporada activa: goles marcados, tarjetas amarillas, tarjetas rojas, partidos sancionados
- Histórico de temporadas anteriores

> No se gestionan alineaciones, por lo que no se muestra "partidos jugados".

> Las fichas de jugadores son por temporada. Un jugador puede cambiar de equipo entre temporadas.

---

### 4.4 Fase de grupos

- Configurar los grupos de la temporada: número de grupos y asignación de equipos (configurable cada edición; el número de equipos puede variar entre temporadas)
- Generar o introducir manualmente el calendario de partidos de la fase de grupos
- Registrar resultados de cada partido
- Calcular automáticamente la clasificación por grupo:
  - Puntos (3V / 1E / 0D)
  - Partidos jugados, ganados, empatados, perdidos
  - Goles a favor, goles en contra, diferencia de goles
  - **Criterios de desempate:** puntos → diferencia de goles → goles a favor → enfrentamiento directo entre los equipos empatados
- Determinar automáticamente los clasificados para cada eliminatoria en base a la clasificación final de grupos

---

### 4.5 Eliminatorias (playoff superior e inferior)

- Generar el cuadro de eliminatorias a partir de los clasificados de la fase de grupos
- **Clasificación para brackets:** los N primeros de cada grupo pasan al playoff superior; el resto al playoff inferior. N es configurable por el administrador al crear los playoffs (permite adaptarse a cualquier número de equipos o grupos).
- **Formato: partido único**
- Registrar resultados de cada eliminatoria
- Avanzar automáticamente al equipo ganador a la siguiente ronda
- **Empate al final del tiempo reglamentario: se va directamente a penaltis** (sin prórroga)
- Cuadro visual del bracket

---

### 4.6 Registro de resultados

**Administrador de liga:**
- Introducir el resultado de cualquier partido (fase de grupos o eliminatoria)
- Editar resultados ya introducidos
- Registrar goleadores de cada partido
- Registrar tarjetas (amarillas / rojas) de cada partido

**Gestor de equipo:**
- No interviene en el registro de resultados. Solo gestiona la plantilla de su equipo.

---

### 4.7 Sanciones y disciplina

- Acumulación automática de tarjetas amarillas: **cada 3 amarillas = 1 partido de sanción** (el ciclo se reinicia tras cumplir la sanción y es continuo durante toda la temporada, incluidas las eliminatorias)
- Registro de tarjetas rojas directas (sanción automática de al menos 1 partido)
- Posibilidad de añadir sanciones adicionales manualmente (partidos de suspensión extra)
- El sistema debe avisar / bloquear a un jugador sancionado al registrar su participación en un partido
- Histórico de sanciones por jugador y temporada

---

### 4.8 Clasificación y estadísticas públicas

Accesibles para cualquier usuario (público):

- **Clasificación de grupos** en tiempo real
- **Cuadro de eliminatorias** (bracket superior e inferior)
- **Calendario de partidos:** próximos partidos con fecha y hora
- **Resultados:** partidos ya disputados con marcador y goleadores
- **Tabla de goleadores** de la temporada
- **Tabla de tarjetas** (más amonestados)

---

### 4.9 Notificaciones

El sistema incluye una capa de notificaciones para mantener informados a los usuarios registrados. Los canales y eventos concretos se definirán, pero la arquitectura debe contemplarlo desde el inicio.

**Posibles eventos notificables:**
- Nueva sanción aplicada a un jugador (al gestor del equipo afectado)
- Nuevo resultado registrado
- Nueva publicación / comunicado de la liga
- Jugador próximo a sanción (a 1 amarilla del ciclo)

**Destinatarios potenciales:**
- Administradores
- Gestores de equipo
- (A valorar) Usuarios registrados suscritos

> Los canales (email, notificación en app, etc.) y los eventos activos se concretarán en una fase posterior.

---

### 4.10 Publicaciones / Noticias

**Administrador de liga:**
- Publicar noticias, avisos o comunicados
- Editar y eliminar publicaciones

**Público:**
- Consultar las publicaciones ordenadas cronológicamente

---

### 4.11 Gestión de usuarios y accesos

- Inicio de sesión (email + contraseña)
- Recuperación de contraseña
- **El registro no es público.** Los administradores crean las cuentas de los gestores de equipo manualmente.
- **Roles:**
  - **Administrador de liga:** puede haber varios; acceso completo a toda la gestión
  - **Gestor de equipo:** cuenta creada por un administrador; vinculado a un equipo por temporada
  - **Público:** sin autenticación, solo lectura
- Un usuario puede ser gestor de distintos equipos en distintas temporadas

---

## 5. Stack tecnológico

| Capa | Tecnología | Motivo |
|------|-----------|--------|
| **Framework** | Next.js (App Router) | SSR para páginas públicas con SEO, rutas protegidas para gestión |
| **Base de datos / Backend** | Supabase (PostgreSQL) | Relacional, Auth integrado, Storage para imágenes, RLS para control de acceso por rol |
| **Autenticación** | Supabase Auth | Gestión de sesiones, roles y recuperación de contraseña |
| **Almacenamiento de imágenes** | Supabase Storage | Fotos de jugadores y escudos de equipos |
| **UI components** | shadcn/ui | Componentes accesibles y altamente personalizables |
| **Estilos** | Tailwind CSS | Utility-first, integración nativa con shadcn/ui |
| **Lenguaje** | TypeScript | Tipado estático en todo el proyecto |
| **i18n** | next-intl | Soporte euskera / castellano en App Router |
| **Validación** | Zod | Esquemas de validación en formularios y API |
| **Despliegue** | Vercel | Plataforma natural para Next.js, preview deployments incluidos |

---

## 6. Requisitos no funcionales

| Requisito | Descripción |
|-----------|-------------|
| **Multilingüe** | Euskera y castellano. El usuario puede cambiar de idioma en cualquier momento. |
| **Multitemporada** | Soporte a ediciones anuales con histórico completo consultable. |
| **Responsive** | Accesible desde móvil, tablet y escritorio. |
| **Web** | Aplicación web accesible desde navegador, sin necesidad de instalación. |
| **SEO** | Las páginas públicas (clasificación, resultados, jugadores) deben ser indexables. |

---

## 7. Flujo general de una temporada

```
1. Administrador crea la nueva temporada
2. Administrador da de alta los equipos participantes y asigna gestores
3. Gestores/administrador configuran las plantillas de jugadores
4. Administrador configura los grupos y genera el calendario de fase de grupos
5. Se juegan los partidos → administrador introduce resultados y tarjetas
6. Al finalizar la fase de grupos, el sistema clasifica a los equipos
7. Administrador genera el cuadro de eliminatorias (superior e inferior)
8. Se juegan las eliminatorias → administrador introduce resultados
9. Se proclama campeón de cada eliminatoria
10. La temporada queda archivada y consultable como histórico
```

---

## 8. Modelo de datos

### Entidades principales y relaciones

```
seasons
  └── season_teams  (equipos inscritos en una temporada)
        ├── teams   (entidad permanente del equipo)
        └── users   (gestor asignado)
              └── groups / group_teams (asignación a grupo)

players
  └── player_registrations  (ficha por temporada + equipo)
        └── season_teams

matches
  ├── season_teams (local y visitante)
  ├── groups       (solo fase de grupos)
  └── matches      (self-ref: siguiente partido en playoff)

match_events  →  matches + players
sanctions     →  players + seasons + matches
publications  →  users
notifications →  users
```

---

### Tablas

#### `users`
Extiende el usuario de Supabase Auth con datos de perfil y rol.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | Referencia a `auth.users` |
| `name` | text | Nombre visible |
| `role` | enum | `admin` \| `team_manager` |
| `created_at` | timestamptz | |

---

#### `seasons`
Una edición del torneo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `name` | text | Ej: "2024-2025" |
| `start_date` | date | |
| `end_date` | date | |
| `is_active` | boolean | Solo una temporada activa a la vez |
| `status` | enum | `setup` \| `group_stage` \| `playoffs` \| `finished` |
| `created_at` | timestamptz | |

---

#### `teams`
Entidad permanente de un equipo, independiente de la temporada.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `name` | text | |
| `shield_url` | text | URL en Supabase Storage |
| `primary_color` | text | Hex |
| `secondary_color` | text | Hex |
| `created_at` | timestamptz | |

---

#### `season_teams`
Inscripción de un equipo en una temporada. Nodo central del modelo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `season_id` | uuid FK → seasons | |
| `team_id` | uuid FK → teams | |
| `manager_id` | uuid FK → users | Gestor asignado para esta temporada |
| `created_at` | timestamptz | |
| — | UNIQUE | `(season_id, team_id)` |

---

#### `groups`
Grupos de la fase de grupos de una temporada.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `season_id` | uuid FK → seasons | |
| `name` | text | Ej: "Grupo A" |
| `created_at` | timestamptz | |

---

#### `group_teams`
Asignación de equipos a grupos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `group_id` | uuid FK → groups | |
| `season_team_id` | uuid FK → season_teams | |
| — | UNIQUE | `(group_id, season_team_id)` |

---

#### `players`
Ficha permanente de un jugador.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `first_name` | text | |
| `last_name` | text | |
| `photo_url` | text | URL en Supabase Storage |
| `created_at` | timestamptz | |

---

#### `player_registrations`
Inscripción de un jugador en un equipo para una temporada concreta.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `player_id` | uuid FK → players | |
| `season_team_id` | uuid FK → season_teams | |
| `jersey_number` | int | Dorsal (opcional) |
| `is_active` | boolean | Baja sin borrar el registro |
| `created_at` | timestamptz | |
| — | UNIQUE | `(player_id, season_team_id)` |

---

#### `matches`
Partidos de fase de grupos y eliminatorias.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `season_id` | uuid FK → seasons | |
| `phase` | enum | `group` \| `upper_playoff` \| `lower_playoff` |
| `group_id` | uuid FK → groups | Solo en fase de grupos |
| `round` | int | Jornada (grupos) o ronda (playoff) |
| `home_team_id` | uuid FK → season_teams | Nullable (pendiente de cruzar en playoff) |
| `away_team_id` | uuid FK → season_teams | Nullable |
| `scheduled_date` | timestamptz | Fecha y hora del partido |
| `status` | enum | `pending` \| `played` |
| `home_score` | int | Nullable hasta que se juegue |
| `away_score` | int | Nullable |
| `home_penalties` | int | Solo si hay empate en playoff |
| `away_penalties` | int | Solo si hay empate en playoff |
| `next_match_id` | uuid FK → matches | Self-ref: a qué partido avanza el ganador |
| `created_at` | timestamptz | |

> `next_match_id` permite construir el árbol del bracket sin lógica extra: el ganador de un partido se asigna automáticamente al siguiente slot.

---

#### `match_events`
Goles y tarjetas registrados en un partido.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `match_id` | uuid FK → matches | |
| `player_id` | uuid FK → players | |
| `season_team_id` | uuid FK → season_teams | Equipo al que pertenece el evento |
| `type` | enum | `goal` \| `yellow_card` \| `red_card` |
| `minute` | int | Opcional |
| `created_at` | timestamptz | |

---

#### `sanctions`
Sanciones activas o cumplidas de un jugador.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `player_id` | uuid FK → players | |
| `season_id` | uuid FK → seasons | |
| `triggering_match_id` | uuid FK → matches | Partido que generó la sanción |
| `reason` | enum | `yellow_accumulation` \| `red_card` \| `additional` |
| `matches_suspended` | int | Partidos de sanción |
| `matches_served` | int | Partidos ya cumplidos |
| `is_active` | boolean | False cuando se cumple la sanción |
| `created_at` | timestamptz | |

> El ciclo de amarillas (cada 3 = 1 partido) se gestiona contando los `match_events` de tipo `yellow_card` por jugador y temporada desde la última sanción por acumulación.

---

#### `publications`
Noticias y comunicados de la liga.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `title_eu` | text | Título en euskera |
| `title_es` | text | Título en castellano |
| `body_eu` | text | Cuerpo en euskera |
| `body_es` | text | Cuerpo en castellano |
| `author_id` | uuid FK → users | |
| `published_at` | timestamptz | |
| `created_at` | timestamptz | |

---

#### `notifications`
Notificaciones generadas por el sistema para usuarios registrados.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid PK | |
| `user_id` | uuid FK → users | Destinatario |
| `type` | enum | `sanction` \| `result` \| `publication` \| `suspension_warning` |
| `title` | text | |
| `body` | text | |
| `is_read` | boolean | |
| `entity_type` | text | `match` \| `player` \| `publication` (para deep link) |
| `entity_id` | uuid | ID de la entidad relacionada |
| `created_at` | timestamptz | |

---

### Notas de diseño

- **Clasificación:** se calcula en tiempo real a partir de los resultados en `matches` y `match_events`. No se almacena, para evitar inconsistencias.
- **RLS (Row Level Security):** Supabase permite definir políticas por tabla. Ejemplo: un `team_manager` solo puede escribir en `player_registrations` de su `season_team_id`.
- **Bilingüismo en datos de usuario:** los campos de datos del torneo (nombres de equipos, jugadores) son propios, sin traducción. Solo el contenido editorial (`publications`) tiene campos `_eu` / `_es`.
- **Histórico:** al no borrar temporadas ni registros, el histórico queda implícito filtrando por `season_id`.

---

## 9. Arquitectura del proyecto

### Stack y decisiones clave

| Decisión | Elección | Motivo |
|----------|---------|--------|
| **Rendering** | Server Components por defecto | Las páginas públicas (clasificación, resultados) no necesitan interactividad; mejor rendimiento y SEO |
| **Mutaciones** | Server Actions | Formularios de gestión sin API REST explícita; validación Zod en servidor |
| **Rutas protegidas** | Route groups + middleware | Separación limpia entre zona pública, auth y dashboard |
| **i18n** | `[locale]` en la raíz del App Router | Estándar de next-intl con App Router |
| **Auth** | Supabase Auth + middleware | Redirección automática según sesión y rol |
| **Tipos de BD** | Generados por Supabase CLI | `supabase gen types typescript` produce `database.types.ts` |

---

### Estructura de carpetas

```
hft/
├── app/
│   └── [locale]/                    # eu | es
│       ├── layout.tsx               # Layout raíz con proveedor i18n
│       ├── page.tsx                 # Página de inicio
│       │
│       ├── (public)/                # Rutas públicas (sin auth)
│       │   ├── clasificacion/
│       │   │   └── page.tsx
│       │   ├── partidos/
│       │   │   └── page.tsx
│       │   ├── equipos/
│       │   │   ├── page.tsx
│       │   │   └── [id]/page.tsx
│       │   ├── jugadores/
│       │   │   └── [id]/page.tsx
│       │   └── noticias/
│       │       ├── page.tsx
│       │       └── [id]/page.tsx
│       │
│       ├── (auth)/                  # Login / recuperación
│       │   ├── login/page.tsx
│       │   └── recuperar/page.tsx
│       │
│       └── (dashboard)/             # Zona protegida (requiere auth)
│           ├── layout.tsx           # Guard: redirige si no hay sesión
│           │
│           ├── admin/               # Solo rol: admin
│           │   ├── layout.tsx       # Guard: redirige si no es admin
│           │   ├── page.tsx         # Panel de control
│           │   ├── temporadas/
│           │   ├── equipos/
│           │   ├── partidos/
│           │   ├── eliminatorias/
│           │   ├── sanciones/
│           │   ├── publicaciones/
│           │   └── usuarios/
│           │
│           └── equipo/              # Rol: team_manager (su equipo)
│               └── [id]/
│                   └── plantilla/
│
├── components/
│   ├── ui/                          # Componentes shadcn/ui (auto-generados)
│   ├── layout/                      # Header, Footer, Nav, LanguageSwitcher
│   ├── clasificacion/               # Tabla de clasificación, badge de posición
│   ├── partidos/                    # Tarjeta de partido, marcador, calendario
│   ├── bracket/                     # Árbol visual de eliminatorias
│   ├── jugadores/                   # Perfil, stats, tarjetas
│   ├── equipos/                     # Escudo, ficha de equipo
│   └── admin/                       # Formularios y tablas de gestión
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Cliente browser (componentes cliente)
│   │   ├── server.ts                # Cliente server (Server Components / Actions)
│   │   └── middleware.ts            # Cliente para middleware
│   ├── validations/                 # Esquemas Zod por entidad
│   │   ├── match.ts
│   │   ├── player.ts
│   │   ├── team.ts
│   │   └── ...
│   └── utils.ts                     # Helpers: clasificación, sanciones, etc.
│
├── hooks/                           # Custom hooks (solo Client Components)
│   ├── use-session.ts
│   └── use-locale.ts
│
├── types/
│   └── database.types.ts            # Generado por Supabase CLI
│
├── messages/                        # Traducciones i18n
│   ├── eu.json                      # Euskera
│   └── es.json                      # Castellano
│
├── middleware.ts                    # next-intl + Supabase auth (combinados)
│
└── supabase/
    ├── migrations/                  # Migraciones SQL versionadas
    └── seed.sql                     # Datos iniciales de desarrollo
```

---

### Routing y control de acceso

```
/                        → público
/[locale]/clasificacion  → público
/[locale]/partidos       → público
/[locale]/equipos/[id]   → público
/[locale]/jugadores/[id] → público
/[locale]/noticias       → público

/[locale]/login          → solo sin sesión

/[locale]/admin/*        → requiere rol: admin
/[locale]/equipo/[id]/*  → requiere rol: team_manager del equipo [id]
```

El middleware combina:
1. **next-intl** — detecta y redirige al locale correcto
2. **Supabase Auth** — verifica sesión; redirige `/admin/*` y `/equipo/*` si no hay sesión o no tiene el rol adecuado

---

### Flujo de datos típico

```
Server Component
  → lib/supabase/server.ts   (consulta directa a Supabase)
  → renderiza HTML con datos

Client Component (solo donde hay interactividad)
  → Server Action             (mutación con validación Zod)
  → lib/supabase/server.ts   (escritura en BD)
  → revalidatePath()          (refresca la página)
```

No se usa una API REST propia. Las Server Actions actúan como endpoints tipados y seguros.

---

## 10. Pendiente de definir

**Notificaciones:**
- Canales concretos (email, in-app...) y eventos que los disparan
- Idioma de las notificaciones (bilingüe o idioma preferido del usuario)

**Playoffs:**
- Orden de enfrentamientos en la primera ronda de cada bracket (¿posición: 1º vs último...? ¿aleatorio? ¿asignación manual por el admin?)

---

*Documento en construcción — se actualiza progresivamente durante la fase de análisis.*
