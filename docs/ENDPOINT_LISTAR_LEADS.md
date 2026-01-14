# 📋 Endpoint: Listar Leads (Sin Fuente, Con Ofertas)

**Fecha:** 14 de Enero, 2026  
**Actualización:** Campo `fuente` eliminado, campo `ofertas` incluido

---

## 🎯 Endpoint

```
GET /api/leads/
```

---

## 📝 Descripción

Obtiene la lista de todos los leads con sus ofertas embebidas. El campo `fuente` ha sido eliminado de la respuesta.

---

## 🔑 Autenticación

Requiere token de autenticación en el header:

```
Authorization: Bearer {token}
```

---

## 📊 Parámetros de Query (Opcionales)

Todos los parámetros son opcionales. Si no se envían, devuelve todos los leads.

| Parámetro | Tipo | Descripción | Ejemplo |
|-----------|------|-------------|---------|
| `nombre` | string | Búsqueda parcial por nombre | `?nombre=Juan` |
| `telefono` | string | Búsqueda parcial por teléfono | `?telefono=+53` |
| `estado` | string | Filtrar por estado exacto | `?estado=Pendiente de visita` |
| `fuente` | string | Filtrar por fuente (aunque no se devuelve en la respuesta) | `?fuente=Instagram` |

---

## 🌐 Ejemplos de Llamadas desde el Frontend

### 1. Obtener Todos los Leads

```javascript
// JavaScript/TypeScript
const response = await fetch('http://localhost:8000/api/leads/', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);
```

### 2. Filtrar por Estado

```javascript
const response = await fetch('http://localhost:8000/api/leads/?estado=Pendiente de visita', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### 3. Filtrar por Nombre

```javascript
const response = await fetch('http://localhost:8000/api/leads/?nombre=Juan', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

### 4. Múltiples Filtros

```javascript
const params = new URLSearchParams({
  estado: 'Pendiente de visita',
  fuente: 'Instagram'
});

const response = await fetch(`http://localhost:8000/api/leads/?${params}`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
```

---

## 📤 Respuesta Exitosa (200 OK)

```json
{
  "success": true,
  "message": "Leads obtenidos exitosamente",
  "data": [
    {
      "id": "6967afef2f81b245527a6250",
      "fecha_contacto": "14/01/2026",
      "nombre": "Juan Pérez",
      "telefono": "+5353329353",
      "telefono_adicional": "+5357654321",
      "estado": "Pendiente de instalación",
      "referencia": "Amigo de María",
      "direccion": "Calle 22 #2904 e/29 y 31, Bejucal, Mayabeque",
      "pais_contacto": "Cuba",
      "comentario": "Cliente interesado en sistema de 5kW",
      "provincia_montaje": "La Habana",
      "municipio": "Boyeros",
      "comercial": "Yanisbe Hurtado Jimenez",
      "ofertas": [
        {
          "inversor_codigo": "INV001",
          "inversor_cantidad": 1,
          "bateria_codigo": "BAT001",
          "bateria_cantidad": 2,
          "panel_codigo": "PAN001",
          "panel_cantidad": 10,
          "costo_oferta": 5000.0,
          "costo_extra": 200.0,
          "costo_transporte": 150.0,
          "aprobada": false,
          "pagada": false,
          "elementos_personalizados": "Cable extra de 10m",
          "razon_costo_extra": "Instalación en zona remota"
        }
      ],
      "comprobante_pago_url": null,
      "metodo_pago": "Efectivo",
      "moneda": "USD"
    },
    {
      "id": "6967b1234567890abcdef123",
      "fecha_contacto": "15/01/2026",
      "nombre": "María López",
      "telefono": "+5356789012",
      "telefono_adicional": null,
      "estado": "Revisando ofertas",
      "referencia": null,
      "direccion": "Calle 10 #505, Vedado",
      "pais_contacto": "Cuba",
      "comentario": null,
      "provincia_montaje": "La Habana",
      "municipio": "Plaza de la Revolución",
      "comercial": "Carlos Rodríguez",
      "ofertas": [],
      "comprobante_pago_url": null,
      "metodo_pago": "Transferencia",
      "moneda": "USD"
    }
  ]
}
```

---

## 📋 Estructura de Cada Lead

### Campos Principales

| Campo | Tipo | Descripción | Puede ser null |
|-------|------|-------------|----------------|
| `id` | string | ID único del lead | No |
| `fecha_contacto` | string | Fecha de contacto (DD/MM/YYYY) | No |
| `nombre` | string | Nombre completo | No |
| `telefono` | string | Teléfono principal | No |
| `telefono_adicional` | string | Teléfono secundario | Sí |
| `estado` | string | Estado actual del lead | No |
| `referencia` | string | Referencia o contacto | Sí |
| `direccion` | string | Dirección completa | Sí |
| `pais_contacto` | string | País de contacto | Sí |
| `comentario` | string | Comentarios adicionales | Sí |
| `provincia_montaje` | string | Provincia de instalación | Sí |
| `municipio` | string | Municipio de instalación | Sí |
| `comercial` | string | Nombre del comercial asignado | Sí |
| `ofertas` | array | Array de ofertas embebidas | No (puede estar vacío) |
| `comprobante_pago_url` | string | URL del comprobante de pago | Sí |
| `metodo_pago` | string | Método de pago | Sí |
| `moneda` | string | Moneda del pago | Sí |

### Estructura de Cada Oferta

Cada elemento del array `ofertas` tiene esta estructura:

```typescript
interface Oferta {
  inversor_codigo: string | null;
  inversor_cantidad: number;
  bateria_codigo: string | null;
  bateria_cantidad: number;
  panel_codigo: string | null;
  panel_cantidad: number;
  costo_oferta: number;
  costo_extra: number;
  costo_transporte: number;
  aprobada: boolean;
  pagada: boolean;
  elementos_personalizados: string | null;
  razon_costo_extra: string | null;
}
```

---

## 🔴 Respuestas de Error

### Error 401 - No Autorizado

```json
{
  "detail": "Not authenticated"
}
```

### Error 500 - Error del Servidor

```json
{
  "detail": "Error message here"
}
```

---

## 💻 Ejemplo Completo en React/Next.js

```typescript
// types.ts
interface Oferta {
  inversor_codigo: string | null;
  inversor_cantidad: number;
  bateria_codigo: string | null;
  bateria_cantidad: number;
  panel_codigo: string | null;
  panel_cantidad: number;
  costo_oferta: number;
  costo_extra: number;
  costo_transporte: number;
  aprobada: boolean;
  pagada: boolean;
  elementos_personalizados: string | null;
  razon_costo_extra: string | null;
}

interface Lead {
  id: string;
  fecha_contacto: string;
  nombre: string;
  telefono: string;
  telefono_adicional: string | null;
  estado: string;
  referencia: string | null;
  direccion: string | null;
  pais_contacto: string | null;
  comentario: string | null;
  provincia_montaje: string | null;
  municipio: string | null;
  comercial: string | null;
  ofertas: Oferta[];
  comprobante_pago_url: string | null;
  metodo_pago: string | null;
  moneda: string | null;
}

interface LeadsResponse {
  success: boolean;
  message: string;
  data: Lead[];
}

// api.ts
export async function getLeads(
  token: string,
  filters?: {
    nombre?: string;
    telefono?: string;
    estado?: string;
    fuente?: string;
  }
): Promise<LeadsResponse> {
  const params = new URLSearchParams();
  
  if (filters?.nombre) params.append('nombre', filters.nombre);
  if (filters?.telefono) params.append('telefono', filters.telefono);
  if (filters?.estado) params.append('estado', filters.estado);
  if (filters?.fuente) params.append('fuente', filters.fuente);
  
  const url = `http://localhost:8000/api/leads/${params.toString() ? '?' + params.toString() : ''}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Error: ${response.status}`);
  }
  
  return await response.json();
}

