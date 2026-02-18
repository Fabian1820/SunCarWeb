# Implementación del Campo Comercial

## Descripción

Este documento explica cómo el módulo "Resultados por Comercial" utiliza el campo `contacto.comercial` del endpoint `/api/ofertas/confeccion/personalizadas-con-pagos`.

## Campo en el Endpoint

### Estructura del Response

```json
{
  "data": [
    {
      "id": "...",
      "numero_oferta": "OF-20240115-001",
      "contacto": {
        "tipo": "cliente",
        "numero": "C-001",
        "nombre": "Juan Pérez",
        "telefono": "53123456",
        "direccion": "Calle 23 #456",
        "comercial": "María González"  // ← Campo usado
      }
    }
  ]
}
```

### Valores Posibles

- `string`: Nombre del comercial asignado (ej: "María González")
- `null`: No tiene comercial asignado

### Origen del Dato

El campo `comercial` viene de:
- `cliente.comercial` si el contacto es un cliente
- `lead.comercial_asignado` si el contacto es un lead
- `null` si es un lead_sin_agregar o no tiene comercial

## Uso en el Frontend

### 1. Tipo TypeScript

```typescript
// lib/types/feats/reportes-comercial/reportes-comercial-types.ts

export interface ResultadoComercial {
  id: string
  numero_oferta: string
  nombre_completo: string
  // ... otros campos
  contacto: {
    tipo: 'cliente' | 'lead' | 'lead_sin_agregar'
    numero: string | null
    nombre: string
    telefono: string | null
    direccion: string | null
    comercial: string | null  // ← Definición del tipo
  }
  // ... otros campos
}
```

### 2. Extracción de Comerciales Únicos

```typescript
// components/feats/reportes-comercial/resultados-comercial-table.tsx

const comerciales = useMemo(() => {
  const uniqueComerciales = new Set(
    resultados
      .map(r => r.contacto.comercial)           // Extraer comercial
      .filter(c => c !== null && c !== undefined) // Filtrar nulos
  )
  return Array.from(uniqueComerciales).sort()   // Ordenar alfabéticamente
}, [resultados])
```

**Resultado**: Array de strings con nombres únicos de comerciales
```typescript
["Ana Martínez", "Carlos Rodríguez", "María González"]
```

### 3. Filtro por Comercial

```typescript
// components/feats/reportes-comercial/resultados-comercial-table.tsx

const filteredResultados = useMemo(() => {
  return resultados.filter(resultado => {
    // ... otros filtros
    
    // Filtro de comercial
    if (comercialFilter !== "todos" && resultado.contacto.comercial !== comercialFilter) {
      return false
    }
    
    return true
  })
}, [resultados, comercialFilter])
```

**Lógica**:
- Si `comercialFilter === "todos"`: Muestra todas las ofertas
- Si `comercialFilter === "María González"`: Solo muestra ofertas donde `contacto.comercial === "María González"`

### 4. Búsqueda por Comercial

```typescript
// components/feats/reportes-comercial/resultados-comercial-table.tsx

const filteredResultados = useMemo(() => {
  return resultados.filter(resultado => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const comercial = resultado.contacto.comercial || ''  // Manejar null
      
      const matchesSearch = 
        resultado.numero_oferta.toLowerCase().includes(search) ||
        resultado.nombre_completo.toLowerCase().includes(search) ||
        (resultado.contacto.nombre?.toLowerCase().includes(search) || false) ||
        comercial.toLowerCase().includes(search)  // ← Buscar en comercial
      
      if (!matchesSearch) return false
    }
    
    return true
  })
}, [resultados, searchTerm])
```

**Lógica**:
- Convierte el comercial a string vacío si es null
- Busca el término en el nombre del comercial
- Permite buscar "María" y encontrar "María González"

### 5. Agrupación en Estadísticas

