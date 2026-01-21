# Sistema de Recibos de Caja Registradora

## Descripción General

El sistema de recibos genera automáticamente comprobantes de pago profesionales en formato PDF cuando se completa una venta en la caja registradora. Los recibos se guardan automáticamente en una carpeta que el usuario selecciona al abrir la sesión de caja.

## Características Principales

### Guardado Automático en Carpeta Personalizada
- **Selección de carpeta al abrir caja**: Al iniciar una sesión de caja, el sistema solicita seleccionar una carpeta donde se guardarán todos los recibos
- **Guardado automático**: Cada vez que se completa una venta, el recibo se guarda automáticamente en la carpeta seleccionada
- **Sin interrupciones**: El proceso es completamente automático, sin ventanas emergentes ni diálogos de descarga
- **Nombres únicos**: Los archivos se nombran automáticamente con formato: `recibo_[numero-orden]_[fecha]_[hora].pdf`

### Compatibilidad con Navegadores
- **Chrome/Edge**: Soporte completo con File System Access API
- **Otros navegadores**: Descarga automática en carpeta de descargas predeterminada
- **Detección automática**: El sistema detecta si el navegador soporta la selección de carpetas

### Formato Profesional
- **Diseño similar a recibos reales**: Formato optimizado para impresoras térmicas de 80mm
- **Información completa**: Todos los datos de la transacción incluidos

### Información Incluida

El recibo contiene toda la información relevante de la transacción:

#### Encabezado
- Nombre de la tienda
- NIT (si está configurado)
- Dirección de la tienda
- Teléfono de contacto

#### Información de la Orden
- Número de orden
- ID de pago (primeros 8 caracteres)
- Fecha de emisión
- Hora de emisión

#### Datos del Cliente (opcional)
- **Cliente de Instaladora**: Si el cliente es de instaladora, se muestra este título destacado
- Nombre del cliente
- CI (Carnet de Identidad)
- Teléfono

**Nota**: Cuando el cliente es de instaladora (seleccionado desde el sistema), el recibo muestra "Cliente de Instaladora" como título, seguido del nombre completo, CI y teléfono obtenidos automáticamente del registro del cliente.

#### Productos
Tabla detallada con:
- Descripción del producto
- Cantidad
- Precio unitario
- Subtotal por producto

#### Totales
- Subtotal
- Descuento (si aplica) con porcentaje
- Impuestos con porcentaje
- **Total a pagar** (destacado)

#### Método de Pago
Según el método seleccionado:

**Efectivo:**
- Monto recibido
- Cambio (si aplica)

**Tarjeta/Transferencia:**
- Número de referencia/autorización

#### Pie de Página
- Mensaje de agradecimiento
- Nota sobre conservar el recibo

## Uso

### Configuración Inicial (Al Abrir Caja)

1. **Abrir sesión de caja**:
   - Ingresa el efectivo de apertura
   - Agrega notas si es necesario
   - Click en "Abrir caja registradora"

2. **Seleccionar carpeta de recibos**:
   - Aparece automáticamente un diálogo para seleccionar carpeta
   - Click en "Seleccionar carpeta"
   - Navega y selecciona la carpeta donde quieres guardar los recibos
   - El navegador solicitará permisos para escribir en esa carpeta
   - Click en "Continuar"

3. **Alternativa - Omitir selección**:
   - Si prefieres no seleccionar carpeta, click en "Omitir"
   - Los recibos se descargarán en tu carpeta de descargas predeterminada

### Guardado Automático de Recibos

Una vez configurada la carpeta:
1. Realiza una venta normalmente en el POS
2. Procesa el pago
3. **El recibo se guarda automáticamente** en la carpeta seleccionada
4. Recibes una notificación confirmando que el recibo se guardó
5. El archivo aparece inmediatamente en la carpeta

### Descargar Recibos Manualmente

Desde el diálogo de "Órdenes":
1. Click en el botón "Órdenes" en la barra superior
2. Selecciona una orden pagada
3. Opciones disponibles:
   - **Botón "Descargar"** en la tabla: Descarga el PDF
   - **Botón "Descargar"** en el panel de detalle: Descarga el PDF
   - **Botón "Imprimir"** en el panel de detalle: Abre ventana de impresión

## Implementación Técnica

### File System Access API

El sistema utiliza la File System Access API moderna de los navegadores para:
- Solicitar acceso a una carpeta específica del sistema de archivos
- Guardar archivos directamente sin diálogos de descarga
- Mantener permisos durante la sesión

```typescript
// Seleccionar carpeta
const directorio = await window.showDirectoryPicker({
  mode: 'readwrite',
  startIn: 'downloads',
});

// Guardar archivo
const fileHandle = await directorio.getFileHandle(nombreArchivo, { create: true });
const writable = await fileHandle.createWritable();
await writable.write(pdfBlob);
await writable.close();
```

### Servicio de Recibos
Ubicación: `lib/services/feats/caja/recibo-service.ts`

#### Métodos Principales

```typescript
// Seleccionar carpeta para guardar recibos
ReciboService.seleccionarCarpetaRecibos(): Promise<FileSystemDirectoryHandle | null>

// Guardar recibo automáticamente en carpeta seleccionada
ReciboService.guardarReciboAutomatico(data: ReciboData): Promise<void>

// Verificar si hay carpeta seleccionada
ReciboService.tieneCarpetaSeleccionada(): boolean

// Verificar soporte del navegador
ReciboService.soportaSeleccionCarpeta(): boolean

// Limpiar carpeta seleccionada
ReciboService.limpiarCarpetaRecibos(): void

// Generar recibo (retorna objeto jsPDF)
ReciboService.generarRecibo(data: ReciboData): jsPDF

// Descargar recibo como PDF (método tradicional)
ReciboService.descargarRecibo(data: ReciboData): void

// Imprimir recibo (abre ventana de impresión)
ReciboService.imprimirRecibo(data: ReciboData): void
```

