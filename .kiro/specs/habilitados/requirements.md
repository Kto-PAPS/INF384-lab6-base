# Requirements Document

## Introduction

Funcionalidad para consultar qué cursos de la malla quedan habilitados para matricularse dado un conjunto de cursos ya aprobados. Un alumno envía la lista de códigos que aprobó y el servicio devuelve todos los cursos cuyos prerrequisitos están completamente cubiertos y que el alumno aún no aprobó. La fuente de datos es `data/cursos.json` (solo lectura); el acceso se realiza siempre a través de `src/data/repositorio.js`.

## Glossary

- **Sistema**: el servicio web Node.js / Express que implementa la API de Malla INF.
- **Repositorio**: el módulo `src/data/repositorio.js` que encapsula el acceso a `data/cursos.json`.
- **Curso habilitado**: curso cuyo array `prerequisites` es un subconjunto de `aprobados` y cuyo `id` no aparece en `aprobados`.
- **aprobados**: array de cadenas enviado en el cuerpo de la petición; cada elemento es el código de un curso aprobado por el alumno.
- **Código de curso**: cadena de texto que identifica un curso; tiene exactamente 6 caracteres y cumple el patrón `^(?:[0-9][A-Z]{3}[0-9]{2}|[A-Z]{3}[0-9]{3})$` (p. ej. `1INF25`, `INF238`, `IDM201`).

## Requirements

### Requisito 1: Lógica funcional principal

**Historia de usuario:** Como alumno, quiero enviar los cursos que aprobé y recibir la lista de cursos que puedo matricular, para planificar mi siguiente ciclo.

#### Criterios de aceptación

1.1 CUANDO se reciba `POST /habilitados` con un cuerpo `{ "aprobados": [...] }` válido, EL sistema DEBE devolver HTTP 200 con un array JSON donde cada elemento contiene `id`, `name`, `credits`, `cycle`, `type` y `prerequisites`.

1.2 CUANDO se reciba `POST /habilitados` con un cuerpo `{ "aprobados": [...] }` válido, EL sistema DEBE incluir en la respuesta todos y únicamente los cursos cuyo array `prerequisites` sea subconjunto de `aprobados` y cuyo `id` no esté en `aprobados`.

1.3 CUANDO se reciba `POST /habilitados` con `aprobados` igual a `["1INF25", "1INF27", "1INF49"]`, EL sistema DEBE devolver exactamente 27 cursos, incluyendo `1INF29`, `1INF30`, `1INF31` y `1INF32`.

1.4 CUANDO un curso tenga `prerequisites: []`, EL sistema DEBE considerarlo habilitado si su `id` no aparece en `aprobados`.

1.5 CUANDO se reciba `POST /habilitados` con un cuerpo válido, EL sistema DEBE obtener los datos de los cursos a través del Repositorio, sin leer `data/cursos.json` directamente desde la ruta.

### Requisito 2: Casos borde funcionales

**Historia de usuario:** Como alumno, quiero que el servicio responda correctamente en situaciones extremas, para confiar en los resultados en cualquier escenario.

#### Criterios de aceptación

2.1 CUANDO `aprobados` sea un array vacío `[]`, EL sistema DEBE devolver todos los cursos de la malla que tengan `prerequisites: []`.

> Decisión: un alumno sin cursos aprobados solo puede matricularse en cursos sin prerrequisitos. No se devuelve error; la respuesta es un array (posiblemente vacío) con HTTP 200.

2.2 CUANDO `aprobados` contenga todos los `id` de la malla, EL sistema DEBE devolver un array vacío `[]` con HTTP 200, ya que ningún curso cumple la condición de no estar en `aprobados`.

> Decisión: "todos aprobados" es un estado válido. Responder `[]` es semánticamente correcto.

2.3 SI `aprobados` contiene algún código que no existe en `data/cursos.json`, EL sistema DEBE responder HTTP 400 con `{ "error": "código de curso desconocido" }`.

> Decisión: el producto tiene alcance cerrado y no contempla equivalencias externas ni planes anteriores. Se devuelve un mensaje fijo para evitar reflejar entradas proporcionadas por el cliente.

2.4 CUANDO `aprobados` contenga códigos duplicados, EL sistema DEBE comportarse como si cada código apareciera una sola vez, sin devolver error ni alterar el resultado esperado.

> Decisión: duplicados son inofensivos; deduplicar en memoria es la respuesta más tolerante y correcta.

### Requisito 3: Validación de entrada

**Historia de usuario:** Como alumno, quiero recibir mensajes de error claros cuando envío datos incorrectos, para saber qué debo corregir.

#### Criterios de aceptación

3.1 SI el cuerpo de la petición no es un objeto JSON con la clave `aprobados`, EL sistema DEBE responder HTTP 400 con `{ "error": "el campo aprobados es requerido y debe ser un array" }`.

