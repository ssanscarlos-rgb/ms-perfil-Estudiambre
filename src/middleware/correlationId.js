const crypto = require('node:crypto');
const logger = require('../logger');

// Lee X-Correlation-Id (lo genera APIM); si no viene, lo crea. Lo devuelve en la respuesta y loguea cada request.
module.exports = function correlationId(req, res, next) {
  const id = req.get('X-Correlation-Id') || crypto.randomUUID();
  req.correlationId = id;
  res.set('X-Correlation-Id', id);
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      correlationId: id,
      method: req.method,
      path: req.originalUrl.split('?')[0],
      status: res.statusCode,
      durationMs: Date.now() - start,
    });
  });
  next();
};
