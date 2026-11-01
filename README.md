# ms-perfil-precios

Microservicio de **Perfil y Precios** de EstudiAmbre (Fase II). Node 20+ / Express, datos en **Azure Table Storage**.

## Endpoints (todos bajo `/v1`, requieren `Authorization: Bearer <Google JWT>`)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/v1/perfil` | `{nombre, universidad, quincenaDias, racha, insignias, preferencias, logoUrl}` |
| PATCH | `/v1/perfil` | Parcial. Solo `nombre`, `universidad`, `quincenaDias`, `preferencias` (se fusiona). Otros campos → 400 |
| GET | `/v1/precios?producto=&page=&size=` | Tiendas ordenadas por precio. `{content, page, size, totalElements, totalPages}` (página base 0, `size` máx. 50) |
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

Sin `STORAGE_CONNECTION_STRING` usa un almacén **en memoria** con precios de ejemplo (solo local). El certificado se desactiva si `CLIENT_CERT_THUMBPRINT` está vacío y `NODE_ENV` no es `production`.

Para probar en local necesitas un JWT con claim `sub` (no se verifica la firma; eso lo hace APIM). Ejemplo:

```bash
TOKEN="x.$(echo -n '{"sub":"user-1"}' | base64 | tr -d '=').y"
curl -H "Authorization: Bearer $TOKEN" "http://localhost:8080/v1/precios?producto=arroz&size=3"
```

## Variables

| Nombre | Tipo (GitHub) | Descripción |
|---|---|---|
| `STORAGE_CONNECTION_STRING` | Secret | Cadena de la Storage Account |
| `TABLE_PERFIL`, `TABLE_PRECIOS` | Variable | Nombres de tablas (`perfiles`, `precios`) |
| `CLIENT_CERT_THUMBPRINT` | Secret | SHA-1 del certificado de APIM, sin `:` |
| `PORT` | App setting | Lo define App Service |
| `AZURE_WEBAPP_NAME` / `AZURE_WEBAPP_PUBLISH_PROFILE` | Variable / Secret (Environment `test`) | Para el workflow |

Todas (menos las dos últimas) también como *App settings* del App Service. Poner `NODE_ENV=production` en Azure: sin thumbprint configurado, el servicio responde 403 en vez de dejar pasar.

## Cargar precios de ejemplo en Azure

```bash
STORAGE_CONNECTION_STRING="..." npm run seed
```

## Decisiones

- **Table Storage**: el acceso es por clave. Perfil: `PartitionKey="perfil"`, `RowKey=sub` del usuario. Precios: `PartitionKey`=producto normalizado (minúsculas, sin tildes), `RowKey`=id. Es barato y simple; no soporta ordenar ni paginar por posición, así que se filtra por partición y se ordena/pagina en la app (aceptable para el volumen de un radar de precios).
- **Identidad**: se lee `sub` del JWT sin revalidar la firma; APIM ya la validó y solo APIM llega al backend (certificado).
- **Certificado**: `X-ARR-ClientCert` (DER en base64) → SHA-1 → comparado con `CLIENT_CERT_THUMBPRINT`. `/health` y `/swagger` quedan fuera del filtro.
- **Logs** JSON por línea, con `correlationId` (`X-Correlation-Id` de APIM, o uno nuevo si falta).
- Precios en colones, enteros (ajustar si el frontend usa otra moneda).

## Despliegue

Push a `test` → GitHub Actions corre las pruebas y despliega al App Service (`.github/workflows/deploy-test.yml`). Si el Deployment Center ya generó su propio workflow, usa ese y borra este.
