# Implementation Plan: Cursos habilitados para matrícula

## Overview

Implementación incremental del endpoint `POST /habilitados`. El orden respeta las dependencias entre módulos: primero los tests de regresión (fase roja), luego el helper de validación, luego la ruta, luego los tests de integración completos, y finalmente los cambios de CI/CD y trazabilidad.

## Tasks

- [x] 1. Escribir los tests de regresión en fase roja
  - [x] 1.1 Crear `tests/habilitados.test.js` con los cuatro tests de regresión que deben fallar antes de la implementación
    - Test 12 (hallazgo #3): `{"aprobados": "1INF25"}` (string, no array) debe devolver HTTP 400 con `{ "error": "el campo aprobados es requerido y debe ser un array" }`. Sin la implementación correcta este caso produce HTTP 500 o resultados incorrectos.
    - Test 15 (hallazgo #1): array de 5000 elementos repetidos debe devolver HTTP 400 sin consultar el repositorio. Sin la implementación este endpoint aún no existe (HTTP 404); el test registra ese fallo como evidencia de fase roja.
    - Test 17 (hallazgo #2): `"1INF30<script>"` como elemento de `aprobados` debe devolver HTTP 400 con exactamente `{ "error": "formato de código inválido" }` y el body no debe contener la cadena `<script>`. Sin la implementación este caso produce HTTP 500 con stack trace expuesto.
    - Test 20 (hallazgo #2 variante): `Content-Type: text/plain` con body JSON válido debe devolver HTTP 400 con `{ "error": "el cuerpo debe ser JSON válido" }`. Sin la implementación este caso produce HTTP 200 con resultados incorrectos.
    - Verificar que `npm test -- --testPathPattern=habilitados` muestra los cuatro tests en rojo.
    - Nota: en esta fase todos los tests deben fallar porque el endpoint aún no existe. Los fallos reales se registran como HTTP 404 (ruta no montada). No se afirma haber reproducido los 40 segundos del prototipo original; esa latencia correspondía a una implementación diferente.
    - _Requisitos: 3.2, 3.3, 3.5, 3.6, 4.1, 4.3_

- [x] 2. Implementar `src/util/validarAprobados.js`
  - [x] 2.1 Crear el archivo `src/util/validarAprobados.js` con la función `validarAprobados(aprobados)`
    - Paso 2: si `aprobados` no existe o no es array → `{ ok: false, status: 400, error: "el campo aprobados es requerido y debe ser un array" }`.
    - Paso 3: si `aprobados.length > 100` → `{ ok: false, status: 400, error: "aprobados no puede contener más de 100 elementos" }` (antes de deduplicar o tocar el catálogo).
    - Paso 4: si algún elemento no es `string` → `{ ok: false, status: 400, error: "cada elemento de aprobados debe ser una cadena de texto" }`.
    - Paso 5: si algún elemento no cumple `^(?:[0-9][A-Z]{3}[0-9]{2}|[A-Z]{3}[0-9]{3})$` → `{ ok: false, status: 400, error: "formato de código inválido" }`.
    - Caso válido → `{ ok: true }`.
    - El helper solo recibe `aprobados` (pasos 2–5); no recibe ni usa `catalogoSet` (eso lo hace la ruta en el paso 6).
    - Exportar con `module.exports = { validarAprobados }`.
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.3_

  - [x] 2.2 Escribir tests unitarios para `validarAprobados`
    - Test unitario con `aprobados` undefined → error de campo requerido.
    - Test unitario con `aprobados` como string → error de tipo.
    - Test unitario con array de 101 elementos → error de longitud.
    - Test unitario con elemento numérico → error de elemento no string.
    - Test unitario con `"ABCDEF"` (patrón inválido) → error de formato.
    - Test unitario con array vacío → `{ ok: true }`.
    - Test unitario con array válido → `{ ok: true }`.
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3. Implementar `src/routes/habilitados.js`
  - [x] 3.1 Crear el archivo `src/routes/habilitados.js` con el handler `POST /`
    - Paso 1: comprobar `req.is('application/json')`; si es `false` o `null` → responder 400 con `{ "error": "el cuerpo debe ser JSON válido" }`.
    - Pasos 2–5: invocar `validarAprobados(req.body?.aprobados)` (el helper sólo recibe `aprobados` para los pasos 2–5; `catalogoSet` todavía no existe); si `!resultado.ok` → responder con `resultado.status` y `resultado.error`.
    - Paso 6: llamar a `repositorio.listar()` **una sola vez**; construir `catalogoSet = new Set(catalogo.map(c => c.id))`; verificar que cada elemento de `aprobados` está en `catalogoSet`; si no → 400 con `{ "error": "código de curso desconocido" }`.
    - Pasos 7–9: construir `aprobadosSet` (deduplicar), filtrar `catalogo`, serializar cada curso a `{ id, name, credits, cycle, type, prerequisites }` donde `prerequisites` es el array de IDs del JSON fuente; responder 200.
    - Exportar el router con `module.exports = router`.
    - _Requisitos: 1.1, 1.2, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.3_

- [x] 4. Modificar `src/app.js`
  - [x] 4.1 Montar el nuevo router y ampliar el middleware de error global
    - Añadir `app.use('/habilitados', require('./routes/habilitados'))` antes del middleware de error.
    - Ampliar el middleware de error existente: si `err.type === 'entity.parse.failed'` → responder 400 con `{ "error": "el cuerpo debe ser JSON válido" }` en lugar del 500 genérico.
    - _Requisitos: 3.6, 4.2, 5.3_

- [x] 5. Checkpoint — verificar que los tests de regresión pasan
  - Ejecutar `npm test -- --testPathPattern=habilitados --coverage=false` y confirmar que los tests 12, 15, 17 y 20 (hallazgos #1, #2, #3) pasan en verde.
  - Corregir cualquier defecto en el helper o la ruta antes de continuar.
  - Preguntar al usuario si surgen dudas.

- [x] 6. Completar la suite de integración en `tests/habilitados.test.js`
  - [x] 6.1 Añadir los tests de forma de respuesta y filtro funcional (Property 1 y Property 2)
    - Test 2 (shape): usar `test.each` con 3+ entradas válidas; verificar que cada elemento tiene exactamente `id`, `name`, `credits`, `cycle`, `type`, `prerequisites`. **Property 1 — Validates: Requisito 1.1**
    - Test 3 (filtro positivo): varios subconjuntos de `aprobados`; verificar `prerequisites ⊆ aprobados` para todos los devueltos. **Property 2 (mitad positiva) — Validates: Requisitos 1.2, 1.4**
    - Test 4 (filtro negativo): verificar que ningún curso devuelto tiene `id` en `aprobados`. **Property 2 (mitad negativa) — Validates: Requisito 1.2**
    - _Requisitos: 1.1, 1.2, 1.4_

  - [x] 6.2 Añadir el test de caso ejemplo fijo
    - Test 1: `POST /habilitados` con `["1INF25","1INF27","1INF49"]` → HTTP 200, exactamente 27 cursos. Verificar: (a) `res.body.length === 27`, (b) que los IDs `1INF29`, `1INF30`, `1INF31` y `1INF32` están presentes en la respuesta, (c) que los IDs `1INF25`, `1INF27` e `1INF49` NO están en la respuesta (cumple la condición de exclusión), y (d) que todos los cursos devueltos satisfacen `prerequisites.every(p => aprobados.includes(p))`.
    - _Requisitos: 1.3_

  - [x] 6.3 Añadir los tests de casos borde funcionales
    - Test 5: cursos con `prerequisites: []` se incluyen cuando no están en `aprobados`.
    - Test 6: mock de `repositorio.listar()` para verificar que se llama exactamente una vez por petición.
    - Test 7: `aprobados: []` → HTTP 200, solo cursos con `prerequisites` vacío.
    - Test 8: `aprobados` = todos los IDs → HTTP 200, `[]`.
    - Test 9: código desconocido (`"1INF99"` si no existe) → HTTP 400 `{ "error": "código de curso desconocido" }`.
    - _Requisitos: 1.4, 1.5, 2.1, 2.2, 2.3_

  - [x] 6.4 Añadir test de idempotencia de deduplicación (Property 3)
    - Test 10: `["1INF25","1INF25"]` produce el mismo resultado que `["1INF25"]`. **Property 3 — Validates: Requisito 2.4**
    - _Requisitos: 2.4_

  - [x] 6.5 Añadir los tests de validación de entrada
    - Test 11: body `{}` → HTTP 400 `{ "error": "el campo aprobados es requerido y debe ser un array" }`.
    - Test 13: array de exactamente 100 elementos válidos → HTTP 200 (límite inclusivo).
    - Test 14: array de 101 elementos → HTTP 400; mock de `repositorio.listar()` para verificar que no se llama.
    - Test 16: elemento numérico `42` → HTTP 400 `{ "error": "cada elemento de aprobados debe ser una cadena de texto" }`.
    - Test 18: `"ABCDEF"` (longitud correcta, patrón inválido) → HTTP 400 `{ "error": "formato de código inválido" }`.
    - Test 19: body texto plano `hola` con `Content-Type: application/json` → HTTP 400 `{ "error": "el cuerpo debe ser JSON válido" }`.
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 6.6 Añadir el test de no-reflexión (Property 4)
    - Test 17: `"1INF30<script>"` → HTTP 400; verificar `expect(res.body).toEqual({ error: 'formato de código inválido' })` y `expect(JSON.stringify(res.body)).not.toContain('<script>')`. **Property 4 — Validates: Requisitos 3.5, 4.3**
    - _Requisitos: 3.5, 4.3_

  - [x] 6.7 Añadir los tests de seguridad
    - Test 21: mock de `repositorio.listar()` lanzando excepción → HTTP 500 `{ "error": "error interno del servidor" }`; verificar que el body no contiene stack trace ni rutas del sistema.
    - _Requisitos: 4.2_

- [x] 7. Checkpoint — suite completa en verde con cobertura ≥ 80 %
  - Ejecutar `npm test -- --coverage` y confirmar que los 21 tests pasan y la cobertura de líneas global es ≥ 80 %.
  - Corregir cualquier defecto antes de continuar.
  - Preguntar al usuario si surgen dudas.

- [ ] 8. Actualizar `.github/workflows/ci.yml`
  - [~] 8.1 Añadir el job `sca` independiente del job `build`
    - El job usa `actions/checkout@v4`, `actions/setup-node@v4` (Node 22, cache npm), `npm ci` y `npm audit --audit-level=high`.
    - El job NO usa `continue-on-error`.
    - _Requisitos: 5.4_

  - [~] 8.2 Añadir el job `secrets` independiente de `build` y `sca`
    - El job usa `actions/checkout@v4`, crea `/tmp/gitleaks-src` con `mkdir -p`, exporta archivos con `git archive HEAD | tar -x -C /tmp/gitleaks-src`, y ejecuta `docker run --rm -v /tmp/gitleaks-src:/path ghcr.io/gitleaks/gitleaks:v8.30.1 dir /path --redact --exit-code 1`.
    - El job NO usa `continue-on-error`.
    - _Requisitos: 5.5_

- [ ] 9. Remediación de SCA y demostración controlada del ciclo Gitleaks
  - [~] 9.1 Verificar estado inicial de auditoría SCA
    - Ejecutar `npm audit --audit-level=high` en el entorno de desarrollo y registrar la salida completa.
    - Si se detectan vulnerabilidades altas o críticas, actualizar las dependencias afectadas con `npm audit fix` o ajustar versiones en `package.json` hasta que `npm audit --audit-level=high` retorne exit code 0.
    - Si no se detectan vulnerabilidades, registrar igualmente la salida limpia como evidencia en `TRAZABILIDAD.md`.
    - _Requisitos: 5.4_

  - [~] 9.2 Demostración controlada del ciclo rojo-verde de Gitleaks
    - **Fase roja**: añadir temporalmente una cadena ficticia con forma de secreto (p. ej. `FAKE_API_KEY=abc123fake`) en un archivo de test o en un archivo temporal fuera del historial; confirmar que Gitleaks CLI la detecta con exit code 1. No usar secretos reales. Registrar la salida de Gitleaks como evidencia de fase roja.
    - **Fase verde**: eliminar la cadena ficticia del archivo o descartarla sin commitearla; confirmar que Gitleaks CLI retorna exit code 0 sobre los archivos versionados (`git archive HEAD`). Registrar la salida limpia como evidencia de fase verde.
    - El propósito es demostrar que el gate funciona antes de confiar en él en CI.
    - _Requisitos: 5.5_

- [~] 10. Actualizar `TRAZABILIDAD.md` con evidencias reales
  - Registrar cada criterio de aceptación (1.1–1.5, 2.1–2.4, 3.1–3.6, 4.1–4.3, 5.1–5.5) con el gate correspondiente (test Jest + supertest, job CI, cobertura) y la evidencia real (salida de Jest, número de test, resultado de CI).
  - Para los hallazgos de regresión #1, #2 y #3: registrar la salida de Jest en fase roja (test fallando) y en fase verde (test pasando) como evidencia de la corrección.
  - No inventar evidencias; copiar salida real de `npm test`.
  - Registrar al menos dos cambios reales introducidos durante la revisión humana respecto a la propuesta inicial de Kiro: (a) reducción del límite de `aprobados` de 200 a 100 elementos (Requisito 3.3), con justificación documentada, y (b) cambio de política para códigos desconocidos: de 'aceptar silenciosamente' a 'rechazar con HTTP 400' (Requisito 2.3), con justificación documentada. Incluir en cada entrada: propuesta original, decisión humana, criterio afectado y razón.
  - _Requisitos: 5.1, 5.2, 5.4, 5.5_

## Notes

- El orden tarea 1 → 2 → 3 → 4 es obligatorio: los tests de regresión deben escribirse antes que el código que los corrige.
- La tarea 6 requiere que `src/app.js` ya monte el router (tarea 4); los tests de integración no levantarán el servidor.
- Los tests 6, 14 y 15 usan mocks de módulo (`jest.mock`) sobre `repositorio`; restaurar mocks en `afterEach` para no contaminar otros tests.
- `src/data/repositorio.js` no se modifica en ninguna tarea.
- No se añade ninguna dependencia de producción ni de desarrollo.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "3.1"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 6, "tasks": ["6.4", "6.5"] },
    { "id": 7, "tasks": ["6.6", "6.7"] },
    { "id": 8, "tasks": ["7"] },
    { "id": 9, "tasks": ["8.1", "8.2"] },
    { "id": 10, "tasks": ["9.1", "9.2"] },
    { "id": 11, "tasks": ["10"] }
  ]
}
```
