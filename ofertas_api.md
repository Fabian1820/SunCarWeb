# API de Ofertas

Base URL: `/api/ofertas`

Autenticación: Bearer Token por header `Authorization: Bearer <TOKEN>`.
- El token debe coincidir con la variable de entorno `AUTH_TOKEN` configurada en el servidor.

## Modelos

### OfertaElemento
- `categoria`: string (opcional)
- `descripcion`: string (requerido)
- `cantidad`: float (requerido, mayor a 0, permite decimales)
- `foto`: string | null (URL de la foto almacenada, solo en respuesta)

### Oferta (completa)
- `id`: string (solo respuesta)
- `descripcion`: string (requerido)
- `descripcion_detallada`: string | null (opcional) - Descripción extendida y detallada de la oferta
- `precio`: float (requerido)
- `precio_cliente`: float | null (opcional) - Precio específico para el cliente
- `imagen`: string | null (URL, opcional)
- `moneda`: string | null (opcional) - Moneda de la oferta (ej: "usd", "cup", "mlc")
- `financiamiento`: boolean (opcional, por defecto false) - Indica si tiene financiamiento disponible
- `descuentos`: string | null (opcional) - Información detallada sobre descuentos aplicables
- `garantias`: string[] (array de strings)
- `elementos`: OfertaElemento[] (array de elementos)

### OfertaSimplificada
- `id`: string (solo respuesta)
- `descripcion`: string (requerido)
- `descripcion_detallada`: string | null (opcional)
- `precio`: float (requerido)
- `precio_cliente`: float | null (opcional)
- `imagen`: string | null (URL, opcional)
- `moneda`: string | null (opcional)
- `financiamiento`: boolean (opcional, por defecto false)
- `descuentos`: string | null (opcional)

## Endpoints

### Gestión de Ofertas

#### GET `/simplified` — Listar ofertas simplificadas
Obtiene todas las ofertas en formato simplificado (sin elementos ni garantías).

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Ofertas simplificadas obtenidas",
  "data": [
    {
      "id": "64f7b2...",
      "descripcion": "SISTEMA FOTOVOLTAICO 3 kW con paneles de 590 W y 2 Baterías de 2.4 kW",
      "descripcion_detallada": "SISTEMA FOTOVOLTAICO 3 kW con paneles de 590 W...",
      "precio": 5440.0,
      "precio_cliente": null,
      "imagen": "https://s3.suncarsrl.com:443/ofertas/3b0d3e87.png",
      "moneda": "usd",
      "financiamiento": true,
      "descuentos": "Descuento del 10% por pago contado..."
    }
  ]
}
```

---

#### GET `/` — Listar ofertas completas
Obtiene todas las ofertas con todos sus detalles, incluyendo elementos y garantías.

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Ofertas obtenidas",
  "data": [
    {
      "id": "68cda22e33da53b76ba3338e",
      "descripcion": "SISTEMA FOTOVOLTAICO 3 kW con paneles de 590 W y 2 Baterías de 2.4 kW",
      "descripcion_detallada": "SISTEMA FOTOVOLTAICO 3 kW con paneles de 590 W y 2 Baterías de 2.4 kW (total 4.8 kWh de almacenamiento)...",
      "precio": 5440.0,
      "precio_cliente": null,
      "imagen": "https://s3.suncarsrl.com:443/ofertas/3b0d3e87.png",
      "moneda": "usd",
      "financiamiento": true,
      "descuentos": "Descuento del 10% por pago contado. Financiamiento disponible desde España con intereses bajos.",
      "garantias": [
        "2 años sobre la instalación efectuada por nosotros.",
        "5 años para el inversor.",
        "3 años o 5000 ciclos de carga para la batería de LiFePo4.",
        "15 años para los paneles."
      ],
      "elementos": [
        {
          "categoria": "Inversor",
          "descripcion": "INVERSOR DE CONEXIÓN A RED MONOFÁSICO GREENHEISS SOLAR GH-IH STYLE 12,5A 3000W 2MPPT 230V MODELO HÍBRIDO",
          "cantidad": 1.0,
          "foto": "https://s3.suncarsrl.com:443/ofertas/adfe2d9e.png"
        },
        {
          "categoria": "Batería",
          "descripcion": "BATERÍA DE LITIO PARA INSTALACIÓN SOLAR FOTOVOLTAICA GREENHEISS SOLAR 2,4KWH IRON",
          "cantidad": 2.0,
          "foto": "https://s3.suncarsrl.com:443/ofertas/d23ddca7.png"
        }
      ]
    }
  ]
}
```

