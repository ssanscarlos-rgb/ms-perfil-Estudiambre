const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// Por defecto las pruebas usan el almacén en memoria; con TEST_MONGO=1 usan el MONGO_URI configurado.
if (process.env.TEST_MONGO !== '1') delete process.env.MONGO_URI;
delete process.env.CLIENT_CERT_THUMBPRINT;

const { createApp } = require('../src/app');

const jwt = (sub) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256' })}.${b64({ sub, name: 'Test' })}.firma`;
};
const auth = (sub = 'user-1') => ({ Authorization: `Bearer ${jwt(sub)}`, 'Content-Type': 'application/json' });

let server;
let base;
test.before(async () => {
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  server.close();
  await require('../src/repositories/store').closeDb();
});

test('health y swagger sin autenticación', async () => {
  assert.equal((await fetch(`${base}/health`)).status, 200);
  assert.equal((await fetch(`${base}/openapi.json`)).status, 200);
});

test('sin token: 401 con formato de error y correlationId', async () => {
  const r = await fetch(`${base}/v1/perfil`, { headers: { 'X-Correlation-Id': 'abc-123' } });
  assert.equal(r.status, 401);
  const body = await r.json();
  assert.equal(body.status, 401);
  assert.equal(body.correlationId, 'abc-123');
  assert.ok(body.message);
});

test('GET /perfil devuelve valores por defecto', async () => {
  const r = await fetch(`${base}/v1/perfil`, { headers: auth('nuevo') });
  assert.equal(r.status, 200);
  const p = await r.json();
  for (const k of ['universidad', 'quincenaDias', 'racha', 'insignias', 'preferencias', 'logoUrl']) assert.ok(k in p, k);
});

test('PATCH /perfil es parcial y fusiona preferencias', async () => {
  const h = auth('user-patch');
  let r = await fetch(`${base}/v1/perfil`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ universidad: 'TEC', preferencias: { tema: 'oscuro' } }),
  });
  assert.equal(r.status, 200);
  r = await fetch(`${base}/v1/perfil`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ quincenaDias: [30, 15], preferencias: { avisos: true } }),
  });
  const p = await r.json();
  assert.equal(p.universidad, 'TEC');
  assert.deepEqual(p.quincenaDias, [15, 30]);
  assert.deepEqual(p.preferencias, { tema: 'oscuro', avisos: true });
  const g = await (await fetch(`${base}/v1/perfil`, { headers: h })).json();
  assert.equal(g.universidad, 'TEC');
});

test('PATCH /perfil rechaza campos de solo lectura y datos inválidos', async () => {
  const h = auth('user-bad');
  for (const body of [
    { racha: 99 },
    { quincenaDias: [40] },
    { quincenaDias: [15, 15] },
    {},
    { nombre: 5 },
    { preferencias: { $set: 1 } },
    { preferencias: { 'a.b': 1 } },
    { preferencias: { tema: { x: 1 } } },
  ]) {
    const r = await fetch(`${base}/v1/perfil`, { method: 'PATCH', headers: h, body: JSON.stringify(body) });
    assert.equal(r.status, 400, JSON.stringify(body));
  }
  const r = await fetch(`${base}/v1/perfil`, { method: 'PATCH', headers: h, body: '{malo' });
  assert.equal(r.status, 400);
});

test('el perfil es por usuario', async () => {
  await fetch(`${base}/v1/perfil`, { method: 'PATCH', headers: auth('a'), body: JSON.stringify({ nombre: 'Ana' }) });
  const b = await (await fetch(`${base}/v1/perfil`, { headers: auth('b') })).json();
  assert.notEqual(b.nombre, 'Ana');
});

test('filtro de certificado: 403 sin cert o con cert distinto, 200 con el correcto', async () => {
  const der = crypto.randomBytes(64);
  process.env.CLIENT_CERT_THUMBPRINT = crypto.createHash('sha1').update(der).digest('hex').match(/../g).join(':');
  try {
    assert.equal((await fetch(`${base}/v1/perfil`, { headers: auth() })).status, 403);
    const malo = { ...auth(), 'X-ARR-ClientCert': crypto.randomBytes(64).toString('base64') };
    assert.equal((await fetch(`${base}/v1/perfil`, { headers: malo })).status, 403);
    const bueno = { ...auth(), 'X-ARR-ClientCert': der.toString('base64') };
    assert.equal((await fetch(`${base}/v1/perfil`, { headers: bueno })).status, 200);
  } finally {
    delete process.env.CLIENT_CERT_THUMBPRINT;
  }
});

test('ruta inexistente: 404 con formato de error', async () => {
  const r = await fetch(`${base}/v1/nada`, { headers: auth() });
  assert.equal(r.status, 404);
  assert.equal((await r.json()).status, 404);
});
