# API - Ofertas con Pagos

## Descripción

Endpoint para obtener todas las ofertas que tienen pagos registrados, con la lista completa de pagos por oferta y los datos del cliente/lead asociado.

Cada oferta en la respuesta incluye sus datos básicos, la lista de todos sus pagos, el total pagado y la información del contacto.

## Endpoint

```
GET /api/pagos/ofertas-con-pagos
```

## Autenticación

Requiere token Bearer en el header `Authorization`.

## Parámetros

No requiere parámetros.

## Respuesta Exitosa

```json
{
  "success": true,
  "message": "Se encontraron 3 ofertas con pagos",
  "data": [
    {
      "oferta_id": "698fa64ddcb41acb25baf168",
      "numero_oferta": "OF-20260213-020",
      "nombre_automatico": "I-1x8kW, B-1x10kWh",
      "nombre_completo": "Oferta de 1x 8kW Inversor Felicity Solar y 1x 10kWh Batería Felicity Solar",
      "tipo_oferta": "personalizada",
      "estado": "confirmada_por_cliente",
      "precio_final": 4980.0,
      "monto_pendiente": 2480.0,
      "almacen_id": "69652dcdd497588c86da669d",
      "almacen_nombre": "Almacén Central",
      "pagos": [
        {
          "id": "699491aef2317f5aeb8eb216",
          "oferta_id": "698fa64ddcb41acb25baf168",
          "monto": 2500.0,
          "fecha": "2026-02-03T00:00:00",
          "tipo_pago": "anticipo",
          "metodo_pago": "efectivo",
          "moneda": "USD",
          "tasa_cambio": 1.0,
          "monto_usd": 2500.0,
          "pago_cliente": true,
          "nombre_pagador": null,
          "carnet_pagador": null,
          "comprobante_transferencia": null,
          "recibido_por": "Alena",
          "desglose_billetes": {
            "100": 25
          },
          "creado_por": null,
          "fecha_creacion": "2026-02-17T16:05:02.540000",
          "fecha_actualizacion": "2026-02-17T16:05:02.540000",
          "notas": null
        }
      ],
      "total_pagado": 2500.0,
      "cantidad_pagos": 1,
      "contacto": {
        "nombre": "Roberto Pino Garcia",
        "telefono": "+53 5 2826474",
        "carnet": "12345678901",
        "direccion": "Calle Omoa # 290 e/ San Joaquín y Romay, Cerro",
        "codigo": "F030400218",
        "tipo_contacto": "cliente"
      }
    },
    {
      "oferta_id": "65f9876543210fedcba98765",
      "numero_oferta": "OF-20260210-005",
      "nombre_automatico": "I-1x3kW, B-1x5kWh",
      "nombre_completo": "Sistema Solar 3kW con Inversor Deye SUN-3K-SG04LP3",
      "tipo_oferta": "personalizada",
      "estado": "confirmada_por_cliente",
      "precio_final": 3500.0,
      "monto_pendiente": 1500.0,
      "almacen_id": "almacen_002",
      "almacen_nombre": "Almacén Santiago",
      "pagos": [
        {
          "id": "20260214-001",
          "oferta_id": "65f9876543210fedcba98765",
          "monto": 1000.0,
          "fecha": "2026-02-14T15:45:00Z",
          "tipo_pago": "anticipo",
          "metodo_pago": "efectivo",
          "moneda": "USD",
          "tasa_cambio": 1.0,
          "monto_usd": 1000.0,
          "pago_cliente": false,
          "nombre_pagador": "Pedro Martínez",
          "carnet_pagador": "11223344556",
          "comprobante_transferencia": null,
          "recibido_por": "María López",
          "desglose_billetes": {
            "100": 3,
            "50": 2,
            "20": 10,
            "10": 5,
            "5": 10
          },
          "notas": "Pago en efectivo recibido en oficina, pagó un familiar",
          "creado_por": "admin@suncar.com",
          "fecha_creacion": "2026-02-14T15:45:00Z",
          "fecha_actualizacion": "2026-02-14T15:45:00Z"
        },
        {
          "id": "20260215-002",
          "oferta_id": "65f9876543210fedcba98765",
          "monto": 1000.0,
          "fecha": "2026-02-15T10:30:00Z",
          "tipo_pago": "pendiente",
          "metodo_pago": "transferencia_bancaria",
          "moneda": "USD",
          "tasa_cambio": 1.0,
          "monto_usd": 1000.0,
          "pago_cliente": true,
          "nombre_pagador": null,
          "carnet_pagador": null,
          "comprobante_transferencia": "https://minio.example.com/pagos-comprobantes/comprobante.jpg",
          "recibido_por": null,
          "desglose_billetes": null,
          "notas": "Segundo pago por transferencia",
          "creado_por": "admin@suncar.com",
          "fecha_creacion": "2026-02-15T10:30:00Z",
          "fecha_actualizacion": "2026-02-15T10:30:00Z"
        }
      ],
      "total_pagado": 2000.0,
      "cantidad_pagos": 2,
      "contacto": {
        "nombre": "Ana Rodríguez",
        "telefono": "53987654",
        "carnet": "98765432109",
        "direccion": "Avenida 789, Santiago de Cuba",
        "codigo": "65f1234567890abcdef99999",
        "tipo_contacto": "lead"
      }
    }
  ],
  "total": 3
}
```

