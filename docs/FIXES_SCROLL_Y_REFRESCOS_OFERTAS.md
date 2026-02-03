# Fixes: Scroll y Refrescos en Ofertas

## Problemas Solucionados

### 1. ❌ No se puede hacer scroll cuando la pantalla está reducida

**Problema**: Al reducir la pantalla a la mitad, no se podía hacer scroll en las páginas de crear, editar o duplicar ofertas.

**Causa**: El contenedor principal tenía `overflow-hidden` que impedía el scroll.

**Solución**:
- Removido `overflow-hidden` del contenedor flex principal
- Agregado `overflow-y-auto` directamente a los paneles izquierdo y derecho
- Cambiado la estructura de flex para permitir scroll independiente en cada panel

**Archivos modificados**:
- `components/feats/ofertas/confeccion-ofertas-view.tsx`
  - Línea ~3020: Removido `overflow-hidden` del contenedor principal
  - Línea ~3022: Agregado `overflow-y-auto` al panel izquierdo
  - Línea ~4426: Agregado `overflow-y-auto` al panel derecho
  - Línea ~4497: Removido `overflow-y-auto` duplicado del div interno

- `app/ofertas-gestion/confeccion/page.tsx`
  - Cambiado estructura del main para usar `flex-1 flex flex-col min-h-0`
  - Removido `overflow-hidden` que bloqueaba el scroll

- `app/ofertas-gestion/duplicar/page.tsx`
  - Cambiado estructura del main para usar `flex-1 flex flex-col min-h-0`
  - Agregado `flex flex-col` al contenedor principal

### 2. ❌ Al volver a entrar, la página se abre desde el inicio

**Problema**: Cuando salías de la página y volvías a entrar, el scroll se reseteaba al inicio en lugar de mantener la posición donde te quedaste.

**Causa**: Los navegadores modernos mantienen la posición del scroll automáticamente, pero el `overflow-hidden` y la estructura incorrecta impedían que funcionara.

**Solución**: 
- Al arreglar la estructura del scroll (problema #1), el navegador ahora puede mantener automáticamente la posición del scroll
- Los paneles con `overflow-y-auto` permiten que el navegador guarde y restaure la posición

**Nota**: El navegador mantiene la posición del scroll de forma nativa cuando:
- El elemento con scroll tiene un tamaño fijo o calculable
- No hay `overflow-hidden` en los contenedores padres
- La estructura del DOM no cambia drásticamente

### 3. ❌ La página de ofertas se refresca demasiadas veces

**Problema**: La página de "Ver Ofertas Confeccionadas" se refrescaba constantemente, incluso cuando estabas dentro de la página trabajando.

**Causa**: Los event listeners `visibilitychange` y `focus` estaban configurados para refrescar la página cada vez que:
- Cambias de pestaña del navegador
- Cambias de ventana
- Haces click en la ventana
- Vuelves de otra aplicación

**Solución**:
- Removido el event listener `focus` que era demasiado agresivo
- Modificado el event listener `visibilitychange` para que solo refresque si:
  - La página estuvo oculta (en otra pestaña/ventana)
  - Y pasaron más de 5 minutos (300,000 ms)
- Esto mantiene los datos actualizados sin ser intrusivo

**Archivo modificado**:
- `components/feats/ofertas/ofertas-confeccionadas-view.tsx`
  - Líneas ~129-147: Reemplazado el useEffect de refrescos

**Código anterior**:
```typescript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      refetch() // ❌ Refresca SIEMPRE que vuelves
    }
  }

  const handleFocus = () => {
    refetch() // ❌ Refresca cada vez que haces click
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleFocus)
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('focus', handleFocus)
  }
}, [refetch])
```

**Código nuevo**:
```typescript
useEffect(() => {
  let lastHiddenTime: number | null = null

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      lastHiddenTime = Date.now() // ✅ Guarda cuándo se ocultó
    } else if (document.visibilityState === 'visible' && lastHiddenTime) {
      const timeDiff = Date.now() - lastHiddenTime
      // ✅ Solo refresca si estuvo oculta por más de 5 minutos
      if (timeDiff > 300000) {
        refetch()
      }
      lastHiddenTime = null
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [refetch])
```

## Beneficios

### Scroll mejorado:
- ✅ Funciona correctamente en pantallas reducidas
- ✅ Scroll independiente en panel izquierdo y derecho
- ✅ Headers sticky funcionan correctamente
- ✅ El navegador mantiene la posición del scroll automáticamente

### Refrescos optimizados:
- ✅ No hay refrescos innecesarios al cambiar de pestaña
- ✅ No hay refrescos al hacer click en la ventana
- ✅ Los datos se mantienen actualizados (refresco cada 5+ minutos de inactividad)
- ✅ Mejor experiencia de usuario sin interrupciones

## Testing

Para verificar que los cambios funcionan:

1. **Test de scroll**:
   - Reducir la ventana del navegador a la mitad
   - Ir a crear/editar/duplicar oferta
   - Verificar que se puede hacer scroll en ambos paneles
   - Agregar varios materiales y verificar que el scroll funciona

2. **Test de posición del scroll**:
   - Hacer scroll hacia abajo en la página de ofertas
   - Navegar a otra página
   - Volver a la página de ofertas
   - Verificar que mantiene la posición del scroll

3. **Test de refrescos**:
   - Abrir la página de ofertas
   - Cambiar de pestaña varias veces
   - Verificar que NO se refresca constantemente
   - Dejar la pestaña oculta por 6+ minutos
   - Volver a la pestaña
   - Verificar que SÍ se refresca después de 5+ minutos

## Notas Técnicas

- La estructura de flex con `min-h-0` es crucial para que el scroll funcione correctamente en contenedores flex
- El `overflow-y-auto` debe estar en el elemento que realmente necesita scroll, no en sus padres
- Los navegadores modernos (Chrome, Firefox, Safari) mantienen la posición del scroll automáticamente cuando la estructura es correcta
- El tiempo de 5 minutos para refrescar es configurable y puede ajustarse según necesidades
