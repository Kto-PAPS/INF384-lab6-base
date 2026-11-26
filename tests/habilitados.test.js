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
