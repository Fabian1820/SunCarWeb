# Cambios en Exportación PDF - Descuento y Condiciones de Pago

## Fecha
4 de febrero de 2026

## Problemas Reportados
1. **Caracteres raros en transferencia**: Al exportar las condiciones de pago en PDF, aparecían caracteres extraños al final del texto de "transferencia" (datos de cuenta).
2. **Falta descuento en PDF**: El descuento no se mostraba en el PDF exportado de ofertas confeccionadas.
3. **Condiciones de pago poco claras**: La sección de condiciones de pago no se entendía bien, faltaba claridad visual.

## Soluciones Implementadas

### 1. Arreglo de Caracteres Raros en Transferencia

**Archivo**: `lib/export-service.ts`

**Problema**: La función `doc.splitTextToSize()` de jsPDF no manejaba correctamente caracteres de control especiales (caracteres invisibles en el rango Unicode \u0000-\u001F y \u007F-\u009F) que podían estar presentes en el texto de `datos_cuenta`.

**Solución**: Limpiar el texto antes de procesarlo con `splitTextToSize()`:

```typescript
// ANTES (línea ~788)
const datosLines = doc.splitTextToSize(pago.total || '', pageWidth - 32)

// DESPUÉS
const textoLimpio = (pago.total || '').replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
const datosLines = doc.splitTextToSize(textoLimpio, pageWidth - 32)
```

### 2. Agregado de Descuento en Ofertas Confeccionadas

**Archivo**: `components/feats/ofertas/ofertas-confeccionadas-view.tsx`

**Problema**: El descuento solo se agregaba en `confeccion-ofertas-view.tsx` (crear/editar), pero NO en `ofertas-confeccionadas-view.tsx` (ver ofertas guardadas).

**Solución**: Agregar el descuento en las tres variantes de exportación:

#### Exportación Completa (línea ~547-560)
```typescript
// Agregar descuento si existe
if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
  const montoDescuento = oferta.monto_descuento || 0
  rowsCompleto.push({
    material_codigo: "",
    seccion: "Descuento",
    tipo: "Descuento",
    descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
    cantidad: 1,
    precio_unitario: "",
    porcentaje_margen: "",
    margen: "",
    total: `- ${montoDescuento.toFixed(2)}`,
  })
}
```

#### Exportación Sin Precios (línea ~807-816)
```typescript
// Agregar descuento si existe
if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
  rowsSinPrecios.push({
    material_codigo: "",
    seccion: "Descuento",
    tipo: "Descuento",
    descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
    cantidad: 1,
  })
}
```

#### Exportación Cliente con Precios (línea ~1001-1013)
```typescript
// Agregar descuento si existe
if (oferta.descuento_porcentaje && oferta.descuento_porcentaje > 0) {
  const montoDescuento = oferta.monto_descuento || 0
  rowsClienteConPrecios.push({
    material_codigo: "",
    seccion: "Descuento",
    tipo: "Descuento",
    descripcion: `Descuento aplicado (${oferta.descuento_porcentaje}%)`,
    cantidad: 1,
    total: `- ${montoDescuento.toFixed(2)}`,
  })
}
```

### 3. Mejora Visual de Condiciones de Pago

**Archivo**: `lib/export-service.ts`

**Problema**: La sección de condiciones de pago no era clara, no se entendía qué valor correspondía a qué concepto.

**Solución**: Agregar líneas punteadas entre el concepto y el valor para mejorar la legibilidad.

#### Items con Checkbox (línea ~753-778)
```typescript
// Texto a la izquierda
const textoIzq = pago.descripcion.replace('✓', '•')
doc.text(textoIzq, 12, yPosition)

// Si hay valor a la derecha, agregar línea punteada
if (pago.total) {
  const anchoTextoIzq = doc.getTextWidth(textoIzq)
  const xInicio = 12 + anchoTextoIzq + 3
  const xFin = pageWidth - 12 - doc.getTextWidth(pago.total) - 3
  
  // Dibujar línea punteada
  doc.setLineDash([1, 2])
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(xInicio, yPosition - 1, xFin, yPosition - 1)
  doc.setLineDash([]) // Resetear a línea sólida
  
  // Valor a la derecha
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.text(pago.total, pageWidth - 12, yPosition, { align: 'right' })
}
```

#### Info Regular (Moneda de pago, etc.) (línea ~780-803)
Similar al anterior, con línea punteada entre concepto y valor.

#### Monto de Contribución (línea ~815-838)
Con línea punteada indentada para mostrar que es un sub-item.

#### Conversión de Moneda (línea ~845-868)
Con línea punteada más gruesa para destacar el resultado final.

## Ejemplo Visual Mejorado

### Antes:
```
✓ Pago por transferencia
Moneda de pago                    Euros (EUR)
Precio en EUR                     1234.56 €
```

### Después:
```
• Pago por transferencia
Moneda de pago ................... Euros (EUR)
Precio en EUR .................... 1234.56 €
```

## Formato del Descuento en PDF

El descuento se muestra:
- **Posición**: Después de transportación y antes del total final
- **Formato**: Texto en negrita con color rojo (RGB: 220, 38, 38) para destacarlo
- **Contenido**: 
  - Descripción: "Descuento aplicado (X%)"
  - Monto: "- $XXX.XX" (con signo negativo)

## Ejemplo Visual Completo

```
Servicio de instalación                    $500.00
Transportación                              $50.00
Descuento aplicado (10%)                   -$55.00  ← NUEVO (en rojo)
─────────────────────────────────────────────────
Precio Final                               $495.00

CONDICIONES DE PAGO
═══════════════════════════════════════════════
• Pago por transferencia
  Datos de la cuenta:
    Banco: XXX
    Titular: YYY
    Cuenta: ZZZ
    
Moneda de pago ................... Euros (EUR)
  1 EUR = 1.10 USD
Precio en EUR .................... 450.00 €
```

## Archivos Modificados

1. `lib/export-service.ts`: 
   - Arreglo de caracteres raros en datos de cuenta
   - Agregado de procesamiento de descuento en PDF
   - Mejora visual con líneas punteadas en condiciones de pago

2. `components/feats/ofertas/ofertas-confeccionadas-view.tsx`:
   - Agregado de descuento en exportación completa
   - Agregado de descuento en exportación sin precios
   - Agregado de descuento en exportación cliente con precios

## Verificación

Para verificar los cambios:

1. **Descuento**: 
   - Abrir una oferta confeccionada que tenga descuento
   - Exportar a PDF (cualquier variante)
   - Verificar que aparece en rojo después de transportación

2. **Transferencia**:
   - Abrir una oferta con pago por transferencia
   - Verificar que los datos de cuenta no tienen caracteres raros

3. **Condiciones de pago**:
   - Exportar una oferta con condiciones de pago
   - Verificar que hay líneas punteadas entre conceptos y valores
   - Verificar que se entiende claramente qué valor corresponde a qué

## Notas Técnicas

- El descuento se procesa solo si `descuento_porcentaje > 0`
- El formato del monto incluye el signo negativo: `- $XXX.XX`
- El color rojo ayuda a identificar visualmente el descuento
- La limpieza de caracteres de control previene problemas de encoding en PDFs
- Las líneas punteadas usan `doc.setLineDash([1, 2])` para crear el efecto visual
- Se resetea a línea sólida con `doc.setLineDash([])` después de cada uso