3.2 SI el valor de `aprobados` no es un array, EL sistema DEBE responder HTTP 400 con `{ "error": "el campo aprobados es requerido y debe ser un array" }`.

> Decisión: el hallazgo de seguridad #3 muestra que `{"aprobados": "1INF25"}` producía HTTP 200 con resultados incorrectos. La validación de tipo es obligatoria antes de cualquier procesamiento.

3.3 SI el array `aprobados` contiene más de 100 elementos, EL sistema DEBE responder HTTP 400 con `{ "error": "aprobados no puede contener más de 100 elementos" }`.

> Decisión: el plan 2026-1 tiene 87 cursos; un límite de 100 cubre el catálogo completo con un pequeño margen y reduce significativamente la exposición a solicitudes masivas como las del hallazgo de seguridad #1 (5000 elementos → 40 s de bloqueo). El mensaje de error es `{ "error": "aprobados no puede contener más de 100 elementos" }`.

3.4 SI algún elemento de `aprobados` no es una cadena de texto, EL sistema DEBE responder HTTP 400 con `{ "error": "cada elemento de aprobados debe ser una cadena de texto" }`.

3.5 SI algún elemento de `aprobados` no tiene exactamente 6 caracteres o no cumple el patrón `^(?:[0-9][A-Z]{3}[0-9]{2}|[A-Z]{3}[0-9]{3})$`, EL sistema DEBE responder HTTP 400 con `{ "error": "formato de código inválido" }`, sin reflejar la entrada en la respuesta ni exponer el stack trace.

> Decisión: todos los códigos del plan 2026-1 tienen exactamente 6 caracteres y siguen uno de dos formatos: `1INF25` (dígito + 3 mayúsculas + 2 dígitos) o `INF238` (3 mayúsculas + 3 dígitos). El patrón `^(?:[0-9][A-Z]{3}[0-9]{2}|[A-Z]{3}[0-9]{3})$` captura ambas variantes y rechaza entradas como `1INF30<script>` que causaron el hallazgo de seguridad #2 (HTTP 500 con stack trace). El mensaje de error es fijo y no refleja la entrada para evitar reflexión de contenido malicioso.

3.6 SI el cuerpo de la petición no es JSON válido o el `Content-Type` no es `application/json`, EL sistema DEBE responder HTTP 400 con `{ "error": "el cuerpo debe ser JSON válido" }`.

> Decisión: Express 4 con `express.json()` devuelve un error de parseo; el middleware de error debe capturarlo y devolver 400, no 500.

### Requisito 4: Seguridad

**Historia de usuario:** Como operador del servicio, quiero que el endpoint resista entradas maliciosas y no exponga información interna, para proteger la disponibilidad y la confidencialidad del servicio.

#### Criterios de aceptación

4.1 SI el array `aprobados` supera 100 elementos, EL sistema DEBE rechazar la petición con HTTP 400 antes de deduplicar los códigos o consultar el repositorio.

4.2 SI ocurre un error interno no controlado durante el procesamiento de `POST /habilitados`, EL sistema DEBE responder HTTP 500 con `{ "error": "error interno del servidor" }` sin incluir el stack trace, rutas del sistema de archivos ni mensajes de excepción internos.

4.3 SI algún elemento de `aprobados` no cumple el patrón `^(?:[0-9][A-Z]{3}[0-9]{2}|[A-Z]{3}[0-9]{3})$`, EL sistema DEBE responder HTTP 400 con `{ "error": "formato de código inválido" }`, sin reflejar la entrada ni exponer stack trace ni rutas internas.

### Requisito 5: Calidad del servicio

**Historia de usuario:** Como equipo de desarrollo, queremos mantener estándares de calidad y seguridad automatizados, para detectar regresiones en el pipeline de CI.

#### Criterios de aceptación

5.1 CUANDO el pipeline de CI ejecute los tests, EL sistema DEBE mantener una cobertura de líneas igual o superior al 80 %; SI la cobertura cae por debajo del 80 %, EL pipeline DEBE fallar.

5.2 EL sistema DEBE tener al menos un test Jest con supertest para cada criterio de aceptación de los Requisitos 1, 2, 3 y 4, usando `src/app.js` sin levantar el servidor.

5.3 EL sistema DEBE registrar el nuevo router `src/routes/habilitados.js` en `src/app.js` bajo la ruta `/habilitados`.

5.4 CUANDO el pipeline de CI ejecute `npm audit`, EL sistema DEBE bloquear el pipeline si se detectan dependencias con vulnerabilidades altas o críticas.

5.5 CUANDO el pipeline de CI ejecute el análisis de secretos con Gitleaks, EL sistema DEBE bloquear el pipeline si se detecta algún secreto, token, contraseña o clave en texto plano en el repositorio.
