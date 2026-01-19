# Endpoints de Marcas

## Base URL
```
/api/marcas
```

## Endpoints Disponibles

### 1. 📋 Listar Todas las Marcas
```http
GET /api/marcas/
```

**Query Parameters (opcionales):**
- `tipo_material`: Filtrar por tipo (`BATERÍAS`, `INVERSORES`, `PANELES`, `OTRO`)

**Ejemplos:**
```http
# Todas las marcas
GET /api/marcas/

# Solo marcas de baterías
GET /api/marcas/?tipo_material=BATERÍAS

# Solo marcas de inversores
GET /api/marcas/?tipo_material=INVERSORES

# Solo marcas de paneles
GET /api/marcas/?tipo_material=PANELES
```

**Response:**
```json
{
  "success": true,
  "message": "Marcas obtenidas exitosamente",
  "data": [
    {
      "id": "67890abc123def456789",
      "nombre": "Must",
      "descripcion": "Inversores y baterías",
      "tipos_material": ["INVERSORES", "BATERÍAS"],
      "is_active": true
    }
  ]
}
```

---

### 2. 🔍 Obtener Marca por ID
```http
GET /api/marcas/{marca_id}
```

**Ejemplo:**
```http
GET /api/marcas/67890abc123def456789
```

**Response:**
```json
{
  "success": true,
  "message": "Marca encontrada",
  "data": {
    "id": "67890abc123def456789",
    "nombre": "Must",
    "descripcion": "Inversores y baterías",
    "tipos_material": ["INVERSORES", "BATERÍAS"],
    "is_active": true
  }
}
```

---

### 3. ➕ Crear Nueva Marca
```http
POST /api/marcas/
Content-Type: application/json
```

**Request Body:**
```json
{
  "nombre": "Must",
  "descripcion": "Inversores y baterías de alta calidad",
  "tipos_material": ["INVERSORES", "BATERÍAS"],
  "is_active": true
}
```

**Campos:**
- `nombre` (string, requerido): Nombre de la marca
- `descripcion` (string, opcional): Descripción de la marca
- `tipos_material` (array, requerido): Array con al menos 1 tipo
  - Valores: `"BATERÍAS"`, `"INVERSORES"`, `"PANELES"`, `"OTRO"`
- `is_active` (boolean, opcional, default: true): Si la marca está activa

**Response:**
```json
{
  "success": true,
  "message": "Marca creada exitosamente",
  "marca_id": "67890abc123def456789"
}
```

**Ejemplos de Creación:**

```json
// Marca solo de baterías
{
  "nombre": "Pylotech",
  "descripcion": "Baterías de litio",
  "tipos_material": ["BATERÍAS"],
  "is_active": true
}

// Marca solo de inversores
{
  "nombre": "Greenheis",
  "descripcion": "Inversores solares",
  "tipos_material": ["INVERSORES"],
  "is_active": true
}

// Marca de múltiples tipos
{
  "nombre": "Huawei",
  "descripcion": "Inversores, baterías y sistemas",
  "tipos_material": ["INVERSORES", "BATERÍAS"],
  "is_active": true
}
```

---

### 4. ✏️ Actualizar Marca
```http
PUT /api/marcas/{marca_id}
Content-Type: application/json
```

**Request Body (todos los campos son opcionales):**
```json
{
  "nombre": "Must Energy",
  "descripcion": "Inversores y baterías de alta eficiencia",
  "tipos_material": ["INVERSORES", "BATERÍAS", "OTRO"],
  "is_active": true
}
```

**Ejemplos:**

```json
// Actualizar solo el nombre
{
  "nombre": "Must Energy"
}

// Actualizar solo los tipos
{
  "tipos_material": ["INVERSORES", "BATERÍAS", "PANELES"]
}

// Desactivar marca
{
  "is_active": false
}

// Actualizar todo
{
  "nombre": "Must Energy Pro",
  "descripcion": "Inversores y baterías profesionales",
  "tipos_material": ["INVERSORES", "BATERÍAS"],
  "is_active": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Marca actualizada exitosamente"
}
```

---

### 5. 🗑️ Eliminar Marca
```http
DELETE /api/marcas/{marca_id}
```

**Ejemplo:**
```http
DELETE /api/marcas/67890abc123def456789
```

**Response:**
```json
{
  "success": true,
  "message": "Marca eliminada exitosamente"
}
```

---

## Ejemplos con cURL

### Listar todas las marcas
```bash
curl -X GET "http://localhost:8000/api/marcas/"
```

### Listar marcas de inversores
```bash
curl -X GET "http://localhost:8000/api/marcas/?tipo_material=INVERSORES"
```

### Crear marca
```bash
curl -X POST "http://localhost:8000/api/marcas/" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Must",
    "descripcion": "Inversores y baterías",
    "tipos_material": ["INVERSORES", "BATERÍAS"],
    "is_active": true
  }'
```

### Actualizar marca
```bash
curl -X PUT "http://localhost:8000/api/marcas/67890abc123def456789" \
  -H "Content-Type: application/json" \
  -d '{
    "tipos_material": ["INVERSORES", "BATERÍAS", "PANELES"]
  }'
```

### Eliminar marca
```bash
curl -X DELETE "http://localhost:8000/api/marcas/67890abc123def456789"
```

---

## Validaciones

### Al Crear
- ✅ `nombre` es requerido
- ✅ `tipos_material` es requerido y debe tener al menos 1 elemento
- ✅ Solo se aceptan valores del enum: `BATERÍAS`, `INVERSORES`, `PANELES`, `OTRO`
- ❌ No se permite array vacío en `tipos_material`

### Al Actualizar
- ✅ Todos los campos son opcionales
- ✅ Si se envía `tipos_material`, debe tener al menos 1 elemento
- ✅ Solo se actualizan los campos enviados

---

## Casos de Uso

### 1. Actualizar "Greenheis" a tipo INVERSORES
```http
PUT /api/marcas/{id_de_greenheis}
Content-Type: application/json

{
  "tipos_material": ["INVERSORES"]
}
```

### 2. Agregar una nueva marca de paneles
```http
POST /api/marcas/
Content-Type: application/json

{
  "nombre": "JA Solar",
  "descripcion": "Paneles solares de alta eficiencia",
  "tipos_material": ["PANELES"],
  "is_active": true
}
```

### 3. Actualizar marca para agregar más tipos
```http
PUT /api/marcas/{marca_id}
Content-Type: application/json

{
  "tipos_material": ["INVERSORES", "BATERÍAS", "PANELES"]
}
```

### 4. Desactivar una marca sin eliminarla
```http
PUT /api/marcas/{marca_id}
Content-Type: application/json

{
  "is_active": false
}
```

---

## Notas Importantes

1. **Filtrado por tipo**: Cuando filtras por un tipo, obtienes todas las marcas que **incluyan** ese tipo en su array, no solo las que tengan exactamente ese tipo.

2. **Múltiples tipos**: Una marca puede tener múltiples tipos. Por ejemplo, "Must" puede ser tanto de inversores como de baterías.

3. **IDs de MongoDB**: Los IDs son ObjectIds de MongoDB en formato string (24 caracteres hexadecimales).

4. **Soft delete**: Usa `is_active: false` en lugar de eliminar si quieres mantener el historial.

5. **Validación automática**: FastAPI valida automáticamente que los tipos sean válidos según el enum.
