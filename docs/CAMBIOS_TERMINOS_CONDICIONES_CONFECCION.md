# Cambios: Agregar Términos y Condiciones en Exportación de Ofertas Confeccionadas

## Problema Identificado

Los términos y condiciones **NO se estaban exportando** en los PDFs generados desde las vistas de confección y ofertas confeccionadas.

### Causa Raíz Principal: Error 401 Unauthorized

El endpoint `/api/terminos-condiciones/activo` requiere autenticación, pero las peticiones se estaban haciendo con `fetch` directo **sin incluir el token de autorización**.

```
❌ Error en la respuesta del servidor: 401 (Unauthorized)
```

### Causas Secundarias

1. ❌ El componente `confeccion-ofertas-view.tsx` no estaba cargando los términos
2. ❌ Las peticiones usaban `fetch` en lugar de `apiRequest` (que incluye el token automáticamente)

---

## Solución Implementada

### 1. Usar `apiRequest` en lugar de `fetch`

**Antes (❌ Incorrecto):**
```typescript
const response = await fetch(`${API_BASE_URL}/api/terminos-condiciones/activo`)
```

**Después (✅ Correcto):**
```typescript
const { apiRequest } = await import('@/lib/api-config')
const result = await apiRequest<{
  success: boolean
  data?: {
    id: string
    texto: string
    activo: boolean
  }
}>('/terminos-condiciones/activo', {
  method: 'GET'
})
```

### 2. Agregar Estado para Términos y Condiciones en confeccion-ofertas-view.tsx

**Archivo:** `components/feats/ofertas/confeccion-ofertas-view.tsx`  
**Línea:** ~183

```typescript
const [terminosCondiciones, setTerminosCondiciones] = useState<string | null>(null)
```

### 3. Agregar useEffect para Cargar Términos

**Archivos modificados:**
- `components/feats/ofertas/confeccion-ofertas-view.tsx` (línea ~477)
- `components/feats/ofertas/ofertas-confeccionadas-view.tsx` (línea ~133)

```typescript
// Cargar términos y condiciones
useEffect(() => {
  const cargarTerminos = async () => {
    try {
      const { apiRequest } = await import('@/lib/api-config')
      const result = await apiRequest<{
        success: boolean
        data?: {
          id: string
          texto: string
          activo: boolean
        }
      }>('/terminos-condiciones/activo', {
        method: 'GET'
      })
      
      if (result.success && result.data) {
        setTerminosCondiciones(result.data.texto)
      }
    } catch (error) {
      console.error('Error cargando términos y condiciones:', error)
    }
  }
  cargarTerminos()
}, [])
```

### 4. Agregar `terminosCondiciones` en las Funciones de Exportación

#### En confeccion-ofertas-view.tsx:

**A. exportOptionsCompleto** (línea ~1612)
```typescript
componentesPrincipales: (() => { /* ... */ })(),
terminosCondiciones: terminosCondiciones || undefined,
```

**B. exportOptionsSinPrecios** (línea ~1906)
```typescript
componentesPrincipales: (() => { /* ... */ })(),
terminosCondiciones: terminosCondiciones || undefined,
```

**C. exportOptionsClienteConPrecios** (línea ~2234)
```typescript
componentesPrincipales: (() => { /* ... */ })(),
terminosCondiciones: terminosCondiciones || undefined,
```

**Dependencias actualizadas en los 3 useMemo:**
```typescript
}, [
  // ... dependencias existentes ...
  terminosCondiciones, // ← AGREGADO
])
```

---

## Verificación

### ✅ Cambios Aplicados

1. ✅ Cambiado `fetch` por `apiRequest` en `ofertas-confeccionadas-view.tsx`
2. ✅ Cambiado `fetch` por `apiRequest` en `confeccion-ofertas-view.tsx`
3. ✅ Estado `terminosCondiciones` agregado en `confeccion-ofertas-view.tsx`
4. ✅ useEffect para cargar términos agregado en ambos archivos
5. ✅ `terminosCondiciones` agregado en las 3 funciones de exportación
6. ✅ Dependencia `terminosCondiciones` agregada en los 3 useMemo

### Cómo Funciona Ahora

1. **Al cargar el componente:** Se hace una petición autenticada al endpoint `/terminos-condiciones/activo`
2. **El token se incluye automáticamente:** `apiRequest` agrega el header `Authorization: Bearer <token>`
3. **Si hay términos activos:** Se guardan en el estado `terminosCondiciones`
4. **Al exportar:** Los términos se pasan en las opciones de exportación
5. **En el PDF:** El servicio `export-service.ts` agrega una nueva página con los términos al final

---

## Resultado Esperado

Ahora, al exportar ofertas desde ambas vistas:

### Desde Confección de Ofertas:
- ✅ **PDF Completo:** Incluye términos y condiciones al final
- ✅ **PDF Sin Precios:** Incluye términos y condiciones al final
- ✅ **PDF Cliente con Precios:** Incluye términos y condiciones al final

### Desde Ofertas Confeccionadas:
- ✅ **PDF Completo:** Incluye términos y condiciones al final
- ✅ **PDF Sin Precios:** Incluye términos y condiciones al final
- ✅ **PDF Cliente con Precios:** Incluye términos y condiciones al final

Los términos se muestran en una nueva página después de todos los datos de la oferta, con formato profesional y legible.

---

## Archivos Modificados

1. `components/feats/ofertas/confeccion-ofertas-view.tsx`
2. `components/feats/ofertas/ofertas-confeccionadas-view.tsx`

## Archivos NO Modificados (ya funcionaban correctamente)

- `lib/export-service.ts` ✅ (ya tenía la funcionalidad de renderizar términos)
- `components/shared/molecule/export-buttons.tsx` ✅
- `components/feats/ofertas/export-selection-dialog.tsx` ✅

---

## Diferencia Clave: fetch vs apiRequest

### ❌ fetch (Incorrecto)
```typescript
const response = await fetch(`${API_BASE_URL}/api/terminos-condiciones/activo`)
```
- No incluye el token de autorización
- Devuelve 401 Unauthorized
- Los términos no se cargan

### ✅ apiRequest (Correcto)
```typescript
const { apiRequest } = await import('@/lib/api-config')
const result = await apiRequest('/terminos-condiciones/activo', { method: 'GET' })
```
- Incluye automáticamente el token de autorización
- Devuelve 200 OK con los datos
- Los términos se cargan correctamente

---

## Notas Técnicas

- Los términos se cargan **una sola vez** al montar el componente
- Si no hay términos activos en la BD, no se muestra nada (no genera error)
- El campo `terminosCondiciones` es opcional (`|| undefined`), por lo que no rompe la exportación si falla la carga
- El formato HTML de los términos se convierte automáticamente a texto plano en el PDF
- `apiRequest` maneja automáticamente:
  - Token de autorización
  - Manejo de errores
  - Logging de peticiones
  - Configuración de headers

---

## Console.logs de Debugging (Temporales)

Se agregaron console.logs en `ofertas-confeccionadas-view.tsx` para verificar que los términos se cargan correctamente:

```typescript
console.log('✅ Términos y condiciones cargados:', result.data.texto.substring(0, 100) + '...')
console.log('📄 Pasando términos a exportOptionsCompleto:', terminosCondiciones ? 'SÍ (' + terminosCondiciones.length + ' caracteres)' : 'NO')
```

Estos logs pueden ser removidos una vez verificado que todo funciona correctamente.

---

## Fecha de Implementación

**Fecha:** 4 de febrero de 2026  
**Implementado por:** Kiro AI Assistant  
**Problema resuelto:** Error 401 Unauthorized al cargar términos y condiciones
