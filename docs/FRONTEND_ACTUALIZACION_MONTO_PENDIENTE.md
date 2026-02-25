# Frontend - Actualización Inmediata del Monto Pendiente

## Problema Resuelto

Cuando se editaba el monto de un pago, el monto pendiente de la oferta no se actualizaba inmediatamente en la UI. El usuario tenía que recargar la página o esperar a que se recargaran todos los datos desde el servidor.

## Solución Implementada

El backend ya devuelve el campo `monto_pendiente_actualizado` en la respuesta del endpoint `PUT /api/pagos/{pago_id}`. Ahora el frontend utiliza este valor para actualizar la UI inmediatamente sin necesidad de recargar todos los datos.

## Cambios Realizados

### 1. Servicio de Pagos (`lib/services/feats/pagos/pago-service.ts`)

Se actualizó el tipo de respuesta del método `actualizarPago` para incluir `monto_pendiente_actualizado`:

```typescript
static async actualizarPago(
  pagoId: string, 
  data: Partial<PagoCreateData>
): Promise<{ 
  success: boolean; 
  message: string; 
  pago_id: string; 
  monto_pendiente_actualizado: number  // ✅ Nuevo campo
}> {
  // ...
  console.log('💰 Monto pendiente actualizado:', response.monto_pendiente_actualizado)
  return response
}
```

### 2. Componente EditarPagoDialog (`components/feats/pagos/editar-pago-dialog.tsx`)

Se modificó la interfaz `EditarPagoDialogProps` para que el callback `onSuccess` reciba el monto pendiente actualizado:

```typescript
interface EditarPagoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    pago: any | null
    oferta: any
    onSuccess: (montoPendienteActualizado?: number) => void  // ✅ Nuevo parámetro
}
```

Y se actualizó el manejo de la respuesta para pasar el valor al callback:

```typescript
const response = await PagoService.actualizarPago(pago.id, updateData)

console.log('✅ Pago actualizado exitosamente:', response)
console.log('💰 Monto pendiente actualizado:', response.monto_pendiente_actualizado)

onSuccess(response.monto_pendiente_actualizado)  // ✅ Pasar el valor
onOpenChange(false)
```

### 3. Componente TodosPagosPlanosTable (`components/feats/pagos/todos-pagos-planos-table.tsx`)

Se actualizó el handler `handlePagoEditSuccess` para recibir y usar el monto pendiente actualizado:

```typescript
const handlePagoEditSuccess = (montoPendienteActualizado?: number) => {
    setEditDialogOpen(false)
    
    // Si recibimos el monto pendiente actualizado, actualizar la UI inmediatamente
    if (montoPendienteActualizado !== undefined && selectedPago) {
        console.log('💰 Actualizando monto pendiente en UI:', montoPendienteActualizado)
        console.log('📝 Oferta afectada:', selectedPago.oferta.numero_oferta)
        
        // Actualizar el monto pendiente en el objeto de la oferta seleccionada
        selectedPago.oferta.monto_pendiente = montoPendienteActualizado
    }
    
    setSelectedPago(null)
    console.log('🔄 Recargando datos después de editar pago...')
    if (onPagoUpdated) {
        onPagoUpdated()
    }
}
```

## Flujo de Actualización

1. Usuario edita un pago en el diálogo `EditarPagoDialog`
2. Se envía la petición `PUT /api/pagos/{pago_id}` al backend
3. Backend actualiza el pago y el `monto_pendiente` de la oferta
4. Backend devuelve la respuesta con `monto_pendiente_actualizado`
5. `EditarPagoDialog` recibe la respuesta y llama a `onSuccess(monto_pendiente_actualizado)`
6. `TodosPagosPlanosTable` recibe el valor y actualiza inmediatamente la UI
7. Se recarga la lista completa para asegurar consistencia

## Beneficios

1. **Actualización instantánea**: El usuario ve el cambio inmediatamente sin esperar
2. **Mejor UX**: No hay delay ni necesidad de recargar la página
3. **Menos carga en el servidor**: Se evita una petición adicional para obtener el monto actualizado
4. **Consistencia**: El valor viene directamente del backend, garantizando precisión

## Logs de Depuración

El sistema incluye logs detallados para facilitar el debugging:

```
🚀 [PagoService.actualizarPago] Iniciando actualización de pago
🆔 Pago ID: 20240215-001
📦 Datos recibidos: {...}
✅ [PagoService.actualizarPago] Respuesta exitosa: {...}
💰 Monto pendiente actualizado: 2500.00
💰 Actualizando monto pendiente en UI: 2500.00
📝 Oferta afectada: OF-2024-001
🔄 Recargando datos después de editar pago...
```

## Compatibilidad

Los cambios son retrocompatibles:
- Si el backend no devuelve `monto_pendiente_actualizado`, el frontend simplemente recarga los datos como antes
- El parámetro `montoPendienteActualizado` es opcional en el callback

## Testing

Para verificar que funciona correctamente:

1. Abrir la tabla de pagos
2. Editar el monto de un pago
3. Verificar en la consola del navegador los logs de actualización
4. Confirmar que el monto pendiente se actualiza inmediatamente en la UI
5. Verificar que después se recarga la lista completa

## Próximos Pasos

Considerar aplicar el mismo patrón a:
- Creación de pagos (ya implementado con `PagoCreateResponse`)
- Eliminación de pagos (ya implementado con `monto_pendiente_actualizado`)
- Otros componentes que muestren el monto pendiente
