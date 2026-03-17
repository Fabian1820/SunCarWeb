# Integración Frontend - Facturas Consolidadas

## Resumen

Se ha integrado el endpoint `/api/facturas/consolidadas` en el módulo de Vales y Facturas de Instaladora para mostrar información completa de facturas con sus ofertas y pagos asociados.

## Cambios Realizados

### 1. Tipos Actualizados (`lib/types/feats/facturas/factura-types.ts`)

Se agregaron dos nuevas interfaces:

```typescript
export interface OfertaInfo {
    oferta_id: string;
    numero_oferta: string;
    nombre_automatico: string;
    precio_final: number;
    monto_cobrado: number;
    monto_pendiente: number;
}

export interface FacturaConsolidada {
    numero_factura: string;
    tipo: FacturaTipo;
    subtipo?: FacturaSubTipo | null;
    mes?: string;
    fecha?: string;
    fecha_creacion: string;
    cliente_nombre?: string;
    cliente_codigo?: string;
    cliente_direccion?: string;
    total_factura: number;
    ofertas: OfertaInfo[];
    total_cobrado_todas_ofertas: number;
    monto_pendiente_materiales: number;
    pagada: boolean;
    terminada: boolean;
}
```

### 2. Servicio Actualizado (`lib/services/feats/facturas/factura-service.ts`)

Se agregó el método:

```typescript
async obtenerFacturasConsolidadas(): Promise<FacturaConsolidada[]>
```

Este método llama a `GET /api/facturas/consolidadas` y devuelve todas las facturas con información completa.

### 3. Hook Actualizado (`hooks/use-facturas.ts`)

Se agregaron:
- Estado: `facturasConsolidadas`
- Función: `cargarFacturasConsolidadas()`

### 4. Nueva Tabla (`components/feats/facturas/facturas-consolidadas-table.tsx`)

Tabla completa que muestra:

#### Columnas Principales:
1. **Número Factura**: Identificador único
2. **Mes**: Mes del primer vale (si existe)
3. **Fecha**: Fecha del primer vale (si existe)
4. **Fecha Creación**: Fecha de creación de la factura
5. **Cliente**: 
   - Nombre (clickeable si tiene código)
   - Código
   - Dirección
6. **Total Factura**: Monto total facturado
7. **Monto Cobrado**: Total cobrado de todas las ofertas (verde)
8. **Monto Pendiente**: Pendiente de materiales (rojo)
9. **Precio Final Oferta**: Suma de precios finales de ofertas
10. **Ganancia Actual**: Precio Final - Total Factura (verde/rojo según signo)
11. **Estado**: Badges de pagada/terminada
12. **Acciones**: Agregar vale, Ver detalles, Editar

#### Características Especiales:
- **Filas Expandibles**: Las facturas con ofertas pueden expandirse para ver el detalle de cada oferta
- **Detalles de Ofertas**: Muestra número, nombre automático, precio final, monto cobrado y pendiente por oferta
- **Colores Semánticos**:
  - Verde: Montos cobrados, ganancias positivas
  - Rojo: Montos pendientes, ganancias negativas
  - Naranja: Estados pendientes
- **Ordenamiento**: Botón para invertir orden (más recientes/antiguas primero)
- **Búsqueda**: Filtra por número de factura, nombre de cliente o código de cliente

### 5. Componente Principal Actualizado (`components/feats/facturas/facturas-section.tsx`)

- Usa `FacturasConsolidadasTable` en lugar de `FacturasTable`
- Carga facturas consolidadas al montar el componente
- Filtrado local por nombre/código de cliente

## Mapeo de Datos Backend → Frontend

### Datos del Endpoint Consolidado:

```json
{
  "numero_factura": "202602117",
  "tipo": "instaladora",
  "subtipo": "cliente",
  "mes": "febrero",
  "fecha": "06/02/2026",
  "fecha_creacion": "13/03/2026",
  "cliente_nombre": "Yunisbel Reyes Mendez",
  "cliente_codigo": "F061200226",
  "cliente_direccion": "Carretera Maleza Km 14, San Gil",
  "total_factura": 2686.66,
  "ofertas": [
    {
      "oferta_id": "69af5d4b5a41169d971b3ceb",
      "numero_oferta": "OF-20260309-037",
      "nombre_automatico": "B-1x5,12kWh",
      "precio_final": 1230.00,
      "monto_cobrado": 0.00,
      "monto_pendiente": 1230.00
    }
  ],
  "total_cobrado_todas_ofertas": 0.00,
  "monto_pendiente_materiales": 2686.66,
  "pagada": false,
  "terminada": false
}
```

### Cálculos en Frontend:

1. **Precio Final Total**: `ofertas.reduce((sum, o) => sum + o.precio_final, 0)`
2. **Ganancia Total**: `precioFinalTotal - total_factura`
3. **Estado de Oferta**: `monto_pendiente === 0 ? 'Pagada' : 'Pendiente'`

## Tipos de Facturas Soportados

### 1. Instaladora/Cliente (con ofertas)
- Muestra todas las columnas con datos
- Filas expandibles para ver ofertas
- Cálculo de ganancia

### 2. Instaladora/Brigada (sin ofertas)
- Muestra datos básicos
- Columnas de ofertas muestran "-"
- No expandible

### 3. Cliente Directo (sin ofertas)
- Muestra datos básicos
- Columnas de ofertas muestran "-"
- No expandible

## Uso

### Cargar Facturas Consolidadas:

```typescript
const { facturasConsolidadas, loading, cargarFacturasConsolidadas } = useFacturas()

useEffect(() => {
  cargarFacturasConsolidadas()
}, [])
```

### Filtrar Facturas:

```typescript
const facturasFiltradas = useMemo(() => {
  const term = searchTerm.toLowerCase()
  return facturasConsolidadas.filter(f => 
    f.numero_factura.toLowerCase().includes(term) ||
    f.cliente_nombre?.toLowerCase().includes(term) ||
    f.cliente_codigo?.toLowerCase().includes(term)
  )
}, [facturasConsolidadas, searchTerm])
```

## Próximos Pasos

1. ✅ Integración completa del endpoint
2. ✅ Tabla con todas las columnas solicitadas
3. ✅ Vista expandible de ofertas
4. ⏳ Integrar acciones (editar, ver detalles, agregar vale) con el sistema existente
5. ⏳ Exportación a Excel con datos consolidados
6. ⏳ Filtros avanzados (por tipo, subtipo, rango de fechas)

## Notas Importantes

- El endpoint devuelve 257 facturas en total
- 197 facturas tienen ofertas asociadas
- 60 facturas no tienen ofertas (brigadas y ventas directas)
- La tabla maneja correctamente los tres tipos de facturas
- Los datos de cliente (código y dirección) ahora están disponibles
- El cálculo de ganancia se hace en el frontend basado en los datos del backend

## Archivos Modificados

1. `lib/types/feats/facturas/factura-types.ts` - Nuevos tipos
2. `lib/services/feats/facturas/factura-service.ts` - Nuevo método
3. `hooks/use-facturas.ts` - Nueva función y estado
4. `components/feats/facturas/facturas-consolidadas-table.tsx` - Nueva tabla (CREADO)
5. `components/feats/facturas/facturas-section.tsx` - Usa nueva tabla
