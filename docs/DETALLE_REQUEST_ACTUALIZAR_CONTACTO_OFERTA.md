# 📤 Detalle Exacto: Request al Actualizar Contacto de Oferta Confeccionada

## 🎯 Endpoint y Método

```
PUT /ofertas/confeccion/{oferta_id}
Content-Type: application/json
```

## 📋 Estructura del Request

### Objeto Base (Siempre se envía)

```json
{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "estado": "en_revision",
  "items": [...],
  "componentes_principales": {...},
  "margen_comercial": 1500.00,
  "porcentaje_margen_materiales": 50,
  "porcentaje_margen_instalacion": 50,
  "margen_total": 1500.00,
  "margen_materiales": 750.00,
  "margen_instalacion": 750.00,
  "costo_transportacion": 200.00,
  "total_materiales": 5000.00,
  "subtotal_con_margen": 6500.00,
  "total_elementos_personalizados": 0,
  "total_costos_extras": 0,
  "precio_final": 6700.00,
  "moneda_pago": "USD",
  "tasa_cambio": 0,
  "pago_transferencia": false,
  "datos_cuenta": "",
  "aplica_contribucion": false,
  "porcentaje_contribucion": 0
}
```

## 🔑 Campo de Contacto (Solo UNO se envía)

### Escenario 1: Actualizar a Cliente

**Estado del formulario:**
```typescript
ofertaGenerica = false
tipoContacto = 'cliente'
selectedCliente = { numero: "CLI-2024-001", nombre: "Juan Pérez" }
clienteId = "CLI-2024-001"
leadId = ""
nombreLeadSinAgregar = ""
```

**Request enviado:**
```json
{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "cliente_numero": "CLI-2024-001",
  // ✅ SOLO este campo de contacto
  // ❌ NO se envía lead_id
  // ❌ NO se envía nombre_lead_sin_agregar
  "estado": "en_revision",
  "items": [...],
  // ... resto de campos
}
```

**Código que lo genera:**
```typescript
const ofertaData: any = {
  tipo_oferta: 'personalizada',
  almacen_id: almacenId,
}

if (!ofertaGenerica) {
  if (tipoContacto === 'cliente' && (selectedCliente?.numero || clienteId)) {
    ofertaData.cliente_numero = selectedCliente?.numero || clienteId
    // ✅ Solo se agrega cliente_numero
  }
}
```

---

### Escenario 2: Actualizar a Lead

**Estado del formulario:**
```typescript
ofertaGenerica = false
tipoContacto = 'lead'
selectedCliente = null
clienteId = ""
leadId = "507f1f77bcf86cd799439011"
nombreLeadSinAgregar = ""
```

**Request enviado:**
```json
{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "lead_id": "507f1f77bcf86cd799439011",
  // ✅ SOLO este campo de contacto
  // ❌ NO se envía cliente_numero
  // ❌ NO se envía nombre_lead_sin_agregar
  "estado": "en_revision",
  "items": [...],
  // ... resto de campos
}
```

**Código que lo genera:**
```typescript
const ofertaData: any = {
  tipo_oferta: 'personalizada',
  almacen_id: almacenId,
}

if (!ofertaGenerica) {
  if (tipoContacto === 'lead' && leadId) {
    ofertaData.lead_id = leadId
    // ✅ Solo se agrega lead_id
  }
}
```

---

### Escenario 3: Actualizar a Lead Sin Agregar

**Estado del formulario:**
```typescript
ofertaGenerica = false
tipoContacto = 'lead_sin_agregar'
selectedCliente = null
clienteId = ""
leadId = ""
nombreLeadSinAgregar = "Pedro López"
```

**Request enviado:**
```json
{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "nombre_lead_sin_agregar": "Pedro López",
  // ✅ SOLO este campo de contacto
  // ❌ NO se envía cliente_numero
  // ❌ NO se envía lead_id
  "estado": "en_revision",
  "items": [...],
  // ... resto de campos
}
```

