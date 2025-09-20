## API de Ofertas

Base URL: `/api/ofertas`

Autenticación: Bearer Token por header `Authorization: Bearer <TOKEN>`.
- El token debe coincidir con la variable de entorno `AUTH_TOKEN` configurada en el servidor.

### Modelos

**OfertaElemento**
- `categoria`: string (requerido)
- `descripcion`?: string | null (opcional)
- `cantidad`: number/float (requerido, mayor a 0, permite decimales)
- `foto`?: string | null (URL de la foto almacenada, solo en respuesta)

**Oferta (completa)**
- `id`: string (solo respuesta)
- `descripcion`: string
- `precio`: number
- `precio_cliente`?: number | null (opcional)
- `imagen`?: string | null (URL)
- `garantias`: string[]
- `elementos`: OfertaElemento[]

**OfertaSimplificada**
- `id`: string (solo respuesta)
- `descripcion`: string
- `precio`: number
- `precio_cliente`?: number | null (opcional)
- `imagen`?: string | null (URL)

### Endpoints

#### Gestión de Ofertas

- **GET** `/simplified` — Listar ofertas simplificadas
  - Respuesta 200:
  ```json
  {
    "success": true,
    "message": "Ofertas simplificadas obtenidas",
    "data": [
      { "id": "64f7b2...", "descripcion": "Instalación de paneles", "precio": 15000.0, "precio_cliente": 14500.0, "imagen": "https://.../imagen.jpg" }
    ]
  }
  ```

- **GET** `/` — Listar ofertas completas
  - Respuesta 200:
  ```json
  {
    "success": true,
    "message": "Ofertas obtenidas",
    "data": [
      {
        "id": "68cac8637c536b55d0a7f12f",
        "descripcion": "Instalación de paneles solares residencial",
        "precio": 15000.0,
        "precio_cliente": 14500.0,
        "imagen": "https://example.com/imagen-oferta-1.jpg",
        "garantias": ["5 años en paneles", "2 años en instalación"],
        "elementos": [
          {"categoria": "Panel Solar", "foto": "https://example.com/panel.jpg", "descripcion": "Panel 400W", "cantidad": 10}
        ]
      }
    ]
  }
  ```

- **GET** `/{oferta_id}` — Obtener oferta por id
  - Respuesta 200 (encontrada):
  ```json
  {"success": true, "message": "Oferta encontrada", "data": { /* Oferta */ }}
  ```
  - Respuesta 200 (no encontrada):
  ```json
  {"success": false, "message": "Oferta no encontrada", "data": null}
  ```

- **POST** `/` — Crear oferta (sin elementos)
  - Content-Type: `multipart/form-data`
  - Form data:
    - `descripcion`: string (requerido)
    - `precio`: number (requerido)
    - `precio_cliente`: number (opcional)
    - `imagen`: file (opcional - archivo de imagen)
    - `garantias`: string (JSON array, por defecto "[]")
  - Ejemplo usando curl:
  ```bash
  curl -X POST "http://localhost:8000/api/ofertas/" \
    -H "Authorization: Bearer <TOKEN>" \
    -F "descripcion=Instalación de paneles" \
    -F "precio=15000.0" \
    -F "precio_cliente=14500.0" \
    -F "imagen=@/path/to/image.jpg" \
    -F "garantias=[\"5 años en paneles\", \"2 años en instalación\"]"
  ```
  - Respuesta 200:
  ```json
  {"success": true, "message": "Oferta creada", "oferta_id": "..."}
  ```

- **PUT** `/{oferta_id}` — Actualizar oferta (sin elementos)
  - Content-Type: `multipart/form-data`
  - Form data (todos opcionales):
    - `descripcion`: string
    - `precio`: number
    - `precio_cliente`: number
    - `imagen`: file (archivo de imagen)
    - `garantias`: string (JSON array)
  - Ejemplo usando curl:
  ```bash
  curl -X PUT "http://localhost:8000/api/ofertas/68cac8637c536b55d0a7f12f" \
    -H "Authorization: Bearer <TOKEN>" \
    -F "descripcion=Nueva descripción" \
    -F "precio_cliente=13500.0" \
    -F "imagen=@/path/to/new-image.jpg"
  ```
  - Respuesta 200:
  ```json
  {"success": true, "message": "Oferta actualizada"}
  ```
  - Si no hay cambios o no existe:
  ```json
  {"success": false, "message": "Oferta no encontrada o sin cambios"}
  ```

- **DELETE** `/{oferta_id}` — Eliminar oferta
  - Respuesta 200:
  ```json
  {"success": true, "message": "Oferta eliminada"}
  ```
  - Si no existe:
  ```json
  {"success": false, "message": "Oferta no encontrada o no eliminada"}
  ```

#### Gestión de Elementos

