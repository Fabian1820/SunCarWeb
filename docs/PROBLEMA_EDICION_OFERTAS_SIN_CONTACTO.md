# Problema: Error al Editar Ofertas sin Contacto

## 🔴 Problema Identificado

Al intentar editar una oferta personalizada, si el frontend envía los 3 campos de contacto vacíos (`""`), el backend:

1. Los normaliza a `None` (línea 2090 de `oferta_confeccion_service.py`)
2. Dispara la validación de "sin contacto" (línea 2223)
3. Retorna un error 500 en lugar de un 400 claro

## ✅ Solución Implementada en Frontend

Se han implementado 3 capas de protección para asegurar que NO se envíen campos de contacto vacíos:

### 1. Validación Previa al Guardar

```typescript
// Validar que haya al menos 1 contacto válido antes de guardar
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
      description: "Una oferta personalizada debe tener un contacto válido",
      variant: "destructive",
    })
    return // ❌ No permite guardar
  }
}
```

### 2. Filtrado al Construir el Payload

```typescript
// Solo agregar campos de contacto que tengan valor NO VACÍO
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
    // ✅ Si está vacío, NO se agrega al payload
  } else if (tipoContacto === 'lead_sin_agregar') {
    const nombreLead = nombreLeadSinAgregar.trim()
    if (nombreLead) {
      ofertaData.nombre_lead_sin_agregar = nombreLead
    }
    // ✅ Si está vacío, NO se agrega al payload
  }
}
```

### 3. Verificación Final Antes de Enviar

```typescript
// Última verificación: eliminar campos vacíos que pudieran haberse colado
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
  console.warn('⚠️ Se eliminaron campos de contacto vacíos:', camposContactoVacios)
}

console.log('✅ Payload final (verificado):', JSON.stringify(ofertaData, null, 2))
```

## 🧪 Verificación en Network

Para verificar que el JSON final NO incluye campos vacíos:

1. Abre DevTools → Network
2. Filtra por `ofertas/confeccion`
3. Intenta guardar/editar una oferta
4. Revisa el Request Payload

**Payload correcto (con cliente):**
```json
{
  "cliente_numero": "C001",
  "precio_final": 5000
  // ✅ NO incluye lead_id ni nombre_lead_sin_agregar
}
```

**Payload correcto (con lead):**
```json
{
  "lead_id": "LEAD-123",
  "precio_final": 5000
  // ✅ NO incluye cliente_numero ni nombre_lead_sin_agregar
}
```

**Payload INCORRECTO (esto ya NO debería pasar):**
```json
{
  "cliente_numero": "",  // ❌ Campo vacío
  "lead_id": "",         // ❌ Campo vacío
  "nombre_lead_sin_agregar": "",  // ❌ Campo vacío
  "precio_final": 5000
}
```

## ✅ Soluciones

### Solución 1: Mejorar el Backend (RECOMENDADO)

#### A. Cambiar el código de error de 500 a 400

```python
# En oferta_confeccion_service.py, línea ~2223
if oferta.tipo == 'personalizada':
    contactos_activos = sum([
        bool(oferta.cliente_numero),
        bool(oferta.lead_id),
        bool(oferta.nombre_lead_sin_agregar)
    ])
    
    if contactos_activos != 1:
        # Cambiar de raise Exception a raise ValueError
        raise ValueError(
            "Una oferta personalizada debe tener exactamente un contacto "
            "(cliente_numero, lead_id o nombre_lead_sin_agregar)"
        )
```

#### B. Validar ANTES de limpiar contactos

```python
# En oferta_confeccion_service.py, línea ~2090
def actualizar_oferta_con_stock(oferta_id, update_data):
    oferta = OfertaConfeccion.query.get(oferta_id)
    
    # Detectar si viene algún campo de contacto
    campos_contacto = ['cliente_numero', 'lead_id', 'nombre_lead_sin_agregar']
    viene_contacto = any(campo in update_data for campo in campos_contacto)
    
    if viene_contacto:
        # Normalizar strings vacíos a None
        for campo in campos_contacto:
            if campo in update_data and update_data[campo] == "":
                update_data[campo] = None
        
        # VALIDAR PRIMERO: Verificar que al menos uno tiene valor
        contactos_nuevos = sum([
            bool(update_data.get('cliente_numero')),
            bool(update_data.get('lead_id')),
            bool(update_data.get('nombre_lead_sin_agregar'))
        ])
        
        if contactos_nuevos == 0:
            raise ValueError(
                "Debe proporcionar al menos un contacto: "
                "cliente_numero, lead_id o nombre_lead_sin_agregar"
            )
        
        if contactos_nuevos > 1:
            raise ValueError(
                "Solo puede proporcionar un tipo de contacto a la vez"
            )
        
        # AHORA SÍ: Limpiar contactos anteriores
        oferta.cliente_numero = None
        oferta.lead_id = None
        oferta.nombre_lead_sin_agregar = None
        
        # Establecer el nuevo contacto
        for campo in campos_contacto:
            if campo in update_data and update_data[campo]:
                setattr(oferta, campo, update_data[campo])
    
    # ... resto del código
```

#### C. Manejar el error en el endpoint

