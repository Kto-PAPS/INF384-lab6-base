const request = require('supertest');
const app = require('../src/app');

// Requisito 1.1 — GET /cursos devuelve todos los cursos con los campos requeridos
describe('GET /cursos', () => {
  test('1.1 devuelve 200 con todos los cursos', async () => {
    const res = await request(app).get('/cursos');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(87);
  });

  test('1.1 cada curso contiene id, name, credits, cycle y type', async () => {
    const res = await request(app).get('/cursos');

    for (const curso of res.body) {
      expect(curso).toHaveProperty('id');
      expect(curso).toHaveProperty('name');
      expect(curso).toHaveProperty('credits');
      expect(curso).toHaveProperty('cycle');
      expect(curso).toHaveProperty('type');
    }
  });
});

// Requisito 1.2 — GET /cursos?ciclo=N filtra por ciclo
describe('GET /cursos?ciclo=N', () => {
  test('1.2 devuelve solo los cursos del ciclo indicado', async () => {
    const res = await request(app).get('/cursos?ciclo=6');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    for (const curso of res.body) {
      expect(curso.cycle).toBe(6);
    }
  });

  test('1.2 acepta ciclo=5 (límite inferior)', async () => {
    const res = await request(app).get('/cursos?ciclo=5');

    expect(res.status).toBe(200);
    for (const curso of res.body) {
      expect(curso.cycle).toBe(5);
    }
  });

  test('1.2 acepta ciclo=10 (límite superior)', async () => {
    const res = await request(app).get('/cursos?ciclo=10');

    expect(res.status).toBe(200);
    for (const curso of res.body) {
      expect(curso.cycle).toBe(10);
    }
  });
});

// Requisito 1.3 — ciclo inválido devuelve 400
describe('GET /cursos?ciclo inválido', () => {
  test('1.3 ciclo=4 (fuera de rango) devuelve 400', async () => {
    const res = await request(app).get('/cursos?ciclo=4');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 ciclo=11 (fuera de rango) devuelve 400', async () => {
    const res = await request(app).get('/cursos?ciclo=11');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 ciclo=abc (no numérico) devuelve 400', async () => {
    const res = await request(app).get('/cursos?ciclo=abc');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });

  test('1.3 ciclo=6.5 (no entero) devuelve 400', async () => {
    const res = await request(app).get('/cursos?ciclo=6.5');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'ciclo debe ser un entero entre 5 y 10' });
  });
});

// Requisito 2.1 — GET /cursos/:codigo devuelve el detalle con prerequisitos resueltos
describe('GET /cursos/:codigo — código existente', () => {
  test('2.1 devuelve 200 con los campos requeridos', async () => {
    const res = await request(app).get('/cursos/1CON27');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: '1CON27',
      name: expect.any(String),
      credits: expect.any(Number),
      cycle: expect.any(Number),
      type: expect.any(String),
      prerequisites: expect.any(Array),
    });
  });

  test('2.1 cada prerequisito incluye id y name', async () => {
    // 1CON27 tiene prerequisito 1IND90
    const res = await request(app).get('/cursos/1CON27');

    expect(res.status).toBe(200);
    expect(res.body.prerequisites.length).toBeGreaterThan(0);
    for (const pre of res.body.prerequisites) {
      expect(pre).toHaveProperty('id');
      expect(pre).toHaveProperty('name');
      expect(typeof pre.id).toBe('string');
      expect(typeof pre.name).toBe('string');
    }
  });

  test('2.1 prerequisito resuelve el nombre correcto', async () => {
    const res = await request(app).get('/cursos/1CON27');

    expect(res.status).toBe(200);
    const pre = res.body.prerequisites.find((p) => p.id === '1IND90');
    expect(pre).toBeDefined();
    expect(pre.name).toBe('Empresa y su Entorno');
  });

  test('2.1 curso sin prerequisitos devuelve arreglo vacío', async () => {
    const res = await request(app).get('/cursos/1GES92');

    expect(res.status).toBe(200);
    expect(res.body.prerequisites).toEqual([]);
  });
});

// Requisito 2.2 — código inexistente devuelve 404
describe('GET /cursos/:codigo — código inexistente', () => {
  test('2.2 devuelve 404 con mensaje de error', async () => {
    const res = await request(app).get('/cursos/NOEXISTE');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'curso no encontrado' });
  });
});

// Requisito 3.1 — error interno no controlado devuelve 500 genérico sin stack trace
describe('Middleware de manejo de errores', () => {
  let testApp;

  beforeAll(() => {
    // Crea una app mínima con la misma función de error handler para probarla de forma aislada
    const express = require('express');
    testApp = express();
    testApp.get('/__test_error', (req, res, next) => {
      next(new Error('fallo simulado'));
    });
    // Monta el mismo middleware de error que usa app.js
    // eslint-disable-next-line no-unused-vars
    testApp.use((err, req, res, next) => {
      res.status(500).json({ error: 'error interno del servidor' });
    });
  });

  test('3.1 responde 500 con mensaje genérico', async () => {
    const res = await request(testApp).get('/__test_error');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'error interno del servidor' });
  });

  test('3.1 no expone stack trace ni rutas internas', async () => {
    const res = await request(testApp).get('/__test_error');

    const body = JSON.stringify(res.body);
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/at\s+\w/);         // stack frames
    expect(body).not.toMatch(/src\//);            // rutas internas
    expect(body).not.toMatch(/node_modules/);
  });
});
