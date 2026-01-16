# 📦 Módulo: Instalaciones Nuevas

## Descripción

Módulo que muestra tanto **Leads** como **Clientes** con estado "Pendiente de Instalación" en una sola tabla unificada.

---

## Ruta

`/instalaciones/nuevas`

---

## Funcionalidad

### Fuentes de Datos

1. **Leads**: Todos los leads del sistema (potenciales instalaciones)
2. **Clientes**: Solo los que tienen estado "Pendiente de Instalación"

### Tipo Unificado

Se crea un tipo `InstalacionNueva` que combina ambos:

```typescript
interface InstalacionNueva {
  tipo: 'lead' | 'cliente'
  id: string
  numero?: string  // Solo clientes
  nombre: string
  telefono: string
  direccion: string
  ofertas?: any[]
  estado: string
  fecha_contacto?: string
  leadId?: string  // Solo leads
  original: Lead | Cliente
}
```

---

## Filtros

1. **Buscar**: Por nombre, teléfono, dirección, número de cliente
2. **Tipo**: 
   - Todos (muestra leads + clientes)
   - Solo Leads
   - Solo Clientes
3. **Fecha Desde**: Filtrar por fecha de contacto
4. **Fecha Hasta**: Filtrar por fecha de contacto

---

## Tabla

### Columnas

1. **Tipo**: Badge que indica si es Lead (azul) o Cliente (verde)
2. **Nombre**: Nombre completo
   - Si es cliente, muestra el número debajo
3. **Teléfono**: Número de contacto
4. **Dirección**: Dirección completa
5. **Oferta**: Productos de la oferta formateados
6. **Estado**: Badge con el estado actual

### Vista Móvil

Cards individuales con:
- Badge de tipo en la esquina superior derecha
- Nombre, teléfono y dirección
- Oferta
- Estado

### Vista Escritorio

Tabla completa con todas las columnas.

---

## Badges y Colores

### Badge de Tipo
- **Lead**: Azul (`bg-blue-100 text-blue-800`)
- **Cliente**: Verde (`bg-green-100 text-green-800`)

### Badge de Estado
- Outline con el texto del estado

### Contador en Header
- Muestra total de instalaciones
- Badge con contador de Leads (azul)
- Badge con contador de Clientes (verde)

---

## Ordenamiento

Las instalaciones se ordenan por **fecha de contacto** (más recientes primero).

---

## Endpoints Utilizados

### 1. GET /api/leads/
Obtiene todos los leads del sistema.

**Response:**
```json
{
  "data": [
    {
      "id": "123",
      "nombre": "Juan Pérez",
      "telefono": "12345678",
      "direccion": "Calle 123",
      "ofertas": [...],
      "estado": "Nuevo",
      "fecha_contacto": "2024-01-15"
    }
  ]
}
```

### 2. GET /api/clientes/
Obtiene todos los clientes. El frontend filtra por estado "Pendiente de Instalación".

**Response:**
```json
[
  {
    "numero": "CLI-001",
    "nombre": "María García",
    "telefono": "87654321",
    "direccion": "Avenida 456",
    "ofertas": [...],
    "estado": "Pendiente de Instalación",
    "fecha_contacto": "2024-01-10"
  }
]
```

---

## Formato de Ofertas

Las ofertas se muestran en formato compacto:

```
2x Inversor Growatt 5kW • 4x Batería Pylontech 3.5kWh • 8x Panel 550W
```

Si hay múltiples ofertas, se separan por ` | `.

---

## Archivos Creados

### 1. `app/instalaciones/nuevas/page.tsx`
- Página principal
- Carga leads y clientes
- Unifica datos en tipo `InstalacionNueva`
- Maneja filtros y estado

### 2. `components/feats/instalaciones/instalaciones-nuevas-table.tsx`
- Componente de tabla
- Filtros de búsqueda
- Vista móvil y escritorio
- Badges y contadores

---

## Flujo de Usuario

1. Usuario hace clic en "Instalaciones Nuevas" desde `/instalaciones`
2. Se cargan todos los leads y clientes pendientes
3. Se muestran en una tabla unificada
4. Usuario puede:
   - Buscar por cualquier campo
   - Filtrar por tipo (leads/clientes)
   - Filtrar por rango de fechas
   - Ver información completa de cada instalación

---

## Diferencias con Instalaciones en Proceso

| Característica | Instalaciones Nuevas | Instalaciones en Proceso |
|----------------|---------------------|--------------------------|
| Fuentes | Leads + Clientes | Solo Clientes |
| Estado Cliente | "Pendiente de Instalación" | "Instalación en Proceso" |
| Leads | ✅ Incluye todos | ❌ No incluye |
| Acciones | ❌ Solo visualización | ✅ Cambiar estado, editar |
| Columna "Qué Falta" | ❌ No | ✅ Sí |

---

## Casos de Uso

### Caso 1: Ver todos los pendientes
- Filtro "Todos"
- Muestra leads y clientes juntos
- Útil para tener visión completa

### Caso 2: Ver solo leads
- Filtro "Solo Leads"
- Muestra potenciales clientes
- Útil para seguimiento de ventas

### Caso 3: Ver solo clientes pendientes
- Filtro "Solo Clientes"
- Muestra clientes confirmados pero sin instalar
- Útil para planificación de instalaciones

### Caso 4: Buscar instalación específica
- Escribir nombre o teléfono
- Encuentra tanto en leads como clientes
- Útil para consultas rápidas

---

## Testing Manual

### Caso 1: Ver instalaciones nuevas
1. Ir a `/instalaciones`
2. Click en "Instalaciones Nuevas"
3. Verificar que se muestran leads y clientes
4. Verificar badges de tipo (azul para leads, verde para clientes)

### Caso 2: Filtrar por tipo
1. Seleccionar "Solo Leads" en el filtro
2. Verificar que solo se muestran leads
3. Seleccionar "Solo Clientes"
4. Verificar que solo se muestran clientes

### Caso 3: Buscar
1. Escribir nombre en el campo de búsqueda
2. Verificar que filtra correctamente
3. Probar con teléfono
4. Probar con dirección

### Caso 4: Filtrar por fecha
1. Seleccionar rango de fechas
2. Verificar que solo muestra instalaciones en ese rango

---

## Mejoras Futuras

1. **Acciones por fila**:
   - Convertir lead a cliente
   - Cambiar estado
   - Asignar brigada

2. **Exportación**:
   - Exportar a Excel
   - Exportar a PDF

3. **Estadísticas**:
   - Gráfico de leads vs clientes
   - Tendencia temporal

4. **Notificaciones**:
   - Alertas de leads antiguos
   - Recordatorios de seguimiento

---

**Fecha**: Enero 2026  
**Estado**: ✅ Implementado  
**Módulo**: Gestionar Instalaciones - Instalaciones Nuevas