**Código que lo genera:**
```typescript
const ofertaData: any = {
  tipo_oferta: 'personalizada',
  almacen_id: almacenId,
}

if (!ofertaGenerica) {
  if (tipoContacto === 'lead_sin_agregar' && nombreLeadSinAgregar.trim()) {
    ofertaData.nombre_lead_sin_agregar = nombreLeadSinAgregar.trim()
    // ✅ Solo se agrega nombre_lead_sin_agregar
  }
}
```

---

## 🔄 Ejemplo Completo: Cambiar de Cliente a Lead

### Situación Inicial
La oferta tiene:
```json
{
  "id": "OFF-2024-001",
  "cliente_numero": "CLI-2024-001",
  "tipo_oferta": "personalizada"
}
```

### Usuario Cambia el Contacto
1. Abre el diálogo de edición
2. Cambia el tipo de contacto de "Cliente" a "Lead"
3. Selecciona un lead: "507f1f77bcf86cd799439011"
4. Guarda los cambios

### Request Enviado (PUT)

```http
PUT /ofertas/confeccion/OFF-2024-001
Content-Type: application/json

{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "lead_id": "507f1f77bcf86cd799439011",
  // ✅ SOLO lead_id (el nuevo contacto)
  // ❌ NO se envía cliente_numero (el anterior)
  // ❌ NO se envía nombre_lead_sin_agregar
  "estado": "en_revision",
  "items": [
    {
      "material_codigo": "INV-001",
      "descripcion": "Inversor 5kW",
      "precio": 1200.00,
      "cantidad": 1,
      "categoria": "INVERSORES",
      "seccion": "INVERSORES",
      "margen_asignado": 300.00
    },
    {
      "material_codigo": "BAT-001",
      "descripcion": "Batería 200Ah",
      "precio": 800.00,
      "cantidad": 2,
      "categoria": "BATERIAS",
      "seccion": "BATERIAS",
      "margen_asignado": 400.00
    }
  ],
  "componentes_principales": {
    "inversor_seleccionado": "INV-001",
    "bateria_seleccionada": "BAT-001",
    "panel_seleccionado": "PAN-001"
  },
  "margen_comercial": 1500.00,
  "porcentaje_margen_materiales": 50,
  "porcentaje_margen_instalacion": 50,
  "margen_total": 1500.00,
  "margen_materiales": 750.00,
  "margen_instalacion": 750.00,
  "costo_transportacion": 200.00,
  "total_materiales": 5000.00,
  "subtotal_con_margen": 6500.00,
  "total_elementos_personalizados": 0,
  "total_costos_extras": 0,
  "precio_final": 6700.00,
  "moneda_pago": "USD",
  "tasa_cambio": 0,
  "pago_transferencia": false,
  "datos_cuenta": "",
  "aplica_contribucion": false,
  "porcentaje_contribucion": 0
}
```

### Respuesta del Backend (Esperada)

```json
{
  "success": true,
  "message": "Oferta actualizada exitosamente",
  "data": {
    "id": "OFF-2024-001",
    "numero_oferta": "OFF-2024-001",
    "nombre_automatico": "Oferta Personalizada - Lead 507f1f77bcf86cd799439011",
    "tipo_oferta": "personalizada",
    "lead_id": "507f1f77bcf86cd799439011",
    "cliente_numero": null,
    "nombre_lead_sin_agregar": null,
    "precio_final": 6700.00,
    "estado": "en_revision"
  }
}
```

---

## 🚫 Lo Que NO Se Envía

### ❌ Campos Undefined
```typescript
// ❌ NUNCA se envía esto:
{
  "cliente_numero": undefined,
  "lead_id": undefined,
  "nombre_lead_sin_agregar": undefined
}
```

### ❌ Campos Null
```typescript
// ❌ NUNCA se envía esto:
{
  "cliente_numero": null,
  "lead_id": null,
  "nombre_lead_sin_agregar": null
}
```

