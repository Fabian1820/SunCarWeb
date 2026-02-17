# Sistema de Comprobantes de Pago en PDF

## Descripción

Sistema para generar comprobantes de pago en formato PDF con dos copias en una sola hoja (una para el cliente y otra para la empresa), siguiendo el formato oficial de Suncar.

## Características

### Formato del PDF
- **Orientación**: Vertical (Portrait)
- **Tamaño**: Carta (Letter - 215.9 x 279.4 mm)
- **Copias**: 2 comprobantes idénticos por hoja
  - Comprobante superior: Para el cliente
  - Línea de corte con tijeras (✂)
  - Comprobante inferior: Para la empresa

### Información Incluida

#### Encabezado
- **Título**: "Recibo de Pago"
- **Empresa**: Empresa Solar Carros "Suncar"
- **Dirección**: Calle 24 #109 e/ 1ra y 3ra, Playa La Habana, Cuba

#### Datos del Pago
1. **Fecha**: Fecha del pago
2. **Entregado por**: Nombre del cliente/lead o pagador
3. **CI**: Carnet de identidad
4. **Concepto**: Instalación y montaje de [nombre completo de la oferta]
   - Número de oferta debajo
5. **Monto Total**: Precio final de la oferta
6. **Monto Pagado**: Cantidad pagada en la moneda original
7. **Moneda**: Moneda utilizada (solo si no es USD)
8. **Tasa de Cambio**: Conversión a USD (solo si no es USD)
   - Formato: 1 [MONEDA] = X.XXXX USD
9. **Equivalente USD**: Monto convertido (solo si no es USD)
10. **Desglose de Billetes**: Detalle de denominaciones (solo para efectivo)
11. **Forma de Pago**: Efectivo / Transferencia Bancaria / Pago en Línea
12. **Recibido por**: Nombre de quien recibió (solo para efectivo)
13. **Monto Pendiente**: Saldo restante por pagar

#### Pie de Página
- Nota: "Comprobante emitido desde Oficina General de Suncar."
- Líneas de firma:
  - Izquierda: "Firma del Cliente"
  - Derecha: "Firma del Representante de la Empresa"

## Ubicación de los Botones

### 1. Vista "Todos los Pagos" (Tabla Plana)
- Columna "Acciones" con botón de icono
- Icono: 📄 (FileText)
- Al hacer clic: Genera y descarga el PDF inmediatamente

### 2. Vista "Pagos por Ofertas" (Tabla Expandible)
- Dentro de cada tarjeta de pago expandida
- Botón completo con texto: "Exportar Comprobante"
- Ubicado al final de los detalles del pago

## Ejemplo de Comprobante

```
┌─────────────────────────────────────────────────┐
│              Recibo de Pago                     │
│                                                 │
│  Empresa Solar Carros "Suncar"                  │
│  Dirección: Calle 24 #109 e/ 1ra y 3ra,        │
│             Playa La Habana, Cuba               │
│                                                 │
│  Fecha: 17/02/2026                              │
│  Entregado por: Juan Pérez García               │
│  CI: 12345678901                                │
│                                                 │
│  Concepto: Instalación y montaje de Sistema    │
│            Solar 5kW con Inversor Deye          │
│            Oferta: OF-20260217-001              │
│                                                 │
│  Monto Total: 5,000.00 USD                      │
│  Monto Pagado: 1,000.00 EUR                     │
│  Moneda: EUR                                    │
│  Tasa de Cambio: 1 EUR = 1.1400 USD            │
│  Equivalente USD: 1,140.00 USD                  │
│                                                 │
│  Desglose de Billetes:                          │
│    5 x 200 EUR = 1,000.00                       │
│                                                 │
│  Forma de Pago: Efectivo                        │
│  Recibido por: María López                      │
│  Monto Pendiente: 3,860.00 USD                  │
│                                                 │
│  Comprobante emitido desde Oficina General      │
│  de Suncar.                                     │
│                                                 │
│  _______________        _______________         │
│  Firma del Cliente      Firma del Representante│
│                         de la Empresa           │
└─────────────────────────────────────────────────┘
- - - - - - - - - ✂ - - - - - - - - - - - - - - -
┌─────────────────────────────────────────────────┐
│  (Copia idéntica para la empresa)              │
└─────────────────────────────────────────────────┘
```

## Uso

```typescript
import { ExportComprobanteService } from '@/lib/services/feats/pagos/export-comprobante-service'

// Generar comprobante
ExportComprobanteService.generarComprobantePDF({
  pago: pagoData,
  oferta: {
    numero_oferta: 'OF-20260217-001',
    nombre_completo: 'Sistema Solar 5kW con Inversor Deye',
    precio_final: 5000
  },
  contacto: {
    nombre: 'Juan Pérez García',
    carnet: '12345678901',
    telefono: '+53 5 1234567',
    direccion: 'Calle 123, Habana'
  }
})
```

## Nombre del Archivo

Formato: `Comprobante_Pago_[NUMERO_OFERTA]_[FECHA].pdf`

Ejemplo: `Comprobante_Pago_OF-20260217-001_2026-02-17.pdf`

## Características Especiales

### Manejo de Monedas
- **USD**: No muestra tasa de cambio (es 1:1)
- **EUR/CUP/Otras**: Muestra:
  - Monto en moneda original
  - Tasa de cambio con 4 decimales
  - Equivalente en USD

### Desglose de Billetes
- Solo se muestra para pagos en efectivo
- Ordenado de mayor a menor denominación
- Formato: `[cantidad] x [denominación] [moneda] = [total]`

### Cálculo de Monto Pendiente
```
Monto Pendiente = Precio Final - Monto Pagado en USD
```

## Archivos Relacionados

- `lib/services/feats/pagos/export-comprobante-service.ts` - Servicio de exportación
- `components/feats/pagos/todos-pagos-planos-table.tsx` - Tabla con botón de exportar
- `components/feats/pagos/todos-pagos-table.tsx` - Tabla expandible con botón
