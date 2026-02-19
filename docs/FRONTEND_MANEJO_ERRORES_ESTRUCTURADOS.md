# Frontend: Manejo de Errores Estructurados

## 📅 Fecha
19 de febrero de 2026

## 🎯 Objetivo
Actualizar el frontend para manejar correctamente los errores estructurados en formato JSON que devuelve el backend, evitando que se muestren pantallas de error completas.

## 🔄 Cambios Realizados

### 1. Servicio de Leads (`lib/services/feats/leads/lead-service.ts`)

#### Método `generarCodigoCliente`

**ANTES:**
```typescript
const response = await apiRequest<{ success: boolean; message: string; codigo_generado: string }>(url)
if (!response.success || !response.codigo_generado) {
  throw new Error(response.message || 'Error al generar el código de cliente')
}
return response.codigo_generado
```

**AHORA:**
```typescript
const response = await apiRequest<{ 
  success: boolean; 
  message?: string; 
  codigo_generado?: string; 
  error?: { 
    code: string; 
    title: string; 
    message: string; 
    field?: string 
  } 
}>(url)

// Verificar si la respuesta indica un error
if (!response.success) {
  if (response.error) {
    // Error estructurado del backend
    throw new Error(response.error.message || response.error.title || 'Error al generar el código de cliente')
  }
  // Error sin estructura
  throw new Error(response.message || 'Error al generar el código de cliente')
}

if (!response.codigo_generado) {
  throw new Error('El servidor no devolvió un código de cliente')
}

return response.codigo_generado
```

#### Método `convertLeadToCliente`

Se aplicó el mismo patrón de manejo de errores estructurados.

### 2. Componente de Tabla de Leads (`components/feats/leads/leads-table.tsx`)

#### Función `openConvertDialog`

**Mejoras implementadas:**

1. **Apertura inmediata del diálogo:**
   ```typescript
   // Abrir el diálogo ANTES de cualquier operación asíncrona
   setIsConvertDialogOpen(true)
   ```

2. **Try-catch anidado para captura robusta:**
   ```typescript
   try {
     codigoGenerado = await onGenerarCodigo(leadId)
   } catch (genError) {
     const genErrorMessage = genError instanceof Error ? genError.message : 'Error al generar el código de cliente'
     throw new Error(genErrorMessage)
   }
   ```

3. **Detección de errores específicos:**
   ```typescript
   if (errorMessage.includes('provincia_montaje') || errorMessage.includes('provincia')) {
     setConversionErrors({
       general: 'El lead no tiene provincia de montaje asignada. Por favor, edita el lead y asigna una provincia antes de convertirlo a cliente.'
     })
   } else if (errorMessage.includes('municipio')) {
     setConversionErrors({
       general: 'El lead no tiene municipio asignado. Por favor, edita el lead y asigna un municipio antes de convertirlo a cliente.'
     })
   }
   ```

4. **Botones de acción contextuales:**
   ```typescript
   {(conversionErrors.general.includes('provincia') || 
     conversionErrors.general.includes('municipio')) && (
     <Button onClick={() => {
       closeConvertDialog()
       if (leadToConvert) {
         onEdit(leadToConvert)
       }
     }}>
       Editar Lead
     </Button>
   )}
   ```

## 📊 Estructura de Errores del Backend

El backend ahora devuelve errores en este formato:

```json
{
  "success": false,
  "error": {
    "code": "MISSING_PROVINCIA",
    "title": "Información Incompleta",
    "message": "El lead no tiene provincia de montaje. Por favor, completa esta información antes de convertir a cliente.",
    "field": "provincia_montaje"
  }
}
```

## 🎯 Flujo de Manejo de Errores

```
1. Usuario hace clic en "Convertir a cliente"
   ↓
2. Diálogo se abre INMEDIATAMENTE
   ↓
3. Se intenta generar el código
   ↓
4a. ÉXITO:
    - Código se muestra en el formulario
    - Usuario completa datos adicionales
    - Confirma conversión
   ↓
4b. ERROR:
    - Error se captura en try-catch
    - Se detecta el tipo de error
    - Se muestra mensaje específico en el diálogo
    - Se ofrece botón de acción (Editar Lead, Crear Oferta, etc.)
    - Usuario puede cerrar el diálogo y continuar trabajando
```

## ✅ Beneficios

1. **No más pantallas de error completas:** Los errores se muestran dentro del diálogo
2. **Mensajes contextuales:** Cada tipo de error tiene un mensaje específico
3. **Acciones sugeridas:** Botones que llevan al usuario a solucionar el problema
4. **Mejor UX:** El usuario no pierde el contexto de lo que estaba haciendo
5. **Logs detallados:** Todos los errores se registran en la consola para debugging

