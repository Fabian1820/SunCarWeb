# API de Pendientes de Instalación

## Descripción General

Este endpoint permite obtener en una sola llamada todos los **leads** y **clientes** que tienen el estado **"Pendiente de Instalación"**. Es útil para gestionar y visualizar todos los casos que requieren seguimiento de instalación en un solo lugar.

---

## Endpoint

### GET `/api/pendientes-instalacion/`

Obtiene todos los leads y clientes con estado "Pendiente de Instalación".

#### Autenticación
✅ **Requiere autenticación**: Sí (Bearer Token)

#### Headers
```
Authorization: Bearer <token>
```

#### Parámetros
No requiere parámetros.

---

## Respuesta Exitosa

### Status Code: `200 OK`

### Estructura de la Respuesta

```json
{
  "leads": [
    {
      "id": "string",
      "fecha_contacto": "string",
      "nombre": "string",
      "telefono": "string",
      "telefono_adicional": "string | null",
      "estado": "string",
      "fuente": "string | null",
      "referencia": "string | null",
      "direccion": "string | null",
      "pais_contacto": "string | null",
      "comentario": "string | null",
      "provincia_montaje": "string | null",
      "municipio": "string | null",
      "comercial": "string | null",
      "ofertas": [
        {
          "inversor_codigo": "string | null",
          "inversor_cantidad": "number",
          "inversor_nombre": "string | null",
          "bateria_codigo": "string | null",
          "bateria_cantidad": "number",
          "bateria_nombre": "string | null",
          "panel_codigo": "string | null",
          "panel_cantidad": "number",
          "panel_nombre": "string | null",
          "costo_oferta": "number",
          "costo_extra": "number",
          "costo_transporte": "number",
          "aprobada": "boolean",
          "pagada": "boolean",
          "elementos_personalizados": "string | null",
          "razon_costo_extra": "string | null"
        }
      ],
      "comprobante_pago_url": "string | null",
      "metodo_pago": "string | null",
      "moneda": "string | null"
    }
  ],
  "clientes": [
    {
      "id": "string",
      "numero": "string",
      "nombre": "string",
      "telefono": "string | null",
      "telefono_adicional": "string | null",
      "direccion": "string",
      "fecha_contacto": "string | null",
      "estado": "string | null",
      "falta_instalacion": "string | null",
      "fuente": "string | null",
      "referencia": "string | null",
      "pais_contacto": "string | null",
      "comentario": "string | null",
      "provincia_montaje": "string | null",
      "municipio": "string | null",
      "comercial": "string | null",
      "ofertas": [
        {
          "inversor_codigo": "string | null",
          "inversor_nombre": "string | null",
          "inversor_cantidad": "number",
          "bateria_codigo": "string | null",
          "bateria_nombre": "string | null",
          "bateria_cantidad": "number",
          "panel_codigo": "string | null",
          "panel_nombre": "string | null",
          "panel_cantidad": "number",
          "elementos_personalizados": "string | null",
          "aprobada": "boolean",
          "pagada": "boolean",
          "costo_oferta": "number",
          "costo_extra": "number",
          "costo_transporte": "number",
          "razon_costo_extra": "string | null"
        }
      ],
      "latitud": "string | null",
      "longitud": "string | null",
      "carnet_identidad": "string | null",
      "fecha_instalacion": "string | null",
      "fecha_montaje": "string | null",
      "comprobante_pago_url": "string | null",
      "metodo_pago": "string | null",
      "moneda": "string | null"
    }
  ],
  "total_leads": "number",
  "total_clientes": "number",
  "total_general": "number"
}
```

---

## Ejemplo de Respuesta

