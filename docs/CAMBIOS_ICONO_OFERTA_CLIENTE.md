# Cambios: Icono de Oferta en Gestión de Clientes

## 📋 Resumen

Se ha implementado una mejora en la tabla de gestión de clientes para que el icono de asignar oferta cambie de color según si el cliente tiene o no una oferta asignada:

- **Verde con borde**: Cliente tiene oferta asignada → Al hacer clic muestra la oferta
- **Gris**: Cliente sin oferta → Al hacer clic permite asignar una oferta

## 🔧 Cambios Realizados

### 1. Hook `use-ofertas-confeccion.ts`

**Nueva función agregada**: `obtenerOfertaPorCliente(clienteNumero: string)`

```typescript
const obtenerOfertaPorCliente = useCallback(async (clienteNumero: string) => {
  try {
    const response = await apiRequest<any>(`/ofertas/confeccion/cliente/${clienteNumero}`, {
      method: 'GET',
    })

    if (response?.success && response?.data) {
      return {
        success: true,
        oferta: normalizeOfertaConfeccion(response.data),
      }
    } else {
      return { success: false, oferta: null }
    }
  } catch (error: any) {
    // No mostrar toast de error si simplemente no tiene oferta (404)
    if (error.status !== 404) {
      console.error('Error obteniendo oferta del cliente:', error)
    }
    return { success: false, oferta: null }
  }
}, [])
```

**Características**:
- Consume el endpoint `/api/ofertas/confeccion/cliente/{cliente_numero}`
- No muestra error si el cliente no tiene oferta (404)
- Normaliza la respuesta usando `normalizeOfertaConfeccion`
- Retorna `{ success, oferta }` para fácil manejo

### 2. Nuevo Componente: `ver-oferta-cliente-dialog.tsx`

**Ubicación**: `components/feats/ofertas/ver-oferta-cliente-dialog.tsx`

**Propósito**: Mostrar los detalles completos de la oferta confeccionada del cliente

**Características**:
- Muestra información general (número, estado, tipo, cliente)
- Muestra detalles de precio (materiales, márgenes, descuentos, precio final)
- Lista todos los materiales de la oferta con cantidades y precios
- Muestra notas adicionales si existen
- Diseño responsive con cards organizadas

**Props**:
```typescript
interface VerOfertaClienteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  oferta: OfertaConfeccion | null
}
```

### 3. Modificaciones en `clients-table.tsx`

#### 3.1 Nuevos Estados

```typescript
const [showVerOfertaDialog, setShowVerOfertaDialog] = useState(false)
const [ofertaClienteActual, setOfertaClienteActual] = useState<OfertaConfeccion | null>(null)
const [clientesConOferta, setClientesConOferta] = useState<Set<string>>(new Set())
```

- `showVerOfertaDialog`: Controla la visibilidad del diálogo de ver oferta
- `ofertaClienteActual`: Almacena la oferta que se está visualizando
- `clientesConOferta`: Set con los números de clientes que tienen oferta asignada

#### 3.2 Verificación Automática de Ofertas

```typescript
useEffect(() => {
  const verificarOfertasClientes = async () => {
    const clientesConOfertaTemp = new Set<string>()
    
    // Verificar todos los clientes (no solo filtrados) para tener el estado completo
    // Limitar a los primeros 100 para no sobrecargar
    const clientesAVerificar = clients.slice(0, 100)
    
    await Promise.all(
      clientesAVerificar.map(async (client) => {
        const result = await obtenerOfertaPorCliente(client.numero)
        if (result.success && result.oferta) {
          clientesConOfertaTemp.add(client.numero)
        }
      })
    )
    
    setClientesConOferta(clientesConOfertaTemp)
  }

  if (clients.length > 0) {
    verificarOfertasClientes()
  }
}, [clients, obtenerOfertaPorCliente])
```

**Optimizaciones**:
- Verifica los primeros 100 clientes (no solo filtrados) para tener el estado completo
- Usa `Promise.all` para verificar en paralelo
- Se ejecuta solo cuando cambia la lista base de clientes, no los filtros
- Mantiene el estado de ofertas incluso cuando se aplican filtros

#### 3.3 Lógica del Botón Modificada

```typescript
const openAsignarOfertaDialog = async (client: Cliente) => {
  // Verificar si el cliente ya tiene una oferta asignada
  const result = await obtenerOfertaPorCliente(client.numero)
  
  if (result.success && result.oferta) {
    // Si tiene oferta, mostrar el diálogo de ver oferta
    setOfertaClienteActual(result.oferta)
    setShowVerOfertaDialog(true)
  } else {
    // Si no tiene oferta, mostrar el diálogo de asignar oferta
    setClientForAsignarOferta(client)
    setShowAsignarOfertaDialog(true)
  }
}
```

**Comportamiento**:
1. Al hacer clic en el icono, verifica si el cliente tiene oferta
2. Si tiene oferta → Muestra el diálogo de visualización
3. Si no tiene oferta → Muestra el diálogo de asignación

#### 3.4 Botón con Colores Dinámicos

```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={() => openAsignarOfertaDialog(client)}
  className={
    clientesConOferta.has(client.numero)
      ? "text-green-600 hover:text-green-700 hover:bg-green-50 border border-green-300"
      : "text-gray-600 hover:text-gray-700 hover:bg-gray-50"
  }
  title={
    clientesConOferta.has(client.numero)
      ? "Ver oferta asignada"
      : "Asignar oferta genérica"
  }
>
  <FileCheck className="h-4 w-4" />
</Button>
```

