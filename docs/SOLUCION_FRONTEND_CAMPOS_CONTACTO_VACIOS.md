# Solución Frontend: Prevenir Envío de Campos de Contacto Vacíos

## ✅ Cambios Implementados

Se implementaron 3 capas de protección en `components/feats/ofertas/confeccion-ofertas-view.tsx` para asegurar que **NUNCA** se envíen campos de contacto vacíos al backend.

## 🛡️ Capa 1: Validación Previa (UI)

**Ubicación:** Antes de `setCreandoOferta(true)`

```typescript
// ✅ VALIDACIÓN CRÍTICA: Si es oferta personalizada, debe tener al menos 1 contacto válido
if (!ofertaGenerica) {
  let tieneContactoValido = false
  
  if (tipoContacto === 'cliente') {
    const numeroCliente = selectedCliente?.numero || clienteId
    tieneContactoValido = !!(numeroCliente && numeroCliente.toString().trim())
  } else if (tipoContacto === 'lead') {
    tieneContactoValido = !!(leadId && leadId.trim())
  } else if (tipoContacto === 'lead_sin_agregar') {
    tieneContactoValido = !!(nombreLeadSinAgregar && nombreLeadSinAgregar.trim())
  }
  
  if (!tieneContactoValido) {
    toast({
      title: "Contacto requerido",
      description: "Una oferta personalizada debe tener un contacto válido (Cliente, Lead o Lead sin agregar)",
      variant: "destructive",
    })
    return // ❌ Bloquea el guardado
  }
}
```

**Qué hace:**
- Valida que haya al menos 1 contacto válido antes de intentar guardar
- Muestra un toast de error si no hay contacto
- Previene el envío al backend

## 🛡️ Capa 2: Filtrado al Construir Payload

**Ubicación:** Al construir `ofertaData`

```typescript
// ✅ CRÍTICO: Solo agregar el campo de contacto que tiene valor NO VACÍO
if (!ofertaGenerica) {
  if (tipoContacto === 'cliente') {
    const numeroCliente = selectedCliente?.numero || clienteId
    // Solo agregar si tiene valor y no es string vacío
    if (numeroCliente && numeroCliente.toString().trim()) {
      ofertaData.cliente_numero = numeroCliente.toString().trim()
    }
    // ✅ Si está vacío, NO se agrega al payload
  } else if (tipoContacto === 'lead') {
    if (leadId && leadId.trim()) {
      ofertaData.lead_id = leadId.trim()
    }
  } else if (tipoContacto === 'lead_sin_agregar') {
    const nombreLead = nombreLeadSinAgregar.trim()
    if (nombreLead) {
      ofertaData.nombre_lead_sin_agregar = nombreLead
    }
  }
}
```

**Qué hace:**
- Solo agrega campos de contacto que tengan valor
- Aplica `.trim()` para eliminar espacios
- Si el valor está vacío, el campo NO se incluye en el payload

## 🛡️ Capa 3: Verificación Final

**Ubicación:** Justo antes de enviar al backend

```typescript
// ✅ VERIFICACIÓN FINAL: Asegurar que NO se envíen campos de contacto vacíos
const camposContactoVacios = []
if ('cliente_numero' in ofertaData && (!ofertaData.cliente_numero || !ofertaData.cliente_numero.toString().trim())) {
  camposContactoVacios.push('cliente_numero')
  delete ofertaData.cliente_numero
}
if ('lead_id' in ofertaData && (!ofertaData.lead_id || !ofertaData.lead_id.trim())) {
  camposContactoVacios.push('lead_id')
  delete ofertaData.lead_id
}
if ('nombre_lead_sin_agregar' in ofertaData && (!ofertaData.nombre_lead_sin_agregar || !ofertaData.nombre_lead_sin_agregar.trim())) {
  camposContactoVacios.push('nombre_lead_sin_agregar')
  delete ofertaData.nombre_lead_sin_agregar
}

if (camposContactoVacios.length > 0) {
  console.warn('⚠️ Se eliminaron campos de contacto vacíos antes de enviar:', camposContactoVacios)
}

console.log('✅ Payload final (verificado sin campos vacíos):', JSON.stringify(ofertaData, null, 2))
```

**Qué hace:**
- Última verificación antes de enviar
- Elimina cualquier campo de contacto que esté vacío
- Registra en consola si se eliminó algún campo
- Muestra el payload final para debugging

## 🧪 Cómo Verificar en Network

### Paso 1: Abrir DevTools
1. Presiona `F12` o `Cmd+Option+I` (Mac)
2. Ve a la pestaña **Network**
3. Filtra por `ofertas/confeccion`

### Paso 2: Intentar Guardar/Editar Oferta
1. Crea o edita una oferta personalizada
2. Selecciona un contacto (Cliente, Lead o Lead sin agregar)
3. Haz clic en "Guardar" o "Actualizar"

### Paso 3: Revisar Request Payload
1. Busca la petición `POST /api/ofertas/confeccion/` o `PUT /api/ofertas/confeccion/{id}`
2. Haz clic en la petición
3. Ve a la pestaña **Payload** o **Request**
4. Verifica el JSON enviado

