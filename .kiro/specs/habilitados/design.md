# Diseño: Cursos habilitados para matrícula

## Overview

Se añade el endpoint `POST /habilitados` al servicio existente. Recibe la lista de cursos aprobados por un alumno y devuelve todos los cursos de la malla cuyo array `prerequisites` esté completamente contenido en ese conjunto y cuyo `id` no figure en él. La lógica de acceso a datos reutiliza `repositorio.js` sin modificación estructural; la validación de entrada se centraliza en un helper nuevo.

---

## Architecture

El endpoint sigue la misma arquitectura en capas del servicio existente:

```
Petición HTTP
   │
   ▼
req.is('application/json')  ← verificación de Content-Type en la ruta (paso 1)
   │  si false/null → 400
   ▼
express.json()              ← middleware de parseo de body
   │  si JSON malformado → err.type === 'entity.parse.failed' → 400 (middleware global)
   ▼
src/routes/habilitados.js   ← validación de entrada + filtro + serialización
   │
   ├── src/util/validarAprobados.js  ← helper de validación (pasos 2–5)
   │       recibe (aprobados, catalogoSet)
   │
   └── src/data/repositorio.js       ← listar() — catálogo en memoria
          (llamado una sola vez, en el paso 6)
   │
   ▼
Middleware de error global (src/app.js)
   │
   ▼
Respuesta HTTP (200 / 400 / 500)
```

### Algoritmo de habilitación

La ruta ejecuta los pasos en el siguiente orden:

1. **Verificación de Content-Type**: la ruta comprueba `req.is('application/json')` antes de leer el body. Si el resultado es `false` o `null`, la ruta responde inmediatamente con HTTP 400 y `{ "error": "el cuerpo debe ser JSON válido" }` sin invocar `express.json()`. El middleware global de error sigue interceptando `err.type === 'entity.parse.failed'` para JSON malformado con Content-Type correcto.
2. **Presencia y tipo de `aprobados`**: si `req.body.aprobados` no existe o no es array, retornar 400 con `{ "error": "el campo aprobados es requerido y debe ser un array" }`.
3. **Límite de tamaño**: si `aprobados.length > 100`, retornar 400 inmediatamente, antes de deduplicar o consultar el repositorio, con `{ "error": "aprobados no puede contener más de 100 elementos" }`.
4. **Tipo de elementos**: recorrer el array; si algún elemento no es `string`, retornar 400 con `{ "error": "cada elemento de aprobados debe ser una cadena de texto" }`.
5. **Formato de código**: recorrer el array; si algún elemento no cumple `^(?:[0-9][A-Z]{3}[0-9]{2}|[A-Z]{3}[0-9]{3})$`, retornar 400 con `{ "error": "formato de código inválido" }` (sin incluir el elemento en la respuesta).
6. **Existencia en catálogo**: llamar a `repositorio.listar()` una sola vez y guardar el resultado en una constante. Construir un `Set` de IDs (`catalogoSet`) a partir de ese array. Si algún elemento de `aprobados` no está en `catalogoSet`, retornar 400 con `{ "error": "código de curso desconocido" }`.
7. **Deduplicación**: convertir `aprobados` en un `Set` (`aprobadosSet`) para eliminar duplicados silenciosamente.
8. **Filtro**: sobre la constante del paso 6, retener únicamente los cursos donde `prerequisites.every(p => aprobadosSet.has(p))` y `!aprobadosSet.has(curso.id)`.
9. **Serialización**: mapear cada curso habilitado a `{ id, name, credits, cycle, type, prerequisites }` donde `prerequisites` es el array de IDs del JSON fuente.

---

## Components and Interfaces