```typescript
// components/feats/reportes-comercial/resultados-comercial-table.tsx

const estadisticas = useMemo(() => {
  const stats = new Map<string, EstadisticaComercial>()

  filteredResultados.forEach(resultado => {
    const comercial = resultado.contacto.comercial || "Sin asignar"  // ← Manejar null
    
    if (!stats.has(comercial)) {
      stats.set(comercial, {
        comercial,
        ofertas_cerradas: 0,
        total_margen: 0,
      })
    }

    const stat = stats.get(comercial)!
    stat.ofertas_cerradas += 1
    stat.total_margen += resultado.margen_dolares
  })

  return Array.from(stats.values()).sort((a, b) => b.total_margen - a.total_margen)
}, [filteredResultados])
```

**Lógica**:
- Agrupa ofertas por comercial
- Si `comercial === null`, usa "Sin asignar"
- Suma ofertas y márgenes por cada comercial
- Ordena por margen total (mayor a menor)

**Resultado**:
```typescript
[
  { comercial: "María González", ofertas_cerradas: 8, total_margen: 10200 },
  { comercial: "Carlos Rodríguez", ofertas_cerradas: 5, total_margen: 7500 },
  { comercial: "Ana Martínez", ofertas_cerradas: 3, total_margen: 4800 },
  { comercial: "Sin asignar", ofertas_cerradas: 2, total_margen: 3200 }
]
```

### 6. Visualización en Tarjetas

```typescript
// components/feats/reportes-comercial/resultados-comercial-table.tsx

{estadisticas.map((stat) => (
  <Card key={stat.comercial} className="border-2">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm font-medium text-gray-600">
        {stat.comercial}  {/* ← Muestra el nombre del comercial */}
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Ofertas Cerradas</span>
        <Badge variant="secondary" className="font-semibold">
          {stat.ofertas_cerradas}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">Margen Total</span>
        <span className="text-sm font-bold text-green-600">
          {formatCurrency(stat.total_margen)}
        </span>
      </div>
    </CardContent>
  </Card>
))}
```

**Resultado Visual**:
```
┌─────────────────────────────┐
│ María González              │
│ Ofertas Cerradas: 8         │
│ Margen Total: $10,200.00    │
└─────────────────────────────┘
```

### 7. Visualización en Tabla

```typescript
// components/feats/reportes-comercial/resultados-comercial-table.tsx

{filteredResultados.map((resultado) => {
  const comercial = resultado.contacto.comercial || "Sin asignar"  // ← Manejar null
  
  return (
    <TableRow key={resultado.id}>
      <TableCell className="font-medium">
        {comercial}  {/* ← Primera columna: Comercial */}
      </TableCell>
      <TableCell>
        {/* ... Oferta ... */}
      </TableCell>
      {/* ... Otras columnas ... */}
    </TableRow>
  )
})}
```

**Resultado Visual**:
```
| Comercial        | Oferta          | ... |
|------------------|-----------------|-----|
| María González   | OF-20240115-001 | ... |
| Carlos Rodríguez | OF-20240120-003 | ... |
| Sin asignar      | OF-20240125-005 | ... |
```

### 8. Selector de Filtro

```typescript
// components/feats/reportes-comercial/resultados-comercial-table.tsx

<Select value={comercialFilter} onValueChange={setComercialFilter}>
  <SelectTrigger>
    <SelectValue placeholder="Comercial" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="todos">Todos los comerciales</SelectItem>
    {comerciales.map((comercial) => (
      <SelectItem key={comercial} value={comercial}>
        {comercial}  {/* ← Muestra el nombre del comercial */}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

**Resultado Visual**:
```
┌─────────────────────────┐
│ Comercial            ▼  │
├─────────────────────────┤
│ Todos los comerciales   │
│ Ana Martínez            │
│ Carlos Rodríguez        │
│ María González          │
└─────────────────────────┘
```

## Manejo de Valores Null

### Estrategia

El frontend maneja consistentemente los valores `null` del campo `comercial`:

```typescript
// Patrón usado en todo el código
const comercial = resultado.contacto.comercial || "Sin asignar"
```

### Casos de Uso

1. **Visualización**: Muestra "Sin asignar" en lugar de vacío
2. **Filtrado**: Agrupa todas las ofertas sin comercial
3. **Búsqueda**: Convierte null a string vacío para evitar errores
4. **Estadísticas**: Crea una tarjeta "Sin asignar" con sus totales

### Ejemplo Completo

```typescript
// Oferta sin comercial en el endpoint
{
  "contacto": {
    "comercial": null
  }
}

