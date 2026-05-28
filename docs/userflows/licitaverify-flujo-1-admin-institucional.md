# LicitaVerify — Flujo 1: Administrador institucional

Este flujo describe cómo un operador de municipio, organismo público u ONG registra una licitación en LicitaVerify y la publica en Arkiv con trazabilidad verificable. El diseño se apoya en la estructura real de las contrataciones electrónicas en Argentina, donde cada procedimiento debe estar asociado a un Expediente Electrónico y a documentación del proceso, incluyendo pliegos y actos posteriores.[cite:114][cite:111]

## Objetivo del flujo

Permitir que un usuario institucional:

- registre una licitación o procedimiento de contratación;
- capture los datos mínimos legales y operativos del proceso;
- publique el pliego y sus metadatos en Arkiv;
- deje un historial verificable por etapas;
- habilite luego la consulta ciudadana y las búsquedas por lenguaje natural.

## Perfil del usuario

Usuario tipo: analista administrativo, responsable de contrataciones, auditor interno o miembro de una ONG de transparencia que documenta procedimientos públicos. En el ecosistema argentino, estos actores trabajan sobre portales de contratación, expedientes electrónicos y documentación pública asociada al procedimiento.[cite:86][cite:114]

## Resultado esperado

Al finalizar el flujo, el sistema debe haber creado al menos una entidad en Arkiv para la etapa inicial del procedimiento, con:

- payload JSON completo;
- attributes indexables para consultas;
- hash verificable del documento fuente;
- referencia al organismo, expediente, tipo de procedimiento y estado.

## Vista general del flujo

1. Ingresar al panel institucional.
2. Crear nuevo expediente/lictación.
3. Completar datos legales mínimos.
4. Adjuntar documento o pegar texto base.
5. Ejecutar extracción asistida por IA.
6. Validar y corregir campos.
7. Publicar en Arkiv.
8. Ver detalle e historial del registro.

## Paso a paso

### 1. Ingreso al panel institucional

El usuario entra al panel privado y selecciona **Nueva licitación**. Desde producto, esta pantalla debe dejar claro que no se está “subiendo un PDF a una nube”, sino generando una publicación verificable y consultable en Arkiv.

**UI mínima:**

- botón “Nueva licitación”;
- tabla de procesos recientes;
- filtros por organismo, estado y fecha;
- indicador de entidades publicadas en Arkiv.

### 2. Crear expediente o proceso

El sistema pide primero los identificadores base del procedimiento, porque en Argentina la contratación electrónica se vincula a un Expediente Electrónico y a un proceso formal de compra o contratación.[cite:114]

**Campos obligatorios iniciales:**

- Número de expediente electrónico.
- Organismo contratante.
- Jurisdicción o provincia.
- Tipo de procedimiento.
- Rubro principal.
- Objeto resumido de la contratación.

**Ejemplo:**

- Expediente: `EX-2026-00123456- -MUNSALTA-OBRAS`
- Organismo: `Municipalidad de Salta`
- Tipo: `Licitación pública`
- Rubro: `Obra pública`
- Objeto: `Remodelación de plaza barrial y veredas perimetrales`

### 3. Completar ficha legal mínima

Luego el usuario completa la ficha del procedimiento con los datos que más importan para auditar transparencia y evolución del proceso. El sistema COMPR.AR y los pliegos de licitación pública estructuran la contratación alrededor del procedimiento, la documentación de bases y condiciones, la apertura y la adjudicación.[cite:114][cite:106][cite:113]

**Campos recomendados para el MVP:**

| Campo | Tipo | Obligatorio | Motivo |
|---|---|---:|---|
| Número de expediente | Texto | Sí | Identifica el trámite formal.[cite:114] |
| Organismo contratante | Texto | Sí | Identifica quién compra o contrata.[cite:114] |
| Tipo de procedimiento | Select | Sí | Licitación pública, privada, contratación directa, etc.[cite:107][cite:114] |
| Objeto de contratación | Texto largo | Sí | Resume qué se contrata.[cite:113] |
| Rubro | Select | Sí | Obra, bienes, servicios, consultoría. |
| Fecha de convocatoria | Fecha | Sí | Marca el inicio del proceso. |
| Fecha/hora de apertura | Fecha-hora | Sí | Punto de control del procedimiento.[cite:114] |
| Presupuesto oficial o estimado | Número | Recomendado | Permite auditoría de montos. |
| Criterio de adjudicación | Texto corto | Recomendado | Explica cómo se decide el ganador. |
| Estado del proceso | Select | Sí | Convocada, evaluación, adjudicada, desierta, etc. |
| Fuente oficial | URL | Sí | Vincula con el origen documental. |

### 4. Adjuntar documento o pegar texto

En esta etapa el usuario puede:

- subir el PDF del pliego o resolución;
- pegar texto del documento;
- cargar un enlace oficial.

Para hackathon, conviene soportar las tres opciones. Eso hace que el producto funcione tanto con portales modernos como con documentos escaneados o publicados de forma irregular, algo realista en contextos municipales.

**Acción del sistema:**

- calcula hash del archivo o del texto normalizado;
- muestra nombre del archivo y peso;
- prepara el contenido para extracción asistida.

