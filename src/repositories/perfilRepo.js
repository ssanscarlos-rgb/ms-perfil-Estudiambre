const { createStore } = require('./store');

const store = createStore(process.env.TABLE_PERFIL || 'perfiles');
const PK = 'perfil';

const DEFAULTS = {
  nombre: '',
  universidad: '',
  quincenaDias: [15, 30],
  racha: 0,
  insignias: [],
  preferencias: {},
  logoUrl: null,
};

// Table Storage solo guarda tipos simples: arreglos y objetos van como JSON en texto.
const parse = (v, fallback) => {
  if (v === undefined || v === null || v === '') return fallback;
  if (typeof v !== 'string') return v;
  try {
    return JSON.parse(v);
  } catch {
    return fallback;
  }
};

function toPerfil(e) {
  if (!e) return { ...DEFAULTS };
  return {
    nombre: e.nombre ?? DEFAULTS.nombre,
    universidad: e.universidad ?? DEFAULTS.universidad,
    quincenaDias: parse(e.quincenaDias, DEFAULTS.quincenaDias),
    racha: Number(e.racha ?? DEFAULTS.racha),
    insignias: parse(e.insignias, DEFAULTS.insignias),
    preferencias: parse(e.preferencias, DEFAULTS.preferencias),
    logoUrl: e.logoUrl ?? DEFAULTS.logoUrl,
  };
}

async function getPerfil(sub) {
  return toPerfil(await store.get(PK, sub));
}

// `cambios` ya viene validado y solo con campos editables.
async function patchPerfil(sub, cambios) {
  const actual = await getPerfil(sub);
  const nuevo = { ...actual, ...cambios };
  if (cambios.preferencias) nuevo.preferencias = { ...actual.preferencias, ...cambios.preferencias };
  await store.upsert(PK, sub, {
    nombre: nuevo.nombre,
    universidad: nuevo.universidad,
    quincenaDias: JSON.stringify(nuevo.quincenaDias),
    preferencias: JSON.stringify(nuevo.preferencias),
    racha: nuevo.racha,
    insignias: JSON.stringify(nuevo.insignias),
    ...(nuevo.logoUrl ? { logoUrl: nuevo.logoUrl } : {}),
  });
  return nuevo;
}

module.exports = { getPerfil, patchPerfil };
