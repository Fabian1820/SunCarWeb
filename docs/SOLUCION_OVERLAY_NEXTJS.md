# Solución al Overlay de Error de Next.js

## Problema
Cuando se intentaba convertir un lead sin provincia_montaje u otros datos requeridos, Next.js mostraba un overlay de error en pantalla completa, incluso cuando el error estaba siendo manejado correctamente por el código.

## Causa Raíz
Next.js en modo desarrollo muestra un overlay de error para TODAS las excepciones que ocurren, incluso si están siendo capturadas y manejadas correctamente por try-catch. Esto es una característica de desarrollo para ayudar a detectar errores.

## Solución Implementada

### 1. Cambios en `lib/api-config.ts`
Para errores HTTP 400 (Bad Request), en lugar de lanzar una excepción, ahora devolvemos una respuesta estructurada:

```typescript
// Para errores 400 (Bad Request), devolver la respuesta como error estructurado
// en lugar de lanzar excepción para evitar el overlay de Next.js
if (response.status === 400) {
  console.log('📦 Returning 400 error as structured response')
  return {
    success: false,
    error: {
      code: 'BAD_REQUEST',
      title: 'Error de Validación',
      message: data.detail || data.message || 'Error en la solicitud',
    }
  } as T
}
```

Esto permite que el error fluya a través del código sin disparar el overlay de Next.js.

### 2. Cambios en `lib/services/feats/leads/lead-service.ts`
Eliminamos los bloques try-catch innecesarios que estaban re-lanzando errores:

**ANTES:**
```typescript
try {
  const response = await apiRequest(...)
  // ... validaciones ...
  return response.codigo_generado
} catch (error) {
  console.error('Error in generarCodigoCliente:', error)
  throw error  // ❌ Esto causaba el overlay
}
```

**DESPUÉS:**
```typescript
const response = await apiRequest(...)
// ... validaciones ...
return response.codigo_generado
// ✅ Los errores se propagan naturalmente sin re-lanzar
```

### 3. Manejo en el Componente
El componente `leads-table.tsx` ya tenía el manejo correcto:
- Abre el diálogo ANTES de hacer la llamada async
- Captura errores en try-catch
- Muestra mensajes de error en el estado del diálogo
- Proporciona botones de acción contextuales

## Resultado
Ahora cuando un lead no tiene provincia_montaje u otros datos requeridos:
1. El diálogo de conversión se abre normalmente
2. El error se captura y se muestra dentro del diálogo
3. NO aparece el overlay de error de Next.js
4. El usuario puede ver el mensaje de error y tomar acción (editar lead, crear oferta, etc.)

## Errores Manejados
- Falta provincia_montaje
- Falta municipio
- Falta oferta confeccionada
- Oferta sin inversor seleccionado
- Material sin marca asignada
- Código de cliente con formato incorrecto

## Notas Técnicas
- Esta solución solo afecta errores HTTP 400 (Bad Request)
- Otros errores (401, 500, etc.) siguen lanzando excepciones normalmente
- En producción, Next.js no muestra el overlay de error de todas formas
- El manejo de errores estructurados sigue funcionando correctamente
