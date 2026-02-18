# API: Ofertas Personalizadas con Pagos

## Descripción General

Endpoint optimizado que devuelve todas las ofertas personalizadas confeccionadas que tienen pagos registrados, incluyendo información completa del contacto (cliente o lead), comercial asignado, detalles financieros y pagos.

## Endpoint

```
GET /api/ofertas/confeccion/personalizadas-con-pagos
```

## Características

### Optimización
- Consulta única usando agregación de MongoDB
- Joins optimizados con `$lookup` para clientes, leads y pagos
- Sin consultas N+1
- Proyección de campos específicos para reducir transferencia de datos
- Ordenamiento por fecha del primer pago (más reciente primero)

### Datos Incluidos

1. **Información de la Oferta**
   - ID y número de oferta
   - Nombre automático y nombre completo
   - Total de materiales
   - Precio final
   - Monto pendiente

2. **Datos del Contacto**
   - Tipo: cliente, lead o lead_sin_agregar
   - Número/ID
   - Nombre
   - Teléfono
   - Dirección
   - Comercial asignado

3. **Cálculos de Margen**
   - Margen en porcentaje (%) sobre total de materiales
   - Margen en dólares ($)

4. **Información de Pagos**
   - Lista completa de pagos con todos sus detalles
   - Total pagado (suma de monto_usd)
   - Fecha del primer pago registrado

## Request

### Headers
```
Authorization: Bearer <token>
```

