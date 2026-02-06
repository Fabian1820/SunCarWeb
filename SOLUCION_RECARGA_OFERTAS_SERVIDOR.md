# Solución: Recarga de Ofertas desde Servidor

## Problema
Cuando se eliminaba una oferta directamente de la base de datos, el botón seguía mostrándose en verde porque el frontend usaba datos cacheados en localStorage.

## Solución Implementada

### 1. Recarga desde Servidor al Montar Componente ✅

**Cambio en `components/feats/customer-service/clients-table.tsx`:**

```typescript
// Cargar set de clientes con ofertas al montar el componente
// SIEMPRE ignora el cache para obtener datos frescos del servidor
useEffect(() => {
  let activo = true
  const reintentosMs = [0, 500, 1500, 3000]

  const intentarCarga = async () => {
    for (const delay of reintentosMs) {
      if (!activo) return
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay))
        if (!activo) return
      }

      try {
        console.log('🔄 Cargando clientes con ofertas desde servidor (ignorando cache)')
        // IMPORTANTE: skipCache: true para siempre obtener datos frescos al recargar la página
        const ok = await cargarClientesConOfertas({ skipCache: true })
        if (ok) {
          console.log('✅ Clientes con ofertas cargados exitosamente desde servidor')
          return
        }
      } catch (error) {
        console.error('Error cargando clientes con ofertas:', error)
        if (activo) setCargaSetOfertasTerminada(true)
      }
    }
  }

  intentarCarga().catch((error) => {
    console.error('Error en reintentos de clientes con ofertas:', error)
    if (activo) setCargaSetOfertasTerminada(true)
  })

  return () => {
    activo = false
  }
}, [cargarClientesConOfertas])
```

**Resultado:**
- ✅ Cada vez que recargas la página, se consulta al servidor
- ✅ Se ignora el cache de localStorage
- ✅ Los botones reflejan el estado real de la base de datos

### 2. Verificación en Tiempo Real al Hacer Clic ✅

**Cambio en `openAsignarOfertaDialog`:**

```typescript
// SIEMPRE verificar con el servidor, sin importar si está en el set local
// Esto asegura que detectemos ofertas eliminadas directamente de la BD
console.log('🔍 Verificando oferta en servidor para cliente:', numeroCliente)
const result = await obtenerOfertaPorCliente(numeroCliente)

if (result.success && result.oferta) {
  // Cliente tiene oferta - actualizar set local si no estaba
  if (!clientesConOferta.has(numeroCliente)) {
    console.log('✅ Cliente tiene oferta pero no estaba en el set - agregando')
    setClientesConOferta((prev) => {
      const next = new Set(prev)
      next.add(numeroCliente)
      return next
    })
  }
  // Mostrar oferta
} else {
  // Cliente NO tiene oferta
  if (clientesConOferta.has(numeroCliente)) {
    console.log('⚠️ Cliente estaba en el set pero ya no tiene oferta - removiendo')
    removerClienteDelSet(numeroCliente)
  }
  // Mostrar diálogo para asignar
}
```

**Resultado:**
- ✅ Cada clic verifica con el servidor
- ✅ Detecta ofertas eliminadas directamente de la BD
- ✅ Actualiza el estado local automáticamente

### 3. Evento Global al Eliminar desde Interfaz ✅

**Cambio en `hooks/use-ofertas-confeccion.ts`:**

```typescript
const eliminarOferta = useCallback(async (id: string) => {
  try {
    await apiRequest(`/ofertas/confeccion/${id}`, { method: 'DELETE' })

    toast({
      title: 'Oferta eliminada',
      description: 'La oferta se eliminó correctamente',
    })

    // Disparar evento global para que otros componentes se enteren
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ofertaEliminada', { detail: { ofertaId: id } }))
    }

    await fetchOfertas()
  } catch (error: any) {
    // ...
  }
}, [toast, fetchOfertas])
```

**Listener en `clients-table.tsx`:**

```typescript
const handleOfertaEliminada = () => {
  console.log('🗑️ Oferta eliminada - Invalidando cache y recargando')
  // Invalidar cache
  if (typeof window !== 'undefined') {
    localStorage.removeItem('clientes_con_ofertas_cache_v2')
  }
  // Recargar desde el servidor
  cargarClientesConOfertas({ skipCache: true })
}

window.addEventListener('ofertaEliminada', handleOfertaEliminada)
```

**Resultado:**
- ✅ Al eliminar desde la interfaz, se invalida el cache
- ✅ Se recarga automáticamente desde el servidor
- ✅ Todos los botones se actualizan inmediatamente

### 4. Logs Mejorados para Debugging 📊

**Agregados en `obtenerNumerosClientesConOfertas`:**

