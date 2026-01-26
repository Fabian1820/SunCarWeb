# Referencia Rápida: Endpoints de Confección de Ofertas

## ⚠️ IMPORTANTE: Todos los endpoints de confección de ofertas están bajo `/api/ofertas/confeccion/`

---

## 📋 Lista de Endpoints

### 1. Crear Oferta
```
POST /api/ofertas/confeccion/
```
**Nota:** La barra diagonal al final (`/`) es OBLIGATORIA

**Body:**
```json
{
  "nombre_automatico": "Oferta de 1x 5kW Inversor Deye y 2x 5.12kWh Batería Deye",
  "precio_final": 15000.50,
  "margen_comercial": 15.5,
  "costo_transportacion": 500.00,
  "almacen_id": "uuid-del-almacen",
  "cliente_id": "uuid-del-cliente",  // Opcional para ofertas genéricas
  "es_generica": true,
  "estado": "en_revision",
  "foto_portada_url": "https://minio.example.com/ofertas-portadas/123_portada.jpg",
  "materiales": [...],
  "elementos_personalizados": [...],
  "secciones_personalizadas": [...]
}
```

---

### 2. Subir Foto de Portada
```
POST /api/ofertas/confeccion/upload-foto-portada
```
**Nota:** SIN barra diagonal al final

**Content-Type:** `multipart/form-data`

**Body:**
```
foto: File (imagen)
tipo: "oferta_portada"
```

**Response:**
```json
{
  "success": true,
  "url": "https://minio.example.com/ofertas-portadas/1234567890_portada.jpg",
  "filename": "1234567890_portada.jpg",
  "size": 245678,
  "content_type": "image/jpeg"
}
```

---

### 3. Listar Ofertas
```
GET /api/ofertas/confeccion/
GET /api/ofertas/confeccion/?page=1&limit=20
GET /api/ofertas/confeccion/?es_generica=true
GET /api/ofertas/confeccion/?estado=en_revision
```

**Query Parameters:**
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 20)
- `es_generica`: Filtrar por tipo (true/false)
- `estado`: Filtrar por estado
- `cliente_id`: Filtrar por cliente

---

### 4. Obtener Oferta por ID
```
GET /api/ofertas/confeccion/{id}
GET /api/ofertas/confeccion/{numero_oferta}
```

**Ejemplo:**
```
GET /api/ofertas/confeccion/OF-2024-001
GET /api/ofertas/confeccion/550e8400-e29b-41d4-a716-446655440000
```

---

### 5. Actualizar Oferta
```
PUT /api/ofertas/confeccion/{id}
PATCH /api/ofertas/confeccion/{id}
```

**Body:** Igual que crear oferta (campos opcionales)

---

### 6. Eliminar Oferta
```
DELETE /api/ofertas/confeccion/{id}
```

---

### 7. Reservar Materiales
```
POST /api/ofertas/confeccion/{id}/reservar-materiales
```

**Body:**
```json
{
  "tipo_reserva": "temporal",  // "temporal" o "definitiva"
  "dias_reserva": 7,           // Solo para temporal
  "almacen_id": "uuid-del-almacen"
}
```

---

### 8. Liberar Materiales Reservados
```
POST /api/ofertas/confeccion/{id}/liberar-materiales
```

---

### 9. Cambiar Estado de Oferta
```
PATCH /api/ofertas/confeccion/{id}/estado
```

**Body:**
```json
{
  "estado": "aprobada_para_enviar"
}
```

**Estados válidos:**
- `en_revision`
- `aprobada_para_enviar`
- `enviada_a_cliente`
- `confirmada_por_cliente`
- `reservada`
- `rechazada`
- `cancelada`

---

## 🔧 Ejemplos de Uso en Frontend

### Crear Oferta
```typescript
const { apiRequest } = await import('@/lib/api-config')

const response = await apiRequest('/ofertas/confeccion/', {
  method: 'POST',
  body: JSON.stringify(ofertaData)
})
```

### Subir Foto
```typescript
const formData = new FormData()
formData.append('foto', file)
formData.append('tipo', 'oferta_portada')

const response = await apiRequest('/ofertas/confeccion/upload-foto-portada', {
  method: 'POST',
  body: formData
})
```

### Listar Ofertas
```typescript
const response = await apiRequest('/ofertas/confeccion/?page=1&limit=20', {
  method: 'GET'
})
```

### Obtener Oferta
```typescript
const response = await apiRequest(`/ofertas/confeccion/${ofertaId}`, {
  method: 'GET'
})
```

### Actualizar Oferta
```typescript
const response = await apiRequest(`/ofertas/confeccion/${ofertaId}`, {
  method: 'PUT',
  body: JSON.stringify(updateData)
})
```

### Reservar Materiales
```typescript
const response = await apiRequest(`/ofertas/confeccion/${ofertaId}/reservar-materiales`, {
  method: 'POST',
  body: JSON.stringify({
    tipo_reserva: 'temporal',
    dias_reserva: 7,
    almacen_id: almacenId
  })
})
```

---

## ❌ Errores Comunes

### 1. Olvidar la barra diagonal al final en POST
```typescript
// ❌ INCORRECTO
await apiRequest('/ofertas/confeccion', { method: 'POST' })

// ✅ CORRECTO
await apiRequest('/ofertas/confeccion/', { method: 'POST' })
```

### 2. Usar el endpoint antiguo
```typescript
// ❌ INCORRECTO
await apiRequest('/ofertas/', { method: 'POST' })

// ✅ CORRECTO
await apiRequest('/ofertas/confeccion/', { method: 'POST' })
```

### 3. Agregar barra diagonal donde no va
```typescript
// ❌ INCORRECTO
await apiRequest('/ofertas/confeccion/upload-foto-portada/', { method: 'POST' })

// ✅ CORRECTO
await apiRequest('/ofertas/confeccion/upload-foto-portada', { method: 'POST' })
```

---

## 📝 Notas Importantes

1. **Todos los endpoints de confección están bajo `/api/ofertas/confeccion/`**
2. **El endpoint de crear oferta REQUIERE la barra diagonal al final (`/`)**
3. **El endpoint de subir foto NO lleva barra diagonal al final**
4. **Los endpoints de detalle usan el ID o número de oferta: `/api/ofertas/confeccion/{id}`**
5. **Siempre incluir `Content-Type: application/json` excepto para upload de archivos**

---

## 🔗 Referencias

- Especificación completa del backend: `docs/CONFECCION_OFERTAS_BACKEND_SPEC.md`
- Guía de implementación frontend: `docs/FRONTEND_CREAR_OFERTA_GUIA.md`
- Implementación frontend: `docs/FRONTEND_IMPLEMENTACION_OFERTAS.md`
