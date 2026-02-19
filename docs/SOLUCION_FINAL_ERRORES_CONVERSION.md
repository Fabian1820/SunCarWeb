# Solución Final: Manejo de Errores en Conversión de Lead a Cliente

## 📅 Fecha
19 de febrero de 2026

## 🎯 Problema Resuelto

**Problema:** Al intentar convertir un lead a cliente sin provincia o municipio, se mostraba una pantalla de error completa que bloqueaba toda la aplicación.

**Solución:** Implementar manejo de errores estructurados en backend y frontend para mostrar errores dentro del diálogo de conversión.

## ✅ Cambios Implementados

### Backend

El backend ahora devuelve errores estructurados en formato JSON:

```json
{
  "success": false,
  "error": {
    "code": "MISSING_PROVINCIA",
    "title": "Información Incompleta",
    "message": "El lead no tiene provincia de montaje. Por favor, completa esta información antes de generar el código.",
    "field": "provincia_montaje"
  }
}
```

**Endpoints actualizados:**
- `GET /leads/{id}/generar-codigo-cliente`
- `POST /leads/{id}/convertir`

### Frontend

#### 1. API Config (`lib/api-config.ts`)

**Cambio clave:** Ahora parsea SIEMPRE la respuesta como JSON y devuelve errores estructurados sin lanzar excepciones:

```typescript
// Si la respuesta tiene estructura de error del backend
// Devolverla tal cual para que el servicio la maneje
// Soporta tanto el formato nuevo (success: false) como el antiguo (detail)
if (data.success === false || (data.detail && !response.ok)) {
  console.log('📦 Returning error response to service for handling')
  return data as T
}
```

#### 2. Servicio de Leads (`lib/services/feats/leads/lead-service.ts`)

**Cambios:**
- Verifica `response.success === false` para detectar errores
- Extrae el mensaje del objeto `error` estructurado
- Mantiene compatibilidad con formato antiguo (`detail`)
- Lanza excepción con mensaje limpio para que el componente lo capture

```typescript
// Verificar si la respuesta indica un error (formato nuevo)
if (response.success === false) {
  if (response.error) {
    // Error estructurado del backend (formato nuevo)
    throw new Error(response.error.message || response.error.title || 'Error...')
  }
  throw new Error(response.message || 'Error...')
}

// Verificar formato antiguo (detail)
if (response.detail) {
  throw new Error(response.detail)
}
```

#### 3. Componente de Leads (`components/feats/leads/leads-table.tsx`)

**Mejoras:**

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
     throw new Error(genError.message)
   }
   ```

3. **Detección de errores específicos:**
   ```typescript
   if (errorMessage.includes('provincia')) {
     setConversionErrors({
       general: 'El lead no tiene provincia de montaje asignada...'
     })
   }
   ```

4. **Botones de acción contextuales:**
   ```typescript
   {conversionErrors.general.includes('provincia') && (
     <Button onClick={() => onEdit(leadToConvert)}>
       Editar Lead
     </Button>
   )}
   ```

## 🔄 Flujo Completo

```
1. Usuario hace clic en "Convertir a cliente"
   ↓
2. Diálogo se abre INMEDIATAMENTE
   ↓
3. Frontend llama a onGenerarCodigo(leadId)
   ↓
4. Hook use-leads llama a LeadService.generarCodigoCliente()
   ↓
5. LeadService llama a apiRequest()
   ↓
6. apiRequest hace fetch al backend
   ↓
7a. Backend devuelve HTTP 200 con success: false
    ↓
    apiRequest parsea JSON y devuelve { success: false, error: {...} }
    ↓
    LeadService detecta success: false
    ↓
    LeadService extrae error.message
    ↓
    LeadService lanza Error(message)
    ↓
    Hook captura error y lo re-lanza
    ↓
    Componente captura error en try-catch
    ↓
    Componente detecta tipo de error (provincia/municipio/oferta)
    ↓
    Componente muestra mensaje en diálogo
    ↓
    Componente muestra botón de acción
    ↓
    Usuario puede cerrar diálogo y continuar
   ↓
7b. Backend devuelve HTTP 200 con success: true
    ↓
    apiRequest devuelve { success: true, codigo_generado: "..." }
    ↓
    LeadService extrae codigo_generado
    ↓
    Componente muestra código en formulario
    ↓
    Usuario completa datos y confirma
