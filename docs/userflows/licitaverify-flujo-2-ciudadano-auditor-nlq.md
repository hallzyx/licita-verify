# LicitaVerify — Flujo 2: Ciudadano / auditor con búsqueda en lenguaje natural

Este flujo describe cómo una persona no técnica —ciudadano, periodista, concejal, activista o miembro de una ONG— consulta contrataciones públicas registradas en LicitaVerify sin conocer la sintaxis de `arkiv_query`. El objetivo es transformar datos verificables y estructurados en una experiencia de acceso simple, usando lenguaje natural como interfaz principal y Arkiv como capa verificable de lectura y consulta.[cite:114][cite:86][cite:1]

## Objetivo del flujo

Permitir que un usuario final:

- formule preguntas en lenguaje natural sobre licitaciones;
- obtenga resultados consultables desde Arkiv;
- vea la traducción entre pregunta humana y query estructurada;
- inspeccione documentos, historial y metadatos verificables;
- detecte posibles cambios, inconsistencias o patrones de interés público.

## Perfil del usuario

Usuario tipo:

- ciudadano que quiere entender cómo compra su municipio;
- periodista investigando contrataciones;
- concejal o asesor legislativo buscando evidencia;
- organización de transparencia monitoreando procesos.

Este perfil importa porque los portales públicos de contratación existen, pero suelen ser difíciles de recorrer, especialmente para quienes no manejan el lenguaje administrativo ni los filtros complejos del procedimiento.[cite:86][cite:105]

## Resultado esperado

Al finalizar el flujo, el usuario debe haber logrado al menos una de estas metas:

- encontrar una licitación relevante;
- entender su estado y su historial;
- verificar el documento fuente y su hash;
- detectar una posible irregularidad o dato llamativo;
- compartir evidencia verificable.

## Principios de diseño del flujo

1. **Lenguaje natural primero**: el usuario pregunta como habla.
2. **Transparencia del sistema**: siempre se muestra qué query estructurada se ejecutó.
3. **Verificabilidad visible**: cada resultado tiene vínculo a entidad, hash, fuente y fecha.
4. **Complejidad progresiva**: primero respuesta simple, luego detalle técnico opcional.
5. **No caja negra**: la IA asiste, pero no esconde el origen de los datos ni inventa resultados.

## Vista general del flujo

1. Entrar a la app pública.
2. Escribir una pregunta en lenguaje natural.
3. Ver la traducción a filtros o query Arkiv.
4. Explorar resultados.
5. Abrir el detalle de una licitación.
6. Revisar historial y verificabilidad.
7. Guardar o compartir hallazgos.

## Paso a paso

### 1. Entrada a la app pública

La home pública debe dejar claro que LicitaVerify sirve para consultar contrataciones verificables. La primera interacción no debería pedir al usuario entender expedientes, tipologías legales ni estados administrativos complejos.

**UI mínima:**

- título tipo: “Buscá licitaciones públicas verificables”;
- campo principal de búsqueda;
- ejemplos de preguntas;
- acceso a búsqueda avanzada;
- listado breve de consultas populares.

**Ejemplos visibles:**

- “Mostrame licitaciones de obra pública en Salta”.
- “¿Qué empresas ganaron más adjudicaciones este mes?”.
- “Licitaciones mayores a 100 millones en evaluación”.
- “Expedientes de plazas o veredas adjudicados en 2026”.

### 2. Pregunta en lenguaje natural

El usuario escribe una pregunta libre. Esta es la feature diferencial del producto: la IA interpreta la intención, identifica entidades clave y la traduce a una consulta sobre los attributes indexados en Arkiv. En el track Arkiv, esto encaja muy bien con la idea de IA útil para búsqueda y acceso a datos verificables.[cite:1]

**Ejemplo de input:**

> “Mostrame todas las licitaciones de obra pública de la Municipalidad de Salta adjudicadas este año por más de 100 millones”.

### 3. Traducción a query estructurada

El sistema devuelve dos cosas al mismo tiempo:

- una reformulación simple de la búsqueda;
- la query estructurada que se usará sobre Arkiv.

Esto es importante para generar confianza: el usuario no solo recibe resultados, también entiende cómo fueron obtenidos.

**Ejemplo de interpretación visible:**

- Jurisdicción: `Salta`
- Organismo: `Municipalidad de Salta`
- Rubro: `Obra pública`
- Estado: `adjudicada`
- Año: `2026`
- Monto: `>100M`

**Ejemplo de query conceptual:**

```txt
organismo = "Municipalidad de Salta" && rubro = "Obra pública" && estado = "adjudicada" && montoBucket = ">100M"
```

No hace falta mostrar la sintaxis exacta todo el tiempo, pero sí un panel plegable tipo **“Ver consulta ejecutada”** para demostrar trazabilidad técnica.

### 4. Resultados de búsqueda

La vista de resultados debe priorizar lectura rápida. Cada tarjeta o fila debe responder las preguntas básicas que una persona haría al auditar una compra pública.

**Campos visibles por resultado:**

- objeto de la contratación;
- organismo contratante;
- número de expediente;
- tipo de procedimiento;
- estado actual;
- proveedor adjudicado, si existe;
- monto oficial o adjudicado;
- fecha clave;
- badge de “verificable en Arkiv”.

**Acciones por resultado:**

- Ver detalle.
- Ver historial.
- Ver documento.
- Copiar link verificable.
- Abrir fuente oficial.

### 5. Detalle de una licitación

