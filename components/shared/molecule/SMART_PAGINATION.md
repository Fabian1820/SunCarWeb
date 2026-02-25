# SmartPagination Component

Componente de paginación inteligente y reutilizable para el proyecto SunCarAdmin.

## Características

- ✅ **Inteligente**: Calcula automáticamente qué páginas mostrar
- ✅ **Responsivo**: Adapta la cantidad de páginas visibles según el espacio
- ✅ **Accesible**: Incluye atributos ARIA para accesibilidad
- ✅ **Optimizado**: Evita re-renders innecesarios con keys únicas
- ✅ **Flexible**: Configurable mediante props

## Uso Básico

```tsx
import { SmartPagination } from "@/components/shared/molecule/smart-pagination"

function MiComponente() {
  const [page, setPage] = useState(1)
  const totalItems = 100
  const itemsPerPage = 20
  const totalPages = Math.ceil(totalItems / itemsPerPage)

  return (
    <SmartPagination
      currentPage={page}
      totalPages={totalPages}
      onPageChange={setPage}
    />
  )
}
```

## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| `currentPage` | `number` | - | Página actual (requerido) |
| `totalPages` | `number` | - | Total de páginas (requerido) |
| `onPageChange` | `(page: number) => void` | - | Callback al cambiar de página (requerido) |
| `maxVisiblePages` | `number` | `5` | Máximo de botones de página visibles |
| `className` | `string` | `undefined` | Clase CSS adicional para el contenedor |

## Lógica de Visualización

El componente muestra automáticamente:

1. **Primera página**: Siempre visible
2. **Última página**: Siempre visible
3. **Página actual**: Y sus páginas adyacentes (±1)
4. **Puntos suspensivos**: Entre gaps de páginas
5. **Páginas adicionales**: Si estás cerca del inicio o fin, muestra más páginas

### Ejemplos de Visualización

**Página 1 de 20:**
```
< [1] 2 3 4 ... 20 >
```

**Página 5 de 20:**
```
< 1 ... 4 [5] 6 ... 20 >
```

**Página 18 de 20:**
```
< 1 ... 17 [18] 19 20 >
```

**Solo 5 páginas:**
```
< [1] 2 3 4 5 >
```

**Una sola página:**
```
(No se muestra)
```

## Integración con Backend

### Con Paginación del Servidor

```tsx
function LeadsPage() {
  const [page, setPage] = useState(1)
  const limit = 20
  const skip = (page - 1) * limit

  // Hook personalizado con paginación
  const { items, totalItems, loading } = useLeads({ skip, limit })

  return (
    <>
      <ItemsTable items={items} loading={loading} />

      <SmartPagination
        currentPage={page}
        totalPages={Math.ceil(totalItems / limit)}
        onPageChange={setPage}
      />
    </>
  )
}
```

### Con Paginación Local

```tsx
function ClientesPage() {
  const [page, setPage] = useState(1)
  const itemsPerPage = 20

  const { allItems } = useClientes()

  // Paginar en el frontend
  const startIndex = (page - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentItems = allItems.slice(startIndex, endIndex)

  return (
    <>
      <ItemsTable items={currentItems} />

      <SmartPagination
        currentPage={page}
        totalPages={Math.ceil(allItems.length / itemsPerPage)}
        onPageChange={setPage}
      />
    </>
  )
}
```

## Comparación con Implementación Anterior

### ❌ Antes (Código duplicado, complejo)

```tsx
<Pagination>
  <PaginationContent>
    <PaginationItem>
      <PaginationPrevious
        onClick={() => setPage(page - 1)}
        aria-disabled={page <= 1}
        className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
      />
    </PaginationItem>
    {Array.from({ length: totalPages }, (_, i) => i + 1)
      .filter(p => p === 1 || p === page || p === page - 1 || p === page + 1 || p === totalPages)
      .map((p, idx, arr) => (
        <div key={`page-${p}`} className="contents">
          {idx > 0 && arr[idx - 1] !== p - 1 && (
            <PaginationItem key={`ellipsis-${p}`}>
              <PaginationEllipsis />
            </PaginationItem>
          )}
          <PaginationItem>
            <PaginationLink
              onClick={() => setPage(p)}
              isActive={page === p}
              className="cursor-pointer"
            >
              {p}
            </PaginationLink>
          </PaginationItem>
        </div>
      ))
    }
    <PaginationItem>
      <PaginationNext
        onClick={() => setPage(page + 1)}
        aria-disabled={page >= totalPages}
        className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
      />
    </PaginationItem>
  </PaginationContent>
</Pagination>
```

### ✅ Ahora (Limpio, reutilizable)

```tsx
<SmartPagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
/>
```

## Ventajas

1. **DRY**: No más código duplicado en cada página
2. **Mantenible**: Un solo lugar para actualizar la lógica de paginación
3. **Consistente**: Misma UX en todos los módulos
4. **Testeable**: Fácil de testear de forma aislada
5. **Documentado**: Incluye JSDoc y ejemplos de uso

## Casos de Uso en el Proyecto

Actualmente implementado en:

- ✅ `/leads` - Lista de leads con paginación del servidor
- ✅ `/clientes` - Lista de clientes con paginación del servidor

Potenciales usos futuros:

- `/ofertas` - Lista de ofertas
- `/trabajadores` - Lista de trabajadores
- `/brigadas` - Lista de brigadas
- `/materiales` - Catálogo de materiales
- Cualquier módulo que requiera paginación

## Personalización

### Cambiar cantidad de páginas visibles

```tsx
<SmartPagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
  maxVisiblePages={7}  // Mostrar más páginas
/>
```

### Agregar estilos personalizados

```tsx
<SmartPagination
  currentPage={page}
  totalPages={totalPages}
  onPageChange={setPage}
  className="mt-8 border-t pt-4"  // Estilos adicionales
/>
```

## Accesibilidad

El componente incluye:

- `aria-disabled` en botones deshabilitados
- `aria-label` en cada botón de página
- Navegación por teclado (Tab + Enter)
- Estados visuales claros (hover, active, disabled)

## Rendimiento

- ✅ Calcula páginas visibles de forma eficiente
- ✅ Usa `className="contents"` para evitar nodos DOM extra
- ✅ Keys únicas para optimizar reconciliación de React
- ✅ Memoización automática de callbacks

## Notas de Implementación

### ¿Por qué `className="contents"`?

La clase `contents` de Tailwind hace que el `<div>` se comporte como un fragment:

```tsx
// Sin contents: crea un nodo div extra
<div key="page-1">
  <PaginationItem>...</PaginationItem>
</div>

// Con contents: el div desaparece en el DOM final
<div key="page-1" className="contents">
  <PaginationItem>...</PaginationItem>  // Se renderiza directamente
</div>
```

Esto permite usar keys sin agregar nodos DOM innecesarios.

### ¿Cuándo NO usar este componente?

- Si tienes menos de 10 ítems totales (probablemente no necesitas paginación)
- Si quieres paginación infinita (scroll infinito)
- Si necesitas lógica de paginación muy específica no cubierta por las props

## Contribuir

Si necesitas agregar funcionalidad:

1. Agregar nueva prop al interface `SmartPaginationProps`
2. Implementar la lógica en el componente
3. Actualizar esta documentación con ejemplos
4. Testear en al menos un módulo existente

---

**Última actualización**: 2026-02-25
**Versión**: 1.0.0
**Autor**: Equipo SunCar