```

## 📊 Tipos de Errores Manejados

### Errores de Generación de Código

| Código | Mensaje | Acción |
|--------|---------|--------|
| MISSING_PROVINCIA | "El lead no tiene provincia de montaje..." | Botón "Editar Lead" |
| MISSING_MUNICIPIO | "El lead no tiene municipio..." | Botón "Editar Lead" |
| MISSING_OFERTAS | "El lead no tiene ofertas confeccionadas..." | Botón "Crear Oferta" |
| MISSING_INVERSOR | "La oferta no tiene inversor seleccionado..." | Botón "Crear Oferta" |
| MISSING_MARCA | "El material no tiene marca asignada..." | Mensaje informativo |

### Errores de Conversión

| Código | Mensaje | Acción |
|--------|---------|--------|
| LEAD_NOT_FOUND | "Lead no encontrado" | Mensaje informativo |
| INVALID_STATE | "Estado inválido" | Mensaje informativo |
| INVALID_CODE_FORMAT | "Código con formato incorrecto" | Mensaje informativo |

## 🧪 Pruebas Realizadas

### ✅ Caso 1: Lead sin provincia
- Diálogo se abre normalmente
- Error se muestra dentro del diálogo: "El lead no tiene provincia de montaje asignada..."
- Botón "Editar Lead" aparece
- Al hacer clic, se abre el formulario de edición
- NO se muestra pantalla de error completa

### ✅ Caso 2: Lead sin municipio
- Diálogo se abre normalmente
- Error se muestra dentro del diálogo: "El lead no tiene municipio asignado..."
- Botón "Editar Lead" aparece
- Usuario puede editar y volver a intentar

### ✅ Caso 3: Lead sin oferta confeccionada
- Diálogo se abre normalmente
- Pregunta sobre equipo propio aparece
- Botón "Crear Oferta Confeccionada" funciona
- Usuario puede crear oferta y volver a intentar

### ✅ Caso 4: Lead con todos los datos
- Diálogo se abre normalmente
- Código se genera automáticamente
- Formulario se muestra con código pre-llenado
- Usuario completa y confirma conversión

## 🎯 Beneficios

1. **No más pantallas de error completas:** Los errores se muestran dentro del diálogo
2. **Mensajes contextuales:** Cada tipo de error tiene un mensaje específico y claro
3. **Acciones sugeridas:** Botones que llevan al usuario a solucionar el problema
4. **Mejor UX:** El usuario no pierde el contexto de lo que estaba haciendo
5. **Logs detallados:** Todos los errores se registran en la consola para debugging
6. **Compatibilidad:** Soporta tanto formato nuevo como antiguo de errores

## 📝 Archivos Modificados

### Backend
- `application/services/leads_service.py` - Lógica de negocio con errores estructurados
- `presentation/routers/leads_router.py` - Endpoints que devuelven respuestas estructuradas

### Frontend
- `lib/api-config.ts` - Manejo de respuestas HTTP con errores estructurados
- `lib/services/feats/leads/lead-service.ts` - Procesamiento de errores estructurados
- `components/feats/leads/leads-table.tsx` - UI con manejo robusto de errores
- `hooks/use-leads.ts` - Hook que propaga errores correctamente

### Documentación
- `docs/CONVERSION_LEAD_CLIENTE_ERROR_HANDLING.md` - Documentación del backend
- `docs/FRONTEND_MANEJO_ERRORES_ESTRUCTURADOS.md` - Documentación del frontend
- `docs/SOLUCION_FINAL_ERRORES_CONVERSION.md` - Este documento

## 🔍 Debugging

Si encuentras problemas, verifica en la consola del navegador:

1. **Logs de apiRequest:**
   - `📨 Response received:` - Estado HTTP
   - `📦 Response data:` - JSON recibido
   - `📦 Returning error response to service for handling` - Error siendo devuelto

2. **Logs del servicio:**
   - `LeadService.generarCodigoCliente response:` - Respuesta procesada
   - `Error in generarCodigoCliente:` - Error capturado

3. **Logs del componente:**
   - `Error generating client code:` - Error en el componente
   - Mensaje de error en el diálogo

## 🚀 Próximos Pasos

1. ✅ Backend devuelve errores estructurados
2. ✅ Frontend maneja errores estructurados
3. ✅ UI muestra errores en diálogo
4. ✅ Botones de acción contextuales
5. ⏳ Agregar indicadores visuales en la tabla de leads
6. ⏳ Agregar tooltips explicativos
7. ⏳ Agregar validación en tiempo real

## 📞 Soporte

Para más información, consulta:
- `docs/CONVERSION_LEAD_CLIENTE_ERROR_HANDLING.md` - Documentación del backend
- `docs/FRONTEND_MANEJO_ERRORES_ESTRUCTURADOS.md` - Documentación del frontend
- `docs/RESUMEN_CAMBIOS_FRONTEND_CODIGO_CLIENTE.md` - Cambios en código de cliente
- `docs/MIGRACION_CODIGO_CLIENTE_OFERTA_CONFECCIONADA.md` - Guía de migración

## ✨ Conclusión

El sistema ahora maneja errores de forma elegante y profesional:
- ✅ No bloquea la aplicación
- ✅ Mensajes claros y accionables
- ✅ Guía al usuario para solucionar problemas
- ✅ Mantiene el contexto de trabajo
- ✅ Logs detallados para debugging

El usuario puede trabajar sin interrupciones y resolver problemas de forma intuitiva.