```json
{
  "leads": [
    {
      "id": "67890abcdef123456789",
      "fecha_contacto": "15/01/2026",
      "nombre": "Juan Pérez",
      "telefono": "+53 5234 5678",
      "telefono_adicional": null,
      "estado": "Pendiente de Instalación",
      "fuente": "Facebook",
      "referencia": "Campaña Enero 2026",
      "direccion": "Calle 23 #456, Vedado",
      "pais_contacto": "Cuba",
      "comentario": "Cliente interesado en sistema de 5kW",
      "provincia_montaje": "La Habana",
      "municipio": "Plaza de la Revolución",
      "comercial": "María González",
      "ofertas": [
        {
          "inversor_codigo": "INV-5000",
          "inversor_cantidad": 1,
          "inversor_nombre": "Inversor Híbrido 5kW",
          "bateria_codigo": "BAT-200",
          "bateria_cantidad": 2,
          "bateria_nombre": "Batería LiFePO4 200Ah",
          "panel_codigo": "PAN-550",
          "panel_cantidad": 10,
          "panel_nombre": "Panel Solar 550W",
          "costo_oferta": 8500.00,
          "costo_extra": 200.00,
          "costo_transporte": 150.00,
          "aprobada": true,
          "pagada": true,
          "elementos_personalizados": "Incluye estructura de montaje reforzada",
          "razon_costo_extra": "Instalación en techo de tejas"
        }
      ],
      "comprobante_pago_url": "https://storage.example.com/comprobantes/lead_67890.pdf",
      "metodo_pago": "Transferencia bancaria",
      "moneda": "USD"
    }
  ],
  "clientes": [
    {
      "id": "12345abcdef987654321",
      "numero": "2601-0001",
      "nombre": "Ana Rodríguez",
      "telefono": "+53 5345 6789",
      "telefono_adicional": "+53 7876 5432",
      "direccion": "Avenida 5ta #789, Miramar",
      "fecha_contacto": "10/01/2026",
      "estado": "Pendiente de Instalación",
      "falta_instalacion": "Esperando entrega de paneles solares",
      "fuente": "Referido",
      "referencia": "Cliente anterior: Carlos López",
      "pais_contacto": "Cuba",
      "comentario": "Instalación programada para la próxima semana",
      "provincia_montaje": "La Habana",
      "municipio": "Playa",
      "comercial": "Pedro Martínez",
      "ofertas": [
        {
          "inversor_codigo": "INV-8000",
          "inversor_nombre": "Inversor Híbrido 8kW",
          "inversor_cantidad": 1,
          "bateria_codigo": "BAT-300",
          "bateria_nombre": "Batería LiFePO4 300Ah",
          "bateria_cantidad": 3,
          "panel_codigo": "PAN-600",
          "panel_nombre": "Panel Solar 600W",
          "panel_cantidad": 15,
          "elementos_personalizados": "Sistema con monitoreo remoto",
          "aprobada": true,
          "pagada": true,
          "costo_oferta": 12500.00,
          "costo_extra": 500.00,
          "costo_transporte": 0.00,
          "razon_costo_extra": "Sistema de monitoreo adicional"
        }
      ],
      "latitud": "23.1136",
      "longitud": "-82.3666",
      "carnet_identidad": "85010112345",
      "fecha_instalacion": "20/01/2026",
      "fecha_montaje": null,
      "comprobante_pago_url": "https://storage.example.com/comprobantes/cliente_2601-0001.pdf",
      "metodo_pago": "Efectivo",
      "moneda": "USD"
    }
  ],
  "total_leads": 1,
  "total_clientes": 1,
  "total_general": 2
}
```

---

## Campos de Respuesta

### Campos Principales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `leads` | Array | Lista de leads con estado "Pendiente de Instalación" |
| `clientes` | Array | Lista de clientes con estado "Pendiente de Instalación" |
| `total_leads` | Number | Cantidad total de leads pendientes |
| `total_clientes` | Number | Cantidad total de clientes pendientes |
| `total_general` | Number | Suma total de leads + clientes pendientes |

