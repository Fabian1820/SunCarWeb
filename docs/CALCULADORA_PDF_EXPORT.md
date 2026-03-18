# Exportación de PDF en Calculadora de Consumo Eléctrico

## Descripción

Se ha implementado la funcionalidad de exportación a PDF en la calculadora de consumo eléctrico (Ficha de Costo). Esta funcionalidad permite generar un documento PDF profesional con todos los datos de la calculadora, incluyendo equipos seleccionados, consumos y recomendaciones de dimensionamiento.

## Ubicación

**Módulo**: Calculadora de Consumo Eléctrico  
**Archivo**: `app/calculadora/page.tsx`  
**Ruta**: `/calculadora`

## Funcionalidades Implementadas

### 1. Botón de Descarga en Panel de Consumo

Se agregó un botón "Descargar PDF" en el panel de consumo total que aparece cuando hay equipos seleccionados:

- **Ubicación**: Panel superior de consumo (versión móvil y desktop)
- **Comportamiento**: Genera el PDF inmediatamente con los datos actuales
- **Estados**: Muestra "Generando PDF..." mientras se procesa

### 2. Botón de Descarga en Modal de Recomendaciones

Se agregó un botón "Descargar PDF" en el modal de dimensionamiento:

- **Ubicación**: Pie del modal de recomendaciones
- **Comportamiento**: Genera el PDF con los datos de dimensionamiento actuales
- **Diseño**: Botón naranja con icono de descarga

## Contenido del PDF

El PDF generado incluye las siguientes secciones:

### 1. Encabezado
- Logo de SunCar SRL
- Título: "FICHA DE COSTO"
- Subtítulo: "Calculadora de Consumo Eléctrico"
- Fecha de generación

### 2. Resumen de Consumo
- Potencia Total (Inversor): en kW
- Consumo Real por Hora: en kWh
- Total de Equipos seleccionados

### 3. Tabla de Equipos Seleccionados
Tabla detallada con las siguientes columnas:
- Categoría
- Equipo
- Cantidad
- Potencia unitaria (W)
- Consumo unitario (W)
- Total Potencia (kW)
- Total Consumo (kWh)

### 4. Dimensionamiento del Sistema

#### Inversor Recomendado
- Potencia recomendada en kW
- Cálculo: Potencia base + 25% de margen
- Explicación del margen de seguridad

#### Banco de Baterías
- Capacidad recomendada en kWh (5 horas de autonomía)
- Duración estimada con la batería configurada
- Consumo diario proyectado (24h)

## Formato y Diseño

### Colores
- **Encabezado**: Verde claro (RGB: 189, 215, 176) - Color corporativo SunCar
- **Títulos**: Negro
- **Destacados**: Naranja (RGB: 234, 88, 12) - Color corporativo SunCar
- **Fondos de sección**: Gris claro, naranja claro, azul claro

### Tipografía
- **Fuente**: Helvetica
- **Tamaños**:
  - Título principal: 20pt
  - Subtítulos: 12pt
  - Texto normal: 10pt
  - Texto pequeño: 8pt

### Tabla
- **Tema**: Grid (con bordes)
- **Encabezados**: Fondo naranja, texto blanco
- **Cuerpo**: Texto negro sobre fondo blanco
- **Tamaño de fuente**: 8-9pt para mejor legibilidad

## Dependencias

Las siguientes librerías se utilizan para la generación del PDF:

```json
{
  "jspdf": "^3.0.3",
  "jspdf-autotable": "^5.0.2"
}
```

Estas dependencias ya están instaladas en el proyecto.

## Uso

### Para el Usuario

1. **Desde el Panel de Consumo**:
   - Agregar equipos a la calculadora
   - Hacer clic en el botón "Descargar PDF" en el panel superior
   - El PDF se descargará automáticamente

2. **Desde el Modal de Recomendaciones**:
   - Agregar equipos a la calculadora
   - Hacer clic en "Dimensionar Inversor y Batería"
   - Ajustar la capacidad de batería si es necesario
   - Hacer clic en "Descargar PDF"
   - El PDF se descargará automáticamente

### Nombre del Archivo

El archivo PDF se genera con el siguiente formato:
```
Ficha_Costo_DD-MM-YYYY.pdf
```

Ejemplo: `Ficha_Costo_18-03-2026.pdf`

## Implementación Técnica

### Función Principal: `generarPDF()`

```typescript
const generarPDF = async () => {
  setExportingPDF(true)
  try {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    })
    
    // Generación del contenido...
    
    doc.save(filename)
    
    toast({
      title: "PDF generado",
      description: "La ficha de costo se ha descargado correctamente.",
    })
  } catch (error) {
    toast({
      title: "Error al generar PDF",
      description: "No se pudo generar el archivo. Intenta nuevamente.",
      variant: "destructive",
    })
  } finally {
    setExportingPDF(false)
  }
}
```

### Estado de Carga

Se utiliza el estado `exportingPDF` para:
- Deshabilitar el botón durante la generación
- Mostrar un indicador de carga (spinner)
- Cambiar el texto del botón a "Generando PDF..."

### Notificaciones

Se utilizan toasts para informar al usuario:
- **Éxito**: "PDF generado - La ficha de costo se ha descargado correctamente."
- **Error**: "Error al generar PDF - No se pudo generar el archivo. Intenta nuevamente."

## Características Destacadas

1. **Diseño Profesional**: Utiliza los colores corporativos de SunCar y un layout limpio
2. **Logo Corporativo**: Incluye el logo de la empresa en el encabezado
3. **Información Completa**: Captura todos los datos relevantes de la calculadora
4. **Cálculos Automáticos**: Incluye totales y recomendaciones calculadas
5. **Formato Estándar**: PDF en formato A4 vertical
6. **Responsive**: Funciona tanto en móvil como en desktop
7. **Feedback Visual**: Indicadores de carga y notificaciones de éxito/error

## Mejoras Futuras Posibles

1. Agregar gráficos de consumo por categoría
2. Incluir comparativas de diferentes configuraciones
3. Agregar sección de notas personalizadas
4. Permitir personalizar el logo y colores
5. Exportar también a Excel para análisis de datos
6. Incluir proyecciones de ahorro energético
7. Agregar códigos QR para compartir configuraciones

## Notas de Desarrollo

- La función es asíncrona para manejar la carga del logo
- Se utiliza `autoTable` de jspdf-autotable para tablas profesionales
- El PDF se genera completamente en el cliente (no requiere backend)
- Compatible con todos los navegadores modernos
- No hay límite en la cantidad de equipos que se pueden incluir (paginación automática)

## Testing

Para probar la funcionalidad:

1. Acceder a `/calculadora`
2. Agregar varios equipos de diferentes categorías
3. Verificar que el botón "Descargar PDF" aparece
4. Hacer clic en el botón
5. Verificar que el PDF se descarga correctamente
6. Abrir el PDF y verificar que contiene:
   - Logo y encabezado
   - Resumen de consumo
   - Tabla de equipos
   - Recomendaciones de dimensionamiento
7. Probar desde el modal de recomendaciones
8. Verificar que funciona en móvil y desktop

## Soporte

Para problemas o mejoras, contactar al equipo de desarrollo.
