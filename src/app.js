const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');

const correlationId = require('./middleware/correlationId');
const clientCert = require('./middleware/clientCert');
const auth = require('./middleware/auth');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Express 4 no captura promesas rechazadas: se envuelve cada handler async.
const wrap = (router) => {
  router.stack.forEach((layer) => {
    if (!layer.route) return;
    layer.route.stack.forEach((l) => {
      const fn = l.handle;
      l.handle = (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
    });
  });
  return router;
};

function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(correlationId);
  app.use(express.json({ limit: '50kb' }));

  // Sin certificado ni token: sondeo de salud y documentación.
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  const spec = YAML.parse(fs.readFileSync(path.join(__dirname, '..', 'openapi.yaml'), 'utf8'));
  app.use('/swagger', swaggerUi.serve, swaggerUi.setup(spec));
  app.get('/openapi.json', (_req, res) => res.json(spec));

  // API: certificado de APIM primero, luego identidad del usuario.
  app.use('/v1', clientCert, auth, wrap(require('./routes/perfil')));

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
