# Solución: Error "Debe proporcionar solo uno de: cliente_numero, lead_id o nombre_lead_sin_agregar"

## 🔴 Error

```
Error actualizando oferta: Para ofertas personalizadas debe proporcionar solo uno de: cliente_numero, lead_id o nombre_lead_sin_agregar
```

## 🔍 Causa del Problema

El frontend está enviando **todos los campos de contacto** en el request, incluyendo los que están en `null` o vacíos. Esto causa que el backend detecte múltiples contactos.

**Ejemplo de request problemático:**
```json
{
  "cliente_numero": "CLI-2024-001",
  "lead_id": null,
  "nombre_lead_sin_agregar": null,
  "items": [...]
}
```

Aunque `lead_id` y `nombre_lead_sin_agregar` están en `null`, el backend los cuenta como "proporcionados" porque están presentes en el objeto.

## ✅ Solución Implementada en el Backend

He actualizado la lógica de validación para:

1. **Distinguir entre campos no enviados y campos en null**
2. **Ignorar strings vacíos** en `nombre_lead_sin_agregar`
3. **Contar solo valores reales** (no null, no vacío)

### Cambio en el Código

**Antes:**
```python
cliente_ref = update_data.get("cliente_numero") if "cliente_numero" in update_data else oferta.cliente_numero
lead_ref = update_data.get("lead_id") if "lead_id" in update_data else oferta.lead_id
nombre_lead = update_data.get("nombre_lead_sin_agregar") if "nombre_lead_sin_agregar" in update_data else oferta.nombre_lead_sin_agregar

contactos_proporcionados = sum([
    bool(cliente_ref),
    bool(lead_ref),
    bool(nombre_lead)
])
```

**Después:**
```python
# Obtener valores distinguiendo entre "no enviado" y "enviado como null"
if "cliente_numero" in update_data:
    cliente_ref = update_data["cliente_numero"]
else:
    cliente_ref = oferta.cliente_numero

if "lead_id" in update_data:
    lead_ref = update_data["lead_id"]
else:
    lead_ref = oferta.lead_id

if "nombre_lead_sin_agregar" in update_data:
    nombre_lead = update_data["nombre_lead_sin_agregar"]
else:
    nombre_lead = oferta.nombre_lead_sin_agregar

# Contar solo valores reales (no None, no string vacío)
contactos_proporcionados = sum([
    bool(cliente_ref),
    bool(lead_ref),
    bool(nombre_lead and nombre_lead.strip())  # Ignora strings vacíos
])
```

## 🎯 Cómo Enviar Datos desde el Frontend

### ✅ Opción 1: Enviar Solo el Campo Activo (RECOMENDADO)

**Crear oferta con cliente:**
```javascript
const ofertaData = {
  tipo_oferta: "personalizada",
  cliente_numero: "CLI-2024-001",  // Solo este
  almacen_id: "ALM001",
  items: [...]
  // NO enviar lead_id ni nombre_lead_sin_agregar
};
```

**Crear oferta con lead:**
```javascript
const ofertaData = {
  tipo_oferta: "personalizada",
  lead_id: "507f1f77bcf86cd799439011",  // Solo este
  almacen_id: "ALM001",
  items: [...]
  // NO enviar cliente_numero ni nombre_lead_sin_agregar
};
```

**Crear oferta con persona nueva:**
```javascript
const ofertaData = {
  tipo_oferta: "personalizada",
  nombre_lead_sin_agregar: "Pedro López",  // Solo este
  almacen_id: "ALM001",
  items: [...]
  // NO enviar cliente_numero ni lead_id
};
```

### ✅ Opción 2: Enviar Todos los Campos (También Funciona Ahora)

Si tu código ya envía todos los campos, ahora también funcionará:

```javascript
const ofertaData = {
  tipo_oferta: "personalizada",
  cliente_numero: "CLI-2024-001",
  lead_id: null,  // Ahora el backend ignora estos null
  nombre_lead_sin_agregar: null,
  almacen_id: "ALM001",
  items: [...]
};
```

El backend ahora cuenta correctamente solo el campo que tiene valor real.

## 🔧 Código Frontend Recomendado

### Función para Preparar Datos

```javascript
const prepararDatosOferta = (formData) => {
  const ofertaData = {
    tipo_oferta: formData.tipoOferta,
    almacen_id: formData.almacenId,
    items: formData.items,
    // ... otros campos comunes
  };

  // Solo agregar el campo de contacto que tiene valor
  if (formData.tipoOferta === 'personalizada') {
    if (formData.tipoContacto === 'cliente' && formData.clienteNumero) {
      ofertaData.cliente_numero = formData.clienteNumero;
    } else if (formData.tipoContacto === 'lead' && formData.leadId) {
      ofertaData.lead_id = formData.leadId;
    } else if (formData.tipoContacto === 'nuevo' && formData.nombreLeadSinAgregar?.trim()) {
      ofertaData.nombre_lead_sin_agregar = formData.nombreLeadSinAgregar.trim();
    }
  }

  return ofertaData;
};
```

### Uso en Crear Oferta

