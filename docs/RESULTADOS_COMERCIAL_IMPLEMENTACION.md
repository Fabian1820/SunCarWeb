# Implementación: Resultados por Comercial

## Estado Actual ✅

El submódulo "Resultados por Comercial" está **completamente implementado y funcional** usando el endpoint:

```
GET /api/ofertas/confeccion/personalizadas-con-pagos
```

Este endpoint proporciona todos los datos necesarios incluyendo:
- ✅ Información completa de ofertas personalizadas con pagos
- ✅ Total de materiales
- ✅ Margen real en % y $
- ✅ Comercial asignado (campo `contacto.comercial`)
- ✅ Datos del contacto (cliente/lead)
- ✅ Historial completo de pagos
- ✅ Cálculos financieros precisos

## Endpoint Utilizado

```
GET /api/ofertas/confeccion/personalizadas-con-pagos
```

### Estructura de la Respuesta

```json
{
  "success": true,
  "message": "15 ofertas personalizadas con pagos encontradas",
  "data": [
    {
      "id": "...",
      "numero_oferta": "OF-20240115-001",
      "nombre_completo": "Sistema Solar Híbrido 5kW",
      "total_materiales": 5000.00,
      "margen_porcentaje": 25.5,
      "margen_dolares": 1275.00,
      "precio_final": 6275.00,
      "monto_pendiente": 2000.00,
      "total_pagado": 4275.00,
      "fecha_primer_pago": "2024-01-10T10:00:00Z",
      "contacto": {
        "tipo": "cliente",
        "numero": "C-001",
        "nombre": "Juan Pérez",
        "telefono": "53123456",
        "direccion": "Calle 23 #456",
        "comercial": "María González"  // ← Campo del comercial asignado
      },
      "pagos_data": [
        {
          "id": "...",
          "monto_usd": 2000.00,
          "fecha": "2024-01-10T10:00:00Z",
          "tipo_pago": "anticipo",
          "metodo_pago": "transferencia_bancaria"
        }
      ]
    }
  ],
  "page": 1,
  "limit": 15,
  "total_pages": 1
}
```

### Campos Importantes

- `data`: Array con las ofertas personalizadas que tienen pagos
- `contacto.tipo`: Puede ser "cliente", "lead" o "lead_sin_agregar"
- `contacto.comercial`: Nombre del comercial asignado (puede ser null)
- `pagos_data`: Array completo de pagos ordenados por fecha
- `monto_pendiente`: Saldo que falta por pagar
- `total_pagado`: Suma de todos los pagos en USD
- `margen_porcentaje`: Margen real calculado en %
- `margen_dolares`: Margen real en dólares

## Implementación del Frontend

El componente de página realiza una petición simple al endpoint:

```typescript
const fetchData = useCallback(async () => {
  setLoading(true)
  try {
    const response = await apiRequest<ResultadosComercialResponse>(
      '/ofertas/confeccion/personalizadas-con-pagos'
    )

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Error al cargar datos')
    }

    setResultados(response.data)
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "No se pudieron cargar los resultados",
      variant: "destructive",
    })
  } finally {
    setLoading(false)
  }
}, [toast])
```

### Uso del Campo Comercial

El componente de tabla utiliza directamente el campo `contacto.comercial`:

```typescript
// Obtener lista única de comerciales para el filtro
const comerciales = useMemo(() => {
  const uniqueComerciales = new Set(
    resultados
      .map(r => r.contacto.comercial)
      .filter(c => c !== null && c !== undefined)
  )
  return Array.from(uniqueComerciales).sort()
}, [resultados])

// Mostrar en la tabla
const comercial = resultado.contacto.comercial || "Sin asignar"
```

## Funcionalidades Implementadas

✅ Integración con endpoint `/ofertas/confeccion/personalizadas-con-pagos`
✅ Tarjetas de estadísticas por comercial con totales
✅ Tabla completa con todas las columnas:
  - Comercial asignado
  - Número y nombre de oferta
  - Total de materiales
  - Margen (% y $)
  - Precio final
  - Cliente/Lead
  - Total pagado
  - Fecha del primer pago
  - Monto pendiente
✅ Filtros avanzados:
  - Búsqueda por oferta, cliente o comercial
  - Filtro por comercial específico
  - Filtro por mes
  - Filtro por año
✅ Resumen de totales (margen y pagado)
✅ Ordenamiento por fecha de pago
✅ Diseño responsive
✅ Actualización de datos en tiempo real
✅ Manejo de comerciales sin asignar

## Cómo Usar el Módulo

### Acceso
Navegar a: `/reportes-comercial/resultados-comercial`

### Características Principales