```python
# En el endpoint PUT /ofertas/confeccion/<oferta_id>
@app.route('/api/ofertas/confeccion/<oferta_id>', methods=['PUT'])
def actualizar_oferta(oferta_id):
    try:
        update_data = request.get_json()
        oferta = actualizar_oferta_con_stock(oferta_id, update_data)
        
        return jsonify({
            'success': True,
            'message': 'Oferta actualizada correctamente',
            'data': oferta.to_dict()
        }), 200
        
    except ValueError as e:
        # Errores de validación → 400 Bad Request
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
        
    except Exception as e:
        # Errores inesperados → 500 Internal Server Error
        logger.error(f"Error al actualizar oferta {oferta_id}: {e}")
        return jsonify({
            'success': False,
            'message': 'Error interno del servidor'
        }), 500
```

### Solución 2: Reforzar el Frontend (Defensa Adicional)

Aunque el frontend ya está bien, podemos agregar una validación extra:

```typescript
// En confeccion-ofertas-view.tsx, antes de enviar la petición

// Validación adicional: Si es oferta personalizada, debe tener contacto
if (!ofertaGenerica && modoEdicion) {
  const tieneContacto = 
    ofertaData.cliente_numero || 
    ofertaData.lead_id || 
    ofertaData.nombre_lead_sin_agregar
  
  if (!tieneContacto) {
    // Si no se está enviando ningún contacto, no incluir ninguno
    // para que el backend mantenga el existente
    delete ofertaData.cliente_numero
    delete ofertaData.lead_id
    delete ofertaData.nombre_lead_sin_agregar
  }
}
```

### Solución 3: Prevenir Envío de Strings Vacíos

```typescript
// En confeccion-ofertas-view.tsx, líneas 3324-3343
if (!ofertaGenerica) {
  if (tipoContacto === 'cliente') {
    const numeroCliente = selectedCliente?.numero || clienteId
    if (numeroCliente && numeroCliente.trim()) { // ✅ Validar que no sea string vacío
      ofertaData.cliente_numero = numeroCliente
    }
  } else if (tipoContacto === 'lead') {
    if (leadId && leadId.trim()) { // ✅ Validar que no sea string vacío
      ofertaData.lead_id = leadId
    }
  } else if (tipoContacto === 'lead_sin_agregar') {
    const nombreLead = nombreLeadSinAgregar.trim()
    if (nombreLead) { // ✅ Ya valida correctamente
      ofertaData.nombre_lead_sin_agregar = nombreLead
    }
  }
}
```

## 🧪 Casos de Prueba

### Caso 1: Editar oferta sin cambiar contacto
```json
PUT /api/ofertas/confeccion/OF-20260219-009
{
  "precio_final": 5000,
  "margen_comercial": 20
}
```
**Esperado**: ✅ Actualiza precio y margen, mantiene contacto existente

### Caso 2: Cambiar de cliente a lead
```json
PUT /api/ofertas/confeccion/OF-20260219-009
{
  "lead_id": "LEAD-123"
}
```
**Esperado**: ✅ Limpia cliente_numero, establece lead_id

### Caso 3: Enviar contactos vacíos (PROBLEMA)
```json
PUT /api/ofertas/confeccion/OF-20260219-009
{
  "cliente_numero": "",
  "lead_id": "",
  "nombre_lead_sin_agregar": ""
}
```
**Actual**: ❌ Error 500
**Esperado**: ❌ Error 400 con mensaje claro: "Debe proporcionar al menos un contacto"

### Caso 4: Enviar múltiples contactos
```json
PUT /api/ofertas/confeccion/OF-20260219-009
{
  "cliente_numero": "C001",
  "lead_id": "LEAD-123"
}
```
**Esperado**: ❌ Error 400 con mensaje claro: "Solo puede proporcionar un tipo de contacto"

## 📋 Checklist de Implementación

### Backend
- [ ] Cambiar `raise Exception` a `raise ValueError` en validaciones de contacto
- [ ] Normalizar strings vacíos a `None` al inicio
- [ ] Validar contactos ANTES de limpiar los existentes
- [ ] Manejar `ValueError` en el endpoint y retornar 400
- [ ] Agregar logs para debugging
- [ ] Probar todos los casos de prueba

### Frontend (Opcional - Defensa Adicional)
- [ ] Agregar `.trim()` a validaciones de `clienteId` y `leadId`
- [ ] Agregar validación para no enviar contactos vacíos en modo edición
- [ ] Mejorar mensajes de error para el usuario

## 🔗 Referencias

- [SOLUCION_CAMBIO_CONTACTOS_OFERTAS.md](./SOLUCION_CAMBIO_CONTACTOS_OFERTAS.md)
- [DEBUG_ERROR_500_ACTUALIZAR_OFERTA.md](./DEBUG_ERROR_500_ACTUALIZAR_OFERTA.md)
- [SOLUCION_ERROR_500_ACTUALIZAR_OFERTA_OF-20260219-009.md](./SOLUCION_ERROR_500_ACTUALIZAR_OFERTA_OF-20260219-009.md)

## 💡 Conclusión

El problema principal está en el backend:
1. Debe retornar 400 en lugar de 500 para errores de validación
2. Debe validar ANTES de limpiar contactos existentes
3. Debe dar mensajes de error claros

El frontend ya está bien implementado, pero podemos agregar validaciones adicionales como defensa en profundidad.
