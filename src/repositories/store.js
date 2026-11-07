const { MongoClient } = require('mongodb');

// Acceso a datos mínimo sobre UNA colección. Dos implementaciones con la misma interfaz:
//  - MongoDB (Atlas, o Cosmos DB for MongoDB) cuando existe MONGO_URI.
//  - Memoria, solo para desarrollo local y pruebas (sin MONGO_URI).
//
//   get(id)                              -> documento | null
//   set(id, campos)                      -> crea o actualiza ($set) el documento con _id = id
//   page(filtro, { sort, skip, limit })  -> { items, total }   (filtro: igualdad por campo)
//   ensureIndex(campos)                  -> índice para las consultas ordenadas (no hace nada en memoria)

const sinId = ({ _id, ...resto }) => ({ id: _id, ...resto });

// ---------- Memoria ----------
function memoryStore() {
  const docs = new Map();
  return {
    async get(id) {
      const d = docs.get(id);
      return d ? sinId(d) : null;
    },
    async set(id, campos) {
      docs.set(id, { ...(docs.get(id) || {}), ...campos, _id: id });
    },
    async page(filtro, { sort = [], skip = 0, limit = 10 } = {}) {
      const todos = [...docs.values()].filter((d) => Object.entries(filtro).every(([k, v]) => d[k] === v));
      todos.sort((a, b) => {
        for (const [campo, dir] of sort) {
          if (a[campo] !== b[campo]) return (a[campo] < b[campo] ? -1 : 1) * dir;
        }
        return 0;
      });
      return { items: todos.slice(skip, skip + limit).map(sinId), total: todos.length };
    },
    async ensureIndex() {},
  };
}

// ---------- MongoDB ----------
let dbPromise;
function getDb() {
  if (!dbPromise) {
    const client = new MongoClient(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    dbPromise = client
      .connect()
      .then((c) => c.db(process.env.MONGO_DB || 'estudiambre_perfil'))
      .catch((e) => {
        dbPromise = undefined; // permite reintentar en la siguiente petición
        throw e;
      });
  }
  return dbPromise;
}

// Cierra la conexión (al apagar el servicio y al terminar las pruebas).
async function closeDb() {
  if (!dbPromise) return;
  const db = await dbPromise.catch(() => null);
  dbPromise = undefined;
  await db?.client.close();
}

function mongoStore(nombre) {
  const col = async () => (await getDb()).collection(nombre);
  return {
    async get(id) {
      const d = await (await col()).findOne({ _id: id });
      return d ? sinId(d) : null;
    },
    async set(id, campos) {
      await (await col()).updateOne({ _id: id }, { $set: campos }, { upsert: true });
    },
    async page(filtro, { sort = [], skip = 0, limit = 10 } = {}) {
      const c = await col();
      const cursor = c.find(filtro);
      if (sort.length) cursor.sort(sort);
      const [items, total] = await Promise.all([cursor.skip(skip).limit(limit).toArray(), c.countDocuments(filtro)]);
      return { items: items.map(sinId), total };
    },
    async ensureIndex(campos) {
      try {
        await (await col()).createIndex(campos);
      } catch {
        /* el índice es solo una optimización: si falla, las consultas siguen funcionando */
      }
    },
  };
}

function createStore(nombreColeccion) {
  return process.env.MONGO_URI ? mongoStore(nombreColeccion) : memoryStore();
}

module.exports = { createStore, closeDb };
