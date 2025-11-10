# Documentación de Endpoints - Sistema de Permisos y Módulos

## Módulos

### 1. GET `/api/modulos/`
**Descripción:** Obtiene todos los módulos del sistema.

**Request:**
- No requiere body

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "data": [
    {
      "id": string,
      "nombre": string
    }
  ]
}
```

---

### 2. POST `/api/modulos/`
**Descripción:** Crea un nuevo módulo.

**Request Body:**
```json
{
  "nombre": string
}
```

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "modulo_id": string
}
```

---

### 3. DELETE `/api/modulos/{modulo_id}`
**Descripción:** Elimina un módulo por su ID.

**Path Parameters:**
- `modulo_id`: string

**Response:**
```json
{
  "success": boolean,
  "message": string
}
```

---

## Permisos

### 4. PUT `/api/permisos/trabajador/{trabajador_ci}`
**Descripción:** Crea o actualiza los permisos de un trabajador (reemplaza completamente los módulos asignados). Operación upsert.

**Path Parameters:**
- `trabajador_ci`: string (CI del trabajador)

**Request Body:**
```json
{
  "modulo_ids": [string]
}
```

**Response:**
```json
{
  "success": boolean,
  "message": string
}
```

**Ejemplo de Request:**
```json
{
  "modulo_ids": ["676012345abc", "676012345def", "676012345ghi"]
}
```

---

### 5. GET `/api/permisos/trabajador/{trabajador_ci}/modulos-nombres`
**Descripción:** Obtiene los nombres de los módulos asignados a un trabajador.

**Path Parameters:**
- `trabajador_ci`: string (CI del trabajador)

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "data": [string]
}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Nombres de módulos obtenidos exitosamente",
  "data": ["Trabajadores", "Reportes", "Productos"]
}
```

---

### 6. GET `/api/permisos/trabajadores-con-permisos`
**Descripción:** Obtiene lista de CIs de trabajadores que tienen al menos un permiso asignado.

**Request:**
- No requiere body

**Response:**
```json
{
  "success": boolean,
  "message": string,
  "data": [string]
}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Trabajadores con permisos obtenidos exitosamente",
  "data": ["12345678", "87654321", "11223344"]
}
```

---

## Notas Importantes

1. **Operación Upsert**: El endpoint `PUT /api/permisos/trabajador/{trabajador_ci}` realiza una operación upsert, es decir:
   - Si el trabajador NO tiene permisos previos → Crea un nuevo registro
   - Si el trabajador YA tiene permisos → Actualiza reemplazando completamente el array de `modulo_ids`

2. **Sin Validaciones**: Los endpoints NO validan:
   - Existencia de módulos antes de asignarlos
   - Existencia del trabajador en la colección de trabajadores

3. **Identificadores**:
   - `trabajador_ci`: Se usa el CI (string) del trabajador, no el ObjectId de MongoDB
   - `modulo_id`: Se usa el ObjectId de MongoDB como string

4. **Colecciones MongoDB**:
   - `modulos`: Contiene los módulos del sistema
   - `permisos`: Contiene las relaciones trabajador-módulos

5. **Estructura de Colecciones**:

   **Módulo:**
   ```json
   {
     "_id": ObjectId,
     "nombre": string
   }
   ```

   **Permiso:**
   ```json
   {
     "_id": ObjectId,
     "trabajador_id": string (CI),
     "modulo_ids": [ObjectId as string]
   }
   ```