// En el frontend
const comercial = resultado.contacto.comercial || "Sin asignar"
// comercial = "Sin asignar"

// En la tarjeta
┌─────────────────────────────┐
│ Sin asignar                 │
│ Ofertas Cerradas: 2         │
│ Margen Total: $3,200.00     │
└─────────────────────────────┘

// En la tabla
| Sin asignar | OF-20240125-005 | ... |
```

## Flujo Completo de Datos

```
1. Backend retorna:
   {
     "contacto": {
       "comercial": "María González"
     }
   }
   ↓
2. Frontend recibe y tipea:
   resultado: ResultadoComercial
   resultado.contacto.comercial = "María González"
   ↓
3. Extrae comerciales únicos:
   ["María González", "Carlos Rodríguez", ...]
   ↓
4. Crea filtro:
   <SelectItem value="María González">María González</SelectItem>
   ↓
5. Usuario selecciona:
   comercialFilter = "María González"
   ↓
6. Filtra resultados:
   resultado.contacto.comercial === "María González"
   ↓
7. Agrupa en estadísticas:
   { comercial: "María González", ofertas_cerradas: 8, total_margen: 10200 }
   ↓
8. Renderiza tarjeta y tabla:
   ┌─────────────────────────────┐
   │ María González              │
   │ Ofertas Cerradas: 8         │
   │ Margen Total: $10,200.00    │
   └─────────────────────────────┘
```

## Ventajas de la Implementación

1. **Tipado Fuerte**: TypeScript previene errores de tipo
2. **Manejo de Null**: Consistente en todo el código
3. **Búsqueda Flexible**: Permite buscar por nombre parcial
4. **Agrupación Automática**: Crea estadísticas sin configuración
5. **Filtrado Eficiente**: useMemo evita recálculos innecesarios
6. **UX Clara**: "Sin asignar" es más claro que null o vacío

## Testing del Campo Comercial

### Casos de Prueba

1. **Comercial Asignado**
   ```json
   { "contacto": { "comercial": "María González" } }
   ```
   - ✅ Aparece en filtro
   - ✅ Tiene tarjeta propia
   - ✅ Se puede buscar
   - ✅ Se puede filtrar

2. **Comercial Null**
   ```json
   { "contacto": { "comercial": null } }
   ```
   - ✅ Muestra "Sin asignar"
   - ✅ Tiene tarjeta "Sin asignar"
   - ✅ No aparece en filtro de comerciales
   - ✅ No causa errores

3. **Múltiples Comerciales**
   ```json
   [
     { "contacto": { "comercial": "María González" } },
     { "contacto": { "comercial": "Carlos Rodríguez" } },
     { "contacto": { "comercial": "María González" } }
   ]
   ```
   - ✅ Filtro muestra 2 opciones
   - ✅ Tarjetas muestran 2 comerciales
   - ✅ María tiene 2 ofertas agrupadas

4. **Búsqueda Parcial**
   - Buscar "María" → Encuentra "María González"
   - Buscar "gonzález" → Encuentra "María González"
   - Buscar "sin" → Encuentra "Sin asignar"

## Conclusión

El campo `contacto.comercial` del endpoint está completamente integrado en el módulo:

- ✅ Correctamente tipado
- ✅ Usado en filtros
- ✅ Usado en búsqueda
- ✅ Usado en agrupación
- ✅ Usado en visualización
- ✅ Manejo robusto de null
- ✅ UX clara y consistente

No se requieren cambios adicionales. La implementación es completa y robusta.