---

#### GET `/{oferta_id}` — Obtener oferta por ID
Obtiene una oferta específica por su ID con todos sus detalles.

**Parámetros de ruta:**
- `oferta_id`: string (ID de la oferta)

**Respuesta 200 (encontrada):**
```json
{
  "success": true,
  "message": "Oferta encontrada",
  "data": {
    "id": "68cda22e33da53b76ba3338e",
    "descripcion": "SISTEMA FOTOVOLTAICO 3 kW...",
    "descripcion_detallada": "...",
    "precio": 5440.0,
    "precio_cliente": null,
    "imagen": "https://...",
    "moneda": "usd",
    "financiamiento": true,
    "descuentos": "...",
    "garantias": [...],
    "elementos": [...]
  }
}
```

**Respuesta 200 (no encontrada):**
```json
{
  "success": false,
  "message": "Oferta no encontrada",
  "data": null
}
```

---

#### POST `/` — Crear oferta
Crea una nueva oferta (sin elementos). Los elementos deben agregarse posteriormente usando el endpoint de elementos.

**Content-Type:** `multipart/form-data`

**Form data:**
- `descripcion`: string (requerido) - Título o nombre corto de la oferta
- `precio`: float (requerido) - Precio base de la oferta
- `descripcion_detallada`: string (opcional) - Descripción extendida y detallada
- `precio_cliente`: float (opcional) - Precio específico para el cliente
- `moneda`: string (opcional) - Moneda (ej: "usd", "cup", "mlc")
- `financiamiento`: boolean (opcional) - Si tiene financiamiento disponible
- `descuentos`: string (opcional) - Información detallada sobre descuentos
- `imagen`: file (opcional) - Archivo de imagen principal de la oferta
- `garantias`: string (opcional, por defecto "[]") - Array JSON de strings con garantías

**Ejemplo usando curl:**
```bash
curl -X POST "http://localhost:8000/api/ofertas/" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "descripcion=SISTEMA FOTOVOLTAICO 3 kW con paneles de 590 W" \
  -F "descripcion_detallada=SISTEMA FOTOVOLTAICO 3 kW con paneles de 590 W y 2 Baterías de 2.4 kW (total 4.8 kWh de almacenamiento)..." \
  -F "precio=5440.0" \
  -F "precio_cliente=5200.0" \
  -F "moneda=usd" \
  -F "financiamiento=true" \
  -F "descuentos=Descuento del 10% por pago contado. Financiamiento disponible desde España." \
  -F "imagen=@/path/to/image.jpg" \
  -F 'garantias=["2 años sobre la instalación", "5 años para el inversor", "15 años para los paneles"]'
```

**Respuesta 200:**
```json
{
  "success": true,
  "message": "Oferta creada",
  "oferta_id": "68cda22e33da53b76ba3338e"
}
```

---

#### PUT `/{oferta_id}` — Actualizar oferta
Actualiza los datos básicos de una oferta existente (sin modificar elementos).

**Parámetros de ruta:**
- `oferta_id`: string (ID de la oferta a actualizar)

**Content-Type:** `multipart/form-data`

**Form data (todos opcionales):**
- `descripcion`: string - Nuevo título o nombre corto
- `descripcion_detallada`: string - Nueva descripción detallada
- `precio`: float - Nuevo precio base
- `precio_cliente`: float - Nuevo precio específico para cliente
- `moneda`: string - Nueva moneda
- `financiamiento`: boolean - Actualizar disponibilidad de financiamiento
- `descuentos`: string - Nueva información sobre descuentos
- `imagen`: file - Nuevo archivo de imagen principal
- `garantias`: string - Nuevo array JSON de garantías

**Ejemplo usando curl:**
```bash
curl -X PUT "http://localhost:8000/api/ofertas/68cda22e33da53b76ba3338e" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "descripcion=SISTEMA FOTOVOLTAICO 3 kW ACTUALIZADO" \
  -F "precio=5200.0" \
  -F "descuentos=Descuento del 15% por pago contado hasta fin de mes" \
  -F "imagen=@/path/to/new-image.jpg"
```

**Respuesta 200 (éxito):**
```json
{
  "success": true,
  "message": "Oferta actualizada"
}
```

**Respuesta 200 (sin cambios o no existe):**
```json
{
  "success": false,
  "message": "Oferta no encontrada o sin cambios"
}
```

---

#### DELETE `/{oferta_id}` — Eliminar oferta
Elimina una oferta y todos sus elementos asociados.

