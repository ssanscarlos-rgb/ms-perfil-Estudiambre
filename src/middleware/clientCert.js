const crypto = require('node:crypto');
const { HttpError } = require('../errors');
const logger = require('../logger');

const normalize = (s) => (s || '').replace(/[:\s]/g, '').toUpperCase();

// Compara el SHA-1 del certificado que App Service pasa en X-ARR-ClientCert (DER en base64)
// con CLIENT_CERT_THUMBPRINT. Sin variable: solo se omite fuera de producción.
module.exports = function clientCert(req, _res, next) {
  const expected = normalize(process.env.CLIENT_CERT_THUMBPRINT);

  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return next(new HttpError(403, 'Certificado no configurado en el servidor'));
    }
    return next();
  }

  const header = req.get('X-ARR-ClientCert');
  if (!header) return next(new HttpError(403, 'Certificado de cliente requerido'));

  try {
    const der = Buffer.from(header, 'base64');
    const thumbprint = crypto.createHash('sha1').update(der).digest('hex').toUpperCase();
    if (thumbprint !== expected) {
      logger.warn('thumbprint no coincide', { correlationId: req.correlationId });
      return next(new HttpError(403, 'Certificado de cliente inválido'));
    }
    return next();
  } catch {
    return next(new HttpError(403, 'Certificado de cliente inválido'));
  }
};
