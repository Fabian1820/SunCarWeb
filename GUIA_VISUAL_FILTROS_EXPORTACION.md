# Guía Visual: Filtros de Exportación

## Ubicación
Los filtros están en el **diálogo de exportación** que se abre al hacer clic en el botón "Exportar oferta".

## Estructura del Diálogo

```
┌─────────────────────────────────────────────────────────────┐
│  Exportar oferta                                        [X] │
├─────────────────────────────────────────────────────────────┤
│  Selecciona filtros, tipo de exportación y formato         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Filtros de exportación                              │   │
│  │                                                      │   │
│  │ Categoría                                           │   │
│  │ ┌─────────────────────────────────────────────┐    │   │
│  │ │ Todas las categorías              ▼        │    │   │
│  │ └─────────────────────────────────────────────┘    │   │
│  │                                                      │   │
│  │ [Solo aparece si seleccionas una categoría]        │   │
│  │ Materiales específicos (opcional)                   │   │
│  │ ┌─────────────────────────────────────────────┐    │   │
│  │ │ ☐ Inversor Growatt 5kW SPF 5000ES    x2   │    │   │
│  │ │ ☐ Inversor Deye 8kW SUN-8K-SG04LP3   x1   │    │   │
│  │ │ ☐ Inversor Sofar 10kW HYD 10KTL      x1   │    │   │
│  │ └─────────────────────────────────────────────┘    │   │
│  │ 2 material(es) seleccionado(s)                     │   │
│  │                                                      │   │
│  │ [ Limpiar filtros ]                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ 1) Completo  │  │ 2) Sin       │  │ 3) Cliente   │    │
│  │              │  │    precios   │  │    con       │    │
│  │ Incluye      │  │              │  │    precios   │    │
│  │ precios,     │  │ Solo         │  │              │    │
│  │ márgenes...  │  │ materiales   │  │ Precios por  │    │
│  │              │  │ y cantidades │  │ material...  │    │
│  │ [Excel] [PDF]│  │ [Excel] [PDF]│  │ [Excel] [PDF]│    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Uso

### Paso 1: Abrir el diálogo
Haz clic en el botón **"Exportar oferta"** en la vista de confección de ofertas.

### Paso 2: Seleccionar filtros (OPCIONAL)

#### Opción A: Exportar todo (sin filtros)
- Deja "Todas las categorías" seleccionado
- Haz clic en Excel o PDF en cualquiera de las 3 opciones
- ✅ Se exporta toda la oferta

#### Opción B: Exportar solo una categoría
1. Haz clic en el dropdown "Categoría"
2. Selecciona una categoría (ej: "Inversores")
3. Haz clic en Excel o PDF
4. ✅ Se exportan solo los inversores

#### Opción C: Exportar materiales específicos
1. Selecciona una categoría (ej: "Inversores")
2. Aparece la lista de materiales de esa categoría
3. Marca los checkboxes de los materiales que quieres exportar
4. Haz clic en Excel o PDF
5. ✅ Se exportan solo esos materiales específicos

### Paso 3: Elegir tipo de exportación
- **Completo**: Con precios, márgenes, servicios y totales
- **Sin precios**: Solo materiales y cantidades
- **Cliente con precios**: Materiales, cantidades y totales (sin márgenes)

### Paso 4: Elegir formato
- **Excel**: Archivo .xlsx editable
- **PDF**: Archivo .pdf para imprimir o enviar

## Ejemplos Prácticos

### Ejemplo 1: Comparar 2 inversores
```
1. Abrir "Exportar oferta"
2. Categoría: "Inversores"
3. Marcar: ☑ Inversor Growatt 5kW
           ☑ Inversor Deye 8kW
4. Clic en "PDF" en "Cliente con precios"
5. Resultado: PDF con solo esos 2 inversores y sus precios
```

### Ejemplo 2: Presupuesto solo de paneles
```
1. Abrir "Exportar oferta"
2. Categoría: "Paneles"
3. No marcar ningún material (exporta todos los paneles)
4. Clic en "Excel" en "Completo"
5. Resultado: Excel con todos los paneles, precios y márgenes
```

### Ejemplo 3: Oferta completa (sin filtros)
```
1. Abrir "Exportar oferta"
2. Categoría: "Todas las categorías" (por defecto)
3. Clic en "PDF" en "Completo"
4. Resultado: PDF con toda la oferta
```

## Características Especiales

### Auto-limpieza
- Los filtros se resetean automáticamente al cerrar el diálogo
- Cada vez que abres el diálogo, empieza con "Todas las categorías"

### Contador de materiales
- Muestra cuántos materiales has seleccionado
- Ejemplo: "3 material(es) seleccionado(s)"

### Cantidad total
- Cada material muestra su cantidad total (ej: "x2", "x5")
- Útil para saber cuántos de cada material hay en la oferta

### Botón "Limpiar filtros"
- Solo aparece cuando hay filtros activos
- Un clic resetea todo a "Todas las categorías"

## Categorías Disponibles

Las categorías que aparecen en el dropdown son las secciones de tu oferta:
- Inversores
- Baterías
- Paneles
- MPPT
- Estructuras
- Cableado DC
- Cableado AC
- Canalización
- Tierra
- Protecciones Eléctricas y Gabinetes
- Material vario
- Ampliación de Sistema (si existe)
- Cualquier sección personalizada que hayas creado

## Notas Importantes

⚠️ **Los filtros solo afectan los materiales**
- Los servicios, transportación, totales y datos de pago NO se filtran
- Siempre aparecen en la exportación si están presentes en la oferta

✅ **Los filtros funcionan en las 3 opciones**
- Completo
- Sin precios
- Cliente con precios

🔄 **Los filtros se aplican en tiempo real**
- No necesitas "aplicar" los filtros
- Se aplican automáticamente al exportar
