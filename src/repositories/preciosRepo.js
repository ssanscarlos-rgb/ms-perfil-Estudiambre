const { createStore } = require('./store');

const store = createStore(process.env.TABLE_PRECIOS || 'precios');

// PartitionKey = producto normalizado (minúsculas, sin tildes); RowKey = id del precio.
const normalizar = (s) =>
  (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const toPrecio = (e) => ({
  id: e.rowKey,
  tienda: e.tienda,
  zona: e.zona,
  precio: Number(e.precio),
  reportes: Number(e.reportes || 0),
});

// Table Storage no ordena ni pagina por posición: se filtra por partición, se ordena por precio y se corta aquí.
async function listarPrecios({ producto, page, size }) {
  const filas = await store.list(producto ? normalizar(producto) : undefined);
  const items = filas.map(toPrecio).sort((a, b) => a.precio - b.precio || b.reportes - a.reportes);
  const totalElements = items.length;
  const totalPages = Math.ceil(totalElements / size);
  return {
    content: items.slice(page * size, page * size + size),
    page,
    size,
    totalElements,
    totalPages,
  };
}

async function guardarPrecio(producto, id, data) {
  await store.upsert(normalizar(producto), id, data);
}

module.exports = { listarPrecios, guardarPrecio, normalizar };
