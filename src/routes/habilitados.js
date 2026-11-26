'use strict';

const { Router } = require('express');
const repositorio = require('../data/repositorio');
const { validarAprobados } = require('../util/validarAprobados');

const router = Router();

router.post('/', (req, res) => {
  // Paso 1: verificar Content-Type application/json
  if (!req.is('application/json')) {
    return res.status(400).json({ error: 'el cuerpo debe ser JSON válido' });
  }

  // Pasos 2–5: validar el campo aprobados
  const resultado = validarAprobados(req.body?.aprobados);
  if (!resultado.ok) {
    return res.status(resultado.status).json({ error: resultado.error });
  }

  const aprobados = req.body.aprobados;

  // Paso 6: verificar que todos los códigos existen en el catálogo
  const catalogo = repositorio.listar();
  const catalogoSet = new Set(catalogo.map((c) => c.id));

  for (const codigo of aprobados) {
    if (!catalogoSet.has(codigo)) {
      return res.status(400).json({ error: 'código de curso desconocido' });
    }
  }

  // Paso 7: deduplicar aprobados
  const aprobadosSet = new Set(aprobados);

  // Paso 8: filtrar cursos habilitados
  const habilitadosFiltrados = catalogo.filter(
    (curso) =>
      curso.prerequisites.every((p) => aprobadosSet.has(p)) &&
      !aprobadosSet.has(curso.id)
  );

  // Paso 9: serializar y responder
  const habilitados = habilitadosFiltrados.map((curso) => ({
    id: curso.id,
    name: curso.name,
    credits: curso.credits,
    cycle: curso.cycle,
    type: curso.type,
    prerequisites: curso.prerequisites,
  }));

  return res.status(200).json(habilitados);
});

module.exports = router;
