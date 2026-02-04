# Debug: Términos y Condiciones No Se Exportan

## Problema Reportado

Los términos y condiciones **NO se están exportando** en los PDFs, ni desde:
- ❌ `confeccion-ofertas-view.tsx` (ya corregido)
- ❌ `ofertas-confeccionadas-view.tsx` (reportado ahora)

## Console.logs Agregados para Debugging

He agregado 4 puntos de debugging para rastrear el flujo de los términos:

### 1. Al cargar términos desde el backend
**Archivo:** `components/feats/ofertas/ofertas-confeccionadas-view.tsx`  
**Línea:** ~140

```typescript
if (result.success && result.data) {
  console.log('✅ Términos y condiciones cargados:', result.data.texto.substring(0, 100) + '...')
  setTerminosCondiciones(result.data.texto)
} else {
  console.warn('⚠️ No se encontraron términos y condiciones activos')
}
```

### 2. Al pasar términos a exportOptions
**Archivo:** `components/feats/ofertas/ofertas-confeccionadas-view.tsx`  
**Línea:** ~744

```typescript
terminosCondiciones: (() => {
  console.log('📄 Pasando términos a exportOptionsCompleto:', terminosCondiciones ? 'SÍ (' + terminosCondiciones.length + ' caracteres)' : 'NO')
  return terminosCondiciones || undefined
})(),
```

### 3. En ExportSelectionDialog
**Archivo:** `components/feats/ofertas/export-selection-dialog.tsx`  
**Línea:** ~234

```typescript
console.log('🔍 ExportSelectionDialog - Términos en exportOptions:', {
  completo: exportOptions.exportOptionsCompleto.terminosCondiciones ? 'SÍ' : 'NO',
  sinPrecios: exportOptions.exportOptionsSinPrecios.terminosCondiciones ? 'SÍ' : 'NO',
  clienteConPrecios: exportOptions.exportOptionsClienteConPrecios.terminosCondiciones ? 'SÍ' : 'NO',
})
```

### 4. En el servicio de exportación
**Archivo:** `lib/export-service.ts`  
**Línea:** ~234

```typescript
console.log('📄 exportToPDF - Términos y condiciones:', options.terminosCondiciones ? 'SÍ (' + options.terminosCondiciones.length + ' caracteres)' : 'NO')
```

---

## Cómo Debuggear

1. **Abrir la consola del navegador** (F12 → Console)
2. **Ir a la vista de ofertas confeccionadas**
3. **Hacer clic en "Exportar" en una oferta**
4. **Observar los mensajes en la consola**

### Escenarios Posibles

#### Escenario A: No se cargan los términos
```
❌ Error en la respuesta del servidor: 404
```
o
```
⚠️ No se encontraron términos y condiciones activos
```

**Solución:** Verificar que:
- El endpoint `/api/terminos-condiciones/activo` existe en el backend
- Hay términos y condiciones activos en la base de datos
- La variable de entorno `NEXT_PUBLIC_API_URL` está configurada correctamente

#### Escenario B: Se cargan pero no se pasan
```
✅ Términos y condiciones cargados: <div class="terminos-condiciones">...
📄 Pasando términos a exportOptionsCompleto: NO
```

**Solución:** Hay un problema con el estado de React. Los términos se cargan pero el componente no se re-renderiza.

#### Escenario C: Se pasan pero no llegan al dialog
```
✅ Términos y condiciones cargados: <div class="terminos-condiciones">...
📄 Pasando términos a exportOptionsCompleto: SÍ (3424 caracteres)
🔍 ExportSelectionDialog - Términos en exportOptions: { completo: 'NO', ... }
```

**Solución:** El problema está en cómo se pasan las props al `ExportSelectionDialog`.

#### Escenario D: Llegan al dialog pero no al servicio
```
✅ Términos y condiciones cargados: <div class="terminos-condiciones">...
📄 Pasando términos a exportOptionsCompleto: SÍ (3424 caracteres)
🔍 ExportSelectionDialog - Términos en exportOptions: { completo: 'SÍ', ... }
📄 exportToPDF - Términos y condiciones: NO
```

