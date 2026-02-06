# Unificación del Diálogo de Ofertas

## Cambio Implementado

Se ha unificado el diálogo de ofertas para que use el mismo componente tanto para **asignar** como para **ver** ofertas de clientes.

## Antes

- **AsignarOfertaGenericaDialog**: Para asignar ofertas genéricas a clientes
- **VerOfertaClienteDialog**: Para ver ofertas ya asignadas a clientes

## Después

- **AsignarOfertaGenericaDialog**: Componente único con dos modos:
  - `modo="asignar"`: Para asignar ofertas genéricas
  - `modo="ver"`: Para ver ofertas ya asignadas

## Cambios en el Componente

### 1. Nuevos Props

```typescript
interface AsignarOfertaGenericaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cliente: Cliente | null
  onAsignar?: (ofertaGenericaId: string) => Promise<void>  // Ahora opcional
  fetchOfertasGenericas?: () => Promise<OfertaConfeccion[]>  // Ahora opcional
  // Nuevos props
  modo?: 'asignar' | 'ver'  // Por defecto 'asignar'
  ofertasExistentes?: OfertaConfeccion[]  // Para modo 'ver'
}
```

### 2. Lógica Condicional

```typescript
const esModoVer = modo === 'ver'

useEffect(() => {
  if (open) {
    if (esModoVer) {
      // En modo ver, usar las ofertas existentes
      setOfertas(ofertasExistentes)
      setLoading(false)
    } else {
      // En modo asignar, cargar ofertas genéricas
      loadOfertas()
    }
  }
}, [open, esModoVer, ofertasExistentes])
```

### 3. Títulos Dinámicos

```typescript
<DialogTitle>
  {esModoVer ? 'Ofertas del Cliente' : 'Asignar Oferta Genérica'}
</DialogTitle>

<DialogDescription>
  {esModoVer ? (
    <>Ofertas asignadas a <span>{cliente.nombre}</span></>
  ) : (
    <>Selecciona una oferta genérica para asignar a <span>{cliente.nombre}</span></>
  )}
</DialogDescription>
```

### 4. Botones Condicionales

```typescript
{esModoVer ? (
  <Button variant="outline">
    <FileCheck className="h-3.5 w-3.5" />
    <span>Ver Detalles</span>
  </Button>
) : (
  <Button onClick={() => handleAsignar(oferta.id)}>
    <FileCheck className="h-3.5 w-3.5" />
    <span>Asignar</span>
  </Button>
)}
```

## Uso en clients-table.tsx

### Modo "Asignar" (cliente sin oferta)

```typescript
<AsignarOfertaGenericaDialog
  open={showAsignarOfertaDialog}
  onOpenChange={setShowAsignarOfertaDialog}
  cliente={clientForAsignarOferta}
  onAsignar={handleAsignarOferta}
  fetchOfertasGenericas={fetchOfertasGenericasAprobadas}
  modo="asignar"  // Por defecto, puede omitirse
/>
```

### Modo "Ver" (cliente con oferta)

```typescript
<AsignarOfertaGenericaDialog
  open={showVerOfertaDialog}
  onOpenChange={setShowVerOfertaDialog}
  cliente={clientForAsignarOferta}
  modo="ver"
  ofertasExistentes={ofertasClienteActuales}
/>
```

## Flujo Completo

### Cliente SIN Oferta (Botón Gris)

```
Usuario hace clic en botón gris
    ↓
Verifica con servidor
    ↓
No tiene oferta
    ↓
Abre diálogo en modo "asignar"
    ↓
Muestra ofertas genéricas disponibles
    ↓
Usuario selecciona y asigna
    ↓
Botón cambia a verde ✅
```

### Cliente CON Oferta (Botón Verde)

```
Usuario hace clic en botón verde
    ↓
Verifica con servidor
    ↓
Tiene oferta(s)
    ↓
Abre diálogo en modo "ver"
    ↓
Muestra ofertas asignadas al cliente
    ↓
Usuario puede ver detalles
```

### Cliente CON Múltiples Ofertas

```
Usuario hace clic en botón verde
    ↓
Verifica con servidor
    ↓
Tiene 3 ofertas
    ↓
Abre diálogo en modo "ver"
    ↓
Muestra las 3 ofertas en lista
    ↓
Usuario puede ver todas las ofertas
```

## Beneficios

✅ **Código más limpio**: Un solo componente en lugar de dos
✅ **Mantenimiento más fácil**: Cambios en un solo lugar
✅ **UI consistente**: Misma apariencia para asignar y ver
✅ **Menos duplicación**: Reutilización de lógica y estilos
✅ **Mejor UX**: Interfaz familiar para el usuario

## Archivos Modificados

1. **components/feats/ofertas/asignar-oferta-generica-dialog.tsx**
   - Agregados props `modo` y `ofertasExistentes`
   - Lógica condicional para modo "ver"
   - Títulos y botones dinámicos
   - Props opcionales para flexibilidad

2. **components/feats/customer-service/clients-table.tsx**
   - Eliminada importación de `VerOfertaClienteDialog`
   - Actualizado uso de `AsignarOfertaGenericaDialog` con modo "ver"
   - Guardado de cliente en `openAsignarOfertaDialog` para modo "ver"

## Componente Obsoleto

El componente `VerOfertaClienteDialog` ya no se usa y puede ser eliminado en el futuro si no se necesita en otros lugares.

## Testing

### Test 1: Cliente sin oferta
1. Hacer clic en botón gris
2. Verificar que se abre el diálogo con título "Asignar Oferta Genérica"
3. Verificar que muestra ofertas genéricas disponibles
4. Verificar que los botones dicen "Asignar"

### Test 2: Cliente con una oferta
1. Hacer clic en botón verde
2. Verificar que se abre el diálogo con título "Ofertas del Cliente"
3. Verificar que muestra la oferta asignada
4. Verificar que el botón dice "Ver Detalles"

### Test 3: Cliente con múltiples ofertas
1. Hacer clic en botón verde de cliente con 3 ofertas
2. Verificar que se abre el diálogo con título "Ofertas del Cliente"
3. Verificar que muestra las 3 ofertas en lista
4. Verificar que cada oferta tiene botón "Ver Detalles"

## Próximos Pasos (Opcional)

Si en el futuro se necesita:
- Agregar funcionalidad de eliminar oferta desde el modo "ver"
- Agregar navegación a detalles completos de la oferta
- Agregar comparación entre múltiples ofertas

Todo se puede hacer en el mismo componente unificado.
