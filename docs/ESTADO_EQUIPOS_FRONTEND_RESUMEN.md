# Estado de Equipos - Resumen Frontend

## Funcionalidad Implementada

### 1. Vista General
- **3 Cards superiores clickeables**: Vendidos, Entregados, En Servicio
- **Filtros por categoría**: Todas, Inversores, Baterías, Paneles Solares
- **Lista de equipos desplegables**: Cada equipo muestra su información resumida

### 2. Header de Cada Equipo
Muestra 4 métricas principales (todas clickeables):
- **Vendidos** (azul): Total de unidades vendidas
- **Entregados** (verde): Unidades ya entregadas
- **En Servicio** (morado): Unidades funcionando
- **Pendientes** (naranja): Unidades que faltan (Vendidos - En Servicio)

### 3. Interacción con Números
Al hacer clic en cualquier número del header:
- Se expande automáticamente el equipo
- Se abre el tab correspondiente con los clientes filtrados
- Efecto hover para indicar que es clickeable

### 4. Tabs Dentro de Cada Equipo
Cuando se expande un equipo, muestra 4 tabs:

#### Tab "Todos"
- Muestra todos los clientes con ese equipo
- Cantidad: `unidades_vendidas`
- Incluye desglose visual: entregadas, en servicio, pendientes

#### Tab "Entregados"
- Filtra: `cliente.unidades_entregadas > 0`
- Muestra solo clientes con equipos entregados
- Cantidad mostrada: `unidades_entregadas`

#### Tab "En Servicio"
- Filtra: `cliente.unidades_en_servicio > 0`
- Muestra solo clientes con equipos funcionando
- Cantidad mostrada: `unidades_en_servicio`

#### Tab "Pendientes"
- Filtra: `cliente.unidades_pendientes > 0`
- Muestra solo clientes con equipos pendientes
- Cantidad mostrada: `unidades_pendientes`

## Estructura de Datos del Backend

### Campos por Cliente
```typescript
{
  id: string
  codigo: string
  nombre: string
  telefono: string
  direccion: string
  provincia: string
  estado: string
  fecha_instalacion?: string
  cantidad_equipos: number           // Total de equipos de este tipo
  unidades_vendidas: number          // Total vendidas
  unidades_entregadas: number        // Ya entregadas
  unidades_pendientes: number        // Vendidas - En Servicio
  unidades_en_servicio: number       // Funcionando (entregadas + instalación completada)
}
```

### Relaciones Importantes
- `Vendidos = En Servicio + Pendientes`
- `En Servicio ≤ Entregadas ≤ Vendidos`
- `Pendientes = Vendidos - En Servicio`

## Ejemplo de Uso

### Caso 1: Ver clientes con inversores en servicio
1. Filtrar por "Inversores" (opcional)
2. Buscar el inversor específico (ej: "Inversor Híbrido 8kW")
3. Click en el número de "En Servicio" (ej: "8")
4. Se expande y muestra solo los clientes con ese inversor funcionando

### Caso 2: Ver clientes con paneles pendientes
1. Filtrar por "Paneles Solares"
2. Buscar el panel específico
3. Click en el número de "Pendientes"
4. Se expande y muestra solo los clientes que tienen paneles sin instalar

### Caso 3: Ver desglose completo de un cliente
1. Expandir cualquier equipo
2. Ir al tab "Todos"
3. Cada cliente muestra un desglose con:
   - Unidades entregadas (verde)
   - Unidades en servicio (morado)
   - Unidades pendientes (naranja)

## Componentes Modificados

### 1. `components/feats/reportes-comercial/estado-equipos-stats.tsx`
- Componente principal con toda la lógica
- Maneja estados de expansión y tabs
- Filtros por categoría
- Click handlers para números

### 2. `lib/types/feats/reportes-comercial/reportes-comercial-types.ts`
- Interface `ClienteConEquipo` actualizada
- Incluye los 4 campos numéricos de unidades

### 3. `app/reportes-comercial/estado-equipos/page.tsx`
- Página principal (sin cambios significativos)
- Solo consume el componente

## Datos de Prueba (Tu Sistema)
- **923 equipos vendidos**
- **197 en servicio**
- **726 pendientes** (923 - 197)
- **47 clientes** solo en paneles solares

## Próximos Pasos
1. ✅ Backend implementado y funcionando
2. ✅ Frontend implementado y listo
3. 🔄 Reiniciar servidor backend
4. ✅ Probar desde el frontend

## Notas Técnicas
- Los clientes pueden aparecer en múltiples tabs si tienen equipos en diferentes estados
- El mismo cliente puede tener 2 inversores en servicio y 1 pendiente
- Los filtros son independientes: puedes filtrar por categoría Y por estado
- Las cards superiores son clickeables pero no filtran, solo cambian el color del tema
