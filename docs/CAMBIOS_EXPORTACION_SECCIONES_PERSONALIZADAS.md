# Cambios en Exportación de Ofertas Confeccionadas

## Resumen
Se ha actualizado el diálogo de exportación de ofertas confeccionadas para incluir la selección de **secciones personalizadas** y **servicio de instalación**.

## Cambios Realizados

### 1. Componente `ExportSelectionDialog`

#### Nuevas Funcionalidades

1. **Detección de Secciones Especiales**
   - Se agregó un nuevo `useMemo` llamado `seccionesEspeciales` que identifica:
     - Secciones personalizadas de la oferta
     - Servicio de instalación (si existe y tiene precio > 0)

2. **Estado de Selección de Secciones Especiales**
   - Nuevo estado: `seccionesEspecialesSeleccionadas`
   - Por defecto, todas las secciones especiales están seleccionadas
   - Se sincroniza con los botones "Seleccionar todo" y "Deseleccionar todo"

3. **Filtrado Mejorado en Exportación**
   - La función `filtrarItems` ahora también verifica:
     - Si un item pertenece al servicio de instalación
     - Si un item pertenece a una sección personalizada
   - Solo se exportan los items de secciones especiales que estén seleccionadas

4. **Interfaz Visual**
   - Nueva sección "Secciones Adicionales" en el diálogo
   - Separador visual entre materiales estándar y secciones especiales
   - Cada sección especial muestra:
     - Icono distintivo (🔧 para servicio, 📦 para personalizada)
     - Badge indicando el tipo (Servicio/Personalizada)
     - Información relevante (precio, cantidad de elementos, total)
   - Fondo degradado azul para distinguir visualmente

5. **Contador Actualizado**
   - El contador ahora muestra:
     - Materiales seleccionados (como antes)
     - Secciones adicionales seleccionadas (nuevo)

## Estructura de Datos

### Secciones Personalizadas
```typescript
{
  id: string,           // ID único de la sección
  label: string,        // Nombre visible
  tipo: 'personalizada',
  elementos: [          // Array de elementos
    {
      descripcion: string,
      cantidad: number,
      precio_unitario: number
    }
  ]
}
```

### Servicio de Instalación
```typescript
{
  id: 'SERVICIO_INSTALACION',
  label: 'Servicio de Instalación',
  tipo: 'servicio',
  precio: number,
  descripcion?: string
}
```

## Comportamiento

### Selección por Defecto
- Todas las secciones (materiales, personalizadas y servicio) están seleccionadas por defecto
- El usuario puede deseleccionar individualmente lo que no desea exportar

### Botones de Control
- **Seleccionar todo**: Selecciona materiales + secciones especiales
- **Deseleccionar todo**: Deselecciona todo

### Exportación
- Los tres tipos de exportación (Completo, Sin precios, Cliente con precios) respetan las selecciones
- Si una sección especial no está seleccionada, sus items no aparecen en ninguna exportación

## Ejemplo Visual

```
┌─────────────────────────────────────────┐
│ Materiales Estándar                     │
│ ☑ Inversores (2/2)                      │
│ ☑ Baterías (1/1)                        │
│ ☑ Paneles (1/1)                         │
├─────────────────────────────────────────┤
│ ━━━ Secciones Adicionales ━━━           │
│                                         │
│ ☑ 📦 Elementos Extras [Personalizada]   │
│    2 elemento(s)                        │
│    Total: $450.00                       │
│                                         │
│ ☑ 🔧 Servicio de Instalación [Servicio] │
│    Precio: $1,200.00                    │
│    Instalación completa del sistema     │
└─────────────────────────────────────────┘
```

## Archivos Modificados

- `components/feats/ofertas/export-selection-dialog.tsx` - Diálogo de selección de exportación
- `components/feats/ofertas/ofertas-confeccionadas-view.tsx` - Vista de ofertas confeccionadas (corrección de visualización de texto)

## Compatibilidad

- ✅ Compatible con ofertas sin secciones personalizadas
- ✅ Compatible con ofertas sin servicio de instalación
- ✅ No afecta el funcionamiento de ofertas existentes
- ✅ Mantiene la estructura de exportación actual

## Pruebas Recomendadas

1. Exportar oferta con secciones personalizadas
2. Exportar oferta con servicio de instalación
3. Exportar oferta con ambos
4. Deseleccionar secciones y verificar que no aparezcan en la exportación
5. Verificar los tres tipos de exportación (Completo, Sin precios, Cliente con precios)
6. **Verificar que el contenido de escritura se muestre completo** en el detalle de ofertas confeccionadas

## Correcciones Adicionales

### Visualización de Contenido de Escritura

Se corrigió un problema en `ofertas-confeccionadas-view.tsx` donde el contenido de las secciones personalizadas de tipo "escritura" se mostraba truncado con `line-clamp-2`.

**Antes:**
```tsx
<p className="text-xs text-slate-500 line-clamp-2">
  {seccion.contenido_escritura}
</p>
```

**Después:**
```tsx
<div className="bg-white rounded-lg border border-slate-200 p-3">
  <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">
    {seccion.contenido_escritura}
  </p>
</div>
```

**Mejoras aplicadas:**
- Se eliminó `line-clamp-2` que limitaba el texto a 2 líneas
- Se agregó `whitespace-pre-wrap` para preservar saltos de línea
- Se agregó `break-words` para evitar desbordamiento horizontal
- Se mejoró el diseño visual con un contenedor separado
- Se aumentó el tamaño de fuente de `text-xs` a `text-sm` para mejor legibilidad
