// Racha de días seguidos entrando a la app. Se enciende una vez por día (minijuego del frontend)
// y se pierde si pasa un día completo sin encenderla. El "día" es el de Costa Rica (UTC−6, sin
// horario de verano), y lo decide el servidor, no el reloj del navegador.

const ZONA_CR_MS = -6 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

let reloj = () => Date.now();
// Solo para pruebas: fija la hora actual.
const _fijarReloj = (fn) => {
  reloj = fn || (() => Date.now());
};

const fechaCR = (ms) => new Date(ms + ZONA_CR_MS).toISOString().slice(0, 10);
const hoyCR = () => fechaCR(reloj());
const ayerCR = () => fechaCR(reloj() - DIA_MS);

// Estado visible a partir de lo guardado ({ racha, rachaUltimoDia }):
//  - encendida hoy  -> la racha tal cual
//  - encendida ayer -> sigue viva, falta encenderla hoy
//  - antes de ayer  -> se perdió: se muestra 0 y cuántos días se perdieron
function estado(guardado) {
  const racha = guardado?.racha ?? 0;
  const ultimo = guardado?.rachaUltimoDia ?? null;
  if (ultimo === hoyCR()) return { racha, rachaEncendidaHoy: true, rachaPerdida: 0, rachaUltimoDia: ultimo };
  if (ultimo === ayerCR()) return { racha, rachaEncendidaHoy: false, rachaPerdida: 0, rachaUltimoDia: ultimo };
  return { racha: 0, rachaEncendidaHoy: false, rachaPerdida: ultimo ? racha : 0, rachaUltimoDia: ultimo };
}

// Cambios a guardar al encender hoy. null si ya estaba encendida (idempotente).
function encender(guardado) {
  const ultimo = guardado?.rachaUltimoDia ?? null;
  if (ultimo === hoyCR()) return null;
  const racha = ultimo === ayerCR() ? (guardado?.racha ?? 0) + 1 : 1;
  return { racha, rachaUltimoDia: hoyCR() };
}

module.exports = { estado, encender, hoyCR, _fijarReloj };
