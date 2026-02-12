# Solución: Botones de Oferta Verde y Recargas Constantes

## Problemas Identificados

### 1. Botones no se ven verdes al cargar
- **Causa**: El `useEffect` de verificación progresiva tenía `clientesConOferta` en las dependencias
- **Efecto**: Creaba un ciclo infinito donde cada actualización del estado disparaba una nueva verificación

### 2. Recargas constantes
- **Causa**: Múltiples problemas de dependencias circulares:
  - `clientesConOferta` en dependencias del efecto que lo modifica
  - Recarga en segundo plano con `skipCache: true` después de cada carga inicial
  - Falta de flag para prevenir verificaciones simultáneas

### 3. Endpoints duplicados
- **Causa**: El código intentaba múltiples URLs por cada request
- **Efecto**: Requests fallidos innecesarios y logs de error confusos

## Soluciones Implementadas

### 1. Eliminación de Dependencias Circulares

**Antes:**
```typescript
useEffect(() => {
  // ...
}, [filteredClients, cargaSetOfertasTerminada, clientesConOferta, obtenerOfertaPorCliente])
```

**Después:**
```typescript
useEffect(() => {
  // ...
}, [filteredClients, cargaSetOfertasTerminada, obtenerOfertaPorCliente])
```

### 2. Flag de Verificación en Progreso

**Agregado:**
```typescript
const verificacionEnProgresoRef = useRef(false)

useEffect(() => {
  if (verificacionEnProgresoRef.current) return
  verificacionEnProgresoRef.current = true
  
  // ... lógica de verificación
  
  return () => {
    verificacionEnProgresoRef.current = false
  }
}, [filteredClients, cargaSetOfertasTerminada, obtenerOfertaPorCliente])
```

### 3. Eliminación de Recarga en Segundo Plano

**Antes:**
```typescript
const ok = await cargarClientesConOfertas()
if (ok) {
  // Esto causaba recargas constantes
  cargarClientesConOfertas({ skipCache: true, silent: true })
  return
}
```

**Después:**
```typescript
const ok = await cargarClientesConOfertas()
if (ok) {
  // Sin recarga adicional
  return
}
```

### 4. Centralización de Endpoints

**Creado:** `lib/api-endpoints.ts`

```typescript
const API_BASE = '/api/ofertas/confeccion'

export const OFERTAS_CONFECCION_ENDPOINTS = {
  CLIENTES_CON_OFERTAS: `${API_BASE}/clientes-con-ofertas`,
  OFERTAS_CLIENTE: (numero: string) => `${API_BASE}/cliente/${numero}`,
  // ... más endpoints
}

export function buildApiUrl(endpoint: string): string {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.suncarsrl.com'
  const apiUrl = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`
  
  if (endpoint.startsWith('/api/')) {
    return `${backendUrl.replace(/\/api$/, '')}${endpoint}`
  }
  
  return `${apiUrl}${endpoint}`
}
```

### 5. Simplificación de Requests

**Antes (múltiples URLs):**
```typescript
const urls = [
  `${apiUrl}/ofertas-confeccion/clientes-con-ofertas`,
  `${apiUrl}/ofertas-confeccion/clientes-con-ofertas/`,
]

const attempts = urls.map(async (url) => {
  // Intentar cada URL
})
```

**Después (una sola URL correcta):**
```typescript
const url = buildApiUrl(OFERTAS_CONFECCION_ENDPOINTS.CLIENTES_CON_OFERTAS)

const response = await fetch(url, {
  method: 'GET',
  headers: getCommonHeaders(),
})
```

## Archivos Modificados

1. **components/feats/customer-service/clients-table.tsx**
   - Eliminada dependencia circular en `useEffect`
   - Agregado `verificacionEnProgresoRef`
   - Eliminada recarga en segundo plano
   - Simplificada lógica de `cargarClientesConOfertas`

2. **hooks/use-ofertas-confeccion.ts**
   - Importadas utilidades de `lib/api-endpoints.ts`
   - Simplificado `obtenerNumerosClientesConOfertas` (una sola URL)
   - Simplificado `obtenerOfertaPorCliente` (una sola URL)
   - Mejorados logs con emojis para debugging

3. **lib/api-endpoints.ts** (NUEVO)
   - Centralización de endpoints
   - Utilidades para construcción de URLs
   - Utilidades para headers comunes

## Resultados Esperados

✅ **Botones verdes desde el inicio**: Los clientes con ofertas mostrarán el botón verde inmediatamente al cargar la página

✅ **Sin recargas constantes**: La verificación se ejecuta una sola vez al montar el componente

✅ **Mejor performance**: Menos requests HTTP innecesarios

✅ **Código más limpio**: Endpoints centralizados y fáciles de mantener

✅ **Mejor debugging**: Logs claros con emojis para identificar el flujo

## Flujo de Carga Optimizado

1. **Carga inicial**: Se obtiene el set completo de clientes con ofertas del endpoint
2. **Cache**: Se guarda en localStorage por 5 minutos
3. **Verificación progresiva**: Solo para clientes no verificados (máximo 40)
4. **Sin recargas**: No hay verificaciones adicionales en segundo plano
5. **Refresh manual**: Solo cuando se dispara el evento `refreshClientsTable`

## Mantenimiento Futuro

Para agregar nuevos endpoints:

1. Agregar en `lib/api-endpoints.ts`:
```typescript
export const OFERTAS_CONFECCION_ENDPOINTS = {
  // ... existentes
  NUEVO_ENDPOINT: `${API_BASE}/nuevo-endpoint`,
}
```

2. Usar en el código:
```typescript
const url = buildApiUrl(OFERTAS_CONFECCION_ENDPOINTS.NUEVO_ENDPOINT)
const response = await fetch(url, {
  method: 'GET',
  headers: getCommonHeaders(),
})
```

## Testing

Para verificar que funciona correctamente:

1. Abrir la consola del navegador
2. Buscar logs con emojis:
   - 🌐 = Request iniciado
   - ✅ = Éxito
   - ❌ = Error
   - ℹ️ = Información
   - 💥 = Error crítico
   - 📡 = Response recibido
   - 📦 = Data parseado

3. Verificar que:
   - Solo hay UNA carga inicial de clientes con ofertas
   - Los botones verdes aparecen inmediatamente
   - No hay recargas constantes en la consola
   - La verificación progresiva solo se ejecuta una vez