## Estructura de Datos

### Nivel Principal (Oferta)
- **oferta_id**: ID único de la oferta
- **numero_oferta**: Número de oferta (formato: OF-YYYYMMDD-XXX)
- **nombre_automatico**: Nombre corto de la oferta
- **nombre_completo**: Nombre descriptivo completo
- **tipo_oferta**: Tipo (`generica` o `personalizada`)
- **estado**: Estado actual de la oferta
- **precio_final**: Precio total de la oferta
- **monto_pendiente**: Monto que falta por pagar
- **almacen_id**: ID del almacén
- **almacen_nombre**: Nombre del almacén
- **pagos**: Array con todos los pagos de la oferta
- **total_pagado**: Suma total de todos los pagos en USD
- **cantidad_pagos**: Número de pagos registrados
- **contacto**: Objeto con datos del cliente/lead

### Array "pagos" (Pagos de la Oferta)
Cada elemento del array contiene:
- **id**: ID único del pago
- **oferta_id**: ID de la oferta asociada
- **monto**: Monto del pago en la moneda especificada
- **fecha**: Fecha y hora del pago
- **tipo_pago**: Tipo (`anticipo` o `pendiente`)
- **metodo_pago**: Método (`efectivo`, `transferencia_bancaria`, `stripe`)
- **moneda**: Moneda del pago (`USD`, `EUR`, `CUP`, `MLC`)
- **tasa_cambio**: Tasa de cambio con respecto al USD
- **monto_usd**: Monto equivalente en USD
- **pago_cliente**: Booleano (true si paga el cliente, false si paga un tercero)
- **nombre_pagador**: Nombre de quien realiza el pago (si es tercero)
- **carnet_pagador**: Carnet de quien realiza el pago (si es tercero)
- **comprobante_transferencia**: URL del comprobante (para transferencias/Stripe)
- **recibido_por**: Nombre de quien recibió el pago (para efectivo)
- **desglose_billetes**: Objeto con desglose de billetes (para efectivo)
- **notas**: Notas adicionales
- **creado_por**: Usuario que registró el pago
- **fecha_creacion**: Fecha de creación del registro
- **fecha_actualizacion**: Fecha de última actualización

### Objeto "contacto" (Cliente/Lead)
- **nombre**: Nombre completo del cliente/lead
- **telefono**: Número de teléfono
- **carnet**: Carnet de identidad
- **direccion**: Dirección completa
- **codigo**: Número de cliente o ID de lead
- **tipo_contacto**: Tipo (`cliente`, `lead`, o `lead_sin_agregar`)

## Casos de Uso

1. **Vista de facturación**: Mostrar todas las ofertas con pagos en una tabla
2. **Dashboard financiero**: Ver ingresos agrupados por oferta
3. **Seguimiento de cobranza**: Identificar ofertas con pagos pendientes
4. **Historial de pagos**: Ver todos los pagos de cada oferta
5. **Reportes**: Generar reportes de ingresos por oferta