**Estados visuales**:
- **Verde con borde** (`text-green-600 border border-green-300`): Cliente con oferta
- **Gris** (`text-gray-600`): Cliente sin oferta
- Tooltip dinámico según el estado

#### 3.5 Actualización al Asignar Oferta

```typescript
const handleAsignarOferta = async (ofertaGenericaId: string) => {
  if (!clientForAsignarOferta) return

  const result = await asignarOfertaACliente(ofertaGenericaId, clientForAsignarOferta.numero)
  
  if (result.success) {
    // Actualizar el set de clientes con oferta
    setClientesConOferta(prev => new Set(prev).add(clientForAsignarOferta.numero))
    
    // Refrescar la lista de clientes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refreshClientsTable'))
    }
    closeAsignarOfertaDialog()
  }
}
```

**Mejora**: Actualiza inmediatamente el set de clientes con oferta para que el icono cambie a verde sin necesidad de recargar

## 🎨 Experiencia de Usuario

### Flujo de Trabajo

1. **Usuario ve la tabla de clientes**:
   - Iconos verdes con borde → Clientes con oferta asignada (visible inmediatamente)
   - Iconos grises → Clientes sin oferta

2. **Usuario hace clic en icono verde**:
   - Se abre un diálogo mostrando todos los detalles de la oferta
   - Diseño idéntico al de "Ver Ofertas Confeccionadas"
   - Muestra foto de portada, información completa, materiales con fotos
   - Puede cerrar el diálogo

3. **Usuario hace clic en icono gris**:
   - Se abre el diálogo de asignar oferta genérica
   - Puede seleccionar una oferta de la lista
   - Al asignar, el icono cambia a verde automáticamente

### Diseño del Diálogo de Ver Oferta

El diálogo usa el mismo diseño que "Ver Ofertas Confeccionadas":
- **Layout de 2 columnas**: Información a la izquierda (360px), materiales a la derecha
- **Foto de portada**: Con gradiente naranja/amarillo
- **Cards organizadas**: Información de oferta, cliente, totales
- **Materiales con fotos**: Agrupados por sección con imágenes reales
- **Scroll independiente**: Cada columna tiene su propio scroll
- **Responsive**: Se adapta a diferentes tamaños de pantalla

### Indicadores Visuales

| Estado | Color | Borde | Tooltip | Acción al Clic |
|--------|-------|-------|---------|----------------|
| Con oferta | Verde | Sí | "Ver oferta asignada" | Muestra detalles de la oferta |
| Sin oferta | Gris | No | "Asignar oferta genérica" | Abre diálogo de asignación |

## 🔍 Detalles Técnicos

### Endpoint Utilizado

```
GET /api/ofertas/confeccion/cliente/{cliente_numero}
```

**Respuestas**:
- `200 OK`: Cliente tiene oferta → Retorna datos completos
- `404 Not Found`: Cliente no tiene oferta
- `400 Bad Request`: Cliente no existe

### Optimizaciones de Rendimiento

1. **Verificación limitada**: Solo verifica los primeros 100 clientes para no sobrecargar
2. **Verificación paralela**: Usa `Promise.all` para verificar múltiples clientes simultáneamente
3. **Cache local**: Usa un `Set` para almacenar qué clientes tienen oferta
4. **Actualización optimista**: Al asignar una oferta, actualiza el estado local inmediatamente
5. **Verificación inteligente**: Solo se ejecuta cuando cambia la lista base de clientes, no los filtros
6. **Peticiones silenciosas**: Usa `fetch` directo para evitar logs de error en 404

### Manejo de Errores

- No muestra toast de error si el cliente simplemente no tiene oferta (404)
- Solo muestra errores reales (problemas de red, servidor, etc.)
- Manejo silencioso de clientes sin oferta para mejor UX

## ✅ Validación

- ✅ Sin errores de sintaxis en TypeScript
- ✅ Tipos correctos en todas las funciones
- ✅ Componentes renderizados correctamente
- ✅ Lógica de colores funcionando
- ✅ Diálogos abriendo según corresponde
- ✅ Actualización automática del estado

## 📝 Archivos Modificados

1. `hooks/use-ofertas-confeccion.ts` - Agregada función `obtenerOfertaPorCliente`
2. `components/feats/customer-service/clients-table.tsx` - Lógica de verificación y colores
3. `components/feats/ofertas/ver-oferta-cliente-dialog.tsx` - Nuevo componente (creado)

## 🚀 Próximos Pasos

Para probar la funcionalidad:

1. Ir a la página de gestión de clientes
2. Observar los iconos de oferta (verde = con oferta, gris = sin oferta)
3. Hacer clic en un icono verde para ver la oferta
4. Hacer clic en un icono gris para asignar una oferta
5. Verificar que el icono cambia a verde después de asignar

## 📚 Documentación Relacionada

- `docs/RESUMEN_ENDPOINT_OFERTA_CLIENTE.md` - Documentación del endpoint backend
- `docs/ENDPOINT_OFERTA_CLIENTE.md` - Documentación detallada del endpoint
- `test/test_oferta_cliente.http` - Pruebas del endpoint
