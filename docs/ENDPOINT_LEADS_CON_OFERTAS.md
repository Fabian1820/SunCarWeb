# Endpoint: Leads con Ofertas Confeccionadas

## Endpoints Disponibles

### 1. Obtener IDs de Leads con Ofertas

```
GET /api/ofertas/confeccion/leads-con-ofertas
```

Retorna lista de IDs de leads únicos que tienen ofertas confeccionadas.

#### Respuesta

```json
{
  "success": true,
  "message": "3 leads encontrados con ofertas",
  "data": {
    "ids_leads": ["65f1234567890abcdef12345", "65f9876543210fedcba98765", "65fabcdef1234567890abcde"],
    "total": 3
  }
}
```

---

### 2. Obtener TODAS las Ofertas de un Lead

```
GET /api/ofertas/confeccion/lead/{lead_id}
```

Retorna **TODAS** las ofertas confeccionadas de un lead específico (ordenadas por fecha, más reciente primero).

#### Parámetros

- `lead_id` (path): ID del lead (ej: "65f1234567890abcdef12345")

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "3 ofertas encontradas para el lead",
  "data": {
    "lead": {
      "id": "65f1234567890abcdef12345",
      "nombre": "Juan Pérez García",
      "telefono": "53123456",
      "email": "juan@example.com"
    },
    "ofertas": [
      {
        "id": "65f1234567890abcdef12345",
        "numero_oferta": "OF-20260209-015",
        "estado": "en_revision",
        "fecha_creacion": "2026-02-09T19:59:02.792Z",
        "precio_final": 4360.00,
        "items": [...],
        "stock_disponible": [...],
        ...
      },
      {
        "numero_oferta": "OF-20260209-014",
        "estado": "en_revision",
        "fecha_creacion": "2026-02-09T19:50:30.304Z",
        "precio_final": 4480.00,
        ...
      },
      {
        "numero_oferta": "OF-20260209-013",
        "estado": "aprobada_para_enviar",
        "fecha_creacion": "2026-02-09T18:01:14.136Z",
        "precio_final": 3440.00,
        ...
      }
    ],
    "total_ofertas": 3
  }
}
```

#### Respuesta Error (404)

```json
{
  "detail": "No se encontraron ofertas confeccionadas para el lead 65f1234567890abcdef12345"
}
```

---

### 3. Asignar Oferta Genérica a Lead

```
POST /api/ofertas/confeccion/asignar-a-lead
```

Duplica una oferta genérica aprobada y la asigna a un lead específico.

#### Body

```json
{
  "oferta_generica_id": "65f1234567890abcdef12345",
  "lead_id": "65fabcdef1234567890abcde"
}
```

#### Respuesta Exitosa (200)

```json
{
  "success": true,
  "message": "Oferta genérica duplicada y asignada exitosamente a lead Juan Pérez",
  "oferta_original_id": "65f1234567890abcdef12345",
  "oferta_nueva_id": "65f9999999999999999999999",
  "oferta_nueva": {
    "id": "65f9999999999999999999999",
    "numero_oferta": "OF-20260209-016",
    "tipo_oferta": "personalizada",
    "lead_id": "65fabcdef1234567890abcde",
    "estado": "en_revision",
    "precio_final": 4500.00,
    ...
  },
  "lead_id": "65fabcdef1234567890abcde",
  "lead_nombre": "Juan Pérez"
}
```

---

## Rutas Completas

⚠️ **IMPORTANTE**: El prefijo del router es `/api/ofertas/confeccion` (con slash, no guión)

- ✅ **Correcto**: `/api/ofertas/confeccion/leads-con-ofertas`
- ❌ **Incorrecto**: `/api/ofertas-confeccion/leads-con-ofertas`

- ✅ **Correcto**: `/api/ofertas/confeccion/lead/{lead_id}`
- ❌ **Incorrecto**: `/api/ofertas-confeccion/lead/{lead_id}`

- ✅ **Correcto**: `/api/ofertas/confeccion/asignar-a-lead`
- ❌ **Incorrecto**: `/api/ofertas-confeccion/asignar-a-lead`

---

## Comparación con Endpoints de Clientes

| Aspecto | Clientes | Leads |
|---------|----------|-------|
| **Listar con ofertas** | `/clientes-con-ofertas` | `/leads-con-ofertas` |
| **Campo retornado** | `numeros_clientes` | `ids_leads` |
| **Obtener ofertas** | `/cliente/{cliente_numero}` | `/lead/{lead_id}` |
| **Asignar oferta** | `/asignar-a-cliente` | `/asignar-a-lead` |
| **Campo en oferta** | `cliente_numero` | `lead_id` |
| **Identificador** | Número de cliente (string) | ID de lead (ObjectId string) |

---

## Uso en Frontend

### Obtener Lista de Leads con Ofertas

```javascript
const response = await fetch('/api/ofertas/confeccion/leads-con-ofertas', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

if (data.success) {
  const idsLeads = data.data.ids_leads;
  console.log(`${data.data.total} leads con ofertas:`, idsLeads);
}
```

### Obtener Todas las Ofertas de un Lead

```javascript
const leadId = '65f1234567890abcdef12345';
const response = await fetch(`/api/ofertas/confeccion/lead/${leadId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const result = await response.json();

if (result.success) {
  const { lead, ofertas, total_ofertas } = result.data;
  
  console.log(`Lead: ${lead.nombre}`);
  console.log(`Total ofertas: ${total_ofertas}`);
  
  ofertas.forEach((oferta, index) => {
    console.log(`${index + 1}. ${oferta.numero_oferta} - $${oferta.precio_final}`);
  });
}
```

### Asignar Oferta Genérica a Lead

```javascript
const response = await fetch('/api/ofertas/confeccion/asignar-a-lead', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    oferta_generica_id: '65f1234567890abcdef12345',
    lead_id: '65fabcdef1234567890abcde'
  })
});

const result = await response.json();

if (result.success) {
  console.log(`Oferta asignada: ${result.oferta_nueva.numero_oferta}`);
  console.log(`Lead: ${result.lead_nombre}`);
}
```

### React Example - Lista de Ofertas de un Lead

```tsx
import { useState, useEffect } from 'react';

interface Oferta {
  id: string;
  numero_oferta: string;
  estado: string;
  fecha_creacion: string;
  precio_final: number;
  items: any[];
}

interface LeadOfertas {
  lead: {
    id: string;
    nombre: string;
    telefono?: string;
    email?: string;
  };
  ofertas: Oferta[];
  total_ofertas: number;
}

function OfertasLead({ leadId }: { leadId: string }) {
  const [data, setData] = useState<LeadOfertas | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOfertas() {
      try {
        const response = await fetch(
          `/api/ofertas/confeccion/lead/${leadId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (!response.ok) {
          throw new Error('No se encontraron ofertas');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setData(result.data);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchOfertas();
  }, [leadId]);

  if (loading) return <div>Cargando ofertas...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return <div>No se encontraron ofertas</div>;

  return (
    <div>
      <h2>Ofertas de {data.lead.nombre}</h2>
      <p>Total: {data.total_ofertas} ofertas</p>
      
      <div className="ofertas-list">
        {data.ofertas.map((oferta) => (
          <div key={oferta.id} className="oferta-card">
            <h3>{oferta.numero_oferta}</h3>
            <p>Estado: {oferta.estado}</p>
            <p>Fecha: {new Date(oferta.fecha_creacion).toLocaleDateString()}</p>
            <p>Precio: ${oferta.precio_final.toFixed(2)}</p>
            <p>Items: {oferta.items.length}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Casos de Uso

### Endpoint 1: `/leads-con-ofertas`
1. **Filtrar leads**: Mostrar solo leads que tienen ofertas
2. **Validación rápida**: Verificar si un lead tiene ofertas
3. **Estadísticas**: Contar cuántos leads tienen ofertas

### Endpoint 2: `/lead/{lead_id}`
1. **Historial completo**: Ver todas las ofertas de un lead
2. **Comparación**: Comparar diferentes ofertas del mismo lead
3. **Seguimiento**: Rastrear evolución de ofertas en el tiempo
4. **Selección**: Permitir al usuario elegir entre múltiples ofertas

### Endpoint 3: `/asignar-a-lead`
1. **Asignación rápida**: Asignar ofertas genéricas pre-aprobadas a leads
2. **Duplicación**: Crear ofertas personalizadas basadas en plantillas
3. **Workflow**: Facilitar el proceso de conversión de lead a cliente

---

## Archivos Modificados/Creados

### 1. **infrastucture/repositories/oferta_confeccion_repository.py**
   - ✅ Agregado `get_ids_leads_con_ofertas()` para listar leads con ofertas

### 2. **application/services/oferta_confeccion_service.py**
   - ✅ Agregado `asignar_oferta_generica_a_lead()` para asignar ofertas a leads
   - ✅ Agregado `get_oferta_confeccionada_por_lead()` para obtener todas las ofertas de un lead
   - ✅ Agregado `get_ids_leads_con_ofertas()` para listar IDs de leads con ofertas

### 3. **presentation/schemas/requests/oferta_confeccion_requests.py**
   - ✅ Agregado `AsignarOfertaGenericaALeadRequest`

### 4. **presentation/schemas/responses/oferta_confeccion_responses.py**
   - ✅ Agregado `AsignarOfertaGenericaALeadResponse`

### 5. **presentation/routers/oferta_confeccion_router.py**
   - ✅ Agregado endpoint `GET /leads-con-ofertas`
   - ✅ Agregado endpoint `POST /asignar-a-lead`
   - ✅ Agregado endpoint `GET /lead/{lead_id}`

---

## Notas Técnicas

- Todos los endpoints requieren autenticación JWT
- El endpoint de ofertas por lead valida que el lead exista
- Si no hay ofertas, retorna 404
- Las ofertas incluyen detalles completos: items, stock, lead, etc.
- Ordenamiento automático por fecha de creación (más reciente primero)
- La asignación de oferta genérica a lead crea una copia independiente
- La nueva oferta asignada NO tiene materiales reservados (debe reservarse manualmente)
- El estado de la nueva oferta es "en_revision" por defecto

---

## Diferencias Clave con Clientes

1. **Identificador**: Los leads usan `id` (ObjectId), los clientes usan `numero` (string personalizado)
2. **Campo en oferta**: `lead_id` vs `cliente_numero`
3. **Endpoint de lista**: Retorna `ids_leads` vs `numeros_clientes`
4. **Conversión**: Los leads pueden convertirse a clientes, las ofertas deben reasignarse

---

## Testing

### Prueba Manual con cURL

```bash
# 1. Listar leads con ofertas
curl -X GET "http://localhost:8000/api/ofertas/confeccion/leads-con-ofertas" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Obtener ofertas de un lead
curl -X GET "http://localhost:8000/api/ofertas/confeccion/lead/65f1234567890abcdef12345" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Asignar oferta genérica a lead
curl -X POST "http://localhost:8000/api/ofertas/confeccion/asignar-a-lead" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "oferta_generica_id": "65f1234567890abcdef12345",
    "lead_id": "65fabcdef1234567890abcde"
  }'
```

---

## Próximos Pasos

1. ✅ Endpoints creados y documentados
2. ⏳ Crear tests unitarios
3. ⏳ Integrar con frontend (tabla de gestión de leads)
4. ⏳ Agregar filtros adicionales si es necesario
5. ⏳ Implementar paginación si el volumen de ofertas crece
