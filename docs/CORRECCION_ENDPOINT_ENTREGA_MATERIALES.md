# Corrección: Endpoint de Confirmar Entrega de Materiales

## Fecha
2026-03-20

## Problema Identificado

El botón "Confirmar entrega de materiales" en el módulo **Operaciones > Trabajos Diarios > Confirmar salidas** estaba usando un endpoint incorrecto y contenía lógica duplicada.

### Endpoint Anterior (Incorrecto)
```typescript
POST /api/entregas-materiales/

Body:
{
  "id_oferta": "...",
  "cliente_numero": "...",
  "id_solicitud": "...",
  "id_vale": "...",
  "fecha": "..."
}
```

### Problemas
1. **Lógica duplicada**: El frontend buscaba las ofertas del cliente y seleccionaba la oferta correcta
2. **Complejidad innecesaria**: Enviaba 5 campos cuando solo necesitaba 2
3. **Endpoint incorrecto**: No usaba el endpoint documentado específicamente para esta operación

## Solución Implementada

### Endpoint Correcto
```typescript
POST /api/entregas-materiales/confirmar-desde-vale

Body:
{
  "id_vale_salida": "507f1f77bcf86cd799439011",
  "fecha": "2024-03-20"  // Formato ISO: YYYY-MM-DD
}
```

**Campos requeridos**:
- `id_vale_salida` (string): ID del vale de salida
- `fecha` (string): Fecha en formato ISO (YYYY-MM-DD)

**Campos opcionales**:
- `id_oferta` (string): ID de la oferta específica (si no se proporciona, el backend la busca automáticamente)

### Beneficios
1. ✅ **Simplificación**: Solo requiere `id_vale_salida` y `fecha`
2. ✅ **Lógica centralizada**: El backend maneja toda la lógica de búsqueda de ofertas
3. ✅ **Menos código**: Eliminadas ~100 líneas de código innecesario
4. ✅ **Mejor mantenibilidad**: Un solo lugar para la lógica de negocio
5. ✅ **Endpoint documentado**: Usa el endpoint oficial del backend
6. ✅ **Formato correcto**: Fecha en formato ISO (YYYY-MM-DD) como espera el backend

## Cambios en el Código

### Archivo Modificado
`components/feats/instalaciones/trabajos-diarios-view.tsx`

### Función Simplificada
```typescript
const confirmarEntregaMateriales = async (vale: TrabajoDiarioVale) => {
  const valeId = safeText(vale.vale_id);
  
  if (!valeId) {
    toast({
      title: "Vale inválido",
      description: "No se pudo identificar el vale de salida.",
      variant: "destructive",
    });
    return;
  }

  setConfirmandoEntrega((prev) => ({ ...prev, [valeId]: true }));
  try {
    const response = await apiRequest<unknown>("/entregas-materiales/confirmar-desde-vale", {
      method: "POST",
      body: JSON.stringify({
        id_vale_salida: valeId,
        fecha: fechaTrabajo, // Formato YYYY-MM-DD
      }),
    });

    // ... manejo de respuesta y toast
  } catch (error) {
    // ... manejo de errores
  } finally {
    setConfirmandoEntrega((prev) => ({ ...prev, [valeId]: false }));
  }
};
```

### Código Eliminado

1. **Función `cargarOfertasCliente`** (~10 líneas)
   - Buscaba ofertas del cliente desde el frontend
   
2. **Función `seleccionarOfertaIdParaEntrega`** (~60 líneas)
   - Lógica compleja para seleccionar la oferta correcta
   - Comparaba materiales del vale con items de ofertas
   
3. **Función `extractOfertasConfeccion`** (~50 líneas)
   - Normalizaba respuestas de ofertas
   
4. **Funciones auxiliares**:
   - `getOfertaItems` (~5 líneas)
   - `getOfertaPersistedId` (~5 líneas)
   
5. **Tipo `OfertaConfeccionLike`**
   - Ya no necesario

### Validaciones Eliminadas del Frontend

El frontend ya NO valida:
- ❌ Cliente válido (el backend lo valida)
- ❌ Solicitud válida (el backend lo valida)
- ❌ Materiales en el vale (el backend lo valida)
- ❌ Existencia de ofertas (el backend lo valida)

El frontend solo valida:
- ✅ Vale ID válido (requerido para la llamada)

## Comportamiento del Backend

El endpoint `/entregas-materiales/confirmar-desde-vale`:

1. **Valida el vale de salida**
   - Existe en la base de datos
   - No está anulado
   - Tiene materiales

2. **Busca la oferta asociada**
   - Obtiene el cliente del vale
   - Busca ofertas confeccionadas del cliente
   - Selecciona la oferta correcta basándose en los materiales

3. **Registra la entrega**
   - Crea el registro de entrega de materiales
   - Actualiza la oferta con los materiales entregados
   - Marca el vale como confirmado

4. **Devuelve la respuesta**
   - Información de la entrega creada
   - Materiales entregados
   - Oferta actualizada

## Testing

### Casos de Prueba

1. **Vale válido con oferta existente**
   - ✅ Debe crear la entrega correctamente
   - ✅ Debe mostrar toast de éxito

2. **Vale sin oferta asociada**
   - ✅ Backend devuelve error
   - ✅ Frontend muestra mensaje de error

3. **Vale inválido o anulado**
   - ✅ Backend devuelve error
   - ✅ Frontend muestra mensaje de error

4. **Vale sin materiales**
   - ✅ Backend devuelve error
   - ✅ Frontend muestra mensaje de error

## Documentación Relacionada

- `docs/API_CONFIRMAR_ENTREGA_MATERIALES.md` - Documentación del endpoint backend
- `AGENTS.md` - Guía general del proyecto

## Notas Adicionales

- El cambio es **backward compatible** si el backend ya tiene implementado el endpoint correcto
- Si el backend aún no tiene el endpoint, necesitará implementarse según la documentación
- La simplificación reduce la superficie de bugs y mejora el rendimiento (menos llamadas API)

## Verificación

Para verificar que el cambio funciona correctamente:

1. Ir a **Operaciones > Trabajos Diarios**
2. Seleccionar la pestaña **Confirmar salidas**
3. Seleccionar una fecha con vales pendientes
4. Hacer clic en **Confirmar entrega de materiales** en un vale
5. Verificar que:
   - Se muestra el toast de éxito
   - El vale se marca como confirmado
   - La entrega se registra en la oferta del cliente
