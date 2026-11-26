'use strict';

const { validarAprobados } = require('../src/util/validarAprobados');

describe('validarAprobados', () => {
  const ERROR_TIPO = 'el campo aprobados es requerido y debe ser un array';

  test('1. aprobados undefined → error de tipo', () => {
    expect(validarAprobados(undefined)).toEqual({
      ok: false,
      status: 400,
      error: ERROR_TIPO,
    });
  });

  test('2. aprobados como string → error de tipo', () => {
    expect(validarAprobados('1INF25')).toEqual({
      ok: false,
      status: 400,
      error: ERROR_TIPO,
    });
  });

  test('3. array de 101 elementos → error de tamaño', () => {
    expect(validarAprobados(Array(101).fill('1INF25'))).toEqual({
      ok: false,
      status: 400,
      error: 'aprobados no puede contener más de 100 elementos',
    });
  });

  test('4. array con elemento numérico → error de tipo de elemento', () => {
    expect(validarAprobados([42])).toEqual({
      ok: false,
      status: 400,
      error: 'cada elemento de aprobados debe ser una cadena de texto',
    });
  });

  test('5. array con código de longitud 6 inválido → error de formato', () => {
    expect(validarAprobados(['ABCDEF'])).toEqual({
      ok: false,
      status: 400,
      error: 'formato de código inválido',
    });
  });

  test('6. array vacío → ok', () => {
    expect(validarAprobados([])).toEqual({ ok: true });
  });

  test('7. array con códigos válidos → ok', () => {
    expect(validarAprobados(['1INF25', 'INF238'])).toEqual({ ok: true });
  });
});