#### Datos Requeridos

```typescript
interface ReciboData {
  orden: OrdenCompra;           // Orden completa con items y pagos
  nombreTienda?: string;        // Nombre de la tienda
  direccionTienda?: string;     // Dirección física
  telefonoTienda?: string;      // Teléfono de contacto
  nitTienda?: string;           // NIT de la empresa
}
```

### Integración en POS

El componente `pos-view.tsx` integra automáticamente el sistema:

```typescript
// Después de procesar el pago exitosamente
const resultadoPago = await procesarPago(...)

// Guardar recibo automáticamente
if (ReciboService.tieneCarpetaSeleccionada()) {
  await ReciboService.guardarReciboAutomatico({
    orden: resultadoPago.orden,
    nombreTienda: tiendaActual?.nombre,
    direccionTienda: tiendaActual?.direccion,
    telefonoTienda: tiendaActual?.telefono,
  })
} else {
  // Descarga tradicional si no hay carpeta
  ReciboService.descargarRecibo(...)
}
```

### Componente de Selección de Carpeta

Ubicación: `components/feats/inventario/seleccionar-carpeta-recibos-dialog.tsx`

Diálogo que se muestra al abrir la caja para configurar la carpeta de recibos:
- Detecta soporte del navegador
- Solicita permisos de escritura
- Muestra confirmación visual
- Permite omitir la configuración

## Librerías Utilizadas

- **jsPDF**: Generación de documentos PDF
- **jspdf-autotable**: Tablas automáticas en PDF

Ambas librerías ya están instaladas en el proyecto.

## Personalización

### Modificar el Diseño

Para personalizar el diseño del recibo, edita el archivo:
`lib/services/feats/caja/recibo-service.ts`

Elementos personalizables:
- Tamaño del papel (actualmente 80mm x 297mm)
- Fuentes y tamaños de texto
- Espaciado entre secciones
- Colores y estilos
- Logo de la empresa (agregar imagen)

### Agregar Logo

Para agregar un logo a los recibos:

```typescript
// En el método generarRecibo, después del encabezado:
const logoUrl = '/logo.png'; // Ruta del logo
doc.addImage(logoUrl, 'PNG', x, y, width, height);
```

## Consideraciones

### Compatibilidad de Navegadores

**Navegadores con soporte completo (File System Access API):**
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+

**Navegadores con descarga tradicional:**
- ⚠️ Firefox (descarga en carpeta de descargas)
- ⚠️ Safari (descarga en carpeta de descargas)
- ⚠️ Navegadores móviles (descarga tradicional)

### Permisos

- El navegador solicitará permisos para escribir en la carpeta seleccionada
- Los permisos se mantienen durante la sesión del navegador
- Si cierras el navegador, deberás volver a seleccionar la carpeta
- Puedes revocar permisos desde la configuración del navegador

### Nombres de Archivo

Los recibos se guardan con el siguiente formato:
```
recibo_20260121-001_20260121_143045.pdf
       └─ número orden  └─ fecha  └─ hora
```

Esto garantiza:
- Nombres únicos sin colisiones
- Fácil identificación del recibo
- Ordenamiento cronológico automático

### Seguridad

- El sistema solo puede escribir en la carpeta que el usuario seleccionó explícitamente
- No tiene acceso a otras carpetas del sistema
- Los permisos son temporales y se pueden revocar en cualquier momento
- El navegador muestra claramente qué carpeta tiene acceso

## Flujo Completo

1. **Usuario agrega productos** a la orden en el POS
2. **Usuario hace click en "Pago"**
3. **Sistema muestra diálogo de pago** con opciones de método
4. **Usuario selecciona método** y completa información
5. **Sistema procesa el pago** en el backend
6. **Backend actualiza stock** y registra la venta
7. **Sistema genera recibo** automáticamente
8. **Ventana de impresión se abre** con el recibo
9. **Usuario imprime** el recibo para el cliente
10. **Stock se actualiza** en la interfaz sin refrescar

## Solución de Problemas

### El recibo no se imprime automáticamente
- Verifica que las ventanas emergentes estén permitidas
- Revisa la consola del navegador por errores
- Intenta usar el botón "Imprimir" manual desde el diálogo de órdenes

### Formato incorrecto
- Verifica que la impresora esté configurada para 80mm
- Ajusta el tamaño del papel en la configuración de impresión
- Modifica el ancho en `recibo-service.ts` si es necesario

### Falta información
- Verifica que la orden tenga todos los datos necesarios
- Asegúrate de que los datos del cliente se capturen correctamente
- Revisa que los items tengan descripción y precios

## Mejoras Futuras

- [ ] Agregar código QR con información de la orden
- [ ] Soporte para múltiples idiomas
- [ ] Guardar recibos en el backend automáticamente
- [ ] Enviar recibo por email al cliente
- [ ] Enviar recibo por WhatsApp
- [ ] Agregar logo de la empresa
- [ ] Soporte para diferentes tamaños de papel
- [ ] Plantillas personalizables por tienda
- [ ] Estadísticas de recibos generados
