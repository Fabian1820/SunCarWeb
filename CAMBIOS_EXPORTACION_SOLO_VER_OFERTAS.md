# Cambios: Exportación Solo en Ver Ofertas Confeccionadas

## Resumen
Se eliminó la opción de exportar ofertas del componente de confección (crear/editar ofertas) para que solo esté disponible en la vista de ofertas confeccionadas.

## Cambios Realizados

### Archivo: `components/feats/ofertas/confeccion-ofertas-view.tsx`

1. **Eliminado el botón "Exportar oferta"** (línea ~4511-4518)
   - Este botón permitía exportar la oferta mientras se estaba creando o editando
   - Ahora solo se puede exportar desde la vista de ofertas confeccionadas

2. **Eliminado el estado `mostrarDialogoExportar`** (línea ~183)
   - Ya no se necesita este estado en el componente de confección

## Dónde Está Disponible la Exportación

### ✅ Disponible en:
- **Ver Ofertas Confeccionadas** (`components/feats/ofertas/ofertas-confeccionadas-view.tsx`)
  - Botón de exportar en cada tarjeta de oferta
  - Abre el diálogo `ExportSelectionDialog` con todas las opciones de filtrado

### ❌ NO disponible en:
- **Crear Oferta** (modo confección)
- **Editar Oferta** (modo edición)

## Flujo de Trabajo Actualizado

1. Usuario crea una oferta en el módulo de confección
2. Guarda la oferta
3. Va a "Ver Ofertas Confeccionadas"
4. Hace clic en el botón de exportar (icono de descarga)
5. Selecciona las categorías y materiales a exportar
6. Elige el formato (Excel o PDF) y tipo de exportación

## Beneficios

- **Flujo más claro**: La exportación se hace después de guardar la oferta
- **Datos consistentes**: Se exportan ofertas ya guardadas en la base de datos
- **Menos confusión**: No hay botones de exportar en el proceso de creación/edición

## Archivos Modificados

- `components/feats/ofertas/confeccion-ofertas-view.tsx` - Eliminado botón y estado de exportación

## Archivos Sin Cambios

- `components/feats/ofertas/ofertas-confeccionadas-view.tsx` - Mantiene la funcionalidad de exportación
- `components/feats/ofertas/export-selection-dialog.tsx` - Sin cambios
