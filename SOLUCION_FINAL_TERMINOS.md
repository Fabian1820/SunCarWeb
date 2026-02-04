# ✅ Solución Final: Términos y Condiciones en PDFs

## 🎯 Problema Resuelto

Los términos y condiciones **NO se exportaban** en los PDFs de ofertas.

## 🔍 Causa Raíz

**Error 401 Unauthorized** al intentar cargar los términos:

```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
❌ Error en la respuesta del servidor: 401
```

### ¿Por qué?

El código usaba `fetch` directo **sin incluir el token de autenticación**:

```typescript
// ❌ INCORRECTO - Sin token
const response = await fetch(`${API_BASE_URL}/api/terminos-condiciones/activo`)
```

El endpoint `/api/terminos-condiciones/activo` requiere autenticación, por lo que devolvía 401.

## ✅ Solución Aplicada

Cambiar `fetch` por `apiRequest` que **incluye automáticamente el token**:

```typescript
// ✅ CORRECTO - Con token automático
const { apiRequest } = await import('@/lib/api-config')
const result = await apiRequest('/terminos-condiciones/activo', {
  method: 'GET'
})
```

## 📝 Archivos Modificados

### 1. `components/feats/ofertas/ofertas-confeccionadas-view.tsx`

**Cambio:** Usar `apiRequest` en lugar de `fetch`

**Antes:**
```typescript
const response = await fetch(`${API_BASE_URL}/api/terminos-condiciones/activo`)
if (response.ok) {
  const result = await response.json()
  // ...
}
```

**Después:**
```typescript
const { apiRequest } = await import('@/lib/api-config')
const result = await apiRequest<{
  success: boolean
  data?: { id: string; texto: string; activo: boolean }
}>('/terminos-condiciones/activo', { method: 'GET' })

if (result.success && result.data) {
  setTerminosCondiciones(result.data.texto)
}
```

### 2. `components/feats/ofertas/confeccion-ofertas-view.tsx`

**Cambios:**
1. ✅ Agregado estado `terminosCondiciones`
2. ✅ Agregado useEffect con `apiRequest` (no `fetch`)
3. ✅ Agregado `terminosCondiciones` en las 3 funciones de exportación

## 🎉 Resultado

Ahora los términos y condiciones se exportan correctamente en **todos los PDFs**:

### Desde Confección de Ofertas:
- ✅ PDF Completo
- ✅ PDF Sin Precios
- ✅ PDF Cliente con Precios

### Desde Ofertas Confeccionadas:
- ✅ PDF Completo
- ✅ PDF Sin Precios
- ✅ PDF Cliente con Precios

## 🔑 Lección Aprendida

**Siempre usar `apiRequest` para peticiones autenticadas:**

```typescript
// ❌ NO HACER
fetch(`${API_BASE_URL}/api/endpoint`)

// ✅ HACER
const { apiRequest } = await import('@/lib/api-config')
apiRequest('/endpoint', { method: 'GET' })
```

`apiRequest` maneja automáticamente:
- ✅ Token de autorización
- ✅ Headers correctos
- ✅ Manejo de errores
- ✅ Logging de peticiones

## 📊 Verificación

Para verificar que funciona:

1. Abrir la consola del navegador (F12)
2. Ir a ofertas confeccionadas o confección
3. Intentar exportar una oferta
4. Deberías ver:
   ```
   ✅ Términos y condiciones cargados: <div class="terminos-condiciones">...
   📄 Pasando términos a exportOptionsCompleto: SÍ (3424 caracteres)
   ```
5. El PDF generado debe tener una página adicional al final con los términos

## 🗑️ Limpieza Pendiente

Los console.logs agregados para debugging pueden ser removidos:

**En `ofertas-confeccionadas-view.tsx`:**
- Línea ~140: `console.log('✅ Términos y condiciones cargados:...')`
- Línea ~744: `console.log('📄 Pasando términos a exportOptionsCompleto:...')`

**En `export-selection-dialog.tsx`:**
- Línea ~234: `console.log('🔍 ExportSelectionDialog - Términos en exportOptions:...')`

**En `lib/export-service.ts`:**
- Línea ~234: `console.log('📄 exportToPDF - Términos y condiciones:...')`

---

**Fecha:** 4 de febrero de 2026  
**Problema:** Error 401 al cargar términos  
**Solución:** Usar `apiRequest` en lugar de `fetch`  
**Estado:** ✅ RESUELTO
