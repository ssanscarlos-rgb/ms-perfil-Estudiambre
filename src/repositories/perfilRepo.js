const { createStore } = require('./store');
const racha = require('../racha');

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

// racha, rachaEncendidaHoy y rachaPerdida se calculan con la fecha de hoy (ver src/racha.js).
const aPerfil = (d) => ({
  nombre: d?.nombre ?? DEFAULTS.nombre,
  universidad: d?.universidad ?? DEFAULTS.universidad,
  quincenaDias: d?.quincenaDias ?? DEFAULTS.quincenaDias,
  ...racha.estado(d),
  insignias: d?.insignias ?? DEFAULTS.insignias,
  preferencias: d?.preferencias ?? DEFAULTS.preferencias,
  logoUrl: d?.logoUrl ?? DEFAULTS.logoUrl,
});

async function getPerfil(sub) {
  return aPerfil(await store.get(sub));
}

// `cambios` ya viene validado y solo con campos editables (nombre, universidad,
// quincenaDias, preferencias). Las preferencias se fusionan con las existentes.
// Solo se guardan los campos que cambian: así un PATCH nunca pisa la racha.
async function patchPerfil(sub, cambios) {
  const aGuardar = { ...cambios };
  if (cambios.preferencias) {
    const actual = await getPerfil(sub);
    aGuardar.preferencias = { ...actual.preferencias, ...cambios.preferencias };
  }
  await store.set(sub, aGuardar);
  return getPerfil(sub);
}

// Enciende la racha de hoy: +1 si se encendió ayer, 1 si se había perdido. Si ya estaba
// encendida hoy no cambia nada (se puede llamar varias veces).
async function encenderRacha(sub) {
  const cambios = racha.encender(await store.get(sub));
  if (cambios) await store.set(sub, cambios);
  return getPerfil(sub);
}

module.exports = { getPerfil, patchPerfil, encenderRacha };