## 🔍 Tipos de Errores Manejados

### Errores de Datos Faltantes

| Error | Mensaje | Acción |
|-------|---------|--------|
| Sin provincia | "El lead no tiene provincia de montaje asignada..." | Botón "Editar Lead" |
| Sin municipio | "El lead no tiene municipio asignado..." | Botón "Editar Lead" |
| Sin oferta confeccionada | "Este lead necesita una oferta confeccionada..." | Botón "Crear Oferta Confeccionada" |
| Sin inversor | "La oferta confeccionada debe tener un inversor..." | Botón "Crear Oferta Confeccionada" |

### Errores de Configuración

| Error | Mensaje | Acción |
|-------|---------|--------|
| Material sin marca | "El material inversor no tiene marca asignada..." | Mensaje informativo |
| Formato incorrecto | "El código generado tiene un formato incorrecto..." | Mensaje informativo |

### Errores de Validación

| Error | Mensaje | Acción |
|-------|---------|--------|
| Lead sin ID | "El lead no tiene ID válido" | Mensaje informativo |
| Código inválido | "El código generado tiene un formato inválido..." | Mensaje informativo |

## 🧪 Pruebas Realizadas

### Caso 1: Lead sin provincia
- ✅ Diálogo se abre normalmente
- ✅ Error se muestra dentro del diálogo
- ✅ Botón "Editar Lead" aparece
- ✅ Al hacer clic, se abre el formulario de edición
- ✅ No se muestra pantalla de error completa

### Caso 2: Lead sin oferta confeccionada
- ✅ Diálogo se abre normalmente
- ✅ Pregunta sobre equipo propio aparece
- ✅ Botón "Crear Oferta Confeccionada" funciona
- ✅ No se muestra pantalla de error completa

### Caso 3: Equipo propio sin provincia
- ✅ Diálogo se abre normalmente
- ✅ Error se captura al intentar generar código
- ✅ Mensaje específico se muestra
- ✅ Botón "Editar Lead" aparece
- ✅ No se muestra pantalla de error completa

## 📝 Notas Técnicas

### Por qué abrir el diálogo inmediatamente

**Problema anterior:**
```typescript
// El diálogo se abría al final
try {
  await onGenerarCodigo(leadId)
} catch (error) {
  // Error se capturaba aquí
}
setIsConvertDialogOpen(true) // ❌ Demasiado tarde
```

Si el error ocurría antes de abrir el diálogo, Next.js lo capturaba y mostraba la pantalla de error completa.

**Solución:**
```typescript
// Abrir el diálogo PRIMERO
setIsConvertDialogOpen(true) // ✅ Inmediatamente

try {
  await onGenerarCodigo(leadId)
} catch (error) {
  // Error se muestra dentro del diálogo
}
```

Ahora el error se captura dentro del contexto del diálogo abierto, evitando que Next.js lo capture.

### Try-catch anidado

```typescript
try {
  // Try-catch interno para captura específica
  try {
    codigoGenerado = await onGenerarCodigo(leadId)
  } catch (genError) {
    throw new Error(genError.message)
  }
  
  // Validaciones adicionales
  if (codigoGenerado.length !== 10) {
    throw new Error('Formato incorrecto')
  }
  
} catch (error) {
  // Catch externo para manejo unificado
  setConversionErrors({ general: error.message })
}
```

Esto asegura que TODOS los errores se capturen y manejen correctamente.

## 🔗 Archivos Relacionados

- `lib/services/feats/leads/lead-service.ts` - Servicio actualizado
- `components/feats/leads/leads-table.tsx` - Componente actualizado
- `hooks/use-leads.ts` - Hook que usa el servicio
- `app/leads/page.tsx` - Página que usa el componente

## 📞 Soporte

Para más información, consulta:
- `docs/RESUMEN_CAMBIOS_FRONTEND_CODIGO_CLIENTE.md` - Cambios en el código de cliente
- `docs/MIGRACION_CODIGO_CLIENTE_OFERTA_CONFECCIONADA.md` - Guía de migración
- `docs/FRONTEND_CAMBIOS_CODIGO_CLIENTE.md` - Documentación completa de cambios

## 🎓 Lecciones Aprendidas

1. **Abrir UI antes de operaciones asíncronas:** Evita que los errores se propaguen fuera del contexto
2. **Try-catch anidados:** Proporcionan captura robusta de errores
3. **Errores estructurados:** Facilitan el manejo y la presentación de mensajes
4. **Acciones contextuales:** Mejoran la UX al ofrecer soluciones inmediatas
5. **Logs detallados:** Facilitan el debugging en producción
