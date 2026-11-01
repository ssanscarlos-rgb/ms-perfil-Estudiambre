const { TableClient } = require('@azure/data-tables');

// Almacén mínimo sobre una tabla: get / upsert / list. Si no hay STORAGE_CONNECTION_STRING
// usa memoria (solo desarrollo local y pruebas).
const memory = new Map(); // tabla -> Map("pk|rk" -> entidad)

function memoryStore(table) {
  if (!memory.has(table)) memory.set(table, new Map());
  const rows = memory.get(table);
  const key = (pk, rk) => `${pk}|${rk}`;
  return {
    async get(pk, rk) {
      const row = rows.get(key(pk, rk));
      return row ? { ...row } : null;
    },
    async upsert(pk, rk, data) {
      const current = rows.get(key(pk, rk)) || {};
      rows.set(key(pk, rk), { ...current, ...data, partitionKey: pk, rowKey: rk });
    },
    async list(pk) {
      return [...rows.values()].filter((r) => !pk || r.partitionKey === pk).map((r) => ({ ...r }));
    },
  };
}

function tableStore(table, connectionString) {
  const client = TableClient.fromConnectionString(connectionString, table);
  let ready;
  const ensure = () => (ready ||= client.createTable().catch(() => {})); // ya existe: se ignora

  return {
    async get(pk, rk) {
      await ensure();
      try {
        return await client.getEntity(pk, rk);
      } catch (e) {
        if (e.statusCode === 404) return null;
        throw e;
      }
    },
    async upsert(pk, rk, data) {
      await ensure();
      await client.upsertEntity({ partitionKey: pk, rowKey: rk, ...data }, 'Merge');
    },
    async list(pk) {
      await ensure();
      const options = pk ? { queryOptions: { filter: `PartitionKey eq '${pk.replace(/'/g, "''")}'` } } : {};
      const out = [];
      for await (const e of client.listEntities(options)) out.push(e);
      return out;
    },
  };
}

function createStore(table) {
  const cs = process.env.STORAGE_CONNECTION_STRING;
  return cs ? tableStore(table, cs) : memoryStore(table);
}

module.exports = { createStore };
