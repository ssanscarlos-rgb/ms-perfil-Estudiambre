const { createApp } = require('./app');
const logger = require('./logger');

const port = process.env.PORT || 8080;

// Sin Azure (almacén en memoria) se cargan precios de ejemplo para poder probar el frontend.
if (!process.env.STORAGE_CONNECTION_STRING && process.env.NODE_ENV !== 'production') {
  require('../scripts/seed').seed().catch((e) => logger.error('seed falló', { error: e.message }));
}

createApp().listen(port, () => {
  logger.info('ms-perfil-precios escuchando', {
    port,
    almacen: process.env.STORAGE_CONNECTION_STRING ? 'azure-table-storage' : 'memoria (solo local)',
    certificado: process.env.CLIENT_CERT_THUMBPRINT ? 'activo' : 'desactivado',
  });
});
