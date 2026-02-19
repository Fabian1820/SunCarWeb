# Error 500 al Actualizar Contacto en Oferta Confeccionada

## Problema Identificado ✅

Al intentar actualizar el contacto (cliente o lead) de una oferta confeccionada, el backend devuelve un error 500:

```
PUT /api/ofertas/confeccion/OF-20260219-009
HTTP Status: 500 (Internal Server Error)
Duration: 15ms
Host: api.suncarsrl.com
```

## Causa Raíz

El frontend estaba enviando **TODA la oferta completa** en el PUT request, incluyendo:
- Todos los items y materiales
- Precios y márgenes
- Configuraciones de pago
- Secciones personalizadas
- Elementos personalizados

Esto causaba problemas porque:
1. El backend intentaba validar y actualizar campos que no deberían cambiar
2. Podía causar conflictos con validaciones de stock
3. Aumentaba la complejidad y posibilidad de errores
4. No seguía la recomendación del backend de enviar solo el campo que se quiere cambiar

## Solución Implementada ✅

Se modificó el código para que en modo edición **solo envíe el campo de contacto que se quiere actualizar**:

### Antes (❌ Incorrecto)
```typescript
// Enviaba TODA la oferta
const ofertaData: any = {
  tipo_oferta: ofertaGenerica ? 'generica' : 'personalizada',
  almacen_id: almacenId,
  items: [...], // Todos los items
  precios: {...}, // Todos los precios
  margenes: {...}, // Todos los márgenes
  // ... muchos más campos
}
```

### Después (✅ Correcto)
```typescript
// En modo edición, solo envía el contacto
const ofertaData: any = {}

// Solo agregar el campo de contacto que tiene valor
if (tipoContacto === 'cliente') {
  ofertaData.cliente_numero = numeroCliente
} else if (tipoContacto === 'lead') {
  ofertaData.lead_id = leadId
} else if (tipoContacto === 'lead_sin_agregar') {
  ofertaData.nombre_lead_sin_agregar = nombreLead
}

// IMPORTANTE: NO se envían los otros campos de contacto en null o vacíos
// El backend se encarga automáticamente de limpiar el contacto anterior
```

## Cambios en el Código

### Archivo: `components/feats/ofertas/confeccion-ofertas-view.tsx`

1. **Inicialización del objeto ofertaData**:
   - Antes: Se inicializaba con `tipo_oferta` y `almacen_id` siempre
   - Ahora: Se inicializa vacío `{}` y solo se agregan campos en modo creación

2. **Campos enviados según el modo**:
   - **Modo creación**: Se envían todos los campos necesarios
   - **Modo edición**: Solo se envía el campo de contacto que cambió

3. **Logs mejorados**:
   ```typescript
   console.log('📤 Actualizando oferta (solo campos modificados):', ofertaData)
   console.log('🔍 Datos de contacto que se envían:', {
     modo: 'EDICION',
     total_campos_enviados: Object.keys(ofertaData).length
   })
   ```

## Comportamiento del Backend

El backend está diseñado para:
1. ✅ Recibir solo el campo de contacto que se quiere actualizar
2. ✅ Limpiar automáticamente el contacto anterior
3. ✅ Validar que el nuevo contacto existe
4. ✅ Mantener todos los demás campos de la oferta sin cambios

## Ejemplo de Request Correcto

### Cambiar de cliente a lead:
```json
PUT /api/ofertas/confeccion/OF-20260219-009
{
  "lead_id": "lead_123"
}
```

### Cambiar de lead a cliente:
```json
PUT /api/ofertas/confeccion/OF-20260219-009
{
  "cliente_numero": "C001"
}
```

### Cambiar a lead sin agregar:
```json
PUT /api/ofertas/confeccion/OF-20260219-009
{
  "nombre_lead_sin_agregar": "Juan Pérez"
}
```

## Validaciones del Backend

El backend valida:
- ✅ El contacto existe (si es cliente o lead con ID)
- ✅ Solo se envía un tipo de contacto
- ✅ El formato del contacto es correcto
- ✅ La oferta existe y está en un estado editable

## Testing

Para probar la solución:

1. **Abrir la consola del navegador** y verificar los logs:
   ```
   📤 Actualizando oferta (solo campos modificados): { cliente_numero: "C001" }
   🔍 Datos de contacto que se envían: {
     modo: "EDICION",
     total_campos_enviados: 1
   }
   ```

2. **Verificar el request en Network tab**:
   - Debe mostrar solo 1-2 campos en el body
   - No debe incluir items, precios, ni márgenes

3. **Probar diferentes escenarios**:
   - ✅ Cambiar de cliente a otro cliente
   - ✅ Cambiar de lead a cliente
   - ✅ Cambiar de cliente a lead
   - ✅ Cambiar a lead sin agregar

## Beneficios de la Solución

1. **Menor payload**: Solo se envía el campo necesario
2. **Más rápido**: Menos datos = menos tiempo de procesamiento
3. **Menos errores**: No hay validaciones innecesarias
4. **Más claro**: El intent del request es obvio
5. **Mejor performance**: El backend no tiene que procesar campos que no cambian

## Notas Importantes

- ⚠️ Esta solución solo aplica para **modo edición**
- ⚠️ En **modo creación** se siguen enviando todos los campos necesarios
- ⚠️ El backend se encarga de limpiar el contacto anterior automáticamente
- ⚠️ NO se deben enviar los otros campos de contacto en `null` o vacíos
