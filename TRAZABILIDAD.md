
# Trazabilidad — Laboratorio 6

**Alumno:** Piero Perezanelli  
**Curso:** INF384 — Temas Avanzados en Ingeniería de Software  
**Fecha:** 26/11/2026  
**Funcionalidad:** POST /habilitados

## 1. Requisito → gate → evidencia

| Requisito | Gate (herramienta y umbral) | Bloquea / avisa | Etapa | Run fallido | Run corregido |
| --- | --- | --- | --- | --- | --- |
| Consulta de cursos 3.2 / Habilitados 5.1: cobertura mínima de líneas del 80%. | Jest con coverageThreshold global de líneas de 80%. | Bloquea CI | PR hacia main y push a main | [Run #3](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45899582693) | [Run #4](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45899910458) |
| Habilitados 3.3 y 4.1: rechazar listas superiores a 100 elementos antes de procesarlas. | Jest + Supertest. Tests de 100, 101 y 5000 elementos. | Bloquea CI | PR hacia main y push a main | [Run #9](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45903059975) | [Run #11](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45904564758) |
| Habilitados 3.5 y 4.3: rechazar códigos malformados sin reflejar entradas maliciosas. | Jest + Supertest. Tests de formato inválido y no reflexión de entrada. | Bloquea CI | PR hacia main y push a main | [Run #9](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45903059975) | [Run #11](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45904564758) |
| Habilitados 3.2: rechazar aprobados cuando no sea un array. | Jest + Supertest. Test de aprobados como string. | Bloquea CI | PR hacia main y push a main | [Run #9](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45903059975) | [Run #11](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45904564758) |
| Habilitados 3.6: rechazar JSON inválido o Content-Type incorrecto. | Jest + Supertest. Tests de JSON malformado y text/plain. | Bloquea CI | PR hacia main y push a main | [Run #9](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45903059975), variante text/plain | [Run #11](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45904564758) |
| Habilitados 4.2: errores internos con HTTP 500 genérico, sin stack trace ni rutas internas. | Jest + Supertest. Test de excepción simulada en el repositorio. | Bloquea CI | PR hacia main y push a main | Test de error interno. No se registró una ejecución roja independiente para este criterio. | [Run #11](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45904564758) |
| Habilitados 5.4: ninguna dependencia con vulnerabilidades altas o críticas. | npm audit --audit-level=high. Umbral: cero vulnerabilidades altas o críticas. | Bloquea CI | PR hacia main y push a main | [Run #13](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45904936128) | [Run #15](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45905264744), job sca |
| Habilitados 5.5: ningún secreto detectado en los archivos versionados. | Gitleaks v8.30.1. Umbral: cero hallazgos. | Bloquea CI | PR hacia main y push a main | [Run #14](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45904965518) | [Run #16](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45905571338) |

## 2. Trazabilidad de criterios de aceptación

Los tests de integración se encuentran en `tests/habilitados.test.js` y las pruebas unitarias de validación en `tests/validarAprobados.test.js`.

| Criterio | Verificación |
| --- | --- |
| 1.1 | Test 2: estructura de la respuesta JSON. |
| 1.2 | Tests 1, 3 y 4: cantidad esperada, cumplimiento de prerrequisitos y exclusión de cursos aprobados. |
| 1.3 | Test 1: exactamente 27 cursos para el ejemplo del enunciado, incluyendo los cuatro códigos requeridos. |
| 1.4 | Tests 3 y 5: inclusión de cursos sin prerrequisitos. |
| 1.5 | Test 6: una invocación a repositorio.listar() por petición válida. |
| 2.1 | Test 7: lista de aprobados vacía. |
| 2.2 | Test 8: todos los cursos aprobados. |
| 2.3 | Test 9: código desconocido devuelve HTTP 400. |
| 2.4 | Test 10: los duplicados no alteran el resultado. |
| 3.1 | Test 11: ausencia del campo aprobados. |
| 3.2 | Test 12: aprobados como string. |
| 3.3 | Tests 13, 14 y 15: límites de 100, 101 y 5000 elementos. |
| 3.4 | Test 16: elemento numérico rechazado. |
| 3.5 | Tests 17 y 18: códigos malformados y caracteres especiales. |
| 3.6 | Tests 19 y 20: JSON inválido y Content-Type incorrecto. |
| 4.1 | Tests 14 y 15: rechazo de listas excesivas. El test de 101 elementos verifica además que no se consulta el repositorio. |
| 4.2 | Test 21: excepción interna simulada y respuesta HTTP 500 genérica. |
| 4.3 | Test 17: rechazo del código malicioso sin reflejarlo en la respuesta. |
| 5.1 | Jest coverageThreshold y job build de CI. |
| 5.2 | Suite Jest y Supertest asociada a los criterios del spec. |
| 5.3 | Registro del router en src/app.js y pruebas de integración de POST /habilitados. |
| 5.4 | Job sca del workflow CI. |
| 5.5 | Job secrets del workflow CI. |

Evidencia de la suite completa: [Run #16](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45905571338).

## 3. Diagnóstico y corrección de los fallos

### 3.1. Cobertura insuficiente

- Commit que incorpora el gate: `259aa26`.
- Resultado inicial: 23 pruebas aprobadas y cobertura de líneas de 67.79%.
- Causa: src/util/formato.js no tenía pruebas y presentaba 0% de cobertura.
- Corrección: incorporación de 26 pruebas unitarias en tests/formato.test.js.
- Commit de corrección: `fd08b92`.
- Resultado corregido: 49 pruebas aprobadas y 98.30% de cobertura.
- Se mantuvo el umbral obligatorio del 80%, sin excluir archivos adicionales.

### 3.2. Regresiones de seguridad del endpoint

Antes de implementar POST /habilitados se escribieron cuatro pruebas de regresión en el commit `5037b77`.

| Caso | HTTP esperado | Fase roja | Fase verde |
| --- | --- | --- | --- |
| Aprobados como string | 400 | 404 | 400 |
| Lista de 5000 elementos | 400 | 404 | 400 |
| Código con caracteres especiales | 400 | 404 | 400 |
| Content-Type incorrecto | 400 | 404 | 400 |

Resultado inicial: 4 pruebas fallidas, código de salida 1.

La causa de los HTTP 404 fue que el endpoint todavía no estaba implementado. Esta evidencia corresponde a la fase roja del desarrollo basado en pruebas y no constituye una reproducción de los 40 segundos de bloqueo del prototipo anterior.

La corrección consistió en implementar validaciones estrictas antes de consultar el repositorio, limitar el tamaño del array, rechazar códigos inválidos y manejar los errores mediante respuestas JSON controladas.

Commits principales:

- `b33c8f0`: helper de validación y pruebas unitarias.
- `67e1309`: implementación del router.
- `fc444de`: integración del router y middleware de errores.
- `f823ab3`: suite completa de pruebas de aceptación.

### 3.3. Vulnerabilidades en dependencias (SCA)

El job sca se incorporó mediante el commit `115466f`.

La auditoría detectó una dependencia con vulnerabilidades de severidad alta: lodash 4.17.20.

Avisos identificados:

- GHSA-35jh-r3h4-6jhm.
- GHSA-29mw-wpgm-hmr9.
- GHSA-r5fr-rjxr-66jc.
- GHSA-xxjr-mmjv-4gpg.

El gate falló mediante npm audit --audit-level=high, con código de salida 1.

Se decidió actualizar específicamente lodash a la versión 4.18.1, evitando una actualización forzada y generalizada de dependencias.

Commit de corrección: `c09d4fa`.

Verificación posterior:

    found 0 vulnerabilities

Código de salida: 0.

Las 82 pruebas continuaron aprobadas y la cobertura de líneas se mantuvo en 100%.

### 3.4. Detección de secretos

El job secrets se incorporó mediante el commit `5bd5126`.

En la ejecución inicial, Gitleaks detectó un hallazgo:

    leaks found: 1
    Process completed with exit code 1.

Se identificó un valor asignado a CATALOGO_API_KEY en config/ejemplo.env.

La corrección consistió en retirar el valor de la variable, conservando el archivo como plantilla de configuración, y habilitar diagnósticos detallados mediante --verbose sin desactivar --redact.

Commit de corrección: `f5a102d`.

Resultado posterior:

    no leaks found

Se verificó el ciclo rojo-verde sobre el hallazgo existente en el repositorio base, sin introducir nuevas credenciales para simular un fallo.

No se reproduce el valor detectado en este documento.

## 4. Decisiones de los gates

| Gate | Umbral | Efecto | Etapa | Justificación |
| --- | --- | --- | --- | --- |
| Jest | Cobertura global de líneas >= 80% y pruebas aprobadas. | Bloqueante para CI. | PR y push a main. | Cumplir la política de calidad y detectar regresiones antes de aceptar cambios. |
| SCA — npm audit | Cero vulnerabilidades altas o críticas. | Bloqueante para CI. | PR y push a main. | Cumplir la política de TI y evitar incorporar dependencias con riesgos de seguridad elevados. |
| Gitleaks v8.30.1 | Cero secretos detectados en el snapshot analizado. | Bloqueante para CI. | PR y push a main. | Detectar credenciales incorporadas accidentalmente y evitar su permanencia en el estado actual del repositorio. |

Los tres jobs son independientes y no utilizan continue-on-error. De esta manera, un fallo de SCA no impide obtener resultados del análisis de secretos o de las pruebas.

## 5. Cambios a la propuesta de Kiro

| Documento | Qué propuso Kiro | Qué cambié | Por qué |
| --- | --- | --- | --- |
| requirements.md — 3.3 y 4.1 | Permitir hasta 200 elementos en aprobados. | Reduje el límite a 100 elementos y exigí verificarlo antes de deduplicar o consultar el repositorio. | El catálogo contiene 87 cursos. El límite permite representar el catálogo completo y reduce la exposición a solicitudes masivas, incluyendo listas de códigos repetidos. |
| requirements.md — 2.3 | Aceptar códigos desconocidos como cursos aprobados de otros planes. | Rechazar códigos desconocidos con HTTP 400 y mensaje fijo. | El producto tiene un alcance cerrado y no contempla equivalencias externas. Aceptarlos produciría resultados potencialmente inconsistentes con el catálogo. |
| requirements.md — 3.5 y 4.3 | Aceptar códigos de 1 a 10 caracteres y sanitizar o ignorar entradas inesperadas. | Exigir seis caracteres con un patrón alfanumérico específico y rechazar explícitamente entradas inválidas. | Los códigos reales del catálogo tienen seis caracteres. La validación estricta reduce la ambigüedad y evita reflejar contenido malicioso. |
| design.md | Incorporar fast-check como dependencia adicional de desarrollo. | Utilizar Jest, Supertest y casos deterministas con test.each. | Las herramientas existentes permiten verificar los criterios sin aumentar innecesariamente la superficie de dependencias. |
| design.md | Integrar los controles de seguridad como pasos de CI. | Establecer jobs independientes para build, sca y secrets. | Permite obtener evidencia individual de cada gate incluso si otro control falla. |

## 6. Resultado final

Pipeline de validación integral: [Run #16 — Success](https://github.com/Kto-PAPS/INF384-lab6-base/actions/runs/45905571338).

| Indicador | Resultado |
| --- | --- |
| Suites aprobadas | 6 de 6 |
| Pruebas aprobadas | 82 de 82 |
| Cobertura de líneas | 100% |
| Cobertura de ramas | 94.87% |
| Cobertura de funciones | 100% |
| Cobertura de sentencias | 100% |
| Vulnerabilidades npm detectadas | 0 |
| Secretos detectados en el snapshot final | 0 |
| Job build | Success |
| Job sca | Success |
| Job secrets | Success |

## 7. Alcance y limitaciones

- Gitleaks analiza los archivos versionados del commit actual mediante git archive HEAD. No analiza todo el historial de Git.
- Retirar una credencial del estado actual no la elimina del historial. Si una credencial expuesta fuera real, correspondería revocarla o rotarla.
- Los gates hacen fallar CI cuando se incumple su política. La rama main no cuenta con protección de rama configurada, por lo que no se garantiza el bloqueo técnico de un merge o push.
- La fase roja del endpoint evidencia pruebas fallidas antes de la implementación, no la reproducción del comportamiento exacto del prototipo anterior.
- El límite de elementos mitiga el escenario de solicitudes masivas identificado, pero no representa una protección integral contra ataques de denegación de servicio.
- No se incorporó el gate SAST opcional. Se priorizaron los cuatro entregables obligatorios.

## 8. Conclusión

El desarrollo de POST /habilitados se realizó mediante un enfoque spec-driven, revisando los requisitos, el diseño y las tareas antes de implementar la funcionalidad.

Los controles automatizados permitieron detectar incumplimientos de cobertura, vulnerabilidades en dependencias y un hallazgo de secreto. Las correcciones se verificaron mediante pruebas y ejecuciones posteriores de CI, conservando las evidencias de los ciclos rojo-verde.

El resultado técnico final cumple los umbrales de calidad y seguridad evaluados por los tres gates implementados.
