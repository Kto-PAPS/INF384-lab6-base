'use strict';

const CODIGO_RE = /^(?:[0-9][A-Z]{3}[0-9]{2}|[A-Z]{3}[0-9]{3})$/;

/**
 * Valida el campo `aprobados` de la petición POST /habilitados (pasos 2–5).
 * No consulta el repositorio ni recibe catalogoSet.
 *
 * @param {unknown} aprobados - Valor recibido en req.body.aprobados
 * @returns {{ ok: true } | { ok: false, status: number, error: string }}
 */
function validarAprobados(aprobados) {
  // Paso 2: presencia y tipo
  if (!Array.isArray(aprobados)) {
    return {
      ok: false,
      status: 400,
      error: 'el campo aprobados es requerido y debe ser un array',
    };
  }

  // Paso 3: límite de tamaño (antes de cualquier otra inspección de elementos)
  if (aprobados.length > 100) {
    return {
      ok: false,
      status: 400,
      error: 'aprobados no puede contener más de 100 elementos',
    };
  }

  // Paso 4: tipo de cada elemento
  for (const elemento of aprobados) {
    if (typeof elemento !== 'string') {
      return {
        ok: false,
        status: 400,
        error: 'cada elemento de aprobados debe ser una cadena de texto',
      };
    }
  }

  // Paso 5: formato de código
  for (const elemento of aprobados) {
    if (!CODIGO_RE.test(elemento)) {
      return {
        ok: false,
        status: 400,
        error: 'formato de código inválido',
      };
    }
  }

  return { ok: true };
}

module.exports = { validarAprobados };
