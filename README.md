# LicitaVerify

> **Transparencia y auditoría ciudadana sobre procesos de contratación pública, anclados en [ARKIV].**

LicitaVerify es una plataforma que registra cada hito de una licitación pública en una bitácora inalterable y verificable, permitiendo que entidades, proveedores, auditores y la ciudadanía vean qué pasó, cuándo y quién hizo cada cambio.

---

## Track del Hackathon

**[ARKIV] × PunaTech — Aplicaciones de IA sobre [ARKIV]**

Vertical: **Procedencia y auditoría de IA** — LicitaVerify usa [ARKIV] como capa de datos inmutable para registrar, consultar y verificar procesos de contratación pública. Cada licitación es una entidad con atributos tipados, propiedad por wallet y expiración deliberada. La IA (DeepSeek) interpreta consultas en lenguaje natural y las traduce en queries estructurados sobre [ARKIV].

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-------------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| **Capa de datos** | [ARKIV] SDK (`@arkiv-network/sdk@0.6.8`) sobre Arkiv Testnet (Braga) |
| **IA** | DeepSeek (via OpenAI SDK) — interpretación de lenguaje natural a queries [ARKIV] |
| **Bot** | Telegram Bot (grammy) para consultas desde móvil |
| **Estilo** | Material Design 3 — tokens de color, tipografía y componentes |
| **Lenguaje** | TypeScript |

---

## Integración con [ARKIV]

### Esquema de entidades

Cada licitación se almacena como una **entidad [ARKIV]** con atributos tipados:

```
entityType: "pliego"
project:   "licita-verify-v1"       ← PROJECT_ATTRIBUTE (namespace global)
```

**Atributos** (filtros consultables):

| Atributo | Tipo | Descripción |
|----------|------|-------------|
| `project` | string | Namespace del proyecto (`licita-verify-v1`) |
| `entityType` | string | Tipo de entidad (`pliego`) |
| `rubro` | string | Categoría del bien/servicio |
| `organismo` | string | Entidad contratante |
| `jurisdiccion` | string | Jurisdicción |
| `tipoProcedimiento` | string | Tipo de procedimiento |
| `estado` | string | Estado (convocada, adjudicada, etc.) |
| `presupuestoOficial` | number | Monto estimado (consultable por rango) |
| `fechaConvocatoria` | number | Timestamp de convocatoria |
| `fechaApertura` | number | Timestamp de apertura |

**Payload**: JSON completo con todos los campos del expediente (expediente, objeto, criterio de adjudicación, proveedor adjudicado, fuente URL, hash del documento).

### Consultas implementadas

- **Filtro por atributos**: `where(eq("project", "licita-verify-v1"))` + filtros temáticos (rubro, organismo, estado, jurisdicción, tipo de procedimiento)
- **Range queries**: `where(gte("presupuestoOficial", montoMin))`, `where(lte("presupuestoOficial", montoMax))`
- **Timestamp filtering**: `where(gte("fechaConvocatoria", ...))`
- **Consultas en lenguaje natural**: DeepSeek interpreta "licitaciones de obras públicas en Salta con presupuesto mayor a 10 millones" y genera filtros [ARKIV] estructurados

### Modelo de propiedad y expiración

- **`$owner`**: La wallet admin crea y actualiza los pliegos
- **`$creator`**: Inmutable — atribución verificable del origen del dato
- **`expiresIn`**: Diferenciado por tipo — los pliegos activos tienen expiración larga; los datos temporales (p. ej. estados de sesión) tienen expiración corta

### Resiliencia

Todas las llamadas RPC a [ARKIV] incluyen `withRetry()` con reintentos automáticos ante errores transitorios (`context cancelled`, `timeout`).

---

## Funcionalidad

### Flujos principales

1. **Búsqueda manual** (`/manual`): Filtrado por rubro, organismo, jurisdicción, tipo, estado y rango de presupuesto
2. **Chat en lenguaje natural** (`/chat`): Interpretación IA de consultas en español, traducción a queries [ARKIV]
3. **Detalle de licitación** (`/licitacion/[entityKey]`): Vista completa con verificación criptográfica (entity key, bloque, creator)
4. **Admin** (`/admin/dashboard`): Panel de gestión con creación de nuevas licitaciones

