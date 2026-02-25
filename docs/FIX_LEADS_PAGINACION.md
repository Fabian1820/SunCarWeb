# Fix: Soporte para Respuesta Paginada de Leads

## Problema

El endpoint `/leads/` del backend cambió su estructura de respuesta de un formato simple a un formato paginado:

**Formato Antiguo:**
```json
{
  "success": true,
  "message": "Leads obtenidos",
  "data": [
    { "id": "1", "nombre": "Lead 1", ... },
    { "id": "2", "nombre": "Lead 2", ... }
  ]
}
```

**Formato Nuevo (Paginado):**
```json
{
  "success": true,
  "data": {
    "data": [
      { "id": "1", "nombre": "Lead 1", ... },
      { "id": "2", "nombre": "Lead 2", ... }
    ],
    "total": 100
  }
}
```

Esto causaba que el frontend no pudiera cargar los leads en:
- Confección de ofertas
- Ofertas personalizadas
- Gestión de leads
- Trabajos pendientes

## Solución Implementada

### 1. Actualización del Servicio (`lib/services/feats/leads/lead-service.ts`)

Se modificó el método `getLeads()` para detectar y manejar ambos formatos:

```typescript
static async getLeads(params: {...} = {}): Promise<Lead[]> {
  const response = await apiRequest<LeadResponse>(endpoint)
  
  // Manejar respuesta paginada (nuevo formato del backend)
  // Estructura: { success: true, data: { data: [...], total: 100 } }
  if (response.data && typeof response.data === 'object' && 'data' in response.data) {
    console.log('LeadService.getLeads - Formato paginado detectado')
    return Array.isArray(response.data.data) ? response.data.data : []
  }
  
  // Formato antiguo (compatibilidad): { data: [...] }
  return Array.isArray(response.data) ? response.data : []
}
```

### 2. Actualización de Tipos (`lib/types/feats/leads/lead-types.ts`)

Se agregó el tipo `LeadPaginatedData` y se actualizó `LeadResponse`:

```typescript
export interface LeadResponse {
  success: boolean;
  message: string;
  data: Lead | Lead[] | LeadPaginatedData | null;
}

// Nuevo formato paginado del backend
export interface LeadPaginatedData {
  data: Lead[];
  total: number;
}
```

### 3. Exportación de Tipos (`lib/api-types.ts`)

Se agregó la exportación del nuevo tipo:

```typescript
export type {
  Lead,
  LeadResponse,
  LeadPaginatedData,  // ← Nuevo
  LeadCreateData,
  LeadUpdateData,
  LeadConversionRequest,
  OfertaAsignacion,
  OfertaEmbebida,
  ElementoPersonalizado,
} from './types/feats/leads/lead-types'
```

## Compatibilidad

La solución es **retrocompatible**:
- ✅ Funciona con el nuevo formato paginado
- ✅ Funciona con el formato antiguo (si el backend lo devuelve)
- ✅ No requiere cambios en los componentes que usan `LeadService.getLeads()`

## Lugares Afectados

Todos estos lugares ahora funcionan correctamente sin cambios adicionales:

1. `components/feats/ofertas/confeccion-ofertas-view.tsx` - Buscar lead al crear oferta
2. `components/feats/ofertas/ofertas-confeccionadas-view.tsx` - Filtrar ofertas por lead
3. `components/feats/ofertas-personalizadas/cliente-selector-field.tsx` - Selector de lead
4. `hooks/use-leads.ts` - Hook para cargar leads
5. `hooks/use-trabajos-pendientes.ts` - Cargar leads pendientes
6. `lib/utils/migrate-fuentes.ts` - Migración de datos

## Verificación

Para verificar que funciona correctamente:

1. Abre la página de **Confección de Ofertas**
2. Selecciona "Lead" como tipo de contacto
3. Haz clic en "Buscar lead"
4. Deberías ver la lista de leads cargada correctamente

Si hay problemas:
- Abre la consola del navegador (F12)
- Busca el log: `LeadService.getLeads - Formato paginado detectado`
- Verifica que `response.data.data` contenga el array de leads

## Endpoint en Swagger

El endpoint correcto en Swagger es:

```
GET /leads/
```

O:

```
GET /leads
```

**Parámetros opcionales:**
- `nombre` (string) - Filtrar por nombre
- `telefono` (string) - Filtrar por teléfono
- `estado` (string) - Filtrar por estado
- `fuente` (string) - Filtrar por fuente

## Notas Adicionales

- El campo `total` de la respuesta paginada actualmente no se usa en el frontend
- Si en el futuro se necesita paginación real (límite/offset), se puede extender el servicio
- La detección del formato se hace verificando si `response.data` tiene una propiedad `data`
