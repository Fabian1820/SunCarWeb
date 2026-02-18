# Filtros de Fecha en Resultados por Comercial

## Descripción

El módulo "Resultados por Comercial" incluye filtros de fecha "Desde" y "Hasta" que permiten filtrar las ofertas por rango de fechas del primer pago. Las tarjetas de estadísticas se actualizan automáticamente según los filtros aplicados.

## Filtros Disponibles

### 1. Filtros de Fecha (Desde/Hasta)
- **Desde**: Fecha inicial del rango
- **Hasta**: Fecha final del rango
- Filtran por la fecha del primer pago de cada oferta
- Las tarjetas se actualizan con los datos filtrados

### 2. Filtros de Mes/Año (Alternativos)
- **Mes**: Filtro por mes específico
- **Año**: Filtro por año específico
- Se deshabilitan cuando hay filtros de fecha activos

## Comportamiento de los Filtros

### Prioridad de Filtros

```
Filtros de Fecha (Desde/Hasta)
         ↓
    ¿Están activos?
         ↓
    Sí  │  No
        │
        ↓
Deshabilita     │  Habilita
Mes/Año         │  Mes/Año
```

### Interacción entre Filtros

1. **Cuando se usa Desde/Hasta**:
   - Los filtros de Mes y Año se deshabilitan
   - Los valores de Mes y Año se resetean a "Todos"

2. **Cuando se usa Mes/Año**:
   - Los filtros de Desde y Hasta se limpian
   - Solo se puede usar Mes/Año

## Ejemplos de Uso

### Caso 1: Filtrar por Rango de Fechas

**Objetivo**: Ver ofertas con pagos entre el 1 de enero y el 31 de marzo de 2024

**Pasos**:
1. Seleccionar "Desde": 2024-01-01
2. Seleccionar "Hasta": 2024-03-31
3. Las tarjetas y tabla se actualizan automáticamente

**Resultado**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Filtrado por fecha: desde 01/01/2024 hasta 31/03/2024   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────┐  ┌─────────────────────────────┐
│ María González              │  │ Carlos Rodríguez            │
│ Ofertas Cerradas: 3         │  │ Ofertas Cerradas: 2         │
│ Margen Total: $4,500.00     │  │ Margen Total: $3,200.00     │
└─────────────────────────────┘  └─────────────────────────────┘

Mostrando 5 de 18 ofertas
Total Margen: $7,700.00    Total Pagado: $25,000.00
```

---

### Caso 2: Filtrar Solo "Desde"

**Objetivo**: Ver ofertas con pagos desde el 1 de febrero de 2024 en adelante

**Pasos**:
1. Seleccionar "Desde": 2024-02-01
2. Dejar "Hasta" vacío
3. Las tarjetas y tabla se actualizan

**Resultado**: Muestra todas las ofertas con primer pago desde febrero 2024 hasta la fecha más reciente

---

### Caso 3: Filtrar Solo "Hasta"

**Objetivo**: Ver ofertas con pagos hasta el 31 de diciembre de 2023

**Pasos**:
1. Dejar "Desde" vacío
2. Seleccionar "Hasta": 2023-12-31
3. Las tarjetas y tabla se actualizan

**Resultado**: Muestra todas las ofertas con primer pago hasta diciembre 2023

---

### Caso 4: Limpiar Filtros de Fecha

**Objetivo**: Volver a ver todas las ofertas

**Pasos**:
1. Hacer clic en el botón "Limpiar fechas" (aparece cuando hay filtros activos)
2. O borrar manualmente las fechas

**Resultado**: Se muestran todas las ofertas sin filtro de fecha

---

### Caso 5: Usar Mes/Año en Lugar de Fechas

**Objetivo**: Ver ofertas de enero 2024

**Pasos**:
1. Asegurarse de que "Desde" y "Hasta" están vacíos
2. Seleccionar "Mes": Enero
3. Seleccionar "Año": 2024

**Resultado**: Muestra solo ofertas con primer pago en enero 2024

---

## Visualización

### Con Filtros de Fecha Activos

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Resultados por Comercial    [X Limpiar fechas] [Actualizar]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [🔍 Buscar...] [Comercial ▼] [Desde: 01/01/24] [Hasta: 31/03]│
│                                [Mes: Deshabilitado] [Año: Desh]│
│                                                                 │
│  ┌─────────────────────────────┐  ┌──────────────────────────┐│
│  │ María González              │  │ Carlos Rodríguez         ││
│  │ Ofertas Cerradas: 3         │  │ Ofertas Cerradas: 2      ││
│  │ Margen Total: $4,500.00     │  │ Margen Total: $3,200.00  ││
│  └─────────────────────────────┘  └──────────────────────────┘│
│                                                                 │
│  📊 Filtrado por fecha: desde 01/01/2024 hasta 31/03/2024      │
│  Mostrando 5 de 18 ofertas                                     │
│  Total Margen: $7,700.00    Total Pagado: $25,000.00          │
└─────────────────────────────────────────────────────────────────┘
```