| Módulo | Estado | Responsabilidad |
|---|---|---|
| `src/routes/habilitados.js` | Nuevo | Define `POST /habilitados`. Verifica Content-Type, orquesta validación, cálculo del filtro y serialización de la respuesta. No accede a `cursos.json` directamente. |
| `src/util/validarAprobados.js` | Nuevo | Encapsula las reglas de validación del campo `aprobados` para los pasos 2–5 (tipo de campo, longitud, tipo de elementos, formato). Recibe `(aprobados, catalogoSet)` donde `catalogoSet` es un `Set` de IDs ya construido por la ruta; el helper no llama a `listar()` internamente. Devuelve `{ ok: true }` o `{ ok: false, status, error }`. Separarlo de la ruta facilita el test unitario aislado y mantiene la ruta legible. |
| `src/data/repositorio.js` | Sin cambios | Se reutiliza `listar()` para obtener el catálogo completo. No se añade función nueva. |
| `src/app.js` | Modificado (una línea + middleware de error) | Monta el nuevo router con `app.use('/habilitados', require('./routes/habilitados'))`. El middleware de error global se amplía para interceptar errores de parseo de `express.json()` (tipo `entity.parse.failed`) y devolver 400 con `{ "error": "el cuerpo debe ser JSON válido" }`. |

> **Nota importante**: La ruta llama a `repositorio.listar()` una sola vez, después de las validaciones de tipo, tamaño y formato (pasos 2–5), y reutiliza el array resultante tanto para construir el `catalogoSet` de validación de existencia (paso 6) como para el filtro de habilitación (paso 8).

### Decisiones de componentes

> **Decisión — reusar `listar()`**: el repositorio ya expone el catálogo completo sin necesidad de una nueva función. Añadir `listarTodos()` sería un alias sin valor añadido.

> **Decisión — extraer `validarAprobados.js`**: la cadena de validación tiene reglas ordenadas propensas a cambiar. Dejarlas inline mezcla lógica de negocio con lógica HTTP y dificulta el test unitario aislado del helper.

> **Decisión — `prerequisites` como array de strings en la respuesta**: `GET /cursos/:codigo` expande prerrequisitos a `[{ id, name }]`. Para `POST /habilitados` los requisitos especifican solo los campos `id, name, credits, cycle, type, prerequisites` sin indicar expansión. Se devuelve el array de IDs tal como está en el JSON fuente, coherente con `GET /cursos` (listado base).

> **Decisión — modificar el middleware de error global**: ampliar el handler existente para interceptar errores de parseo de `express.json()` es preferible a añadir un middleware local en la ruta, porque centraliza el manejo y aplica a todas las rutas.

> **Decisión — verificación de Content-Type en la ruta**: comprobar `req.is('application/json')` como primer paso del handler garantiza que se rechaza con 400 cualquier petición con Content-Type incorrecto antes de que `express.json()` intente parsear el body. Esto cubre el hallazgo de seguridad #2 variante (body JSON válido enviado como `text/plain`).

### Contrato del endpoint

**Request**

```
POST /habilitados
Content-Type: application/json

{ "aprobados": ["1INF25", "1INF27", "1INF49"] }
```

**Respuesta exitosa — HTTP 200**

```json
[
  {
    "id": "1INF29",
    "name": "Nombre del curso",
    "credits": 4.0,
    "cycle": 6,
    "type": "obligatorio",
    "prerequisites": ["1INF25"]
  }
]
```

El array tiene exactamente 27 elementos para la entrada del ejemplo. Puede ser vacío (`[]`) cuando ningún curso cumple la condición.

---

## Data Models

No se introducen modelos de datos nuevos. El endpoint trabaja exclusivamente con la forma de curso existente definida en el steering:

```json
{
  "id": "1INF30",
  "name": "Programación 3",
  "credits": 5.0,
  "cycle": 6,
  "type": "obligatorio",
  "prerequisites": ["1INF25"]
}
```

**Reglas del campo `aprobados` (cuerpo de la petición):**

- Tipo: array de strings.
- Longitud: 0 a 100 elementos (inclusive).
- Cada elemento: cadena de exactamente 6 caracteres que cumple el patrón `^(?:[0-9][A-Z]{3}[0-9]{2}|[A-Z]{3}[0-9]{3})$` (p. ej. `1INF25`, `INF238`, `IDM201`).
- Cada elemento debe corresponder a un `id` existente en `data/cursos.json`.
- Duplicados se aceptan y se deduplicán silenciosamente.

**Respuesta:** array (posiblemente vacío) de objetos con los mismos campos que el modelo de curso, donde `prerequisites` es un array de strings (IDs), no de objetos.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Estas propiedades se verifican con **Jest + test.each + casos deterministas**; no se usa un generador de datos aleatorios. Cada propiedad se implementa como uno o más casos de prueba con entradas concretas elegidas para cubrir las variantes representativas del espacio de entradas.

