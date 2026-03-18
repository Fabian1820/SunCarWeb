# Cambios en Frontend: Vales de Salida en Facturas

## Resumen

Se modificó el componente de creación de facturas para que al seleccionar vales de salida, se envíe el ID del vale de salida al backend, permitiendo que el backend marque el vale como facturado.

## Archivo Modificado

### `components/feats/facturas/factura-form-dialog.tsx`

**Función modificada**: `mapValeToFacturaVale`

**Cambio realizado**:
```typescript
// ANTES
return {
  fecha: vale.fecha_creacion || new Date().toISOString(),
  items,
};

// DESPUÉS
return {
  id: vale.id, // ← Incluir el ID del vale de salida
  fecha: vale.fecha_creacion || new Date().toISOString(),
  items,
};
```

**Línea**: ~181-223

## Impacto

### Antes del Cambio

Cuando se creaba una factura con vales de salida seleccionados:
1. El frontend enviaba los vales SIN el campo `id`
2. El backend los trataba como vales manuales
3. Los vales de salida NO se marcaban como facturados
4. Los vales quedaban disponibles para ser agregados múltiples veces

### Después del Cambio

Cuando se crea una factura con vales de salida seleccionados:
1. El frontend envía los vales CON el campo `id` (ID del vale de salida)
2. El backend los detecta como vales de salida
3. El backend marca los vales de salida como `facturado = true`
4. El backend guarda la referencia en `id_vale_salida`
5. Los vales NO quedan disponibles para ser agregados nuevamente

## Flujos Afectados

### Flujo 1: Crear Factura con Vales de Salida

```
Usuario → Nueva Factura → Tipo: Instaladora → Subtipo: Cliente
       → Seleccionar Cliente → Seleccionar Vales de Salida
       → Crear Factura
```

**Datos enviados al backend**:
```json
POST /api/facturas

{
  "numero_factura": "F-2024-001",
  "tipo": "instaladora",
  "subtipo": "cliente",
  "cliente_id": "12345",
  "vales": [
    {
      "id": "65f8a1b2c3d4e5f6g7h8i9j0",  // ← Ahora incluye el ID
      "fecha": "2024-03-17T10:30:00Z",
      "items": [...]
    }
  ]
}
```

### Flujo 2: Agregar Vale a Factura Existente

Este flujo YA funcionaba correctamente antes del cambio, ya que el componente `FacturasSection` siempre enviaba el ID del vale de salida.

```
Usuario → Factura → Agregar Vale → Desde Vales de Salida
       → Seleccionar Vales → Agregar
```

**Datos enviados al backend**:
```json
POST /api/facturas/{factura_id}/vales

{
  "id": "65f8a1b2c3d4e5f6g7h8i9j0",  // ← Ya incluía el ID
  "fecha": "2024-03-17T10:30:00Z",
  "items": [...]
}
```

## Consistencia

Ahora ambos flujos funcionan de la misma manera:
- ✅ Crear factura con vales de salida
- ✅ Agregar vale de salida a factura existente

En ambos casos:
1. Se envía el ID del vale de salida
2. El backend marca el vale como facturado
3. El backend guarda la referencia en `id_vale_salida`

## Testing

### Pruebas Manuales Recomendadas

1. **Crear factura con vale de salida**:
   - Crear factura tipo instaladora/cliente
   - Seleccionar un vale de salida
   - Crear la factura
   - Verificar que el vale ya no aparece en la lista de disponibles

2. **Crear factura con múltiples vales**:
   - Crear factura tipo instaladora/cliente
   - Seleccionar 2-3 vales de salida
   - Crear la factura
   - Verificar que ninguno de los vales aparece en la lista de disponibles

3. **Agregar vale a factura existente** (verificar que sigue funcionando):
   - Abrir una factura existente
   - Agregar vale desde vales de salida
   - Verificar que el vale ya no aparece en la lista de disponibles

4. **Eliminar vale de factura**:
   - Eliminar un vale que proviene de un vale de salida
   - Verificar que el vale vuelve a aparecer en la lista de disponibles

## Compatibilidad

### Backend

El backend debe estar preparado para:
1. Recibir vales con campo `id` en el endpoint `POST /api/facturas`
2. Procesar estos vales como vales de salida
3. Marcar los vales de salida como `facturado = true`
4. Guardar la referencia en `id_vale_salida`

Ver documentación completa en:
- `docs/BACKEND_VALES_SALIDA_EN_FACTURAS.md`
- `docs/RESUMEN_VALES_SALIDA_FACTURAS.md`

### Vales Manuales

Los vales creados manualmente (sin seleccionar un vale de salida) siguen funcionando igual:
- NO tienen campo `id` al ser enviados
- El backend los trata como vales manuales
- Se guardan con `id_vale_salida = null`

## Notas Adicionales

- El cambio es mínimo (1 línea agregada)
- No afecta la funcionalidad existente de vales manuales
- Mantiene compatibilidad con el flujo de agregar vale existente
- Requiere que el backend esté actualizado para procesar correctamente

## Documentación Relacionada

- `docs/BACKEND_VALES_SALIDA_EN_FACTURAS.md` - Implementación backend completa
- `docs/FLUJO_VALES_SALIDA_FACTURAS.md` - Flujo paso a paso
- `docs/CHECKLIST_IMPLEMENTACION_VALES.md` - Checklist de implementación
- `docs/VALES_SALIDA_EN_FACTURAS.md` - Documentación original
