const express = require('express');
const { HttpError } = require('../errors');
const repo = require('../repositories/preciosRepo');

const router = express.Router();
const MAX_SIZE = 50;

function entero(valor, nombre, def, min, max) {
  if (valor === undefined || valor === '') return def;
  const n = Number(valor);
  if (!Number.isInteger(n) || n < min || n > max) {
    throw new HttpError(400, `${nombre} debe ser un entero entre ${min} y ${max}`);
  }
  return n;
}

router.get('/precios', async (req, res) => {
  const page = entero(req.query.page, 'page', 0, 0, 1_000_000);
  const size = entero(req.query.size, 'size', 10, 1, MAX_SIZE);
  const producto = typeof req.query.producto === 'string' ? req.query.producto : undefined;
  res.json(await repo.listarPrecios({ producto, page, size }));
});

module.exports = router;
