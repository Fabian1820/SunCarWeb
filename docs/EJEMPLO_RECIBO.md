# Ejemplo Visual de Recibo

Este documento muestra cómo se ve un recibo generado por el sistema.

## Formato del Recibo (80mm de ancho)

```
═══════════════════════════════════════════════════════
                  SUNCAR BOLIVIA
                  NIT: 123456789
           Av. Principal #123, Santa Cruz
                Tel: 555-1234
───────────────────────────────────────────────────────

              RECIBO DE VENTA

Orden:          #20260121-001
ID Pago:        A1B2C3D4
Fecha:          21/01/2026
Hora:           14:30

───────────────────────────────────────────────────────
                     CLIENTE
Juan Pérez García
CI: 1234567 SC
Tel: 555-9876

───────────────────────────────────────────────────────
                    PRODUCTOS

Producto              Cant  P.Unit    Total
─────────────────────────────────────────
Panel Solar 450W        2   $250.00  $500.00
Inversor 5kW            1   $800.00  $800.00
Cable 10mm (metro)     50     $2.50  $125.00
Estructura montaje      1   $150.00  $150.00

───────────────────────────────────────────────────────

Subtotal:                            $1,575.00
Impuestos (16%):                       $252.00
                                     ──────────
TOTAL:                               $1,827.00

═══════════════════════════════════════════════════════
                 MÉTODO DE PAGO
                    EFECTIVO

Recibido:                            $2,000.00
Cambio:                                $173.00

───────────────────────────────────────────────────────

              ¡Gracias por su compra!
        Este documento es un comprobante de pago
                Conserve este recibo

═══════════════════════════════════════════════════════
```

## Variaciones según Método de Pago

### Pago con Tarjeta

```
═══════════════════════════════════════════════════════
                 MÉTODO DE PAGO
                    TARJETA

Referencia:                      AUTH-789456123

───────────────────────────────────────────────────────
```

### Pago con Transferencia

```
═══════════════════════════════════════════════════════
                 MÉTODO DE PAGO
                 TRANSFERENCIA

Referencia:                      TRANS-456789012

───────────────────────────────────────────────────────
```

## Con Descuento

```
───────────────────────────────────────────────────────

Subtotal:                            $1,575.00
Descuento (10%):                      -$157.50
Impuestos (16%):                       $226.80
                                     ──────────
TOTAL:                               $1,644.30

═══════════════════════════════════════════════════════
```

## Cliente Directo (sin datos de instaladora)

```
───────────────────────────────────────────────────────
                     CLIENTE
María López
Tel: 555-4321

───────────────────────────────────────────────────────
```

## Sin Cliente Registrado

```
───────────────────────────────────────────────────────
                    PRODUCTOS
(No se muestra sección de cliente)
───────────────────────────────────────────────────────
```

## Características del Diseño

### Encabezado
- **Nombre de la tienda**: Centrado, negrita, tamaño 14pt
- **Información de contacto**: Centrado, tamaño 8pt
- **Línea separadora**: Grosor 0.3mm

### Información de Orden
- **Título**: "RECIBO DE VENTA" centrado, negrita, 10pt
- **Datos**: Alineados a la izquierda con etiquetas en negrita
- **ID de pago**: Primeros 8 caracteres en mayúsculas

### Tabla de Productos
- **Columnas**: Producto (35mm), Cant (10mm), P.Unit (15mm), Total (15mm)
- **Encabezado**: Fondo gris claro, texto en negrita
- **Contenido**: Tamaño 7pt, padding 1mm
- **Descripción**: Truncada a 25 caracteres si es muy larga

### Totales
- **Subtotal e impuestos**: Tamaño 8pt normal
- **Total**: Tamaño 11pt negrita, destacado
- **Línea separadora**: Grosor 0.5mm antes del total

### Método de Pago
- **Título**: Centrado, negrita
- **Método**: Centrado, mayúsculas
- **Detalles**: Alineados con etiquetas

### Pie de Página
- **Mensaje principal**: Tamaño 7pt
- **Notas**: Tamaño 6pt, texto secundario

## Dimensiones

- **Ancho**: 80mm (estándar para impresoras térmicas)
- **Alto**: Variable según contenido (máximo 297mm)
- **Márgenes**: 5mm a cada lado
- **Área de contenido**: 70mm de ancho

## Optimizaciones

1. **Texto adaptativo**: Las descripciones largas se truncan automáticamente
2. **Espaciado inteligente**: Se ajusta según la cantidad de productos
3. **Secciones opcionales**: Solo se muestran si hay datos disponibles
4. **Formato de moneda**: Siempre con 2 decimales y símbolo $
5. **Fechas localizadas**: Formato español (DD/MM/YYYY)
6. **Horas**: Formato 24 horas (HH:MM)

## Impresión

El recibo está optimizado para:
- **Impresoras térmicas** de 80mm
- **Papel térmico** estándar
- **Sin tinta** requerida
- **Impresión rápida** (< 5 segundos)

## Compatibilidad

- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari
- ✅ Navegadores móviles
- ✅ Impresoras térmicas USB
- ✅ Impresoras térmicas Bluetooth
- ✅ Impresoras láser/inkjet (ajustar tamaño)
