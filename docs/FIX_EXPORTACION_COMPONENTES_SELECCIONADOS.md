# Fix: Exportación de Componentes Seleccionados en Encabezado

## 🔴 Problema

Cuando una oferta tiene más de 1 batería, panel o inversor, el encabezado del PDF exportado mostraba la potencia y cantidad del **primer item encontrado** en lugar del componente **seleccionado para el nombre**.

### Ejemplo del Problema

**Oferta con:**
- 2x Inversor Growatt 5kW (seleccionado para nombre)
- 1x Inversor Deye 8kW

**Antes (incorrecto):**
- Encabezado mostraba: "1x Inversor Growatt 5kW" (primer item)
- Nombre de oferta: "2x Inversor Growatt 5kW + ..." (correcto)

**Después (correcto):**
- Encabezado muestra: "2x Inversor Growatt 5kW" (seleccionado)
- Nombre de oferta: "2x Inversor Growatt 5kW + ..." (correcto)

## ✅ Solución Implementada

Se modificó `components/feats/ofertas/confeccion-ofertas-view.tsx` para usar los componentes seleccionados (`inversorSeleccionado`, `bateriaSeleccionada`, `panelSeleccionado`) en lugar de `items.find()`.

### Cambios en las 3 Opciones de Exportación

1. **exportOptionsCompleto** (línea ~1843)
2. **exportOptionsSinPrecios** (línea ~2143)
3. **exportOptionsClienteConPrecios** (línea ~2475)
