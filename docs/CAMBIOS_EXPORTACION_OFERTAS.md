# Cambios en Exportación de Ofertas Confeccionadas

## Resumen
Se implementaron mejoras en la exportación de ofertas confeccionadas para optimizar el espacio en PDF y agregar filtros de exportación.

## Cambios Realizados

### 1. Reducción de Espacio en PDF (lib/export-service.ts)

#### Altura de filas reducida
- **Antes**: 25mm por fila
- **Ahora**: 15mm por fila
- **Resultado**: Caben aproximadamente **el doble de componentes por página** (de ~10 a ~20 items por página)

#### Tamaño de fuentes optimizado (legible y compacto)
- **Descripción de materiales**: 9pt (bold) - Legible y clara
- **Precios y cantidades**: 10pt (bold) - Destacados y fáciles de leer
- **Precio unitario**: 9pt (normal) - Información secundaria
- **Margen**: 8.5pt en una sola línea como "X% ($Y)" - Compacto pero legible

#### Tamaño de fotos optimizado
- **Antes**: 22mm x 22mm
- **Ahora**: 14mm x 14mm
- Mantiene el aspect ratio original de las imágenes
- Suficientemente grande para identificar el producto

#### Texto optimizado
- Se muestra solo 1 línea de descripción en lugar de 2
- Posicionamiento vertical centrado (yPosition + 9) para mejor balance visual
- Espaciado optimizado entre elementos

### 2. Filtros de Exportación (components/feats/ofertas/confeccion-ofertas-view.tsx)

#### Nuevos estados agregados
```typescript
const [categoriaFiltroExport, setCategoriaFiltroExport] = useState<string>("todas")
const [materialesFiltroExport, setMaterialesFiltroExport] = useState<string[]>([])
```

#### Filtro por Categoría
- Select dropdown con todas las categorías/secciones disponibles en la oferta
- Opción "Todas las categorías" por defecto
- Filtra los items antes de generar la exportación

#### Filtro por Materiales Específicos
- Se activa solo cuando se selecciona una categoría específica
- Muestra checkboxes con todos los materiales de la categoría seleccionada
- Permite seleccionar múltiples materiales
- Contador de materiales seleccionados

#### Botón "Limpiar filtros"
- Aparece solo cuando hay filtros activos
- Resetea ambos filtros a sus valores por defecto

#### Auto-reset al cerrar
- Los filtros se resetean automáticamente al cerrar el diálogo de exportación

### 3. Aplicación de Filtros

Los filtros se aplican en las tres opciones de exportación:
1. **Exportación Completa** (con precios, márgenes y servicios)
2. **Sin Precios** (solo materiales y cantidades)
3. **Cliente con Precios** (materiales, cantidades y totales)

#### Lógica de filtrado
```typescript
let itemsFiltrados = items

if (categoriaFiltroExport !== "todas") {
  itemsFiltrados = items.filter(item => {
    const seccion = seccionLabelMap.get(item.seccion) ?? item.seccion
    return seccion === categoriaFiltroExport
  })
}

if (materialesFiltroExport.length > 0) {
  itemsFiltrados = itemsFiltrados.filter(item => 
    materialesFiltroExport.includes(item.materialCodigo)
  )
}
```

## Beneficios

### Reducción de Espacio
- ✅ **Menos páginas**: Una oferta que antes ocupaba 4 páginas ahora ocupa aproximadamente 2 páginas
- ✅ **Más eficiente**: Reduce costos de impresión y facilita la lectura
- ✅ **Mantiene legibilidad**: Las fuentes siguen siendo legibles (8-9pt)

### Filtros de Exportación
- ✅ **Exportaciones específicas**: Exportar solo una categoría (ej: solo Paneles)
- ✅ **Comparaciones**: Exportar materiales específicos para comparar opciones
- ✅ **Presupuestos parciales**: Crear presupuestos de ampliaciones o componentes específicos
- ✅ **Flexibilidad**: Combinar filtros para exportaciones muy específicas

## Ejemplos de Uso

### Caso 1: Exportar solo Paneles
1. Abrir diálogo de exportación
2. Seleccionar "Paneles" en el filtro de categoría
3. Exportar (Excel o PDF)
4. Resultado: Solo se exportan los paneles de la oferta

### Caso 2: Exportar 2 inversores específicos
1. Abrir diálogo de exportación
2. Seleccionar "Inversores" en el filtro de categoría
3. Marcar los 2 inversores deseados en la lista de materiales
4. Exportar
5. Resultado: Solo se exportan esos 2 inversores

### Caso 3: Exportación completa (sin filtros)
1. Abrir diálogo de exportación
2. Dejar "Todas las categorías" seleccionado
3. Exportar
4. Resultado: Se exporta toda la oferta (comportamiento original)

## Notas Técnicas

- Los filtros NO afectan los totales, servicios, transportación ni datos de pago
- Los filtros se aplican solo a los materiales de la oferta
- Las dependencias de los useMemo fueron actualizadas correctamente
- No hay errores de TypeScript ni warnings