### Campos de Lead

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID único del lead |
| `fecha_contacto` | String | Fecha de primer contacto (formato: DD/MM/YYYY) |
| `nombre` | String | Nombre completo del lead |
| `telefono` | String | Teléfono principal |
| `telefono_adicional` | String \| null | Teléfono secundario (opcional) |
| `estado` | String | Estado del lead (siempre "Pendiente de Instalación") |
| `fuente` | String \| null | Origen del lead (Facebook, Instagram, Referido, etc.) |
| `referencia` | String \| null | Información adicional sobre la fuente |
| `direccion` | String \| null | Dirección del lead |
| `pais_contacto` | String \| null | País de contacto |
| `comentario` | String \| null | Comentarios adicionales |
| `provincia_montaje` | String \| null | Provincia donde se realizará el montaje |
| `municipio` | String \| null | Municipio donde se realizará el montaje |
| `comercial` | String \| null | Nombre del comercial asignado |
| `ofertas` | Array | Lista de ofertas asociadas al lead |
| `comprobante_pago_url` | String \| null | URL del comprobante de pago |
| `metodo_pago` | String \| null | Método de pago utilizado |
| `moneda` | String \| null | Moneda del pago (USD, EUR, CUP, etc.) |

### Campos de Cliente

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String | ID único del cliente |
| `numero` | String | Número de cliente (formato: PPMM-NNNN) |
| `nombre` | String | Nombre completo del cliente |
| `telefono` | String \| null | Teléfono principal |
| `telefono_adicional` | String \| null | Teléfono secundario (opcional) |
| `direccion` | String | Dirección del cliente |
| `fecha_contacto` | String \| null | Fecha de primer contacto |
| `estado` | String \| null | Estado del cliente (siempre "Pendiente de Instalación") |
| `falta_instalacion` | String \| null | **Campo especial**: Descripción de qué falta para completar la instalación |
| `fuente` | String \| null | Origen del cliente |
| `referencia` | String \| null | Información adicional sobre la fuente |
| `pais_contacto` | String \| null | País de contacto |
| `comentario` | String \| null | Comentarios adicionales |
| `provincia_montaje` | String \| null | Provincia donde se realizará el montaje |
| `municipio` | String \| null | Municipio donde se realizará el montaje |
| `comercial` | String \| null | Nombre del comercial asignado |
| `ofertas` | Array | Lista de ofertas asociadas al cliente |
| `latitud` | String \| null | Coordenada de latitud |
| `longitud` | String \| null | Coordenada de longitud |
| `carnet_identidad` | String \| null | Carnet de identidad del cliente |
| `fecha_instalacion` | String \| null | Fecha programada de instalación |
| `fecha_montaje` | String \| null | Fecha de montaje realizado |
| `comprobante_pago_url` | String \| null | URL del comprobante de pago |
| `metodo_pago` | String \| null | Método de pago utilizado |
| `moneda` | String \| null | Moneda del pago |

### Campos de Oferta (Lead y Cliente)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `inversor_codigo` | String \| null | Código del inversor |
| `inversor_nombre` | String \| null | Nombre/descripción del inversor |
| `inversor_cantidad` | Number | Cantidad de inversores |
| `bateria_codigo` | String \| null | Código de la batería |
| `bateria_nombre` | String \| null | Nombre/descripción de la batería |
| `bateria_cantidad` | Number | Cantidad de baterías |
| `panel_codigo` | String \| null | Código del panel solar |
| `panel_nombre` | String \| null | Nombre/descripción del panel |
| `panel_cantidad` | Number | Cantidad de paneles |
| `costo_oferta` | Number | Costo base de la oferta |
| `costo_extra` | Number | Costo adicional |
| `costo_transporte` | Number | Costo de transporte |
| `aprobada` | Boolean | Si la oferta fue aprobada |
| `pagada` | Boolean | Si la oferta fue pagada |
| `elementos_personalizados` | String \| null | Descripción de elementos personalizados |
| `razon_costo_extra` | String \| null | Justificación del costo extra |

---

## Respuestas de Error

### 401 Unauthorized
```json
{
  "detail": "No autorizado"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Error al obtener pendientes de instalación: [mensaje de error]"
}
```

---

## Casos de Uso

### 1. Dashboard de Instalaciones Pendientes
Mostrar en un dashboard todos los casos que requieren seguimiento de instalación, separados por leads y clientes.

### 2. Gestión de Brigadas
Asignar brigadas de instalación basándose en la lista de pendientes y su ubicación geográfica.

### 3. Reportes de Seguimiento
Generar reportes de instalaciones pendientes para análisis de gestión y planificación.

