const express = require('express');
const { HttpError } = require('../errors');
const repo = require('../repositories/perfilRepo');

const router = express.Router();
const EDITABLES = ['nombre', 'universidad', 'quincenaDias', 'preferencias'];

const esObjetoPlano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function validar(body) {
  if (!esObjetoPlano(body) || Object.keys(body).length === 0) {
    throw new HttpError(400, 'El body debe incluir al menos un campo a cambiar');
  }
  const extra = Object.keys(body).filter((k) => !EDITABLES.includes(k));
  if (extra.length) {
    throw new HttpError(400, `Campos no editables: ${extra.join(', ')}. Editables: ${EDITABLES.join(', ')}`);
  }
  const { nombre, universidad, quincenaDias, preferencias } = body;
  if (nombre !== undefined && (typeof nombre !== 'string' || nombre.trim().length > 60)) {
    throw new HttpError(400, 'nombre debe ser texto de máximo 60 caracteres');
  }
  if (universidad !== undefined && (typeof universidad !== 'string' || universidad.trim().length > 100)) {
    throw new HttpError(400, 'universidad debe ser texto de máximo 100 caracteres');
  }
  if (quincenaDias !== undefined) {
    const ok =
      Array.isArray(quincenaDias) &&
      quincenaDias.length >= 1 &&
      quincenaDias.length <= 2 &&
      quincenaDias.every((d) => Number.isInteger(d) && d >= 1 && d <= 31);
    if (!ok || new Set(quincenaDias).size !== quincenaDias.length) {
      throw new HttpError(400, 'quincenaDias debe ser un arreglo de 1 o 2 días distintos entre 1 y 31');
    }
  }
  if (preferencias !== undefined) {
    if (!esObjetoPlano(preferencias) || JSON.stringify(preferencias).length > 2000) {
      throw new HttpError(400, 'preferencias debe ser un objeto de máximo 2000 caracteres');
    }
    // Claves simples y valores simples: evita claves tipo operador de Mongo ("$set", "a.b").
    const valido = Object.entries(preferencias).every(
      ([k, v]) => /^[A-Za-z0-9_-]{1,40}$/.test(k) && (v === null || ['string', 'number', 'boolean'].includes(typeof v))
    );
    if (!valido) {
      throw new HttpError(400, 'preferencias solo admite claves simples (letras, números, _ y -) con valores de texto, número o booleano');
    }
  }
  const limpio = {};
  for (const k of EDITABLES) if (body[k] !== undefined) limpio[k] = typeof body[k] === 'string' ? body[k].trim() : body[k];
  if (limpio.quincenaDias) limpio.quincenaDias = [...limpio.quincenaDias].sort((a, b) => a - b);
  return limpio;
}

router.get('/perfil', async (req, res) => {
  res.json(await repo.getPerfil(req.user.sub));
});

router.patch('/perfil', async (req, res) => {
  const cambios = validar(req.body);
  res.json(await repo.patchPerfil(req.user.sub, cambios));
});

module.exports = router;
