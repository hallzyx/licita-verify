# LicitaVerify

> **Transparencia y auditoría ciudadana sobre procesos de contratación pública, anclados en [ARKIV].**

LicitaVerify es una plataforma que registra cada hito de una licitación pública en una bitácora inalterable y verificable, permitiendo que entidades, proveedores, auditores y la ciudadanía vean qué pasó, cuándo y quién hizo cada cambio.

📺 **Pitch:** [youtube.com/watch?v=9bYCp1oG_NE](https://www.youtube.com/watch?v=9bYCp1oG_NE)
🎥 **Demo:** [youtube.com/watch?v=HaGdi7J3W64](https://www.youtube.com/watch?v=HaGdi7J3W64)

---

## Track del Hackathon

**[ARKIV] × PunaTech — Aplicaciones de IA sobre [ARKIV]**

Vertical: **Procedencia y auditoría de IA** — LicitaVerify usa [ARKIV] como capa de datos inmutable para registrar, consultar y verificar procesos de contratación pública. Cada licitación es una entidad con atributos tipados, propiedad por wallet y expiración deliberada. La IA (DeepSeek) interpreta consultas en lenguaje natural y las traduce en queries estructurados sobre [ARKIV].

---

## Demo en Arkiv Explorer

Entidad de licitación registrada en Arkiv Testnet:

👉 [Ver entidad en Arkiv Explorer](https://explorer.braga.hoodi.arkiv.network/entity/0x09b5b2b77a8d19105f662f2fc1bba70bf5ed0ab6119e503d074f454c8bf05f9f)

---

## Stack Tecnológico

| Capa | Tecnología |
|------|-------------|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| **Capa de datos** | [ARKIV] SDK (`@arkiv-network/sdk@0.6.8`) sobre Arkiv Testnet (Braga) |
| **IA** | DeepSeek (via OpenAI SDK) — interpretación de lenguaje natural a queries [ARKIV] |
| **Bot de Telegram** | grammy + ai-sdk v6 — agente autónomo que consulta [ARKIV] vía MCP |
| **MCP Server** | Python FastMCP — puente entre el agente de IA y [ARKIV] RPC |
| **Estilo** | Material Design 3 — tokens de color, tipografía y componentes |
| **Lenguaje** | TypeScript (frontend + agente), Python (MCP server) |

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
- **`expiresIn`**: Diferenciado por tipo — los pliegos activos tienen expiración larga; los datos temporales tienen expiración corta. Refleja lógica de producto real.

### Resiliencia

Todas las llamadas RPC a [ARKIV] incluyen `withRetry()` con reintentos automáticos ante errores transitorios (`context cancelled`, `timeout`).

---

## Bot de Telegram — Agente Autónomo con MCP

LicitaVerify incluye un **bot de Telegram** que actúa como agente autónomo de IA:

1. El usuario escribe consultas en lenguaje natural en Telegram
2. El agente (DeepSeek vía ai-sdk v6) interpreta la intención y los filtros
3. Se conecta al **MCP Server** (Python/FastMCP) que expone `arkiv_search` y `arkiv_get_entity`
4. El MCP Server ejecuta queries estructurados contra [ARKIV] RPC
5. El agente devuelve resultados formateados con botones inline para ver detalles

**Arquitectura:**

```
Usuario (Telegram) → Bot (grammy) → Agente IA (ai-sdk + DeepSeek)
                                            ↓
                                    MCP Client (@ai-sdk/mcp)
                                            ↓
                                    MCP Server (Python/FastMCP)
                                            ↓
                                    Arkiv RPC (Braga testnet)
```

**Tools del MCP Server:**
- `arkiv_search`: Buscar licitaciones con filtros (rubro, estado, organismo, jurisdicción, monto)
- `arkiv_get_entity`: Obtener detalle completo de una licitación por entity key

---

## MCP Server (Python/FastMCP)

Servidor MCP independiente que actúa como puente entre el agente de IA y [ARKIV]:

```bash
cd arkiv-mcp
uv run src/server.py
```

Variables de entorno (`arkiv-mcp/.env`):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ARKIV_RPC_URL` | RPC endpoint de Arkiv | `https://braga.hoodi.arkiv.network/rpc` |
| `ARKIV_EXPLORER_URL` | Explorer URL | `https://explorer.braga.hoodi.arkiv.network` |

---

## Funcionalidad

### Flujos principales

1. **Búsqueda manual** (`/manual`): Filtrado por rubro, organismo, jurisdicción, tipo, estado y rango de presupuesto
2. **Chat en lenguaje natural** (`/chat`): Interpretación IA de consultas en español, traducción a queries [ARKIV]
3. **Detalle de licitación** (`/licitacion/[entityKey]`): Vista completa con verificación criptográfica (entity key, bloque, creator)
4. **Bot de Telegram**: Consultas desde móvil en lenguaje natural con respuestas inline y botones de detalle
5. **Admin** (`/admin/dashboard`): Panel de gestión con creación de nuevas licitaciones en [ARKIV]

### Manejo de errores

- Retry automático en llamadas [ARKIV] (hasta 2 reintentos con backoff)
- Estados de error visibles (404, 502)
- Skeleton loading durante consultas
- Validación de formularios con Zod
- Mensajes claros de error en el bot de Telegram

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

## Quick Start

### Prerrequisitos

- Node.js 18+
- Python 3.11+ (para MCP server)
- npm o pnpm

### Instalación

```bash
# Clonar el repo
git clone https://github.com/hallzyx/licita-verify.git
cd licita-verify

# ── Frontend ──
cd frontend
npm install
cp .env.example .env.local
# Editar .env.local con las variables (ver abajo)
npm run dev

# ── MCP Server (requerido para el bot de Telegram) ──
cd ../arkiv-mcp
uv sync
cp .env.example .env
# Editar .env con las variables del MCP server

# ── Agente de Telegram ──
cd ../agent
npm install
cp .env.example .env
# Editar .env con las variables del agente
npm run agent
```

Abrir [http://localhost:3000](http://localhost:3000) para el frontend.

### Variables de entorno

**Frontend** (`frontend/.env.local`):

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `ADMIN_PASSWORD` | Password para el panel admin | Sí |
| `ARKIV_ADMIN_PRIVATE_KEY` | Private key de la wallet admin para escribir entidades | Sí |
| `ARKIV_RPC_URL` | RPC endpoint de Arkiv | No (default: `https://rpc.braga.arkiv.network`) |
| `ARKIV_EXPLORER_URL` | URL base del explorer (sin `/entity`) | No (default: `https://data.arkiv.network`) |
| `OPENAI_API_KEY_OCR` | API key de OpenAI para extracción OCR | Sí (para admin) |
| `DEEPSEEK_API_KEY_LLM` | API key de DeepSeek para búsqueda IA | Sí (para /chat) |
| `TELEGRAM_BOT_TOKEN` | Token del bot de Telegram | No (solo para bot) |

**MCP Server** (`arkiv-mcp/.env`):

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `ARKIV_RPC_URL` | RPC endpoint de Arkiv | `https://braga.hoodi.arkiv.network/rpc` |
| `ARKIV_EXPLORER_URL` | Explorer URL | `https://explorer.braga.hoodi.arkiv.network` |

**Agente de Telegram** (`agent/.env`):

| Variable | Descripción | Obligatoria |
|----------|-------------|-------------|
| `TELEGRAM_BOT_TOKEN` | Token del bot de @BotFather | Sí |
| `DEEPSEEK_API_KEY_LLM` | API key de DeepSeek para el agente IA | Sí |
| `ARKIV_RPC_URL` | RPC endpoint de Arkiv | No (default: `https://rpc.braga.arkiv.network`) |
| `ARKIV_EXPLORER_URL` | Explorer URL | No (default: `https://data.arkiv.network`) |

---

## Estructura del proyecto

```
licita-verify/
├── frontend/                  # App Next.js
│   ├── app/
│   │   ├── page.tsx           # Homepage
│   │   ├── manual/page.tsx   # Búsqueda manual con filtros
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
│   │   └── ui/               # Componentes UI (Badge, Button, Input, Select, CopyButton)
│   ├── lib/
│   │   ├── arkiv/client.ts    # Cliente [ARKIV] con withRetry
│   │   └── ai-search.ts     # Prompt y parser de consultas IA
│   └── .env.example           # Variables de entorno del frontend
├── agent/                     # Bot de Telegram (grammy + ai-sdk v6)
│   ├── src/
│   │   ├── index.ts          # Bot entry point, handlers y memoria de sesión
│   │   ├── agent.ts           # Agente autónomo con DeepSeek
│   │   ├── mcp-client.ts     # Cliente MCP (@ai-sdk/mcp)
│   │   └── formatters.ts     # Formateo de respuestas
│   └── .env.example           # Variables de entorno del agente
├── arkiv-mcp/                 # MCP Server (Python/FastMCP)
│   ├── src/server.py          # Tools: arkiv_search, arkiv_get_entity
│   ├── pyproject.toml
│   └── .env.example           # Variables de entorno del MCP
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