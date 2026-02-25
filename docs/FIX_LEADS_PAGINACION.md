# Fix: Soporte para Respuesta Paginada de Leads

## Problema

El endpoint `/leads/` del backend cambió su estructura de respuesta para incluir información de paginación:

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

**Formato Nuevo (Con Paginación):**
```json
{
  "success": true,
  "message": "Leads obtenidos",
  "data": [
    { "id": "1", "nombre": "Lead 1", ... },
    { "id": "2", "nombre": "Lead 2", ... }
  ],
  "total": 100,
  "skip": 0,
  "limit": 20
}
```

Esto causaba que el frontend no pudiera cargar los leads correctamente en varios componentes.

## Solución Implementada

### 1. Actualización del Servicio (`lib/services/feats/leads/lead-service.ts`)

Se modificó el método `getLeads()` para devolver un objeto con la información de paginación:

```typescript
static async getLeads(params: {
  nombre?: string
  telefono?: string
  estado?: string
  fuente?: string
  skip?: number
  limit?: number
} = {}): Promise<{ leads: Lead[]; total: number; skip: number; limit: number }> {
  const response = await apiRequest<LeadResponse>(endpoint)
  const leads = Array.isArray(response.data) ? response.data : []
  const total = response.total ?? leads.length
  const skip = response.skip ?? params.skip ?? 0
  const limit = response.limit ?? params.limit ?? (params.skip !== undefined || params.limit !== undefined ? 50 : 0)
  return { leads, total, skip, limit }
}
```

**Cambio importante:** Ahora devuelve `{ leads, total, skip, limit }` en lugar de solo un array.

### 2. Actualización de Tipos (`lib/types/feats/leads/lead-types.ts`)

Se actualizó `LeadResponse` para incluir los campos de paginación:

```typescript
export interface LeadResponse {
  success: boolean;
  message: string;
  data: Lead | Lead[] | null;
  total?: number;    // ← Nuevo
  skip?: number;     // ← Nuevo
  limit?: number;    // ← Nuevo
}
```

### 3. Actualización de Componentes

Se actualizaron todos los lugares que usan `LeadService.getLeads()` para desestructurar la respuesta:

**Antes:**
```typescript
const data = await LeadService.getLeads()
setLeads(Array.isArray(data) ? data : [])
```

**Después:**
```typescript
const { leads } = await LeadService.getLeads()
setLeads(Array.isArray(leads) ? leads : [])
```

## Archivos Modificados

1. ✅ `lib/services/feats/leads/lead-service.ts` - Servicio actualizado
2. ✅ `lib/types/feats/leads/lead-types.ts` - Tipos actualizados
3. ✅ `lib/api-types.ts` - Exportaciones actualizadas
4. ✅ `hooks/use-leads.ts` - Hook actualizado (ya incluía soporte de paginación)
5. ✅ `components/feats/ofertas/confeccion-ofertas-view.tsx` - Componente actualizado
6. ✅ `components/feats/ofertas/ofertas-confeccionadas-view.tsx` - Componente actualizado
7. ✅ `components/feats/ofertas-personalizadas/cliente-selector-field.tsx` - Componente actualizado
8. ✅ `hooks/use-trabajos-pendientes.ts` - Hook actualizado
9. ✅ `lib/utils/migrate-fuentes.ts` - Utilidad actualizada

## Compatibilidad

La solución es **retrocompatible**:
- ✅ Funciona con el nuevo formato paginado
- ✅ Maneja correctamente cuando `total`, `skip` o `limit` no están presentes
- ✅ Los componentes que no necesitan paginación simplemente ignoran esos campos

## Verificación

Para verificar que funciona correctamente:

1. Abre la página de **Confección de Ofertas**
2. Selecciona "Lead" como tipo de contacto
3. Haz clic en "Buscar lead"
4. Deberías ver la lista de leads cargada correctamente

Si hay problemas:
- Abre la consola del navegador (F12)
- Busca el log: `LeadService.getLeads response:`
- Verifica que la respuesta tenga los campos `data`, `total`, `skip`, `limit`

## Endpoint en Swagger

El endpoint correcto en Swagger es:

```
GET /leads/
```

**Parámetros opcionales:**
- `nombre` (string) - Filtrar por nombre
- `telefono` (string) - Filtrar por teléfono
- `estado` (string) - Filtrar por estado
- `fuente` (string) - Filtrar por fuente
- `skip` (number) - Número de registros a saltar (paginación)
- `limit` (number) - Número máximo de registros a devolver

**Respuesta:**
```json
{
  "success": true,
  "message": "Leads obtenidos exitosamente",
  "data": [...],
  "total": 100,
  "skip": 0,
  "limit": 20
}
```

## Notas Adicionales

- El hook `use-leads.ts` ya tenía soporte completo de paginación
- Los componentes simples que no usan paginación solo extraen el array `leads`
- La paginación real (con controles de página) solo está implementada en `use-leads.ts`
- Si otros componentes necesitan paginación en el futuro, pueden usar el mismo patrón