```typescript
if (skipCache) {
  console.log('🔄 Ignorando cache - consultando servidor directamente')
}

if (isFresh && cachedNumeros) {
  console.log('✅ Usando cache de clientes con ofertas:', cachedNumeros.length)
  return { success: true, numeros_clientes: cachedNumeros }
} else {
  console.log('⏰ Cache expirado o inválido - consultando servidor')
}

console.log('✅ Clientes con oferta cargados desde servidor:', numeros.length)
console.log('💾 Cache actualizado con', numeros.length, 'clientes')
```

## Flujos Completos

### Flujo 1: Recarga de Página

```
Usuario recarga página
    ↓
useEffect se ejecuta con skipCache: true
    ↓
Consulta al servidor (ignora cache)
    ↓
Obtiene lista actualizada de clientes con ofertas
    ↓
Actualiza estado local y cache
    ↓
Botones muestran estado real ✅
```

### Flujo 2: Eliminar desde Interfaz

```
Usuario elimina oferta desde interfaz
    ↓
Hook dispara evento 'ofertaEliminada'
    ↓
Listener invalida cache
    ↓
Recarga desde servidor con skipCache: true
    ↓
Actualiza estado local
    ↓
Botones se actualizan automáticamente ✅
```

### Flujo 3: Eliminar desde Base de Datos

```
Oferta eliminada directamente de BD
    ↓
Botón sigue verde (cache local desactualizado)
    ↓
Usuario hace clic en botón
    ↓
Verifica con servidor
    ↓
Servidor: "No hay oferta"
    ↓
Remueve del set local y cache
    ↓
Botón cambia a gris ✅
```

### Flujo 4: Asignar Oferta

```
Usuario asigna oferta a cliente
    ↓
Backend confirma asignación
    ↓
Actualiza estado local inmediatamente
    ↓
Actualiza cache
    ↓
Botón cambia a verde ✅
```

## Logs de Consola

### Al Recargar Página:
```
🔄 Cargando clientes con ofertas desde servidor (ignorando cache)
🔄 Ignorando cache - consultando servidor directamente
🌐 Fetching clientes con ofertas desde: http://...
✅ Clientes con oferta cargados desde servidor: 15
💾 Cache actualizado con 15 clientes
✅ Clientes con ofertas cargados exitosamente desde servidor
```

### Al Hacer Clic en Botón:
```
🔍 Verificando oferta en servidor para cliente: F031200228
📡 Resultado de verificacion: {...}
⚠️ Cliente estaba en el set pero ya no tiene oferta - removiendo
🗑️ Removiendo cliente del set de ofertas
📊 Cliente removido del set: true
💾 Cache actualizado - cliente removido
```

### Al Eliminar desde Interfaz:
```
🗑️ Oferta eliminada - Invalidando cache y recargando
🔄 Ignorando cache - consultando servidor directamente
🌐 Fetching clientes con ofertas desde: http://...
✅ Clientes con oferta cargados desde servidor: 14
💾 Cache actualizado con 14 clientes
```

## Archivos Modificados

1. **components/feats/customer-service/clients-table.tsx**
   - useEffect inicial ahora usa `skipCache: true`
   - Listener para evento `ofertaEliminada`
   - `openAsignarOfertaDialog` siempre verifica con servidor

2. **hooks/use-ofertas-confeccion.ts**
   - `eliminarOferta` dispara evento global
   - `obtenerNumerosClientesConOfertas` con logs mejorados

## Beneficios

✅ **Datos siempre frescos**: Cada recarga consulta al servidor
✅ **Sincronización perfecta**: Estado local refleja la base de datos
✅ **Detección automática**: Detecta ofertas eliminadas de cualquier forma
✅ **Sin falsos positivos**: No hay botones verdes para clientes sin oferta
✅ **Mejor UX**: Feedback inmediato en todas las operaciones
✅ **Fácil debugging**: Logs claros con emojis para seguir el flujo

## Testing

### Test 1: Recarga de Página
1. Recargar la página (F5)
2. Verificar en consola: `🔄 Ignorando cache - consultando servidor directamente`
3. Verificar que los botones reflejan el estado real de la BD

### Test 2: Eliminar desde BD
1. Eliminar una oferta directamente de la base de datos
2. Recargar la página
3. Verificar que el botón del cliente está en gris

### Test 3: Eliminar desde Interfaz
1. Eliminar una oferta desde la interfaz
2. Verificar en consola: `🗑️ Oferta eliminada - Invalidando cache y recargando`
3. Verificar que el botón cambia a gris automáticamente

### Test 4: Asignar Oferta
1. Asignar una oferta a un cliente
2. Verificar que el botón cambia a verde inmediatamente
3. Recargar la página
4. Verificar que el botón sigue verde
