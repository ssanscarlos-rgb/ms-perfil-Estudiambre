const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

delete process.env.STORAGE_CONNECTION_STRING;
delete process.env.CLIENT_CERT_THUMBPRINT;

const { createApp } = require('../src/app');
const { seed } = require('../scripts/seed');

const jwt = (sub) => {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'RS256' })}.${b64({ sub, name: 'Test' })}.firma`;
};
const auth = (sub = 'user-1') => ({ Authorization: `Bearer ${jwt(sub)}`, 'Content-Type': 'application/json' });

let server;
let base;
test.before(async () => {
  await seed();
  server = createApp().listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(() => server.close());

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
  for (const body of [{ racha: 99 }, { quincenaDias: [40] }, { quincenaDias: [15, 15] }, {}, { nombre: 5 }]) {
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

test('GET /precios: ordenado por precio, sin tildes/mayúsculas y paginado', async () => {
  const r = await fetch(`${base}/v1/precios?producto=ARROZ%20T%C3%8DO%20PEL%C3%93N%201%20KG&page=0&size=3`, { headers: auth() });
  const p = await r.json();
  assert.equal(p.page, 0);
  assert.equal(p.size, 3);
  assert.equal(p.totalElements, 4);
  assert.equal(p.totalPages, 2);
  assert.equal(p.content.length, 3);
  const precios = p.content.map((x) => x.precio);
  assert.deepEqual(precios, [...precios].sort((a, b) => a - b));
  assert.deepEqual(Object.keys(p.content[0]).sort(), ['id', 'precio', 'reportes', 'tienda', 'zona']);

  const p2 = await (await fetch(`${base}/v1/precios?producto=Arroz%20Tio%20Pelon%201%20kg&page=1&size=3`, { headers: auth() })).json();
  assert.equal(p2.content.length, 1);
});

test('GET /precios valida parámetros y producto desconocido da página vacía', async () => {
  assert.equal((await fetch(`${base}/v1/precios?page=-1`, { headers: auth() })).status, 400);
  assert.equal((await fetch(`${base}/v1/precios?size=500`, { headers: auth() })).status, 400);
  const p = await (await fetch(`${base}/v1/precios?producto=inexistente`, { headers: auth() })).json();
  assert.equal(p.totalElements, 0);
  assert.deepEqual(p.content, []);
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