- **POST** `/{oferta_id}/elementos` — Agregar elemento a oferta
  - Content-Type: `multipart/form-data`
  - Form data:
    - `categoria`: string (requerido)
    - `cantidad`: number/float (requerido, mayor a 0, permite decimales)
    - `descripcion`: string (opcional)
    - `foto`: file (opcional - archivo de imagen del elemento)
  - Ejemplo usando curl:
  ```bash
  curl -X POST "http://localhost:8000/api/ofertas/68cac8637c536b55d0a7f12f/elementos" \
    -H "Authorization: Bearer <TOKEN>" \
    -F "categoria=Panel Solar" \
    -F "cantidad=10.5" \
    -F "descripcion=Panel fotovoltaico 400W monocristalino" \
    -F "foto=@/path/to/panel.jpg"
  ```
  - Respuesta 200:
  ```json
  {"success": true, "message": "Elemento agregado a la oferta"}
  ```
  - Si la oferta no existe:
  ```json
  {"success": false, "message": "Oferta no encontrada"}
  ```

- **PUT** `/{oferta_id}/elementos/{elemento_index}` — Actualizar elemento de oferta
  - `elemento_index`: índice del elemento en el array ordenado por categoría (empezando desde 0)
  - Content-Type: `multipart/form-data`
  - Form data (todos opcionales, debe proporcionar al menos uno):
    - `categoria`: string (nueva categoría del elemento)
    - `cantidad`: number/float (nueva cantidad, mayor a 0, permite decimales)
    - `descripcion`: string (nueva descripción del elemento)
    - `foto`: file (nueva foto del elemento)
  - Ejemplo usando curl:
  ```bash
  curl -X PUT "http://localhost:8000/api/ofertas/68cac8637c536b55d0a7f12f/elementos/0" \
    -H "Authorization: Bearer <TOKEN>" \
    -F "categoria=Panel Solar Premium" \
    -F "cantidad=12.5" \
    -F "descripcion=Panel fotovoltaico 450W monocristalino premium"
  ```
  - Respuesta 200:
  ```json
  {"success": true, "message": "Elemento actualizado en la oferta"}
  ```
  - Si la oferta no existe o índice inválido:
  ```json
  {"success": false, "message": "Oferta no encontrada o índice inválido"}
  ```

- **DELETE** `/{oferta_id}/elementos/{elemento_index}` — Eliminar elemento de oferta
  - `elemento_index`: índice del elemento en el array ordenado por categoría (empezando desde 0)
  - Ejemplo usando curl:
  ```bash
  curl -X DELETE "http://localhost:8000/api/ofertas/68cac8637c536b55d0a7f12f/elementos/0" \
    -H "Authorization: Bearer <TOKEN>"
  ```
  - Respuesta 200:
  ```json
  {"success": true, "message": "Elemento eliminado de la oferta"}
  ```
  - Si la oferta no existe o índice inválido:
  ```json
  {"success": false, "message": "Oferta no encontrada o índice inválido"}
  ```

### Cabeceras

Enviar en todas las llamadas:
```
Authorization: Bearer <TOKEN>
Accept: application/json
Content-Type: multipart/form-data (en POST/PUT con archivos)
```

### Notas Importantes

#### Workflow Recomendado
1. **Crear oferta**: Usar `POST /` para crear la oferta básica (sin elementos)
2. **Agregar elementos**: Usar `POST /{oferta_id}/elementos` para cada elemento individual
3. **Modificar oferta**: Usar `PUT /{oferta_id}` para actualizar datos básicos
4. **Gestionar elementos**:
  - Usar `PUT /{oferta_id}/elementos/{index}` para editar elementos específicos
  - Usar `DELETE /{oferta_id}/elementos/{index}` para eliminar elementos específicos

#### Validaciones
- `cantidad` en elementos debe ser mayor a 0 (permite decimales como 1.5, 2.75, etc.)
- `categoria` en elementos es campo requerido
- Los archivos de imagen se almacenan en MinIO bucket "ofertas"
- `precio` y `precio_cliente` son number (float)
- El `id` se devuelve como string
- `precio_cliente` es opcional y puede usarse para precios específicos por cliente

#### Estructura de Elementos
Los elementos ahora son objetos estructurados con validaciones:
- **categoria**: Campo obligatorio que define el tipo de elemento
- **descripcion**: Campo opcional para detalles adicionales
- **cantidad**: Campo obligatorio, permite decimales (float) y debe ser mayor a 0
- **foto**: Campo opcional multipart file para imagen específica del elemento
  - En el input: archivo multipart (igual que imagen principal de oferta)
  - En la respuesta: URL string de la imagen almacenada en MinIO
  - Independiente de la imagen principal de la oferta

#### Ordenamiento de Elementos
- Los elementos se devuelven **siempre ordenados por categoría** alfabéticamente
- Los índices en endpoints PUT/DELETE se refieren al orden mostrado (ordenado por categoría)
- Esto garantiza consistencia entre frontend y backend al manipular elementos por índice

#### Cambios Importantes
- **ARREGLADO**: Inconsistencia al eliminar elementos cuando están ordenados por categoría
- **NUEVO**: Endpoint PUT para editar elementos existentes
- **ACTUALIZADO**: Cantidades ahora permiten valores decimales (float) en lugar de solo enteros