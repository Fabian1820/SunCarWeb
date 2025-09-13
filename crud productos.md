# Documentación de Endpoints de Materiales

## Autenticación
Todos los endpoints requieren token Bearer en el header:
```
Authorization: Bearer suncar-token-2025
```

## Endpoints de Materiales

### 1. **Crear Material (Agregar a Categoría)**
**POST** `/api/productos/{producto_id}/materiales`

**Headers:**
```
Authorization: Bearer suncar-token-2025
Content-Type: application/json
```

**Body:**
```json
{
  "material": {
    "codigo": "ACE001",
    "descripcion": "Aceite sintético",
    "um": "litro"
  }
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Material agregado exitosamente"
}
```

---

### 2. **Editar Material**
**PUT** `/api/productos/{producto_id}/materiales/{material_codigo}`

**Headers:**
```
Authorization: Bearer suncar-token-2025
Content-Type: application/json
```

**Body:**
```json
{
  "codigo": "ACE002",
  "descripcion": "Aceite mineral premium",
  "um": "galón"
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Material actualizado exitosamente"
}
```

---

### 3. **Eliminar Material**
**DELETE** `/api/productos/materiales/{material_codigo}`

**Headers:**
```
Authorization: Bearer suncar-token-2025
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Material eliminado exitosamente"
}
```

---

## Notas Importantes

- **producto_id**: ID de la categoría donde está el material
- **material_codigo**: Código único del material
- **Token por defecto**: `suncar-token-2025`
- Todos los endpoints retornan respuestas con estructura `{success: boolean, message: string}`
- Los campos obligatorios del material son: `codigo`, `descripcion`, `um`