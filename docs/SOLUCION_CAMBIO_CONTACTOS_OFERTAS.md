# Solución: Cambio de Contactos en Ofertas de Confección

## Problema Identificado

Cuando un usuario intentaba cambiar el tipo de contacto en una oferta personalizada (por ejemplo, de Cliente a Lead), el backend rechazaba la actualización con el error:

```
"Una oferta personalizada solo puede tener uno de: cliente_numero, lead_id o nombre_lead_sin_agregar"
```

## Causa Raíz

El backend validaba los contactos ANTES de limpiar los valores anteriores, lo que causaba que temporalmente existieran múltiples contactos activos durante la actualización.

## Solución Implementada

### Backend (Python/Flask)

Se modificó el método `actualizar_oferta_con_stock` en `application/services/oferta_confeccion_service.py` para:

1. **Detectar cambio de contacto**: Verificar si viene algún campo de contacto en `update_data`
2. **Limpiar PRIMERO**: Establecer todos los campos de contacto en `None`
3. **Validar DESPUÉS**: Aplicar la validación de "solo un contacto"
4. **Establecer nuevo**: Asignar el nuevo contacto que viene en la petición

```python
# Detectar si viene algún campo de contacto en el update
campos_contacto = ['cliente_numero', 'lead_id', 'nombre_lead_sin_agregar']
viene_contacto = any(campo in update_data for campo in campos_contacto)

if viene_contacto:
    # Limpiar TODOS los contactos anteriores primero
    oferta.cliente_numero = None
    oferta.lead_id = None
    oferta.nombre_lead_sin_agregar = None
    
    # Ahora establecer solo el nuevo contacto
    for campo in campos_contacto:
        if campo in update_data:
            setattr(oferta, campo, update_data[campo])
```

### Frontend (Next.js/React)

El frontend ya está implementado correctamente en `components/feats/ofertas/confeccion-ofertas-view.tsx`:

```typescript
// ✅ Solo envía el campo de contacto que tiene valor
if (!ofertaGenerica) {
  if (tipoContacto === 'cliente' && (selectedCliente?.numero || clienteId)) {
    ofertaData.cliente_numero = selectedCliente?.numero || clienteId
  } else if (tipoContacto === 'lead' && leadId) {
    ofertaData.lead_id = leadId
  } else if (tipoContacto === 'lead_sin_agregar' && nombreLeadSinAgregar.trim()) {
    ofertaData.nombre_lead_sin_agregar = nombreLeadSinAgregar.trim()
  }
}
```

## Uso Correcto

### Cambiar de Cliente a Lead

```typescript
const updateData = {
  lead_id: "nuevo_lead_id"
  // NO enviar cliente_numero: null
  // El backend lo limpiará automáticamente
}

await fetch(`/api/ofertas-confeccion/${ofertaId}`, {
  method: 'PUT',
  body: JSON.stringify(updateData)
})
```

### Cambiar de Lead a Cliente

```typescript
const updateData = {
  cliente_numero: "nuevo_cliente_numero"
  // NO enviar lead_id: null
  // El backend lo limpiará automáticamente
}
```

### Cambiar a Lead sin Agregar

```typescript
const updateData = {
  nombre_lead_sin_agregar: "Nombre del Lead"
  // NO enviar los otros campos en null
  // El backend los limpiará automáticamente
}
```

## Reglas Importantes

1. **Solo enviar el nuevo contacto**: No enviar los otros campos, ni siquiera en `null`
2. **El backend limpia automáticamente**: Cuando detecta un nuevo contacto, limpia los anteriores
3. **Validación después de limpieza**: Esto evita el error de "múltiples contactos"
4. **Funciona en creación y edición**: La lógica aplica tanto para crear como para actualizar ofertas

## Estado Actual

✅ **Backend**: Solución implementada y funcionando
✅ **Frontend**: Ya implementado correctamente desde el inicio
✅ **Documentación**: Actualizada

El cambio de contactos ahora funciona sin errores. El usuario puede cambiar libremente entre Cliente, Lead y Lead sin Agregar en ofertas personalizadas.