### 5. Extracción asistida por IA

La IA no debe inventar información jurídica; debe **proponer** campos estructurados a partir del documento. Esta capa tiene sentido porque los pliegos pueden ser largos y difíciles de leer, mientras que el jurado del track Arkiv valora una IA que aporte utilidad real al flujo.[file:1]

**Lo que hace la IA:**

- detecta expediente;
- identifica organismo;
- sugiere tipo de procedimiento;
- resume objeto;
- extrae fechas visibles;
- detecta monto si aparece;
- propone tags para attributes.

**Lo que no hace:**

- no publica automáticamente;
- no reemplaza validación humana;
- no asume datos faltantes.

### 6. Revisión y validación humana

El usuario revisa cada campo sugerido. Este paso es crítico para reducir riesgo de error y para reforzar que LicitaVerify es una herramienta de transparencia, no un generador automático de registros dudosos.

**UX recomendada:**

- campos con highlight “extraído por IA”;
- badge de confianza por campo: alta, media, baja;
- diff entre texto fuente y dato propuesto;
- checkbox final: “Confirmo que los datos fueron revisados antes de publicar”.

### 7. Publicar en Arkiv

Cuando el usuario confirma, el sistema crea la entidad inicial en Arkiv, idealmente como `licitacion.created` o `pliego.published`. En el track Arkiv es clave que `createEntity` y luego la lectura/consulta sean visibles en la demo.[file:1]

**Payload sugerido:**

```json
{
  "eventType": "pliego.published",
  "expediente": "EX-2026-00123456- -MUNSALTA-OBRAS",
  "organismo": "Municipalidad de Salta",
  "jurisdiccion": "Salta",
  "tipoProcedimiento": "Licitación pública",
  "rubro": "Obra pública",
  "objeto": "Remodelación de plaza barrial y veredas perimetrales",
  "fechaConvocatoria": "2026-05-28",
  "fechaApertura": "2026-06-10T10:00:00-03:00",
  "presupuestoOficial": 185000000,
  "criterioAdjudicacion": "Oferta más conveniente",
  "estado": "convocada",
  "fuenteUrl": "https://...",
  "documentHash": "0x...",
  "documentName": "pliego-bases-condiciones.pdf"
}
```

**Attributes sugeridos:**

```json
[
  { "key": "entityType", "value": "pliego" },
  { "key": "eventType", "value": "pliego.published" },
  { "key": "expediente", "value": "EX-2026-00123456- -MUNSALTA-OBRAS" },
  { "key": "organismo", "value": "Municipalidad de Salta" },
  { "key": "jurisdiccion", "value": "Salta" },
  { "key": "tipoProcedimiento", "value": "Licitación pública" },
  { "key": "rubro", "value": "Obra pública" },
  { "key": "estado", "value": "convocada" },
  { "key": "montoBucket", "value": ">100M" }
]
```

### 8. Confirmación y vista detalle

Luego de publicar, el usuario ve:

- `entityKey`;
- `txHash` o confirmación de publicación;
- resumen del payload;
- atributos indexables;
- historial del expediente;
- botón de “Verificar en explorer”.

La pantalla de detalle también debe mostrar cómo se consultará luego con `getEntity` y con queries filtradas. Eso ayuda mucho en la narrativa del pitch.

## Entidades futuras dentro del mismo expediente

Una sola licitación no debería quedarse en una entidad única. Para trazabilidad real, el expediente puede recibir más eventos:

- `ofertas.opened`
- `evaluacion.issued`
- `adjudicacion.published`
- `contrato.perfected`
- `ampliacion.approved`
- `obra.certificadoAvance`

Esto permite ver el historial sin sobrescribir información, que es exactamente la ventaja frente a una base centralizada editable.[file:1]

## Riesgos y controles del flujo

| Riesgo | Mitigación de producto |
|---|---|
| La IA extrae mal un dato | Validación humana obligatoria antes de publicar |
| El documento viene incompleto | Permitir guardar borrador y publicar luego |
| El usuario no sabe qué tipo de procedimiento elegir | Helper contextual con ejemplos argentinos |
| Se publica una versión incorrecta | No editar silenciosamente; crear nueva entidad correctiva |
| El jurado no entiende Arkiv | Mostrar payload, attributes, `entityKey` y query en la misma demo |

## Criterios de éxito del flujo

El flujo está bien resuelto si logra estas cuatro cosas:

1. El usuario puede registrar una licitación en menos de 3 minutos.
2. La IA reduce carga manual sin reemplazar el control humano.
3. Arkiv es visible como parte central del proceso y no como una capa decorativa.[file:1]
4. El registro queda listo para ser consultado luego por ciudadanos mediante filtros o lenguaje natural.

## Qué mostrar en la demo

Para una demo de hackathon, este flujo debería terminar con una secuencia clara:

- crear licitación;
- extraer datos con IA;
- publicar en Arkiv;
- ver `entityKey`;
- consultar el mismo expediente desde una búsqueda.

Esa secuencia demuestra integración real, utilidad concreta y una diferencia nítida frente a una planilla o base de datos que puede alterarse sin dejar rastro.[file:1]
