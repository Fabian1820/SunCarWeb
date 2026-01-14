# Documento de Requisitos

## Introducción

Esta especificación define los requisitos para rediseñar el diálogo de detalles de lead para que coincida con el diseño organizado, profesional y visualmente atractivo del create-lead-dialog. La implementación actual muestra la información en un diseño básico, mientras que el create-lead-dialog utiliza un enfoque estructurado con secciones bordeadas, jerarquía visual clara y agrupaciones organizadas.

## Glosario

- **Lead_Details_Dialog**: El diálogo modal que muestra información completa sobre un lead cuando el usuario hace clic en "Ver detalles"
- **Create_Lead_Dialog**: El diálogo de referencia con el patrón de diseño deseado que presenta secciones bordeadas y diseños organizados
- **Sección**: Un grupo visualmente distinto de información relacionada con un borde, encabezado y descripción
- **Sistema**: La interfaz de gestión de leads dentro de la aplicación SunCar Admin

## Requisitos

### Requisito 1: Implementar Diseño de Secciones

**Historia de Usuario:** Como usuario, quiero ver los detalles del lead en secciones claramente organizadas, para poder encontrar y comprender rápidamente diferentes tipos de información.

#### Criterios de Aceptación

1. EL Sistema DEBERÁ mostrar la información del lead en secciones bordeadas con esquinas redondeadas y sombras
2. CUANDO se muestre una sección, EL Sistema DEBERÁ incluir un encabezado de sección con título y subtítulo descriptivo
3. EL Sistema DEBERÁ usar espaciado consistente (padding y márgenes) entre secciones que coincida con el create-lead-dialog
4. EL Sistema DEBERÁ aplicar un fondo blanco a las secciones con bordes grises (border-2 border-gray-300)
5. EL Sistema DEBERÁ separar los encabezados de sección del contenido con un borde inferior (border-b-2 border-gray-200)

### Requisito 2: Organizar Información en Grupos Lógicos

**Historia de Usuario:** Como usuario, quiero que la información del lead esté agrupada lógicamente en secciones, para que los datos relacionados se presenten juntos.

#### Criterios de Aceptación

1. EL Sistema DEBERÁ agrupar la información del lead en las siguientes secciones: "Datos Personales", "Oferta", "Costos y Pago"
2. CUANDO se muestren "Datos Personales", EL Sistema DEBERÁ incluir: nombre, referencia, teléfono, teléfono adicional, estado, fuente, dirección, provincia, municipio, país de contacto
3. CUANDO se muestre "Oferta", EL Sistema DEBERÁ incluir: todas las ofertas con sus productos (inversor, batería, paneles), cantidades y banderas de estado (aprobada, pagada)
4. CUANDO se muestren "Costos y Pago", EL Sistema DEBERÁ incluir: costo de oferta, costo extra, costo de transporte, costo final, método de pago, moneda, razón del costo extra
5. EL Sistema DEBERÁ mostrar comentarios en una sección separada si están presentes

### Requisito 3: Aplicar Estilo Visual Profesional

**Historia de Usuario:** Como usuario, quiero que el diálogo de detalles del lead tenga una apariencia profesional de nivel empresarial, para que coincida con la calidad del create-lead-dialog.

#### Criterios de Aceptación

1. EL Sistema DEBERÁ usar tipografía consistente con títulos de sección en negrita (text-xl font-bold text-gray-900)
2. EL Sistema DEBERÁ usar subtítulos descriptivos en gris (text-sm text-gray-500 mt-1)
3. EL Sistema DEBERÁ aplicar estilo de etiqueta consistente (text-gray-700 o text-gray-500)
4. EL Sistema DEBERÁ usar diseños de cuadrícula para presentación de datos en múltiples columnas (grid grid-cols-1 md:grid-cols-2 gap-4)
5. EL Sistema DEBERÁ mantener un esquema de colores consistente que coincida con el create-lead-dialog

### Requisito 4: Preservar Funcionalidad Existente

**Historia de Usuario:** Como usuario, quiero que toda la funcionalidad existente continúe funcionando después del rediseño, para no perder ninguna capacidad.

#### Criterios de Aceptación

1. EL Sistema DEBERÁ mostrar todos los campos de lead que se muestran actualmente
2. EL Sistema DEBERÁ mantener la funcionalidad del botón de descarga de comprobante
3. EL Sistema DEBERÁ preservar el botón de cerrar en la parte inferior del diálogo
4. EL Sistema DEBERÁ manejar campos faltantes o vacíos con gracia con texto de respaldo apropiado
5. EL Sistema DEBERÁ mantener el comportamiento responsivo para vistas móviles y de escritorio

### Requisito 5: Coincidir con la Estructura del Create-Lead-Dialog

**Historia de Usuario:** Como desarrollador, quiero que el diálogo de detalles del lead siga los mismos patrones estructurales que el create-lead-dialog, para que la base de código sea consistente y mantenible.

#### Criterios de Aceptación

1. EL Sistema DEBERÁ usar las mismas clases de envoltura de sección que create-lead-dialog (border-2 border-gray-300 rounded-lg p-6 bg-white shadow-sm)
2. EL Sistema DEBERÁ usar la misma estructura de encabezado con pb-4 mb-4 border-b-2 border-gray-200
3. EL Sistema DEBERÁ usar los mismos patrones de cuadrícula para diseños de campos
4. EL Sistema DEBERÁ usar las mismas utilidades de espaciado (space-y-4, space-y-6)
5. EL Sistema DEBERÁ seguir el mismo orden de secciones que create-lead-dialog donde sea aplicable

### Requisito 6: Mostrar Información de Oferta Claramente

**Historia de Usuario:** Como usuario, quiero ver los detalles de la oferta en un formato organizado, para poder entender rápidamente qué productos y costos están asociados con cada oferta.

#### Criterios de Aceptación

1. CUANDO se muestren ofertas, EL Sistema DEBERÁ mostrar cada oferta en una subsección dentro de la sección "Oferta"
2. CUANDO se muestre información de productos, EL Sistema DEBERÁ usar un diseño de cuadrícula mostrando inversor, batería y paneles lado a lado
3. CUANDO se muestren costos, EL Sistema DEBERÁ mostrar costo de oferta, costo extra, costo de transporte y costo final en una cuadrícula
4. CUANDO una oferta esté aprobada o pagada, EL Sistema DEBERÁ mostrar indicadores de estado (casillas de verificación o insignias)
5. CUANDO existan elementos_personalizados o razon_costo_extra, EL Sistema DEBERÁ mostrarlos en un área dedicada

### Requisito 7: Mejorar Legibilidad y Escaneabilidad

**Historia de Usuario:** Como usuario, quiero escanear rápidamente y encontrar información específica en los detalles del lead, para poder trabajar de manera más eficiente.

#### Criterios de Aceptación

1. EL Sistema DEBERÁ usar pares etiqueta-valor consistentes con distinción visual clara
2. EL Sistema DEBERÁ usar indicadores de iconos apropiados para información de contacto (Phone, MapPin, etc.)
3. EL Sistema DEBERÁ usar espacios en blanco efectivamente para separar diferentes piezas de información
4. EL Sistema DEBERÁ usar pesos de fuente para enfatizar valores importantes (font-medium, font-semibold)
5. EL Sistema DEBERÁ mantener una jerarquía visual clara desde títulos de sección hasta etiquetas de campo hasta valores
