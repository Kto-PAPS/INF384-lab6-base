const {
  formatearNombre,
  formatearCreditos,
  formatearCiclo,
  formatearTipo,
  resumenCurso,
  totalCreditos,
  agruparPorCiclo,
  ordenarPorCreditos,
  listaRequisitos,
} = require('../src/util/formato');

// formatearNombre
describe('formatearNombre', () => {
  test('capitaliza la primera letra de cada palabra', () => {
    expect(formatearNombre('programación avanzada')).toBe('Programación Avanzada');
  });

  test('normaliza mayúsculas en la entrada', () => {
    expect(formatearNombre('CÁLCULO DIFERENCIAL')).toBe('Cálculo Diferencial');
  });

  test('nombre de una sola palabra', () => {
    expect(formatearNombre('matemáticas')).toBe('Matemáticas');
  });
});

// formatearCreditos
describe('formatearCreditos', () => {
  test('formatea un entero con un decimal', () => {
    expect(formatearCreditos(4)).toBe('4.0 créditos');
  });

  test('formatea un número con decimal', () => {
    expect(formatearCreditos(3.5)).toBe('3.5 créditos');
  });

  test('formatea cero créditos', () => {
    expect(formatearCreditos(0)).toBe('0.0 créditos');
  });
});

// formatearCiclo
describe('formatearCiclo', () => {
  test('devuelve "Ciclo N" para un número válido', () => {
    expect(formatearCiclo(5)).toBe('Ciclo 5');
    expect(formatearCiclo(10)).toBe('Ciclo 10');
  });

  test('devuelve "Electivo" cuando el ciclo es null', () => {
    expect(formatearCiclo(null)).toBe('Electivo');
  });

  test('devuelve "Electivo" cuando el ciclo es undefined', () => {
    expect(formatearCiclo(undefined)).toBe('Electivo');
  });
});

// formatearTipo
describe('formatearTipo', () => {
  test('devuelve "Obligatorio" para tipo obligatorio', () => {
    expect(formatearTipo('obligatorio')).toBe('Obligatorio');
  });

  test('devuelve "Electivo" para cualquier otro tipo', () => {
    expect(formatearTipo('electivo')).toBe('Electivo');
    expect(formatearTipo('otro')).toBe('Electivo');
    expect(formatearTipo(undefined)).toBe('Electivo');
  });
});

// resumenCurso
describe('resumenCurso', () => {
  test('combina id, name y créditos formateados', () => {
    const curso = { id: '1MAT01', name: 'Cálculo', credits: 4 };
    expect(resumenCurso(curso)).toBe('1MAT01 · Cálculo · 4.0 créditos');
  });

  test('incluye créditos con decimal cuando corresponde', () => {
    const curso = { id: '1FIS10', name: 'Física', credits: 3.5 };
    expect(resumenCurso(curso)).toBe('1FIS10 · Física · 3.5 créditos');
  });
});

// totalCreditos
describe('totalCreditos', () => {
  test('suma los créditos de una lista de cursos', () => {
    const cursos = [
      { credits: 4 },
      { credits: 3 },
      { credits: 2 },
    ];
    expect(totalCreditos(cursos)).toBe(9);
  });

  test('devuelve 0 con lista vacía', () => {
    expect(totalCreditos([])).toBe(0);
  });

  test('funciona con un solo curso', () => {
    expect(totalCreditos([{ credits: 5 }])).toBe(5);
  });
});

// agruparPorCiclo
describe('agruparPorCiclo', () => {
  const cursos = [
    { id: '1MAT01', cycle: 5, credits: 4 },
    { id: '1FIS10', cycle: 5, credits: 3 },
    { id: '1COM20', cycle: 6, credits: 3 },
    { id: '1ELE30', cycle: null, credits: 2 },
  ];

  test('agrupa cursos por su ciclo formateado', () => {
    const grupos = agruparPorCiclo(cursos);
    expect(grupos).toHaveProperty('Ciclo 5');
    expect(grupos).toHaveProperty('Ciclo 6');
    expect(grupos).toHaveProperty('Electivo');
  });

  test('cursos con ciclo null quedan bajo "Electivo"', () => {
    const grupos = agruparPorCiclo(cursos);
    expect(grupos['Electivo'].map((c) => c.id)).toContain('1ELE30');
  });

  test('cada grupo está ordenado por id', () => {
    const grupos = agruparPorCiclo(cursos);
    const ids = grupos['Ciclo 5'].map((c) => c.id);
    expect(ids).toEqual([...ids].sort());
  });
});

// ordenarPorCreditos
describe('ordenarPorCreditos', () => {
  test('ordena de mayor a menor créditos', () => {
    const cursos = [
      { id: 'A', credits: 2 },
      { id: 'B', credits: 5 },
      { id: 'C', credits: 3 },
    ];
    const result = ordenarPorCreditos(cursos);
    expect(result.map((c) => c.credits)).toEqual([5, 3, 2]);
  });

  test('cursos con igual crédito se ordenan por id ascendente', () => {
    const cursos = [
      { id: 'Z', credits: 4 },
      { id: 'A', credits: 4 },
      { id: 'M', credits: 4 },
    ];
    const result = ordenarPorCreditos(cursos);
    expect(result.map((c) => c.id)).toEqual(['A', 'M', 'Z']);
  });

  test('lista vacía devuelve arreglo vacío', () => {
    expect(ordenarPorCreditos([])).toEqual([]);
  });
});

// listaRequisitos
describe('listaRequisitos', () => {
  test('devuelve "Sin requisitos" para arreglo vacío', () => {
    expect(listaRequisitos([])).toBe('Sin requisitos');
  });

  test('devuelve "Sin requisitos" para null/undefined', () => {
    expect(listaRequisitos(null)).toBe('Sin requisitos');
    expect(listaRequisitos(undefined)).toBe('Sin requisitos');
  });

  test('ordena y une los códigos con coma y espacio', () => {
    expect(listaRequisitos(['1FIS10', '1MAT01', '1COM20'])).toBe('1COM20, 1FIS10, 1MAT01');
  });

  test('un solo código se devuelve tal cual', () => {
    expect(listaRequisitos(['1MAT01'])).toBe('1MAT01');
  });
});