### Query Parameters
Ninguno

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "15 ofertas personalizadas con pagos encontradas",
  "data": [
    {
      "id": "65f1234567890abcdef12345",
      "numero_oferta": "OF-20240115-001",
      "nombre_automatico": "Inversor 5kW + Batería 10kWh",
      "nombre_completo": "Sistema Solar Híbrido 5kW con Batería 10kWh",
      "total_materiales": 5000.00,
      "margen_porcentaje": 25.5,
      "margen_dolares": 1275.00,
      "precio_final": 6275.00,
      "monto_pendiente": 2000.00,
      "fecha_creacion": "2024-01-15T08:30:00Z",
      "contacto": {
        "tipo": "cliente",
        "numero": "C-001",
        "nombre": "Juan Pérez",
        "telefono": "53123456",
        "direccion": "Calle 23 #456, La Habana",
        "comercial": "María González"
      },
      "pagos_data": [
        {
          "id": "65f9876543210fedcba98765",
          "oferta_id": "65f1234567890abcdef12345",
          "monto": 2000.00,
          "monto_usd": 2000.00,
          "moneda": "USD",
          "tasa_cambio": 1.0,
          "fecha": "2024-01-10T10:00:00Z",
          "tipo_pago": "anticipo",
          "metodo_pago": "transferencia_bancaria",
          "pago_cliente": true,
          "nombre_pagador": "Juan Pérez",
          "comprobante_transferencia": "https://...",
          "notas": "Primer pago del sistema"
        },
        {
          "id": "65f9876543210fedcba98766",
          "oferta_id": "65f1234567890abcdef12345",
          "monto": 2275.00,
          "monto_usd": 2275.00,
          "moneda": "USD",
          "tasa_cambio": 1.0,
          "fecha": "2024-01-20T14:30:00Z",
          "tipo_pago": "pendiente",
          "metodo_pago": "efectivo",
          "pago_cliente": true,
          "nombre_pagador": "Juan Pérez",
          "recibido_por": "Carlos Rodríguez",
          "desglose_billetes": {
            "100": 20,
            "50": 5,
            "20": 1,
            "5": 1
          },
          "notas": "Segundo pago en efectivo"
        }
      ],
      "total_pagado": 4275.00,
      "fecha_primer_pago": "2024-01-10T10:00:00Z"
    }
  ]
}
```

### Tipos de Contacto

#### Cliente
```json
{
  "tipo": "cliente",
  "numero": "C-001",
  "nombre": "Juan Pérez",
  "telefono": "53123456",
  "direccion": "Calle 23 #456, La Habana",
  "comercial": "María González"
}
```

#### Lead
```json
{
  "tipo": "lead",
  "numero": "65f1234567890abcdef12345",
  "nombre": "Ana García",
  "telefono": "53987654",
  "direccion": "Ave 5ta #789, Vedado",
  "comercial": "Pedro Martínez"
}
```

#### Lead Sin Agregar
```json
{
  "tipo": "lead_sin_agregar",
  "nombre": "Cliente Temporal",
  "numero": null,
  "telefono": null,
  "direccion": null,
  "comercial": null
}
```

### Error Responses

#### 401 Unauthorized
```json
{
  "detail": "No autorizado"
}
```

#### 500 Internal Server Error
```json
{
  "detail": "Error obteniendo ofertas personalizadas con pagos: <mensaje de error>"
}
```

## Cálculo del Margen

### Margen en Porcentaje
```
margen_porcentaje = (margen_materiales / total_materiales) * 100
```

Ejemplo:
- Total materiales: $5,000
- Margen materiales: $1,275
- Margen porcentaje: (1,275 / 5,000) * 100 = 25.5%

### Margen en Dólares
```
margen_dolares = margen_materiales
```

El margen en dólares es directamente el campo `margen_materiales` de la oferta.

## Ordenamiento

Las ofertas se ordenan por `fecha_primer_pago` en orden descendente (más reciente primero).

## Casos de Uso

### 1. Dashboard de Ventas
Mostrar todas las ofertas personalizadas que han recibido pagos con su estado financiero actual.

### 2. Seguimiento de Cobros
Identificar ofertas con saldo pendiente y su historial de pagos.

### 3. Análisis de Márgenes
Evaluar los márgenes aplicados en ofertas personalizadas y su rentabilidad.

### 4. Gestión de Comerciales
Ver qué comerciales tienen ofertas con pagos y su desempeño.

### 5. Reportes Financieros
Generar reportes de ingresos por ofertas personalizadas.

## Notas Técnicas

### Pipeline de Agregación MongoDB

```javascript
[
  // 1. Filtrar ofertas personalizadas con pagos
  {
    $match: {
      tipo_oferta: "personalizada",
      pagos: { $exists: true, $ne: [], $not: { $size: 0 } }
    }
  },
  
  // 2. Join con clientes
  {
    $lookup: {
      from: "clientes",
      localField: "cliente_numero",
      foreignField: "numero",
      as: "cliente_data"
    }
  },
  
  // 3. Join con leads
  {
    $lookup: {
      from: "leads",
      let: { lead_id_str: "$lead_id" },
      pipeline: [
        {
          $match: {
            $expr: { $eq: [{ $toString: "$_id" }, "$$lead_id_str"] }
          }
        }
      ],
      as: "lead_data"
    }
  },
  
  // 4. Join con pagos
  {
    $lookup: {
      from: "pagos",
      let: { oferta_id_str: { $toString: "$_id" } },
      pipeline: [
        {
          $match: {
            $expr: { $eq: ["$oferta_id", "$$oferta_id_str"] }
          }
        },
        { $sort: { fecha: 1 } }
      ],
      as: "pagos_data"
    }
  },
  
  // 5. Proyectar y calcular campos
  {
    $project: {
      // Campos básicos
      _id: 1,
      numero_oferta: 1,
      nombre_automatico: 1,
      nombre_completo: 1,
      total_materiales: 1,
      margen_comercial: 1,
      margen_materiales: 1,
      precio_final: 1,
      monto_pendiente: 1,
      fecha_creacion: 1,
      
      // Datos del contacto (cliente o lead)
      contacto: { /* lógica condicional */ },
      
      // Datos de pagos
      pagos_data: 1,
      fecha_primer_pago: { $arrayElemAt: ["$pagos_data.fecha", 0] },
      total_pagado: { $sum: "$pagos_data.monto_usd" }
    }
  },
  
  // 6. Calcular margen en porcentaje
  {
    $addFields: {
      margen_porcentaje: {
        $cond: {
          if: { $gt: ["$total_materiales", 0] },
          then: {
            $multiply: [
              { $divide: ["$margen_materiales", "$total_materiales"] },
              100
            ]
          },
          else: 0
        }
      },
      margen_dolares: "$margen_materiales"
    }
  },
  
  // 7. Ordenar por fecha del primer pago
  { $sort: { fecha_primer_pago: -1 } }
]
```

### Ventajas de la Implementación

1. **Una sola consulta**: Todo se resuelve en una agregación
2. **Sin N+1**: No hay consultas adicionales por cada oferta
3. **Datos completos**: Incluye toda la información necesaria
4. **Ordenamiento eficiente**: Se hace en la base de datos
5. **Cálculos en BD**: Los cálculos se hacen en MongoDB, no en Python

## Ejemplo de Uso en Frontend

```javascript
// Obtener ofertas personalizadas con pagos
const response = await fetch('/api/ofertas/confeccion/personalizadas-con-pagos', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { data: ofertas } = await response.json();

// Mostrar en tabla
ofertas.forEach(oferta => {
  console.log(`
    Oferta: ${oferta.nombre_completo}
    Cliente: ${oferta.contacto.nombre}
    Comercial: ${oferta.contacto.comercial || 'Sin asignar'}
    Total Materiales: $${oferta.total_materiales.toFixed(2)}
    Margen: ${oferta.margen_porcentaje.toFixed(1)}% ($${oferta.margen_dolares.toFixed(2)})
    Precio Final: $${oferta.precio_final.toFixed(2)}
    Total Pagado: $${oferta.total_pagado.toFixed(2)}
    Pendiente: $${oferta.monto_pendiente.toFixed(2)}
    Primer Pago: ${new Date(oferta.fecha_primer_pago).toLocaleDateString()}
  `);
});
```

## Historial de Cambios

### v1.0.0 (2024-01-15)
- Implementación inicial del endpoint
- Consulta optimizada con agregación de MongoDB
- Soporte para clientes, leads y leads sin agregar
- Cálculo de márgenes en % y $
- Inclusión de datos del comercial asignado
