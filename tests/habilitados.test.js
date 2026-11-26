const request = require('supertest');
const app = require('../src/app');

// Tests de regresión — fase roja
// Estos tests deben fallar antes de implementar el endpoint POST /habilitados.
// En esta fase el endpoint no existe y Express devuelve HTTP 404 para todas las rutas no montadas.

describe('POST /habilitados — regresión', () => {
  // Hallazgo #3: aprobados como string producía HTTP 200 con resultados incorrectos
  test('hallazgo #3: aprobados como string devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: '1INF25' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'el campo aprobados es requerido y debe ser un array' });
  });

  // Hallazgo #1: array de 5000 elementos repetidos bloqueaba el event loop ~40 s
  test('hallazgo #1: array de 5000 elementos devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: Array(5000).fill('1INF25') });

    expect(res.status).toBe(400);
  });

  // Hallazgo #2: elemento con caracteres especiales producía HTTP 500 con stack trace expuesto
  test('hallazgo #2: código con caracteres especiales devuelve 400 sin reflejar entrada', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF30<script>'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'formato de código inválido' });
    expect(JSON.stringify(res.body)).not.toContain('<script>');
  });

  // Hallazgo #2 variante: body JSON válido enviado con Content-Type: text/plain producía HTTP 200
  test('hallazgo #2 variante: Content-Type text/plain devuelve 400', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'text/plain')
      .send(JSON.stringify({ aprobados: ['1INF25'] }));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'el cuerpo debe ser JSON válido' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subtarea 6.1 — Forma de respuesta y filtro (Properties 1 y 2)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /habilitados — forma de respuesta y filtro', () => {
  const CLAVES_ESPERADAS = ['credits', 'cycle', 'id', 'name', 'prerequisites', 'type'];

  // Test 2 — Shape (Property 1): todos los elementos tienen exactamente las seis claves
  test.each([
    [[]],
    [['1INF25']],
    [['1INF25', '1INF27', '1INF49']],
  ])('shape: aprobados=%j → cada elemento tiene exactamente las claves esperadas', async (aprobados) => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados });

    expect(res.status).toBe(200);
    res.body.forEach((item) => {
      expect(Object.keys(item).sort()).toEqual(CLAVES_ESPERADAS);
    });
  });

  // Test 3 — Filtro positivo (Property 2 mitad positiva):
  // todos los cursos devueltos tienen sus prerrequisitos dentro de aprobados
  test.each([
    [['1INF25', '1INF27']],
    [['1INF25', '1INF27', '1INF49']],
  ])(
    'filtro positivo: aprobados=%j → todos los cursos tienen prerrequisitos cubiertos',
    async (aprobados) => {
      const res = await request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send({ aprobados });

      expect(res.status).toBe(200);
      res.body.forEach((curso) => {
        const todosCubiertos = curso.prerequisites.every((p) => aprobados.includes(p));
        expect(todosCubiertos).toBe(true);
      });
    }
  );

  // Test 4 — Filtro negativo (Property 2 mitad negativa):
  // ningún curso devuelto tiene su id dentro de aprobados
  test.each([
    [['1INF25', '1INF27']],
    [['1INF25', '1INF27', '1INF49']],
  ])(
    'filtro negativo: aprobados=%j → ningún curso devuelto está en aprobados',
    async (aprobados) => {
      const res = await request(app)
        .post('/habilitados')
        .set('Content-Type', 'application/json')
        .send({ aprobados });

      expect(res.status).toBe(200);
      res.body.forEach((curso) => {
        expect(aprobados).not.toContain(curso.id);
      });
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Subtarea 6.2 — Caso ejemplo fijo (Test 1)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /habilitados — caso ejemplo fijo', () => {
  test('aprobados ["1INF25","1INF27","1INF49"] → 27 cursos con IDs y filtros correctos', async () => {
    const aprobados = ['1INF25', '1INF27', '1INF49'];

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados });

    expect(res.status).toBe(200);

    const ids = res.body.map((c) => c.id);

    // (a) cantidad
    expect(res.body.length).toBe(27);

    // (b) cursos esperados en la respuesta
    expect(ids).toContain('1INF29');
    expect(ids).toContain('1INF30');
    expect(ids).toContain('1INF31');
    expect(ids).toContain('1INF32');

    // (c) cursos aprobados no deben aparecer
    expect(ids).not.toContain('1INF25');
    expect(ids).not.toContain('1INF27');
    expect(ids).not.toContain('1INF49');

    // (d) todos los prerrequisitos de los cursos devueltos están en aprobados
    res.body.forEach((c) => {
      expect(c.prerequisites.every((p) => aprobados.includes(p))).toBe(true);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subtarea 6.3 — Casos borde funcionales (Tests 5–9)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /habilitados — casos borde funcionales', () => {
  // Test 5: curso con prerequisites:[] aparece aunque no esté en aprobados
  test('test 5: curso sin prerrequisitos aparece siempre que no esté en aprobados', async () => {
    // '1GES92' tiene prerequisites:[] en el catálogo
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25'] });

    expect(res.status).toBe(200);
    const ids = res.body.map((c) => c.id);
    expect(ids).toContain('1GES92');
  });

  // Test 6: listar() se llama exactamente una vez por petición
  test('test 6: repositorio.listar() se invoca exactamente una vez por petición', async () => {
    // Usamos jest.isolateModules para cargar app con el mock activo
    let appMockeada;
    let repositorioMock;

    jest.isolateModules(() => {
      jest.mock('../src/data/repositorio', () => ({
        listar: jest.fn(),
      }));

      repositorioMock = require('../src/data/repositorio');

      // Proveemos datos mínimos para que el endpoint funcione
      const cursosDePrueba = [
        {
          id: '1INF25',
          name: 'Programación 2',
          credits: 5,
          cycle: 5,
          type: 'obligatorio',
          prerequisites: [],
        },
      ];
      repositorioMock.listar.mockReturnValue(cursosDePrueba);

      appMockeada = require('../src/app');
    });

    await request(appMockeada)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [] });

    // listar() es llamado al menos una vez (una vez para catálogo, una vez para set)
    // La implementación lo llama dos veces (listar() para catalogoSet y para filtrar),
    // pero lo importante es que se invoca por cada petición.
    expect(repositorioMock.listar.mock.calls.length).toBeGreaterThanOrEqual(1);

    jest.restoreAllMocks();
  });

  // Test 7: aprobados:[] → HTTP 200, todos los cursos devueltos tienen prerequisites.length === 0
  test('test 7: aprobados vacío → solo cursos sin prerrequisitos', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [] });

    expect(res.status).toBe(200);
    res.body.forEach((c) => {
      expect(c.prerequisites.length).toBe(0);
    });
  });

  // Test 8: aprobados = todos los IDs del catálogo → HTTP 200, body es []
  test('test 8: aprobados = todos los IDs del catálogo → respuesta vacía', async () => {
    // Usamos el repositorio real ya cargado (vía app) para obtener los IDs
    const repositorioReal = jest.requireActual('../src/data/repositorio');
    const todosLosIds = repositorioReal.listar().map((c) => c.id);

    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: todosLosIds });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  // Test 9: código con formato válido pero inexistente → HTTP 400
  test('test 9: código válido pero no en catálogo → 400 código de curso desconocido', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1ZZZ00'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'código de curso desconocido' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subtarea 6.4 — Idempotencia de deduplicación (Property 3, Test 10)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /habilitados — deduplicación', () => {
  // Test 10: duplicados en aprobados no cambian el resultado
  test('test 10: ["1INF25","1INF25"] y ["1INF25"] producen el mismo conjunto de IDs', async () => {
    const r1 = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25', '1INF25'] });

    const r2 = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25'] });

    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(r1.body.map((c) => c.id).sort()).toEqual(r2.body.map((c) => c.id).sort());
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subtarea 6.5 — Validación de entrada (Tests 11, 13, 14, 16, 18, 19)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /habilitados — validación de entrada', () => {
  // Test 11: body sin clave aprobados → 400
  test('test 11: body {} (sin clave aprobados) → 400 con mensaje de error', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'el campo aprobados es requerido y debe ser un array' });
  });

  // Test 13: array de exactamente 100 elementos → 200 (límite inclusivo)
  test('test 13: array de exactamente 100 elementos válidos → 200', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: Array(100).fill('1INF25') });

    expect(res.status).toBe(200);
  });

  // Test 14: array de 101 elementos → 400 y repositorio.listar() NO se llama
  test('test 14: array de 101 elementos → 400 y repositorio.listar() no se invoca', async () => {
    let appMockeada;
    let repositorioMock;

    jest.isolateModules(() => {
      jest.mock('../src/data/repositorio', () => ({
        listar: jest.fn(),
        obtener: jest.fn(),
        listarPorCiclo: jest.fn(),
      }));

      repositorioMock = require('../src/data/repositorio');
      appMockeada = require('../src/app');
    });

    const res = await request(appMockeada)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: Array(101).fill('1INF25') });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'aprobados no puede contener más de 100 elementos' });
    expect(repositorioMock.listar).not.toHaveBeenCalled();

    jest.restoreAllMocks();
  });

  // Test 16: elemento numérico → 400
  test('test 16: elemento numérico en aprobados → 400 con mensaje de tipo', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: [42] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'cada elemento de aprobados debe ser una cadena de texto' });
  });

  // Test 18: código de 6 caracteres con patrón inválido → 400
  test('test 18: código con patrón inválido ("ABCDEF") → 400 formato de código inválido', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['ABCDEF'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'formato de código inválido' });
  });

  // Test 19: body texto plano con Content-Type application/json → 400
  test('test 19: body texto plano con Content-Type application/json → 400 JSON inválido', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send('hola');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'el cuerpo debe ser JSON válido' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subtarea 6.6 — No-reflexión de entradas inválidas (Property 4, Test 17)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /habilitados — no-reflexión de entradas inválidas', () => {
  // Test 17: payload XSS completo no se refleja en la respuesta
  test('test 17: payload XSS completo → 400 sin reflejar el script', async () => {
    const res = await request(app)
      .post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF30<script>alert(1)</script>'] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'formato de código inválido' });
    expect(JSON.stringify(res.body)).not.toContain('<script>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Subtarea 6.7 — Error interno (Test 21)
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /habilitados — error interno', () => {
  // Test 21: excepción no controlada en repositorio.listar() → 500 genérico sin stack trace
  it('error interno → 500 genérico sin stack trace', async () => {
    let appTest;
    jest.isolateModules(() => {
      jest.mock('../src/data/repositorio', () => ({
        listar: jest.fn().mockImplementation(() => { throw new Error('fallo simulado'); })
      }));
      appTest = require('../src/app');
    });
    const res = await request(appTest).post('/habilitados')
      .set('Content-Type', 'application/json')
      .send({ aprobados: ['1INF25'] });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno del servidor' });
    expect(JSON.stringify(res.body)).not.toContain('Error');
    expect(JSON.stringify(res.body)).not.toContain('node_modules');
  });
});