## Ordenamiento

Las ofertas se devuelven ordenadas por la fecha del pago más reciente (más reciente primero).

## Ejemplo de Uso

```bash
# Obtener todas las ofertas con pagos
curl -X GET "http://localhost:8000/api/pagos/ofertas-con-pagos" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Ejemplo de Uso en Frontend (TypeScript)

```typescript
interface Pago {
  id: string;
  oferta_id: string;
  monto: number;
  fecha: string;
  tipo_pago: 'anticipo' | 'pendiente';
  metodo_pago: 'efectivo' | 'transferencia_bancaria' | 'stripe';
  moneda: string;
  tasa_cambio: number;
  monto_usd: number;
  pago_cliente: boolean;
  nombre_pagador: string | null;
  carnet_pagador: string | null;
  comprobante_transferencia: string | null;
  recibido_por: string | null;
  desglose_billetes: Record<string, number> | null;
  notas: string | null;
  creado_por: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface Contacto {
  nombre: string | null;
  telefono: string | null;
  carnet: string | null;
  direccion: string | null;
  codigo: string | null;
  tipo_contacto: 'cliente' | 'lead' | 'lead_sin_agregar' | null;
}

interface OfertaConPagos {
  oferta_id: string;
  numero_oferta: string;
  nombre_automatico: string;
  nombre_completo: string;
  tipo_oferta: string;
  estado: string;
  precio_final: number;
  monto_pendiente: number;
  almacen_id: string;
  almacen_nombre: string | null;
  pagos: Pago[];
  total_pagado: number;
  cantidad_pagos: number;
  contacto: Contacto;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: OfertaConPagos[];
  total: number;
}

// Función para obtener ofertas con pagos
async function getOfertasConPagos(): Promise<OfertaConPagos[]> {
  const response = await fetch('http://localhost:8000/api/pagos/ofertas-con-pagos', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error('Error al obtener ofertas con pagos');
  }
  
  const result: ApiResponse = await response.json();
  return result.data;
}

// Ejemplo de uso en un componente
const ofertas = await getOfertasConPagos();

ofertas.forEach(oferta => {
  console.log(`Oferta: ${oferta.numero_oferta}`);
  console.log(`Cliente: ${oferta.contacto.nombre}`);
  console.log(`Total pagado: $${oferta.total_pagado}`);
  console.log(`Monto pendiente: $${oferta.monto_pendiente}`);
  console.log(`Cantidad de pagos: ${oferta.cantidad_pagos}`);
  
  oferta.pagos.forEach(pago => {
    console.log(`  - Pago ${pago.id}: $${pago.monto_usd} (${pago.metodo_pago})`);
  });
});
```

## Respuesta de Error

```json
{
  "detail": "Error obteniendo ofertas con pagos: [mensaje de error]"
}
```

## Notas Técnicas

- Solo se devuelven ofertas que tienen al menos un pago registrado
- Los pagos están ordenados por fecha dentro de cada oferta
- El campo `total_pagado` es la suma de todos los `monto_usd` de los pagos
- Si una oferta no tiene contacto asociado, los campos del objeto `contacto` serán `null`
- Para ofertas genéricas sin contacto, `tipo_contacto` será `null`

## Diferencia con Otros Endpoints

- **GET /api/pagos**: Devuelve solo los pagos (sin agrupar por oferta)
- **GET /api/pagos/oferta/{oferta_id}**: Devuelve pagos de una oferta específica
- **GET /api/pagos/ofertas-con-pagos**: Devuelve TODAS las ofertas con pagos, agrupadas y con datos del contacto

## Ventajas

1. **Vista centrada en ofertas**: Ideal para ver el estado de pago de cada oferta
2. **Datos agrupados**: Los pagos están organizados por oferta
3. **Información completa**: Incluye oferta, pagos y contacto en una sola llamada
4. **Cálculos automáticos**: Total pagado y cantidad de pagos ya calculados
5. **Eficiente**: Una sola llamada para obtener toda la información necesaria