### Sin Filtros de Fecha

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Resultados por Comercial                      [Actualizar]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [🔍 Buscar...] [Comercial ▼] [Desde:    ] [Hasta:    ]       │
│                                [Mes: Enero ▼] [Año: 2024 ▼]    │
│                                                                 │
│  ┌─────────────────────────────┐  ┌──────────────────────────┐│
│  │ María González              │  │ Carlos Rodríguez         ││
│  │ Ofertas Cerradas: 8         │  │ Ofertas Cerradas: 5      ││
│  │ Margen Total: $10,200.00    │  │ Margen Total: $7,500.00  ││
│  └─────────────────────────────┘  └──────────────────────────┘│
│                                                                 │
│  Mostrando 18 de 18 ofertas                                    │
│  Total Margen: $25,700.00    Total Pagado: $87,450.00         │
└─────────────────────────────────────────────────────────────────┘
```

## Lógica de Filtrado

### Código de Filtrado por Fecha

```typescript
// Filtro de fecha desde
if (fechaDesde) {
  const desde = new Date(fechaDesde)
  desde.setHours(0, 0, 0, 0)  // Inicio del día
  if (fechaPago < desde) {
    return false
  }
}

// Filtro de fecha hasta
if (fechaHasta) {
  const hasta = new Date(fechaHasta)
  hasta.setHours(23, 59, 59, 999)  // Fin del día
  if (fechaPago > hasta) {
    return false
  }
}
```

### Actualización de Tarjetas

Las tarjetas se calculan a partir de `filteredResultados`:

```typescript
const estadisticas = useMemo(() => {
  const stats = new Map<string, EstadisticaComercial>()

  filteredResultados.forEach(resultado => {
    const comercial = resultado.contacto.comercial || "Sin asignar"
    
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

**Resultado**: Las tarjetas solo muestran estadísticas de las ofertas filtradas

## Características

### 1. Botón "Limpiar fechas"
- Aparece solo cuando hay filtros de fecha activos
- Limpia ambos campos (Desde y Hasta) con un clic
- Ubicado junto al título del módulo

### 2. Indicador Visual
- Banner azul que muestra el rango de fechas aplicado
- Formato: "Filtrado por fecha: desde DD/MM/YYYY hasta DD/MM/YYYY"
- Aparece encima del resumen de totales

### 3. Deshabilitar Mes/Año
- Los selectores de Mes y Año se deshabilitan cuando hay filtros de fecha
- Evita conflictos entre diferentes tipos de filtros
- Se habilitan automáticamente al limpiar las fechas

### 4. Limpieza Automática
- Al seleccionar Mes o Año, se limpian los filtros de fecha
- Al seleccionar Desde o Hasta, se resetean Mes y Año a "Todos"

## Casos de Uso Comunes

### 1. Análisis Trimestral
```
Desde: 2024-01-01
Hasta: 2024-03-31
```
Ver desempeño del primer trimestre

### 2. Análisis Mensual Específico
```
Desde: 2024-02-01
Hasta: 2024-02-29
```
Ver desempeño de febrero

### 3. Comparar Períodos
```
Paso 1: Desde: 2024-01-01, Hasta: 2024-03-31
Anotar totales

Paso 2: Desde: 2023-01-01, Hasta: 2023-03-31
Comparar con año anterior
```

### 4. Ver Últimos 30 Días
```
Desde: [Fecha hace 30 días]
Hasta: [Fecha actual]
```

### 5. Ver Todo el Año
```
Desde: 2024-01-01
Hasta: 2024-12-31
```

## Preguntas Frecuentes

**P: ¿Por qué no puedo seleccionar Mes/Año cuando tengo fechas?**
R: Los filtros de fecha tienen prioridad. Limpia las fechas primero para usar Mes/Año.

**P: ¿Las tarjetas se actualizan automáticamente?**
R: Sí, las tarjetas muestran solo las estadísticas de las ofertas filtradas.

**P: ¿Puedo filtrar solo por "Desde" sin "Hasta"?**
R: Sí, mostrará todas las ofertas desde esa fecha en adelante.

**P: ¿Puedo filtrar solo por "Hasta" sin "Desde"?**
R: Sí, mostrará todas las ofertas hasta esa fecha.

**P: ¿Qué fecha se usa para filtrar?**
R: Se usa la fecha del primer pago de cada oferta (`fecha_primer_pago`).

**P: ¿Los filtros de fecha afectan la tabla?**
R: Sí, tanto las tarjetas como la tabla se filtran según las fechas seleccionadas.

**P: ¿Cómo limpio rápidamente los filtros?**
R: Usa el botón "Limpiar fechas" que aparece junto al título cuando hay filtros activos.

## Combinación de Filtros

Los filtros de fecha se pueden combinar con otros filtros:

```
Búsqueda: "Sistema Solar"
Comercial: "María González"
Desde: 2024-01-01
Hasta: 2024-03-31
```

**Resultado**: Ofertas de María González que contienen "Sistema Solar" con pagos entre enero y marzo 2024

## Resumen

✅ Filtros de fecha "Desde" y "Hasta" implementados  
✅ Tarjetas se actualizan según filtros  
✅ Tabla se filtra según fechas  
✅ Botón "Limpiar fechas" para resetear  
✅ Indicador visual del rango aplicado  
✅ Mes/Año se deshabilitan con fechas activas  
✅ Limpieza automática al cambiar tipo de filtro  
✅ Resumen de totales actualizado  

**Los filtros de fecha están completamente funcionales.**
