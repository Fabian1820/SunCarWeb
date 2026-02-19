# Solución: Error 500 al Actualizar Contacto en Oferta

## Resumen

Se corrigió el error 500 que ocurría al intentar actualizar el contacto de una oferta confeccionada. El problema era que el frontend enviaba **toda la oferta completa** en el PUT request, cuando solo debería enviar el campo de contacto que se quiere actualizar.

## Cambios Realizados

### Archivo Modificado
- `components/feats/ofertas/confeccion-ofertas-view.tsx`

### Cambio Principal

**Antes (❌):**
```typescript
const ofertaData: any = {
  tipo_oferta: ofertaGenerica ? 'generica' : 'personalizada',
  almacen_id: almacenId,
}
// ... se agregaban TODOS los campos (items, precios, márgenes, etc.)
```

**Después (✅):**
```typescript
// En modo edición, inicializar vacío
const ofertaData: any = {}

// Solo agregar campos en modo creación
if (!modoEdicion) {
  ofertaData.tipo_oferta = ofertaGenerica ? 'generica' : 'personalizada'
  ofertaData.almacen_id = almacenId
}
```

### Lógica Implementada

1. **Modo Creación**: Se envían todos los campos necesarios para crear la oferta
2. **Modo Edición**: Solo se envía el campo de contacto que se quiere actualizar

```typescript
// Solo agregar el campo de contacto que tiene valor
if (!ofertaGenerica) {
  if (tipoContacto === 'cliente') {
    ofertaData.cliente_numero = numeroCliente
  } else if (tipoContacto === 'lead') {
    ofertaData.lead_id = leadId
  } else if (tipoContacto === 'lead_sin_agregar') {
    ofertaData.nombre_lead_sin_agregar = nombreLead
  }
}

// En modo edición, NO se agregan items, precios, márgenes, etc.
if (!modoEdicion) {
  // Agregar foto, estado, items, precios, etc.
  // ...
}
```

## Beneficios

1. ✅ **Menor payload**: Solo se envía 1 campo en lugar de toda la oferta
2. ✅ **Más rápido**: Menos datos = menos tiempo de procesamiento
3. ✅ **Menos errores**: No hay validaciones innecesarias de stock, precios, etc.
4. ✅ **Más claro**: El intent del request es obvio
5. ✅ **Mejor performance**: El backend no tiene que procesar campos que no cambian

## Ejemplo de Request

### Antes (❌ - Enviaba ~50+ campos)
```json
PUT /api/ofertas/confeccion/OF-20260219-009
{
  "tipo_oferta": "personalizada",
  "almacen_id": "ALM001",
  "cliente_numero": "C001",
  "items": [...], // 20+ items
  "precios": {...},
  "margenes": {...},
  "servicios": [...],
  "secciones_personalizadas": [...],
  // ... muchos más campos
}
```

### Después (✅ - Solo 1 campo)
```json
PUT /api/ofertas/confeccion/OF-20260219-009
{
  "cliente_numero": "C001"
}
```

## Logs Mejorados

Se agregaron logs más descriptivos para debugging:

```typescript
console.log('📤 Actualizando oferta (solo campos modificados):', ofertaData)
console.log('🔍 Datos de contacto que se envían:', {
  modo: 'EDICION',
  total_campos_enviados: Object.keys(ofertaData).length
})
```

## Testing

Para verificar que funciona correctamente:

1. **Abrir DevTools** → Console
2. **Editar una oferta** y cambiar el contacto
3. **Verificar los logs**:
   - Debe mostrar: `modo: "EDICION"`
   - Debe mostrar: `total_campos_enviados: 1`
4. **Verificar Network tab**:
   - El request body debe tener solo 1 campo
   - No debe incluir items, precios, ni márgenes

## Comportamiento del Backend

El backend está diseñado para:
- ✅ Recibir solo el campo que se quiere actualizar
- ✅ Limpiar automáticamente el contacto anterior
- ✅ Mantener todos los demás campos sin cambios

## Notas Importantes

⚠️ **Esta solución solo aplica para modo edición**
- En modo creación se siguen enviando todos los campos
- En modo edición solo se envía el campo de contacto
- El backend se encarga de limpiar el contacto anterior

⚠️ **NO enviar otros campos de contacto en null**
- ❌ Incorrecto: `{ cliente_numero: "C001", lead_id: null }`
- ✅ Correcto: `{ cliente_numero: "C001" }`

## Próximos Pasos

Si el error persiste después de este cambio:
1. Revisar logs del backend en Railway
2. Verificar que el contacto existe en la BD
3. Verificar que la oferta esté en un estado editable
4. Verificar que no haya pagos asociados que impidan el cambio
