const logger = require('../logger');

function notFound(req, _res, next) {
  const { HttpError } = require('../errors');
  next(new HttpError(404, 'Ruta no encontrada'));
}

// Formato de error del equipo: { status, message, correlationId }
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = err.status || 500;
  let message = err.message;
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON inválido';
  }
  if (status >= 500) {
    logger.error('error no controlado', { correlationId: req.correlationId, error: err.message, stack: err.stack });
    message = 'Error interno del servidor';
  }
  res.status(status).json({ status, message, correlationId: req.correlationId });
}

module.exports = { notFound, errorHandler };