**Parámetros de ruta:**
- `oferta_id`: string (ID de la oferta a eliminar)

**Ejemplo usando curl:**
```bash
curl -X DELETE "http://localhost:8000/api/ofertas/68cda22e33da53b76ba3338e" \
  -H "Authorization: Bearer <TOKEN>"
```

**Respuesta 200 (éxito):**
```json
{
  "success": true,
  "message": "Oferta eliminada"
}
```

**Respuesta 200 (no existe):**
```json
{
  "success": false,
  "message": "Oferta no encontrada o no eliminada"
}
```

---

### Gestión de Elementos

#### POST `/{oferta_id}/elementos` — Agregar elemento a oferta
Agrega un nuevo elemento (componente/material) a una oferta existente.

**Parámetros de ruta:**
- `oferta_id`: string (ID de la oferta)

**Content-Type:** `multipart/form-data`

**Form data:**
- `categoria`: string (requerido) - Categoría del elemento (ej: "Inversor", "Batería", "Paneles")
- `cantidad`: float (requerido, mayor a 0) - Cantidad del elemento, permite decimales
- `descripcion`: string (opcional) - Descripción detallada del elemento
- `foto`: file (opcional) - Archivo de imagen del elemento específico

**Ejemplo usando curl:**
```bash
curl -X POST "http://localhost:8000/api/ofertas/68cda22e33da53b76ba3338e/elementos" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "categoria=Inversor" \
  -F "cantidad=1" \
  -F "descripcion=INVERSOR DE CONEXIÓN A RED MONOFÁSICO GREENHEISS SOLAR GH-IH STYLE 12,5A 3000W 2MPPT 230V" \
  -F "foto=@/path/to/inversor.jpg"
```

**Respuesta 200 (éxito):**
```json
{
  "success": true,
  "message": "Elemento agregado a la oferta"
}
```

**Respuesta 200 (oferta no encontrada):**
```json
{
  "success": false,
  "message": "Oferta no encontrada"
}
```

---

#### PUT `/{oferta_id}/elementos/{elemento_index}` — Actualizar elemento
Actualiza un elemento específico dentro de una oferta.

**Parámetros de ruta:**
- `oferta_id`: string (ID de la oferta)
- `elemento_index`: integer (índice del elemento en el array ordenado por categoría, empezando desde 0)

**Content-Type:** `multipart/form-data`

**Form data (todos opcionales, debe proporcionar al menos uno):**
- `categoria`: string - Nueva categoría del elemento
- `cantidad`: float (mayor a 0) - Nueva cantidad, permite decimales
- `descripcion`: string - Nueva descripción del elemento
- `foto`: file - Nueva foto del elemento

**Ejemplo usando curl:**
```bash
curl -X PUT "http://localhost:8000/api/ofertas/68cda22e33da53b76ba3338e/elementos/0" \
  -H "Authorization: Bearer <TOKEN>" \
  -F "categoria=Inversor Premium" \
  -F "cantidad=2" \
  -F "descripcion=INVERSOR DE CONEXIÓN A RED MONOFÁSICO PREMIUM 3500W"
```

**Respuesta 200 (éxito):**
```json
{
  "success": true,
  "message": "Elemento actualizado en la oferta"
}
```

**Respuesta 200 (oferta no encontrada o índice inválido):**
```json
{
  "success": false,
  "message": "Oferta no encontrada o índice inválido"
}
```

---

#### DELETE `/{oferta_id}/elementos/{elemento_index}` — Eliminar elemento
Elimina un elemento específico de una oferta.

**Parámetros de ruta:**
- `oferta_id`: string (ID de la oferta)
- `elemento_index`: integer (índice del elemento en el array ordenado por categoría, empezando desde 0)

**Ejemplo usando curl:**
```bash
curl -X DELETE "http://localhost:8000/api/ofertas/68cda22e33da53b76ba3338e/elementos/0" \
  -H "Authorization: Bearer <TOKEN>"
```

**Respuesta 200 (éxito):**
```json
{
  "success": true,
  "message": "Elemento eliminado de la oferta"
}
```

**Respuesta 200 (oferta no encontrada o índice inválido):**
```json
{
  "success": false,
  "message": "Oferta no encontrada o índice inválido"
}
```

---

### Sistema Recomendador con IA

#### POST `/recomendador` — Recomendar ofertas basado en IA
Sistema inteligente que analiza el texto del usuario y retorna todas las ofertas ordenadas por relevancia según sus necesidades.