**Solución:** El problema está en el spread operator de `ExportSelectionDialog`. Los términos no se están copiando correctamente.

#### Escenario E: Todo llega correctamente
```
✅ Términos y condiciones cargados: <div class="terminos-condiciones">...
📄 Pasando términos a exportOptionsCompleto: SÍ (3424 caracteres)
🔍 ExportSelectionDialog - Términos en exportOptions: { completo: 'SÍ', ... }
📄 exportToPDF - Términos y condiciones: SÍ (3424 caracteres)
```

**Solución:** Los términos SÍ están llegando. El problema está en la función `exportToPDF` que no los está renderizando correctamente.

---

## Posibles Causas y Soluciones

### Causa 1: El endpoint no existe o no devuelve datos

**Verificar:**
```bash
curl http://localhost:3001/api/terminos-condiciones/activo
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Términos y condiciones obtenidos",
  "data": {
    "id": "...",
    "texto": "<div class=\"terminos-condiciones\">...</div>",
    "activo": true
  }
}
```

**Si no funciona:**
- Verificar que el backend esté corriendo
- Verificar que la ruta esté registrada en el backend
- Verificar que haya términos activos en la BD

### Causa 2: CORS o problema de red

**Síntomas:**
- Error en la consola: `CORS policy` o `Failed to fetch`

**Solución:**
- Verificar que el backend permita peticiones desde el frontend
- Verificar que `NEXT_PUBLIC_API_URL` esté configurado correctamente

### Causa 3: Los términos no se están copiando en ExportSelectionDialog

**Problema:**
El spread operator `...exportOptions.exportOptionsCompleto` debería copiar todos los campos, pero por alguna razón no lo hace.

**Solución:**
Modificar `ExportSelectionDialog` para copiar explícitamente los términos:

```typescript
return {
  exportOptionsCompleto: {
    ...exportOptions.exportOptionsCompleto,
    data: filtrarItems(exportOptions.exportOptionsCompleto.data),
    terminosCondiciones: exportOptions.exportOptionsCompleto.terminosCondiciones, // ← AGREGAR
  },
  exportOptionsSinPrecios: {
    ...exportOptions.exportOptionsSinPrecios,
    data: filtrarItems(exportOptions.exportOptionsSinPrecios.data),
    terminosCondiciones: exportOptions.exportOptionsSinPrecios.terminosCondiciones, // ← AGREGAR
  },
  exportOptionsClienteConPrecios: {
    ...exportOptions.exportOptionsClienteConPrecios,
    data: filtrarItems(exportOptions.exportOptionsClienteConPrecios.data),
    terminosCondiciones: exportOptions.exportOptionsClienteConPrecios.terminosCondiciones, // ← AGREGAR
  },
}
```

### Causa 4: La función exportToPDF no está renderizando los términos

**Verificar:**
Buscar en `lib/export-service.ts` la sección que renderiza los términos (línea ~820):

```typescript
// ========== TÉRMINOS Y CONDICIONES ==========
if (options.terminosCondiciones) {
  // Agregar nueva página para términos
  doc.addPage()
  yPosition = 15
  // ... código de renderizado
}
```

**Si esta sección no existe o está comentada:**
- Los términos no se renderizarán aunque lleguen correctamente

---

## Próximos Pasos

1. **Ejecutar la aplicación** y abrir la consola
2. **Intentar exportar una oferta**
3. **Revisar los mensajes de la consola**
4. **Identificar en qué punto se pierden los términos**
5. **Aplicar la solución correspondiente**

---

## Archivos Modificados para Debugging

- ✅ `components/feats/ofertas/ofertas-confeccionadas-view.tsx`
- ✅ `components/feats/ofertas/export-selection-dialog.tsx`
- ✅ `lib/export-service.ts`

---

## Nota Importante

Los console.logs agregados son **temporales** para debugging. Una vez identificado y solucionado el problema, deberían ser removidos o comentados para no contaminar la consola en producción.

---

**Fecha:** 4 de febrero de 2026  
**Creado por:** Kiro AI Assistant
