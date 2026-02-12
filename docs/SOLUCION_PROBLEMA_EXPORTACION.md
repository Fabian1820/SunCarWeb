# Solución: Problema de Visualización en Exportación de Ofertas

## Problema Resuelto
En algunas PCs se mostraba un componente antiguo con un select y checkboxes abajo, mientras que en otras se mostraba correctamente con checkboxes al lado de cada categoría y flechitas expandibles.

## Causa Identificada
Había **DOS diálogos de exportación** en el mismo archivo `confeccion-ofertas-view.tsx`:
1. Un diálogo antiguo con Select (líneas ~4920-5098) - **ELIMINADO**
2. El nuevo `ExportSelectionDialog` con checkboxes expandibles - **ACTIVO**

El problema era que dependiendo del caché del navegador o del build, se mostraba uno u otro.

## Solución Aplicada

### 1. Eliminación del Diálogo Antiguo
- Se eliminó completamente el diálogo antiguo con Select del archivo `confeccion-ofertas-view.tsx`
- Se eliminaron los estados `categoriaFiltroExport` y `materialesFiltroExport` que ya no se usan
- Se limpiaron las dependencias de los useMemo que generan las opciones de exportación

### 2. Componente Actualizado
- Se agregó documentación clara en `export-selection-dialog.tsx` indicando que es la versión 2.0
- Se agregó atributo `data-version="expandable-v2"` para identificar la versión correcta
- El filtrado ahora se maneja completamente dentro de `ExportSelectionDialog`

### 3. Archivos Modificados
- `components/feats/ofertas/confeccion-ofertas-view.tsx` - Eliminado diálogo antiguo
- `components/feats/ofertas/export-selection-dialog.tsx` - Agregada documentación de versión

## Pasos para Aplicar la Solución

### Opción 1: Reconstruir la Aplicación (Recomendado)
1. Ejecutar el archivo `clear-cache.bat` en el servidor
2. Esto limpiará el caché de Next.js y reconstruirá la aplicación
3. Reiniciar el servidor

### Opción 2: Limpiar Caché del Navegador (Para cada PC afectada)

#### Chrome/Edge:
1. Presionar `Ctrl + Shift + Delete`
2. Seleccionar "Imágenes y archivos en caché"
3. Seleccionar "Desde siempre"
4. Hacer clic en "Borrar datos"
5. Cerrar completamente el navegador
6. Abrir de nuevo y presionar `Ctrl + Shift + R` en la página

#### Firefox:
1. Presionar `Ctrl + Shift + Delete`
2. Seleccionar "Caché"
3. Seleccionar "Todo"
4. Hacer clic en "Limpiar ahora"
5. Cerrar completamente el navegador
6. Abrir de nuevo y presionar `Ctrl + Shift + R` en la página

### Opción 3: Forzar Recarga Sin Caché (Rápido)
En la página de ofertas, presionar:
- Windows/Linux: `Ctrl + Shift + R` o `Ctrl + F5`
- Mac: `Cmd + Shift + R`

## Verificación
Después de aplicar la solución, al hacer clic en "Exportar" en una oferta, deberías ver:
- ✅ Checkboxes al lado de cada categoría
- ✅ Flechitas (▶/▼) para expandir/contraer
- ✅ Lista de materiales dentro de cada categoría cuando está expandida
- ✅ Contador de materiales seleccionados (X/Y)
- ✅ Secciones adicionales (personalizadas y servicio de instalación) al final

**NO deberías ver:**
- ❌ Un select/dropdown arriba
- ❌ Checkboxes solo abajo del select

## Notas Técnicas
- Archivos modificados: 
  - `components/feats/ofertas/confeccion-ofertas-view.tsx`
  - `components/feats/ofertas/export-selection-dialog.tsx`
- Versión actual: 2.0 - Expandible con checkboxes
- La versión correcta SIEMPRE debe mostrar checkboxes expandibles
- El diálogo antiguo ha sido completamente eliminado del código