1. **Tarjetas de Estadísticas**: Muestra un resumen por cada comercial con:
   - Número de ofertas cerradas
   - Margen total generado

2. **Filtros Disponibles**:
   - Búsqueda por texto (oferta, cliente, comercial)
   - Filtro por comercial específico
   - Filtro por mes
   - Filtro por año

3. **Tabla Detallada**: Muestra todas las ofertas con:
   - Comercial asignado
   - Información de la oferta
   - Costos y márgenes
   - Estado de pagos
   - Información del cliente

4. **Resumen de Totales**: En la parte inferior muestra:
   - Total de margen generado
   - Total pagado por los clientes

### Casos de Uso

- Ver el desempeño de cada comercial
- Identificar ofertas con pagos pendientes
- Analizar márgenes por comercial
- Filtrar resultados por período específico
- Buscar ofertas o clientes específicos

## Testing

### Casos de Prueba

1. **Carga de Datos**
   - ✅ Navegar a `/reportes-comercial/resultados-comercial`
   - ✅ Verificar que se cargan ofertas personalizadas con pagos
   - ✅ Verificar que aparecen las tarjetas de estadísticas por comercial

2. **Visualización de Datos**
   - ✅ Verificar que Total Materiales muestra valores reales
   - ✅ Verificar que Margen muestra % y $ correctos
   - ✅ Verificar que Comercial muestra el nombre asignado
   - ✅ Verificar que ofertas sin comercial muestran "Sin asignar"
   - ✅ Verificar que los totales de pagos son correctos

3. **Filtros**
   - ✅ Buscar por número de oferta
   - ✅ Buscar por nombre de cliente
   - ✅ Buscar por nombre de comercial
   - ✅ Filtrar por comercial específico
   - ✅ Filtrar por mes
   - ✅ Filtrar por año
   - ✅ Combinar múltiples filtros

4. **Estadísticas**
   - ✅ Verificar que las tarjetas muestran totales correctos
   - ✅ Verificar que el resumen inferior suma correctamente
   - ✅ Verificar que los filtros actualizan las estadísticas

5. **Actualización**
   - ✅ Hacer clic en botón "Actualizar"
   - ✅ Verificar que se recargan los datos

## Archivos Modificados/Creados

### Creados
- `app/reportes-comercial/resultados-comercial/page.tsx`
- `components/feats/reportes-comercial/resultados-comercial-table.tsx`
- `docs/RESULTADOS_COMERCIAL_README.md`
- `docs/RESULTADOS_COMERCIAL_IMPLEMENTACION.md`

### Modificados
- `lib/types/feats/reportes-comercial/reportes-comercial-types.ts`
- `app/reportes-comercial/page.tsx`

## Notas Importantes

1. **Endpoint Completo**: Usa `/ofertas/confeccion/personalizadas-con-pagos` con todos los datos necesarios
2. **Campo Comercial**: El endpoint incluye `contacto.comercial` con el nombre del comercial asignado
3. **Datos Reales**: Todos los cálculos (margen, totales, etc.) vienen del backend
4. **Manejo de Nulos**: El frontend maneja correctamente ofertas sin comercial asignado
5. **Documentación del Endpoint**: Ver `/docs/API_OFERTAS_PERSONALIZADAS_CON_PAGOS.md` para detalles completos

## Estructura de Datos

El endpoint retorna ofertas con esta estructura:

```typescript
interface ResultadoComercial {
  id: string
  numero_oferta: string
  nombre_completo: string
  total_materiales: number        // ✅ Valor real
  margen_porcentaje: number       // ✅ Calculado en backend
  margen_dolares: number          // ✅ Calculado en backend
  precio_final: number
  monto_pendiente: number
  total_pagado: number
  fecha_primer_pago: string
  contacto: {
    tipo: 'cliente' | 'lead' | 'lead_sin_agregar'
    numero: string | null
    nombre: string
    telefono: string | null
    direccion: string | null
    comercial: string | null      // ✅ Nombre del comercial
  }
  pagos_data: Array<Pago>
}
```

## Changelog

### v2.0.0 (2024-02-18) - Implementación Completa
- ✅ Integración con endpoint `/ofertas/confeccion/personalizadas-con-pagos`
- ✅ Uso del campo `contacto.comercial` para mostrar comercial asignado
- ✅ Datos reales de materiales, márgenes y pagos
- ✅ Tarjetas de estadísticas por comercial
- ✅ Filtros avanzados (búsqueda, comercial, mes, año)
- ✅ Tabla completa con todas las columnas requeridas
- ✅ Resumen de totales
- ✅ Manejo de ofertas sin comercial asignado
- ✅ Diseño responsive y actualización de datos
