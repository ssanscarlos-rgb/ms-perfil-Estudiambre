const { createStore } = require('./store');

const store = createStore(process.env.COLLECTION_PERFIL || 'perfiles');

// Un documento por usuario: _id = claim `sub` del JWT de Google.
// Arreglos y objetos se guardan tal cual (es justo para lo que sirve un documento).
const DEFAULTS = {
  nombre: '',
  universidad: '',
  quincenaDias: [15, 30],
  racha: 0,
  insignias: [],
  preferencias: {},
  logoUrl: null,
};

const aPerfil = (d) => ({
  nombre: d?.nombre ?? DEFAULTS.nombre,
  universidad: d?.universidad ?? DEFAULTS.universidad,
  quincenaDias: d?.quincenaDias ?? DEFAULTS.quincenaDias,
  racha: d?.racha ?? DEFAULTS.racha,
  insignias: d?.insignias ?? DEFAULTS.insignias,
  preferencias: d?.preferencias ?? DEFAULTS.preferencias,
  logoUrl: d?.logoUrl ?? DEFAULTS.logoUrl,
});

async function getPerfil(sub) {
  return aPerfil(await store.get(sub));
}

// `cambios` ya viene validado y solo con campos editables (nombre, universidad,
// quincenaDias, preferencias). Las preferencias se fusionan con las existentes.
async function patchPerfil(sub, cambios) {
  const actual = await getPerfil(sub);
  const nuevo = { ...actual, ...cambios };
  if (cambios.preferencias) nuevo.preferencias = { ...actual.preferencias, ...cambios.preferencias };
  await store.set(sub, nuevo);
  return nuevo;
}

module.exports = { getPerfil, patchPerfil };