### Manejo de errores

- Retry automático en llamadas [ARKIV]
- Estados de error visibles (404, 502)
- Skeleton loading durante consultas
- Validación de formularios con Zod

### Abstracción de blockchain

El usuario no necesita saber nada de [ARKIV], wallets ni blockchain para navegar y consultar licitaciones. La sección de **Verificabilidad** en la ficha de cada licitación muestra los datos criptográficos de forma accesible y con botón de copiar.

---

## Diseño y UX

- **Material Design 3** como sistema de diseño
- Tipografía: Hanken Grotesk (headlines) + Inter (body) + Material Symbols (iconos)
- Layout responsive: grid 8+4 columnas en desktop, stacked en mobile
- Estados de carga, error y vacío con iconos Material
- Panel de Verificabilidad con borde verde y datos on-chain accesibles
- Colores institucionales: primario navy, secundario esmeralda, errores rojo

---

## Capturas de pantalla

> *(Adjuntar en el video de demo)*

---

## Quick Start

### Prerrequisitos

- Node.js 18+
- npm o pnpm

### Instalación

```bash
# Clonar el repo
git clone https://github.com/hallzyx/licita-verify.git
cd licita-verify

# Instalar dependencias del frontend
cd frontend
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con:
#   ARKIV_ADMIN_PRIVATE_KEY=0x...  (wallet admin para escribir)
#   DEEPSEEK_API_KEY=sk-...         (API key de DeepSeek)
#   OPENAI_BASE_URL=https://api.deepseek.com (opcional)

# Iniciar en modo desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

### Variables de entorno

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `ARKIV_ADMIN_PRIVATE_KEY` | Private key de la wallet admin para escribir entidades | Sí |
| `DEEPSEEK_API_KEY` | API key para consultas de IA en lenguaje natural | Sí |
| `OPENAI_BASE_URL` | Base URL del provider de IA (default: `https://api.deepseek.com`) | No |
| `ARKIV_EXPLORER_URL` | URL del explorer de Arkiv (default: `https://explorer.braga.arkiv.network`) | No |

---

## Estructura del proyecto

```
licita-verify/
├── frontend/                  # App Next.js
│   ├── app/
│   │   ├── page.tsx           # Homepage
│   │   ├── manual/page.tsx    # Búsqueda manual con filtros
│   │   ├── chat/page.tsx      # Chat IA en lenguaje natural
│   │   ├── licitacion/[entityKey]/page.tsx  # Detalle de licitación
│   │   ├── admin/             # Panel admin (login, dashboard, nueva)
│   │   ├── api/
│   │   │   ├── arkiv/         # API routes directas a [ARKIV]
│   │   │   ├── ai/search/     # Endpoint de búsqueda IA
│   │   │   └── public/        # API pública para frontend
│   │   ├── globals.css        # Tokens MD3 (colores, tipografía, spacing)
│   │   └── layout.tsx         # Layout raíz con fuentes
│   ├── components/
│   │   ├── ChatBot.tsx        # Componente de chat con IA
│   │   ├── FilterPanel.tsx    # Panel de filtros MD3
│   │   ├── ResultCard.tsx     # Tarjeta de resultado MD3
│   │   └── ui/                # Componentes UI (Badge, Button, Input, Select, CopyButton)
│   └── lib/
│       ├── arkiv/client.ts    # Cliente [ARKIV] con withRetry
│       └── ai-search.ts      # Prompt y parser de consultas IA
├── agent/                     # Bot de Telegram (grammy)
├── arkiv-mcp/                 # MCP server para [ARKIV]
└── docs/                      # Documentación de producto y user flows
```

---

## Equipo

| Integrante | GitHub | Rol |
|------------|--------|-----|
| Hallzyx | [@hallzyx](https://github.com/hallzyx) | Full-stack developer |

---

## Licencia

MIT — ver [LICENSE](./LICENSE).