### ❌ Campos Vacíos
```typescript
// ❌ NUNCA se envía esto:
{
  "cliente_numero": "",
  "lead_id": "",
  "nombre_lead_sin_agregar": ""
}
```

---

## 🔍 Validación en el Frontend

Antes de enviar, el código valida:

```typescript
// Para cliente
if (tipoContacto === 'cliente' && (selectedCliente?.numero || clienteId)) {
  // ✅ Solo se agrega si hay valor
  ofertaData.cliente_numero = selectedCliente?.numero || clienteId
}

// Para lead
if (tipoContacto === 'lead' && leadId) {
  // ✅ Solo se agrega si hay valor
  ofertaData.lead_id = leadId
}

// Para lead sin agregar
if (tipoContacto === 'lead_sin_agregar' && nombreLeadSinAgregar.trim()) {
  // ✅ Solo se agrega si hay valor y no está vacío
  ofertaData.nombre_lead_sin_agregar = nombreLeadSinAgregar.trim()
}
```

---

## 📊 Comparación: Antes vs Después del Fix

### ❌ ANTES (Causaba Error)

```json
{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "cliente_numero": "CLI-2024-001",
  "lead_id": undefined,
  "nombre_lead_sin_agregar": undefined,
  // ❌ Backend detectaba 3 contactos
  "items": [...]
}
```

**Resultado:** Error 400
```json
{
  "success": false,
  "message": "Para ofertas personalizadas debe proporcionar solo uno de: cliente_numero, lead_id o nombre_lead_sin_agregar"
}
```

### ✅ DESPUÉS (Funciona)

```json
{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "cliente_numero": "CLI-2024-001",
  // ✅ Solo este campo
  // ✅ lead_id NO está presente en el objeto
  // ✅ nombre_lead_sin_agregar NO está presente en el objeto
  "items": [...]
}
```

**Resultado:** Success 200
```json
{
  "success": true,
  "message": "Oferta actualizada exitosamente",
  "data": {...}
}
```

---

## 🧪 Cómo Verificar el Request

### En el Navegador (DevTools)

1. Abre las DevTools (F12)
2. Ve a la pestaña "Network"
3. Filtra por "Fetch/XHR"
4. Edita una oferta y cambia el contacto
5. Busca el request `PUT /ofertas/confeccion/{id}`
6. Haz clic en el request
7. Ve a la pestaña "Payload" o "Request"
8. Verifica que solo aparece UN campo de contacto

### En el Console Log

El código hace un `console.log` antes de enviar:

```typescript
console.log('📤 Actualizando oferta:', ofertaData)
```

Busca en la consola del navegador este log para ver exactamente qué se está enviando.

### Ejemplo de Log

```javascript
📤 Actualizando oferta: {
  tipo_oferta: "personalizada",
  almacen_id: "ALM001",
  lead_id: "507f1f77bcf86cd799439011",  // ✅ Solo este campo
  estado: "en_revision",
  items: Array(5),
  componentes_principales: {...},
  margen_comercial: 1500,
  // ... resto de campos
}
```

---

## 📝 Resumen

### ✅ Lo Que Se Envía

1. **Objeto base** con `tipo_oferta` y `almacen_id`
2. **UN SOLO campo de contacto** (el que está activo)
3. **Todos los demás campos** de la oferta (items, precios, etc.)

### ❌ Lo Que NO Se Envía

1. Campos de contacto con valor `undefined`
2. Campos de contacto con valor `null`
3. Campos de contacto con valor `""`
4. Múltiples campos de contacto simultáneamente

### 🎯 Resultado

El backend recibe exactamente UN campo de contacto y puede procesar la actualización sin errores.

---

**Archivo de código:** `components/feats/ofertas/confeccion-ofertas-view.tsx`  
**Función:** `handleCrearOferta()` (líneas 2248-2450)  
**Método HTTP:** `PUT` (en modo edición)  
**Endpoint:** `/ofertas/confeccion/{oferta_id}`