### 4. Notificaciones y Recordatorios
Crear sistema de notificaciones para hacer seguimiento a instalaciones pendientes.

---

## Notas Importantes

1. **Estado Exacto**: El endpoint filtra por el estado exacto "Pendiente de Instalación" (case-sensitive).

2. **Campo `falta_instalacion`**: Este campo es exclusivo de clientes y describe específicamente qué falta para completar la instalación (ej: "Esperando entrega de paneles", "Pendiente de permisos", etc.).

3. **Diferencia Lead vs Cliente**:
   - **Lead**: Prospecto que aún no se ha convertido en cliente
   - **Cliente**: Ya tiene número de cliente asignado y está en proceso de instalación

4. **Ofertas**: Ambos (leads y clientes) pueden tener múltiples ofertas, pero típicamente solo una estará marcada como `aprobada: true` y `pagada: true`.

5. **Ordenamiento**: Los resultados se devuelven ordenados por fecha de contacto (más recientes primero).

---

## Ejemplo de Uso en Frontend (JavaScript/TypeScript)

```typescript
// Función para obtener pendientes de instalación
async function obtenerPendientesInstalacion() {
  try {
    const response = await fetch('https://api.example.com/api/pendientes-instalacion/', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Error al obtener pendientes');
    }

    const data = await response.json();
    
    console.log(`Total de pendientes: ${data.total_general}`);
    console.log(`Leads pendientes: ${data.total_leads}`);
    console.log(`Clientes pendientes: ${data.total_clientes}`);
    
    // Procesar leads
    data.leads.forEach(lead => {
      console.log(`Lead: ${lead.nombre} - ${lead.telefono}`);
      console.log(`Dirección: ${lead.direccion}`);
      console.log(`Comercial: ${lead.comercial}`);
    });
    
    // Procesar clientes
    data.clientes.forEach(cliente => {
      console.log(`Cliente: ${cliente.numero} - ${cliente.nombre}`);
      console.log(`Falta: ${cliente.falta_instalacion}`);
      console.log(`Fecha instalación: ${cliente.fecha_instalacion}`);
    });
    
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

---

## Ejemplo de Uso en Frontend (React)

```tsx
import { useState, useEffect } from 'react';

interface PendientesInstalacion {
  leads: Lead[];
  clientes: Cliente[];
  total_leads: number;
  total_clientes: number;
  total_general: number;
}

function PendientesInstalacionDashboard() {
  const [pendientes, setPendientes] = useState<PendientesInstalacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPendientes() {
      try {
        const response = await fetch('/api/pendientes-instalacion/', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!response.ok) throw new Error('Error al cargar datos');

        const data = await response.json();
        setPendientes(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchPendientes();
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!pendientes) return null;

  return (
    <div>
      <h1>Pendientes de Instalación</h1>
      <div className="stats">
        <div>Total: {pendientes.total_general}</div>
        <div>Leads: {pendientes.total_leads}</div>
        <div>Clientes: {pendientes.total_clientes}</div>
      </div>

      <section>
        <h2>Leads Pendientes</h2>
        {pendientes.leads.map(lead => (
          <div key={lead.id}>
            <h3>{lead.nombre}</h3>
            <p>Teléfono: {lead.telefono}</p>
            <p>Dirección: {lead.direccion}</p>
            <p>Comercial: {lead.comercial}</p>
          </div>
        ))}
      </section>

      <section>
        <h2>Clientes Pendientes</h2>
        {pendientes.clientes.map(cliente => (
          <div key={cliente.id}>
            <h3>{cliente.numero} - {cliente.nombre}</h3>
            <p>Teléfono: {cliente.telefono}</p>
            <p>Falta: {cliente.falta_instalacion}</p>
            <p>Fecha instalación: {cliente.fecha_instalacion}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
```

---

## Changelog

### Versión 1.0.0 (16/01/2026)
- ✅ Endpoint inicial creado
- ✅ Soporte para leads y clientes con estado "Pendiente de Instalación"
- ✅ Incluye contadores totales
- ✅ Documentación completa