**Content-Type:** `application/json`

**Request body:**
```json
{
  "texto": "Necesito un sistema solar para mi casa con respaldo de batería para apagones"
}
```

**Respuesta 200 (éxito):**
```json
{
  "success": true,
  "message": "Recomendaciones generadas exitosamente",
  "data": {
    "texto": "Basado en tus necesidades de respaldo durante apagones, te recomiendo estos sistemas con baterías...",
    "ofertas": [
      {
        "id": "68cda22e33da53b76ba3338e",
        "descripcion": "SISTEMA FOTOVOLTAICO 3 kW con 2 Baterías",
        "descripcion_detallada": "...",
        "precio": 5440.0,
        "precio_cliente": null,
        "imagen": "https://...",
        "moneda": "usd",
        "financiamiento": true,
        "descuentos": "..."
      }
    ]
  }
}
```

**Respuesta 200 (sin ofertas disponibles):**
```json
{
  "success": false,
  "message": "No hay ofertas disponibles para recomendar"
}
```

---

## Cabeceras HTTP

Enviar en todas las llamadas:
```
Authorization: Bearer <TOKEN>
Accept: application/json
Content-Type: multipart/form-data (en POST/PUT con archivos)
Content-Type: application/json (en /recomendador)
```

---

## Notas Importantes

### Workflow Recomendado
1. **Crear oferta**: Usar `POST /` para crear la oferta básica (sin elementos)
2. **Agregar elementos**: Usar `POST /{oferta_id}/elementos` para cada elemento individual
3. **Modificar oferta**: Usar `PUT /{oferta_id}` para actualizar datos básicos
4. **Gestionar elementos**:
  - Usar `PUT /{oferta_id}/elementos/{index}` para editar elementos específicos
  - Usar `DELETE /{oferta_id}/elementos/{index}` para eliminar elementos específicos

### Validaciones
- `cantidad` en elementos debe ser mayor a 0 (permite decimales como 1.5, 2.75, etc.)
- `categoria` en elementos es campo requerido
- Los archivos de imagen se almacenan en MinIO bucket "ofertas"
- `precio` y `precio_cliente` son floats
- El `id` se devuelve como string
- `precio_cliente` es opcional y puede usarse para precios específicos por cliente
- `moneda` puede ser cualquier string, típicamente: "usd", "cup", "mlc"
- `financiamiento` es boolean, por defecto false
- `descripcion_detallada` y `descuentos` son strings largos opcionales para información extendida

### Estructura de Elementos
Los elementos son objetos estructurados con validaciones:
- **categoria**: Campo opcional que define el tipo de elemento (ej: "Inversor", "Batería", "Paneles")
- **descripcion**: Campo requerido para detalles del elemento
- **cantidad**: Campo obligatorio, permite decimales (float) y debe ser mayor a 0
- **foto**: Campo opcional multipart file para imagen específica del elemento
  - En el input: archivo multipart (igual que imagen principal de oferta)
  - En la respuesta: URL string de la imagen almacenada en MinIO
  - Independiente de la imagen principal de la oferta

### Ordenamiento de Elementos
- Los elementos se devuelven **siempre ordenados por categoría** alfabéticamente
- Los índices en endpoints PUT/DELETE se refieren al orden mostrado (ordenado por categoría)
- Esto garantiza consistencia entre frontend y backend al manipular elementos por índice

### Campos Opcionales Extendidos
- **descripcion_detallada**: Permite agregar explicaciones largas sobre el sistema, casos de uso, ventajas, especificaciones técnicas detalladas, etc.
- **descuentos**: Permite explicar en detalle las políticas de descuentos, promociones, condiciones de financiamiento, etc.
- **moneda**: Especifica la moneda de la oferta para facilitar conversiones y presentación al cliente
- **financiamiento**: Indica si la oferta tiene opciones de financiamiento disponibles

### Sistema Recomendador con IA
- Utiliza inteligencia artificial para analizar las necesidades del usuario
- Ordena todas las ofertas según relevancia para el usuario
- Retorna explicación personalizada junto con las ofertas ordenadas
- Útil para sistemas de chat, asistentes virtuales y recomendaciones personalizadas

### Almacenamiento de Archivos
- Todas las imágenes (ofertas y elementos) se almacenan en MinIO
- Bucket: "ofertas"
- Las URLs retornadas son permanentes y accesibles públicamente
- Formato típico: `https://s3.suncarsrl.com:443/ofertas/{uuid}.{ext}`
