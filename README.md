# ms-perfil

Microservicio de **Perfil** de EstudiAmbre (Fase II). Node 20+ / Express, datos en **MongoDB Atlas** (base `estudiambre_perfil`, colección `perfiles`). Forma parte de la separación de Perfil y Precios pedida por el profe: los dos servicios tienen la misma estructura y comparten el cluster de Atlas, pero cada uno tiene su propia base.

## Endpoints (bajo `/v1`, requieren `Authorization: Bearer <Google JWT>`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/perfil` | `{nombre, universidad, quincenaDias, racha, insignias, preferencias, logoUrl}` |
| PATCH | `/v1/perfil` | Parcial. Solo `nombre`, `universidad`, `quincenaDias`, `preferencias` (se fusiona; claves simples con valores de texto, número o booleano). Otros campos → 400 |
| GET | `/health` | Sin autenticación |
| GET | `/swagger` | Swagger UI (spec en `/openapi.json`) |

Errores: `{ "status": 400, "message": "...", "correlationId": "..." }`.

## Arranque local

```bash
npm install
cp .env.example .env
npm run dev        # http://localhost:8080/swagger
npm test
```

Sin `MONGO_URI` usa un almacén **en memoria** (solo local). Las colecciones se crean solas al primer uso. El certificado se desactiva si `CLIENT_CERT_THUMBPRINT` está vacío y `NODE_ENV` no es `production`.

Las pruebas usan memoria por defecto; con `TEST_MONGO=1 MONGO_URI=... npm test` corren contra una base Mongo real.

Para probar a mano necesitas un JWT con claim `sub` (no se verifica la firma; eso lo hace APIM):

```bash
TOKEN="x.$(echo -n '{"sub":"user-1"}' | base64 | tr -d '=').y"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/v1/Perfil"
```

## Variables

| Nombre | Tipo (GitHub) | Descripción |
|---|---|---|
| `MONGO_URI` | Secret | Cadena de conexión del cluster de MongoDB Atlas |
| `MONGO_DB` | Variable | Base de este servicio (`estudiambre_perfil`) |
| `COLLECTION_PERFIL` | Variable | Colección (`perfiles`) |
| `CLIENT_CERT_THUMBPRINT` | Secret | SHA-1 del certificado de APIM, sin `:` |
| `PORT` | App setting | Lo define App Service |
| `AZURE_WEBAPP_NAME` / `AZURE_WEBAPP_PUBLISH_PROFILE` | Variable / Secret (Environment `test`) | Para el workflow |

Todas (menos las dos últimas) también como *App settings* del App Service. Poner `NODE_ENV=production` en Azure: sin thumbprint configurado, el servicio responde 403 en vez de dejar pasar.

## Decisiones

- **MongoDB (NoSQL documental)**: el perfil es un documento con arreglos y objetos anidados (insignias, días de quincena, preferencias) que se lee y escribe completo por usuario, sin joins ni transacciones.
- **Perfil**: un documento por usuario, `_id` = claim `sub`.
- **Un servicio por contexto**: este servicio solo conoce su base; no lee los datos de su par (`ms-perfil`).
- **Identidad**: se lee `sub` del JWT sin revalidar la firma; APIM ya la validó y solo APIM llega al backend (certificado).
- **Certificado**: `X-ARR-ClientCert` (DER en base64) → SHA-1 → comparado con `CLIENT_CERT_THUMBPRINT`. `/health` y `/swagger` quedan fuera del filtro.
- **Logs** JSON por línea, con `correlationId` (`X-Correlation-Id` de APIM, o uno nuevo si falta).
- **Seguridad con Mongo**: valores y claves validados antes de llegar a la base (sin claves tipo operador como `$set`).

## Despliegue

Push a `test` → GitHub Actions corre las pruebas y despliega al App Service (`.github/workflows/deploy-test.yml`). Si el Deployment Center ya generó su propio workflow, usa ese y borra este.