Cuando el usuario abre un resultado, entra a una pantalla de lectura pública con dos capas: una narrativa y una técnica.

**Bloque narrativo:**

- qué se contrató;
- quién lo publicó;
- en qué estado está;
- por cuánto monto;
- qué proveedor resultó adjudicado, si aplica.

**Bloque técnico/verificable:**

- `entityKey`;
- fecha de publicación en Arkiv;
- hash del documento;
- link a explorer;
- attributes usados para búsqueda;
- enlace a la fuente oficial.

Esto permite que una persona común entienda el caso, mientras que un periodista o auditor puede profundizar y validar por su cuenta.

### 6. Historial e integridad documental

La parte más valiosa del producto no es solo encontrar una licitación, sino seguir su evolución sin sobrescrituras silenciosas. Como Arkiv está pensado para entidades verificables, queryables y con historial auditable, la pantalla debe mostrar una línea de tiempo por eventos.[cite:1]

**Timeline sugerido:**

- `pliego.published`
- `ofertas.opened`
- `evaluacion.issued`
- `adjudicacion.published`
- `contrato.perfected`
- `ampliacion.approved`

Cada evento debe mostrar:

- fecha;
- actor registrante;
- resumen del cambio;
- link a entidad asociada;
- comparación con evento anterior cuando aplique.

### 7. Detección de señales de alerta

El producto gana mucho valor si no solo responde preguntas, sino que también ayuda a identificar cosas raras. No hace falta automatizar “detección de corrupción”, pero sí puede resaltar patrones de interés.

**Alertas posibles en MVP:**

- monto adjudicado muy superior al presupuesto estimado;
- ampliaciones repetidas;
- múltiples adjudicaciones a un mismo proveedor;
- expediente con documentos faltantes;
- cambios de estado con poco contexto documental.

Estas alertas deben presentarse como **señales para revisar**, no como acusaciones.

### 8. Compartir hallazgo verificable

El usuario debe poder compartir un hallazgo con contexto y evidencia.

**Formato ideal del bloque compartible:**

- título de la licitación;
- organismo;
- monto;
- estado;
- extracto de la consulta realizada;
- link al detalle público;
- referencia verificable en Arkiv.

Esto es importante para periodistas, redes sociales y trabajo colaborativo de observación ciudadana.

## Estados de la interfaz

### A. Estado vacío

Antes de la búsqueda, mostrar ejemplos sugeridos y categorías rápidas:

- Obra pública
- Servicios
- Bienes
- Salud
- Educación
- Contrataciones mayores a 100M

### B. Estado con resultados

Mostrar tarjetas limpias con filtros activos arriba y opción de refinar la búsqueda sin reescribir todo.

### C. Estado sin resultados

No decir solo “sin resultados”. Mostrar:

- cómo interpretó la IA la consulta;
- qué filtros pueden estar bloqueando resultados;
- sugerencias alternativas.

**Ejemplo:**

> “No se encontraron adjudicaciones de obra pública en Salta por más de 500M. Probá ampliar a toda la provincia o quitar el filtro de estado”.

### D. Estado de ambigüedad

Si la pregunta es ambigua, la app debe pedir aclaración.

**Ejemplo:**

> “¿Te referís a Municipalidad de Salta o Provincia de Salta?”

Esto es mejor que inventar una interpretación incorrecta.

## Mapeo de intención → attributes Arkiv

| Intención del usuario | Attribute sugerido |
|---|---|
| Municipio o organismo | `organismo` |
| Provincia o jurisdicción | `jurisdiccion` |
| Tipo de contratación | `tipoProcedimiento` |
| Rubro | `rubro` |
| Estado | `estado` |
| Proveedor | `proveedorAdjudicado` |
| Rango de monto | `montoBucket` |
| Año o fecha | `fechaPublicacion`, `anio` |
| Tipo de evento | `eventType` |
| Expediente puntual | `expediente` |

Este mapping hace que la IA no dependa de respuestas libres, sino de una estructura consistente para traducir preguntas a consultas repetibles.

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| La IA interpreta mal la intención | Mostrar interpretación y permitir editar filtros antes de ejecutar |
| El usuario cree que la IA “inventó” resultados | Exponer query/filtros y enlazar a entidades verificables |
| El lenguaje legal abruma | Usar resúmenes claros y glosario progresivo |
| Demasiados resultados | Ordenar por relevancia y ofrecer refinamiento guiado |
| Sin resultados por filtros estrictos | Sugerencias automáticas de relajación de filtros |

## Criterios de éxito del flujo

Este flujo está bien resuelto si logra:

1. que una persona sin conocimientos técnicos encuentre una licitación en menos de 60 segundos;
2. que entienda por qué apareció ese resultado;
3. que pueda verificar el documento y su rastro en Arkiv;
4. que perciba que la IA facilita el acceso, pero no reemplaza la evidencia verificable.[cite:1]

## Qué mostrar en demo

En la demo del hackathon, este flujo debería verse así:

1. El usuario escribe una pregunta natural.
2. La app muestra cómo la entendió.
3. Ejecuta la búsqueda en Arkiv.
4. Devuelve resultados con badge verificable.
5. Se abre una licitación.
6. Se muestra historial + `entityKey` + hash + fuente.

Ese recorrido comunica de inmediato el diferencial del producto: **datos públicos verificables accesibles con una interfaz humana**. Eso convierte a Arkiv en el núcleo del valor, no en una capa técnica oculta.[cite:1]
