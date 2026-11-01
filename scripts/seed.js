// Carga precios de ejemplo en la tabla (Azure o memoria). Uso: npm run seed
const { guardarPrecio } = require('../src/repositories/preciosRepo');
const data = require('./seed-data');

async function seed() {
  let n = 0;
  for (const [producto, filas] of Object.entries(data)) {
    for (const { id, ...resto } of filas) {
      await guardarPrecio(producto, id, resto);
      n++;
    }
  }
  return n;
}

module.exports = { seed };

if (require.main === module) {
  seed()
    .then((n) => console.log(`Precios cargados: ${n}`))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