### ✅ Payloads Correctos

**Con Cliente:**
```json
{
  "tipo_oferta": "personalizada",
  "cliente_numero": "C001",
  "almacen_id": "ALM-001",
  "items": [...],
  "precio_final": 5000
}
```
✅ Solo incluye `cliente_numero`
✅ NO incluye `lead_id` ni `nombre_lead_sin_agregar`

**Con Lead:**
```json
{
  "tipo_oferta": "personalizada",
  "lead_id": "LEAD-123",
  "almacen_id": "ALM-001",
  "items": [...],
  "precio_final": 5000
}
```
✅ Solo incluye `lead_id`
✅ NO incluye `cliente_numero` ni `nombre_lead_sin_agregar`

**Con Lead sin Agregar:**
```json
{
  "tipo_oferta": "personalizada",
  "nombre_lead_sin_agregar": "Juan Pérez",
  "almacen_id": "ALM-001",
  "items": [...],
  "precio_final": 5000
}
```
✅ Solo incluye `nombre_lead_sin_agregar`
✅ NO incluye `cliente_numero` ni `lead_id`

### ❌ Payloads Incorrectos (Ya NO deberían ocurrir)

```json
{
  "cliente_numero": "",  // ❌ Campo vacío
  "lead_id": "",         // ❌ Campo vacío
  "nombre_lead_sin_agregar": "",  // ❌ Campo vacío
  "precio_final": 5000
}
```

```json
{
  "cliente_numero": null,  // ❌ Campo null
  "lead_id": null,         // ❌ Campo null
  "precio_final": 5000
}
```

```json
{
  "cliente_numero": "   ",  // ❌ Solo espacios
  "precio_final": 5000
}
```

## 📊 Logs en Consola

Al guardar/editar una oferta, verás estos logs:

```
📤 Enviando oferta al backend: {...}

🔍 Datos de contacto que se envían: {
  modo: "CREACION",
  tipo_oferta: "personalizada",
  cliente_numero: "C001",
  lead_id: undefined,
  nombre_lead_sin_agregar: undefined,
  campos_presentes: ["cliente_numero"],
  total_campos_enviados: 15
}

✅ Payload final (verificado sin campos vacíos): {
  "tipo_oferta": "personalizada",
  "cliente_numero": "C001",
  "almacen_id": "ALM-001",
  ...
}
```

Si se detectan campos vacíos (no debería pasar):
```
⚠️ Se eliminaron campos de contacto vacíos antes de enviar: ["lead_id", "nombre_lead_sin_agregar"]
```

## 🎯 Casos de Prueba

### Caso 1: Crear oferta con cliente
1. Selecciona tipo "Cliente"
2. Busca y selecciona un cliente
3. Agrega materiales
4. Guarda
5. ✅ Verifica en Network que solo se envía `cliente_numero`

### Caso 2: Crear oferta con lead
1. Selecciona tipo "Lead"
2. Busca y selecciona un lead
3. Agrega materiales
4. Guarda
5. ✅ Verifica en Network que solo se envía `lead_id`

### Caso 3: Crear oferta con lead sin agregar
1. Selecciona tipo "Lead sin agregar"
2. Escribe un nombre
3. Agrega materiales
4. Guarda
5. ✅ Verifica en Network que solo se envía `nombre_lead_sin_agregar`

### Caso 4: Editar oferta sin cambiar contacto
1. Abre una oferta existente para editar
2. Cambia el precio o margen
3. NO cambies el contacto
4. Guarda
5. ✅ Verifica en Network que NO se envían campos de contacto

### Caso 5: Editar oferta cambiando contacto
1. Abre una oferta existente (ej: con cliente)
2. Cambia a tipo "Lead"
3. Selecciona un lead
4. Guarda
5. ✅ Verifica en Network que solo se envía `lead_id`

### Caso 6: Intentar guardar sin contacto (debe fallar)
1. Selecciona tipo "Cliente"
2. NO selecciones ningún cliente
3. Intenta guardar
4. ✅ Debe mostrar toast de error: "Contacto requerido"
5. ✅ NO debe enviar petición al backend

## 📝 Resumen

| Requisito | Estado | Implementación |
|-----------|--------|----------------|
| No enviar campos vacíos ("", null, espacios) | ✅ | Capa 2 + Capa 3 |
| Validar en UI que haya contacto válido | ✅ | Capa 1 |
| Verificar en Network que JSON no incluye campos vacíos | ✅ | Logs + Capa 3 |

## 🔗 Archivos Modificados

- `components/feats/ofertas/confeccion-ofertas-view.tsx`
  - Línea ~3310: Capa 1 - Validación previa
  - Línea ~3330: Capa 2 - Filtrado al construir payload
  - Línea ~3510: Capa 3 - Verificación final

## 🚀 Próximos Pasos

1. ✅ Probar todos los casos de prueba
2. ✅ Verificar en Network que no se envían campos vacíos
3. ✅ Confirmar que los logs muestran el payload correcto
4. 🔄 Esperar que el backend implemente validación 400 (en lugar de 500)