### Property 1: La respuesta tiene la forma correcta

*For any* conjunto válido de códigos aprobados, cada elemento del array devuelto por `POST /habilitados` debe contener exactamente los campos `id`, `name`, `credits`, `cycle`, `type` y `prerequisites`.

**Validates: Requirements 1.1**

### Property 2: El filtro cumple el predicado de habilitación

*For any* subconjunto de IDs del catálogo enviado como `aprobados`, todos los cursos devueltos deben satisfacer `prerequisites ⊆ aprobados` y `id ∉ aprobados`; y ningún curso excluido debe satisfacer ambas condiciones simultáneamente.

**Validates: Requirements 1.2, 1.4**

### Property 3: Idempotencia de la deduplicación

*For any* array de códigos válidos, añadir copias duplicadas de cualquier elemento no debe cambiar el resultado devuelto por `POST /habilitados`.

**Validates: Requirements 2.4**

### Property 4: Rechazo no reflexivo de formatos inválidos

*For any* cadena que no cumpla el patrón `^(?:[0-9][A-Z]{3}[0-9]{2}|[A-Z]{3}[0-9]{3})$`, el endpoint debe responder HTTP 400 con el mensaje fijo `{ "error": "formato de código inválido" }` y el cuerpo de la respuesta no debe contener la cadena enviada.

**Validates: Requirements 3.5, 4.3**

---

## CI/CD Gates

> Los tres jobs son independientes. Un fallo en `sca` no impide que `secrets` se ejecute, y viceversa.

### Job 1: `build` (existente)