// Uso en componente
import { useState, useEffect } from 'react';

function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchLeads() {
      try {
        const token = localStorage.getItem('token'); // O de donde obtengas el token
        const response = await getLeads(token!);
        
        if (response.success) {
          setLeads(response.data);
        }
      } catch (error) {
        console.error('Error al obtener leads:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLeads();
  }, []);
  
  if (loading) return <div>Cargando...</div>;
  
  return (
    <div>
      <h1>Leads ({leads.length})</h1>
      {leads.map(lead => (
        <div key={lead.id}>
          <h2>{lead.nombre}</h2>
          <p>Teléfono: {lead.telefono}</p>
          <p>Estado: {lead.estado}</p>
          <p>Ofertas: {lead.ofertas.length}</p>
          
          {lead.ofertas.length > 0 && (
            <div>
              <h3>Ofertas:</h3>
              {lead.ofertas.map((oferta, index) => (
                <div key={index}>
                  <p>Inversor: {oferta.inversor_codigo} x{oferta.inversor_cantidad}</p>
                  <p>Batería: {oferta.bateria_codigo} x{oferta.bateria_cantidad}</p>
                  <p>Panel: {oferta.panel_codigo} x{oferta.panel_cantidad}</p>
                  <p>Costo: ${oferta.costo_oferta}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

## 📝 Notas Importantes

### ⚠️ Campo `fuente` Eliminado

El campo `fuente` **NO se devuelve** en la respuesta, aunque todavía puedes usarlo como filtro en los parámetros de query.

### ✅ Campo `ofertas` Incluido

El array `ofertas` **siempre se devuelve**, incluso si está vacío:
- Si el lead tiene ofertas: `"ofertas": [{ ... }]`
- Si el lead no tiene ofertas: `"ofertas": []`

### 🔄 Compatibilidad

Los leads antiguos que tengan el campo `fuente` en MongoDB seguirán funcionando, pero ese campo no se devolverá en la respuesta del endpoint.

---

## 🚀 URL Completa

```
http://localhost:8000/api/leads/
```

O en producción:
```
https://tu-dominio.com/api/leads/
```

---

**Última actualización:** 14 de Enero, 2026
