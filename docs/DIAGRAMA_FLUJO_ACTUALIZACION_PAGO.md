# Diagrama de Flujo - Actualización de Pago

## Flujo Completo de Actualización

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USUARIO                                      │
│                                                                      │
│  1. Edita el monto de un pago en el diálogo                        │
│  2. Hace clic en "Actualizar Pago"                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   EditarPagoDialog.tsx                              │
│                                                                      │
│  3. handleSubmit() valida los datos                                │
│  4. Llama a PagoService.actualizarPago(pago.id, updateData)       │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   PagoService.ts                                    │
│                                                                      │
│  5. Envía PUT /api/pagos/{pago_id} al backend                      │
│  6. Recibe respuesta con monto_pendiente_actualizado               │
│  7. Retorna { success, message, pago_id,                           │
│               monto_pendiente_actualizado }                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   BACKEND API                                        │
│                                                                      │
│  8. Actualiza el pago en la base de datos                          │
│  9. Recalcula monto_pendiente de la oferta                         │
│ 10. Devuelve respuesta con monto_pendiente_actualizado             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   EditarPagoDialog.tsx                              │
│                                                                      │
│ 11. Recibe la respuesta exitosa                                    │
│ 12. Llama a onSuccess(response.monto_pendiente_actualizado)        │
│ 13. Cierra el diálogo                                              │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                TodosPagosPlanosTable.tsx                            │
│                                                                      │
│ 14. handlePagoEditSuccess() recibe montoPendienteActualizado       │
│ 15. Actualiza selectedPago.oferta.monto_pendiente                  │
│ 16. ✅ UI se actualiza INMEDIATAMENTE                              │
│ 17. Llama a onPagoUpdated() para recargar lista completa          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         USUARIO                                      │
│                                                                      │
│ 18. Ve el monto pendiente actualizado INSTANTÁNEAMENTE             │
│ 19. La lista completa se recarga para asegurar consistencia       │
└─────────────────────────────────────────────────────────────────────┘
```

## Comparación: Antes vs Después

### ❌ ANTES (Problema)

```
Usuario edita pago
    ↓
Backend actualiza monto_pendiente ✅
    ↓
Backend NO devuelve el nuevo valor ❌
    ↓
Frontend recarga TODA la lista desde el servidor
    ↓
Usuario espera... ⏳
    ↓
UI se actualiza después de la recarga
```

**Problemas:**
- Delay visible para el usuario
- Petición adicional innecesaria al servidor
- Mala experiencia de usuario

### ✅ DESPUÉS (Solución)

```
Usuario edita pago
    ↓
Backend actualiza monto_pendiente ✅
    ↓
Backend DEVUELVE el nuevo valor ✅
    ↓
Frontend actualiza UI INMEDIATAMENTE ⚡
    ↓
Frontend recarga lista en segundo plano
    ↓
Usuario ve el cambio INSTANTÁNEAMENTE 🎉
```

**Beneficios:**
- Actualización instantánea
- Mejor experiencia de usuario
- Menos carga en el servidor
- Consistencia garantizada

## Estructura de Datos

### Respuesta del Backend

```typescript
{
  success: true,
  message: "Pago actualizado exitosamente",
  pago_id: "20240215-001",
  monto_pendiente_actualizado: 2500.00  // ⭐ Nuevo campo
}
```

### Callback en Frontend

```typescript
// EditarPagoDialog
onSuccess: (montoPendienteActualizado?: number) => void

// TodosPagosPlanosTable
const handlePagoEditSuccess = (montoPendienteActualizado?: number) => {
  if (montoPendienteActualizado !== undefined && selectedPago) {
    // Actualizar UI inmediatamente
    selectedPago.oferta.monto_pendiente = montoPendienteActualizado
  }
  // Recargar lista completa
  onPagoUpdated()
}
```

## Logs de Consola

### Secuencia de Logs Esperada

```
🚀 [PagoService.actualizarPago] Iniciando actualización de pago
🆔 Pago ID: 20240215-001
📦 Datos recibidos: { monto: 2500, ... }
✅ [PagoService.actualizarPago] Respuesta exitosa
💰 Monto pendiente actualizado: 2500.00
💰 Actualizando monto pendiente en UI: 2500.00
📝 Oferta afectada: OF-2024-001
🔄 Recargando datos después de editar pago...
```

## Casos de Uso

### Caso 1: Aumentar el monto de un pago

```
Oferta: OF-2024-001
Precio final: $5000
Monto pendiente actual: $3000
Pago actual: $2000

Usuario edita pago a: $2500
Diferencia: +$500

Backend calcula:
  monto_pendiente = $3000 - $500 = $2500

Frontend recibe: monto_pendiente_actualizado = $2500
Frontend actualiza UI: $3000 → $2500 ⚡
```

### Caso 2: Disminuir el monto de un pago

```
Oferta: OF-2024-001
Precio final: $5000
Monto pendiente actual: $3000
Pago actual: $2000

Usuario edita pago a: $1500
Diferencia: -$500

Backend calcula:
  monto_pendiente = $3000 + $500 = $3500

Frontend recibe: monto_pendiente_actualizado = $3500
Frontend actualiza UI: $3000 → $3500 ⚡
```

### Caso 3: Cambiar moneda y tasa de cambio

```
Oferta: OF-2024-001
Precio final: $5000
Monto pendiente actual: $3000
Pago actual: 2000 USD (monto_usd = $2000)

Usuario edita pago a: 2000 EUR con tasa 1.10
Nuevo monto_usd: 2000 × 1.10 = $2200
Diferencia: +$200

Backend calcula:
  monto_pendiente = $3000 - $200 = $2800

Frontend recibe: monto_pendiente_actualizado = $2800
Frontend actualiza UI: $3000 → $2800 ⚡
```

## Archivos Modificados

1. ✅ `lib/services/feats/pagos/pago-service.ts`
   - Actualizado tipo de respuesta de `actualizarPago`
   - Agregado log del monto pendiente actualizado

2. ✅ `components/feats/pagos/editar-pago-dialog.tsx`
   - Actualizada interfaz `EditarPagoDialogProps`
   - Modificado callback `onSuccess` para pasar el monto

3. ✅ `components/feats/pagos/todos-pagos-planos-table.tsx`
   - Actualizado `handlePagoEditSuccess` para recibir y usar el monto
   - Agregada actualización inmediata de la UI

4. ✅ `docs/API_ACTUALIZAR_PAGO.md`
   - Documentado el campo `monto_pendiente_actualizado` en la respuesta

## Testing

### Checklist de Pruebas

- [ ] Editar monto de un pago y verificar actualización instantánea
- [ ] Cambiar moneda y tasa de cambio, verificar cálculo correcto
- [ ] Verificar logs en consola del navegador
- [ ] Confirmar que la lista se recarga después de la actualización
- [ ] Probar con diferentes tipos de pago (anticipo, pendiente)
- [ ] Verificar que funciona con pagos en diferentes monedas
- [ ] Confirmar que no hay errores de TypeScript
- [ ] Verificar compatibilidad con backend antiguo (sin monto_pendiente_actualizado)