- **Trigger**: push a `main`, PR hacia `main`
- **Herramienta**: Jest (versión configurada en `package.json`) + supertest
- **Pasos**:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` (Node 22, cache npm)
  3. `npm ci`
  4. `npm test -- --coverage`
- **Umbral**: cobertura de líneas ≥ 80 % (configurado en `jest.config.js`)
- **Efecto bloqueante**: el job falla si algún test falla o si la cobertura cae por debajo del 80 %
- **Justificación**: la política de TI exige cobertura mínima del 80 % para detectar regresiones en producción

### Job 2: `sca` (nuevo)

- **Trigger**: push a `main`, PR hacia `main`
- **Herramienta**: `npm audit` (integrado en npm, versión npm@10+ incluida en Node 22)
- **Pasos**:
  1. `actions/checkout@v4`
  2. `actions/setup-node@v4` (Node 22, cache npm)
  3. `npm ci`
  4. `npm audit --audit-level=high`
- **Umbral**: ninguna vulnerabilidad de severidad alta o crítica en las dependencias
- **Efecto bloqueante**: `npm audit` retorna exit code 1 si encuentra vulnerabilidades altas o críticas; el job falla. No se usa `continue-on-error`.
- **Justificación**: la política de TI prohíbe desplegar dependencias con vulnerabilidades altas o críticas

### Job 3: `secrets` (nuevo)

- **Trigger**: push a `main`, PR hacia `main`
- **Herramienta**: Gitleaks CLI `v8.30.1` (imagen oficial `ghcr.io/gitleaks/gitleaks:v8.30.1`)
- **Pasos**:
  1. `actions/checkout@v4`
  2. Crear directorio temporal: `mkdir -p /tmp/gitleaks-src`
  3. Exportar archivos versionados del commit actual: `git archive HEAD | tar -x -C /tmp/gitleaks-src`
  4. Ejecutar Gitleaks CLI:
     ```
     docker run --rm -v /tmp/gitleaks-src:/path ghcr.io/gitleaks/gitleaks:v8.30.1 dir /path --redact --exit-code 1
     ```
- **Umbral**: cero secretos detectados en el snapshot del commit actual
- **Efecto bloqueante**: Gitleaks retorna exit code 1 si detecta secretos; el job falla. No se usa `continue-on-error`.
- **Limitación documentada**: este modo escanea únicamente los archivos del commit actual (`git archive HEAD`). No analiza el historial Git completo. Si se comprometió un secreto en un commit anterior y se eliminó en uno posterior, este gate no lo detectará.
- **Justificación**: la política de TI prohíbe secretos en el repositorio. Se usa imagen versionada `v8.30.1` para reproducibilidad. No se usa `gitleaks/gitleaks-action@v2` para evitar dependencia de acciones de terceros con permisos implícitos.

---

## Error Handling

### Errores de validación (400)

El helper `validarAprobados` recibe `(aprobados, catalogoSet)` y retorna `{ ok: false, status: 400, error: '<mensaje>' }`. La ruta comprueba `ok`; si es `false`, responde con el `status` y el mensaje `error` sin procesamiento adicional.

**Tabla de condiciones de error:**

| Condición | Mecanismo de interceptación | HTTP | Mensaje exacto |
|---|---|---|---|
| `Content-Type !== application/json` | `req.is('application/json')` en la ruta (paso 1) → responde directamente | 400 | `"el cuerpo debe ser JSON válido"` |
| JSON malformado con Content-Type correcto | Middleware global intercepta `err.type === 'entity.parse.failed'` | 400 | `"el cuerpo debe ser JSON válido"` |
| Clave `aprobados` ausente o su valor no es array | `validarAprobados` paso 2 | 400 | `"el campo aprobados es requerido y debe ser un array"` |
| Array con más de 100 elementos | `validarAprobados` paso 3 (antes de deduplicar o consultar repositorio) | 400 | `"aprobados no puede contener más de 100 elementos"` |
| Algún elemento no es string | `validarAprobados` paso 4 | 400 | `"cada elemento de aprobados debe ser una cadena de texto"` |
| Algún elemento no cumple el patrón de código | `validarAprobados` paso 5 | 400 | `"formato de código inválido"` |
| Código válido por formato pero ausente en el catálogo | Ruta paso 6 | 400 | `"código de curso desconocido"` |

### Error de parseo de Express

Express 4 emite un error con `err.type === 'entity.parse.failed'` cuando `express.json()` no puede parsear el cuerpo. El middleware de error global existente en `src/app.js` se amplía para interceptar este caso y responder 400 con `{ "error": "el cuerpo debe ser JSON válido" }` en lugar del mensaje 500 genérico.

### Error interno no controlado (500)

El middleware global ya cubre este caso con `{ "error": "error interno del servidor" }` sin stack trace, rutas del sistema de archivos ni mensajes de excepción internos.

### Casos borde y decisiones

| Caso | Comportamiento | Mensaje JSON exacto | Criterio |
|---|---|---|---|
| `aprobados: []` | HTTP 200, devuelve cursos sin prerrequisitos | — (respuesta exitosa) | 2.1 |
| `aprobados` = todos los IDs de la malla | HTTP 200, devuelve `[]` | — | 2.2 |
| Código válido por formato pero no en catálogo | HTTP 400 | `{ "error": "código de curso desconocido" }` | 2.3 |
| Duplicados en `aprobados` | HTTP 200, deduplicados silenciosamente | — | 2.4 |
| Elemento con formato inválido (ej. `1INF30<script>`) | HTTP 400, mensaje fijo, entrada NO reflejada en la respuesta | `{ "error": "formato de código inválido" }` | 3.5 / 4.3 |
| Array con 101 o más elementos | HTTP 400 antes de deduplicar o consultar repositorio | `{ "error": "aprobados no puede contener más de 100 elementos" }` | 3.3 / 4.1 |
| Body no-JSON válido | HTTP 400 vía middleware `entity.parse.failed` | `{ "error": "el cuerpo debe ser JSON válido" }` | 3.6 |
| `aprobados` es string, no array | HTTP 400 | `{ "error": "el campo aprobados es requerido y debe ser un array" }` | 3.2 |

---

## Testing Strategy

Los tests se ubican en `tests/habilitados.test.js`. Se usa supertest sobre `src/app.js`, igual que los tests existentes, sin levantar el servidor.

No se añade ninguna dependencia nueva de producción ni de desarrollo. Los tests de propiedad se implementan con Jest `test.each` y casos deterministas.

### Grupos de tests

| # | Descripción del test | Criterio(s) | Tipo | Notas |
|---|---|---|---|---|
| 1 | Caso ejemplo fijo: `["1INF25","1INF27","1INF49"]` → 27 cursos incluyendo `1INF29`, `1INF30`, `1INF31`, `1INF32` | 1.3 | Ejemplo | Verifica el recuento exacto y la presencia de los cursos mencionados en el criterio |
| 2 | Shape: cada elemento tiene exactamente `id`, `name`, `credits`, `cycle`, `type`, `prerequisites` | 1.1 | Determinista (test.each con 3+ entradas válidas) | Verifica Property 1; los casos cubren array vacío, un curso y múltiples cursos |
| 3 | Filtro — prerrequisitos cubiertos: todos los cursos devueltos satisfacen `prerequisites ⊆ aprobados` | 1.2 | Determinista | Verifica Property 2 (mitad positiva); usar varios subconjuntos de aprobados |
| 4 | Filtro — exclusión: ningún curso devuelto tiene su `id` en `aprobados` | 1.2 | Determinista | Verifica Property 2 (mitad negativa); complementario al test anterior |
| 5 | Cursos sin prerrequisitos se incluyen cuando no están en `aprobados` | 1.4 | Ejemplo | Criterio 1.4 explícito; `aprobados` no vacío y sin incluir el curso con `prerequisites: []` |
| 6 | Uso del Repositorio: `listar()` se invoca exactamente una vez por petición | 1.5 | Smoke con mock | Mock de módulo sobre `repositorio`; verificar que la ruta no lee `cursos.json` directamente |
| 7 | `aprobados: []` → HTTP 200, solo cursos con `prerequisites` vacío | 2.1 | Ejemplo | Ningún elemento en aprobados; todos los cursos sin prerrequisitos deben aparecer |
| 8 | `aprobados` = todos los IDs → HTTP 200, `[]` | 2.2 | Ejemplo | Todos los cursos están ya aprobados; ninguno queda habilitado |
| 9 | Código desconocido → HTTP 400, `{ "error": "código de curso desconocido" }` | 2.3 | Ejemplo | El código cumple el formato pero no existe en la malla |
| 10 | Duplicados no alteran el resultado: `["1INF25","1INF25"]` produce mismo resultado que `["1INF25"]` | 2.4 | Determinista | Verifica Property 3 |
| 11 | Body sin clave `aprobados` → HTTP 400 `{ "error": "el campo aprobados es requerido y debe ser un array" }` | 3.1 | Ejemplo | Body `{}` o body vacío |
| 12 | `aprobados` como string `"1INF25"` → HTTP 400 `{ "error": "el campo aprobados es requerido y debe ser un array" }` | 3.2 | Regresión (hallazgo #3) | Antes de la corrección este caso producía HTTP 200 con resultados incorrectos |
| 13 | Array con exactamente 100 elementos válidos → HTTP 200 (límite permitido) | 3.3 | Edge | Verifica que el límite es inclusivo en 100 |
| 14 | Array con 101 elementos → HTTP 400 antes de consultar repositorio | 3.3 / 4.1 | Edge | Mock para verificar que `listar()` no se invoca cuando el array supera el límite |
| 15 | Lista de 5000 elementos repetidos → HTTP 400 antes de consultar repositorio | 4.1 | Regresión (hallazgo #1) | Mock para verificar que el repositorio no se consulta; antes de la corrección esto bloqueaba el event loop ~40 s |
| 16 | Elemento no-string (p.ej. número `42`) → HTTP 400 `{ "error": "cada elemento de aprobados debe ser una cadena de texto" }` | 3.4 | Ejemplo | — |
| 17 | Código `1INF30<script>` → HTTP 400, body no contiene la cadena `<script>` | 3.5 / 4.3 | Regresión (hallazgo #2) | Verifica Property 4; ver subsección "Verificación de no-reflexión" |
| 18 | Código de 6 caracteres con formato inválido (ej. `ABCDEF`) → HTTP 400 `{ "error": "formato de código inválido" }` | 3.5 | Edge | Longitud correcta pero patrón incumplido |
| 19 | Body no-JSON (texto plano `hola`) → HTTP 400 `{ "error": "el cuerpo debe ser JSON válido" }` | 3.6 | Ejemplo | Cubre la rama del middleware `entity.parse.failed` |
| 20 | Content-Type `text/plain` con body JSON válido → HTTP 400 `{ "error": "el cuerpo debe ser JSON válido" }` | 3.6 | Regresión (hallazgo #2 variante) | Cubre la rama `req.is('application/json')` en la ruta |
| 21 | Error interno simulado (mock de `repositorio.listar()` lanzando excepción) → HTTP 500 `{ "error": "error interno del servidor" }`, body no contiene stack trace | 4.2 | Smoke con mock | El middleware global de error debe ocultar detalles internos |

> **Nota**: Los tests de regresión (filas 12, 15, 17, 20) replican las condiciones exactas de los hallazgos de seguridad del prototipo y deben ejecutarse antes de aplicar las correcciones para confirmar que el comportamiento defectuoso es reproducible (fase roja del ciclo TDD), y después para confirmar la corrección (fase verde). No se inventan evidencias; los resultados se registran en TRAZABILIDAD.md durante la implementación.

### Verificación de no-reflexión

Para el criterio 4.3 (y el test 17 de la tabla), la verificación correcta es:

- `expect(res.body).toEqual({ error: 'formato de código inválido' })` — igualdad del objeto completo, y
- `expect(JSON.stringify(res.body)).not.toContain('<script>')` — ausencia del payload malicioso en la respuesta serializada.

No se exige que el mensaje fijo no contenga substrings arbitrarios.

### Estrategia de regresión

Antes de implementar las correcciones, se ejecuta la suite de tests sobre el código del prototipo (o sobre stubs que reproducen el comportamiento defectuoso) para confirmar que los tests de regresión fallan. Esto genera evidencia de la condición de fallo. Después de aplicar las correcciones, los tests deben pasar. Los resultados (salida de Jest en ambas ejecuciones) se registran en `TRAZABILIDAD.md` como evidencia de la corrección. No se inventan evidencias ni se usan secretos reales en ningún test.

### Cobertura

La configuración existente en `jest.config.js` (`collectCoverageFrom: ['src/**/*.js']`, umbral 80 %) cubre automáticamente los nuevos ficheros `src/routes/habilitados.js` y `src/util/validarAprobados.js`.

### Tests de repositorio

No se añaden tests de repositorio nuevos: `repositorio.js` no se modifica.

---

## Decisiones de diseño — resumen

| Decisión | Alternativa considerada | Razón elegida |
|---|---|---|
| Reusar `repositorio.listar()` sin función nueva | Añadir `listarHabilitados()` | YAGNI; el filtro en la capa de ruta es suficiente para 87 cursos |
| Extraer `validarAprobados.js` | Validación inline en la ruta | Testabilidad aislada; ruta legible; reglas propensas a cambiar |
| `prerequisites` como array de strings | Expandir a `[{ id, name }]` | Los requisitos no piden expansión; coherente con `GET /cursos` |
| Modificar middleware global para error de parseo | Middleware local en la ruta | Centralización; aplica a todas las rutas |
| Verificación de Content-Type con `req.is()` en la ruta | Middleware dedicado de Content-Type | Mínima superficie; aplica solo a la ruta que lo necesita; sin dependencias adicionales |
| `repositorio.listar()` una sola vez (paso 6), reutilizado en paso 8 | Llamar `listar()` dos veces (validación y filtro) | Evita doble lectura del catálogo; la constante es compartida por ambos pasos |
| `validarAprobados.js` recibe `catalogoSet` precomputado | Helper llama a `listar()` internamente | Permite ejecutar pasos 2–5 sin tocar el repositorio; facilita test unitario del helper con un Set arbitrario |
| Sin dependencias nuevas de producción ni de desarrollo | Añadir fast-check para PBT aleatorio | Los tests de propiedad se implementan con Jest test.each y casos deterministas; sin dependencias adicionales |
| Tres jobs independientes en CI (`build`, `sca`, `secrets`) | Un solo job con todos los pasos en secuencia | Un fallo de auditoría no bloquea la detección de secretos y viceversa; fallos aislados por dominio |
| Imagen versionada `gitleaks:v8.30.1` en job `secrets` | `gitleaks/gitleaks-action@v2` | Reproducibilidad garantizada por versión fija; sin dependencia de acciones de terceros con permisos implícitos |