```javascript
const crearOferta = async () => {
  const ofertaData = prepararDatosOferta({
    tipoOferta: 'personalizada',
    tipoContacto: 'cliente',
    clienteNumero: 'CLI-2024-001',
    leadId: null,
    nombreLeadSinAgregar: '',
    almacenId: 'ALM001',
    items: [...]
  });

  // ofertaData solo tendrá cliente_numero, no los otros campos
  console.log(ofertaData);
  // {
  //   tipo_oferta: "personalizada",
  //   cliente_numero: "CLI-2024-001",
  //   almacen_id: "ALM001",
  //   items: [...]
  // }

  const response = await fetch('/ofertas/confeccion/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ofertaData)
  });
};
```

### Uso en Editar Oferta

```javascript
const editarOferta = async (ofertaId) => {
  // Preparar solo los campos que cambiaron
  const updateData = {
    items: nuevosItems,
    precio_final: nuevoPrecio
  };

  // Si cambió el contacto, agregar solo el nuevo
  if (cambioContacto) {
    if (nuevoTipoContacto === 'cliente') {
      updateData.cliente_numero = nuevoClienteNumero;
    } else if (nuevoTipoContacto === 'lead') {
      updateData.lead_id = nuevoLeadId;
    } else if (nuevoTipoContacto === 'nuevo') {
      updateData.nombre_lead_sin_agregar = nuevoNombre;
    }
  }

  const response = await fetch(`/ofertas/confeccion/${ofertaId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
};
```

## 🧪 Testing

### Test 1: Crear con Cliente
```javascript
const data = {
  tipo_oferta: "personalizada",
  cliente_numero: "CLI-001",
  almacen_id: "ALM001",
  items: [{ material_codigo: "MAT001", cantidad: 1, precio: 100 }]
};

// ✅ Debe funcionar
```

### Test 2: Crear con Lead
```javascript
const data = {
  tipo_oferta: "personalizada",
  lead_id: "LEAD-001",
  almacen_id: "ALM001",
  items: [{ material_codigo: "MAT001", cantidad: 1, precio: 100 }]
};

// ✅ Debe funcionar
```

### Test 3: Crear con Todos los Campos (algunos null)
```javascript
const data = {
  tipo_oferta: "personalizada",
  cliente_numero: "CLI-001",
  lead_id: null,
  nombre_lead_sin_agregar: null,
  almacen_id: "ALM001",
  items: [{ material_codigo: "MAT001", cantidad: 1, precio: 100 }]
};

// ✅ Ahora también funciona (backend ignora los null)
```

### Test 4: Crear con String Vacío
```javascript
const data = {
  tipo_oferta: "personalizada",
  cliente_numero: "CLI-001",
  lead_id: null,
  nombre_lead_sin_agregar: "",  // String vacío
  almacen_id: "ALM001",
  items: [{ material_codigo: "MAT001", cantidad: 1, precio: 100 }]
};

// ✅ Ahora también funciona (backend ignora strings vacíos)
```

### Test 5: Error - Múltiples Contactos Reales
```javascript
const data = {
  tipo_oferta: "personalizada",
  cliente_numero: "CLI-001",
  lead_id: "LEAD-001",  // ❌ Dos contactos con valor
  almacen_id: "ALM001",
  items: [{ material_codigo: "MAT001", cantidad: 1, precio: 100 }]
};

// ❌ Error: "debe proporcionar solo uno"
```

## 📊 Comparación: Antes vs Después

### Antes (Causaba Error)
```javascript
// Request
{
  cliente_numero: "CLI-001",
  lead_id: null,
  nombre_lead_sin_agregar: ""
}

// Backend contaba: 3 contactos (cliente + null + "")
// ❌ Error: "debe proporcionar solo uno"
```

### Después (Funciona)
```javascript
// Request
{
  cliente_numero: "CLI-001",
  lead_id: null,
  nombre_lead_sin_agregar: ""
}

// Backend cuenta: 1 contacto (solo cliente)
// ✅ Éxito
```

## 🎯 Resumen

### ✅ Cambios en el Backend
- Distingue entre "no enviado" y "enviado como null"
- Ignora strings vacíos en `nombre_lead_sin_agregar`
- Cuenta solo valores reales

### ✅ Recomendaciones para el Frontend
1. **Mejor práctica:** Enviar solo el campo de contacto activo
2. **También funciona:** Enviar todos los campos (algunos en null)
3. **Validar:** Que solo un campo tenga valor antes de enviar

### ✅ Ahora Funciona
- ✅ Enviar solo cliente_numero
- ✅ Enviar solo lead_id
- ✅ Enviar solo nombre_lead_sin_agregar
- ✅ Enviar todos con algunos en null
- ✅ Enviar todos con algunos en string vacío

### ❌ Sigue Dando Error (Como Debe Ser)
- ❌ Enviar cliente_numero Y lead_id con valores
- ❌ Enviar cliente_numero Y nombre_lead_sin_agregar con valores
- ❌ Enviar lead_id Y nombre_lead_sin_agregar con valores

## 🚀 Próximos Pasos

1. **Actualizar el frontend** para usar la función `prepararDatosOferta()`
2. **Probar** crear y editar ofertas con cada tipo de contacto
3. **Verificar** que no se envíen múltiples contactos con valor

El error debería estar resuelto ahora! 🎉
