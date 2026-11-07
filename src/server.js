const { createApp } = require('./app');
const logger = require('./logger');
const { closeDb } = require('./repositories/store');

const port = process.env.PORT || 8080;

const server = createApp().listen(port, () => {
  logger.info('ms-perfil escuchando', {
    port,
    almacen: process.env.MONGO_URI ? 'mongodb' : 'memoria (solo local)',
    certificado: process.env.CLIENT_CERT_THUMBPRINT ? 'activo' : 'desactivado',
  });
});

// App Service manda SIGTERM al reiniciar o escalar: terminar las peticiones en curso y cerrar Mongo.
process.on('SIGTERM', () => {
  logger.info('SIGTERM: cerrando');
  server.close(() => closeDb().finally(() => process.exit(0)));
});
