# 📦 Módulo: Gestionar Instalaciones

## Descripción

Nuevo módulo para administrar instalaciones, averías y mantenimiento de equipos solares.

---

## Estructura del Módulo

### Página Principal: `/instalaciones`

Muestra 3 opciones principales:

1. **Instalaciones en Proceso** (Azul)
   - Clientes con estado "Instalación en Proceso"
   - Ícono: Clock (Reloj)
   
2. **Instalaciones Nuevas** (Verde)
   - Nuevas instalaciones por realizar
   - Ícono: Wrench (Llave inglesa)
   
3. **Averías** (Rojo)
   - Reportes de averías y mantenimiento
   - Ícono: AlertTriangle (Triángulo de alerta)

---

## Instalaciones en Proceso

### Ruta: `/instalaciones/en-proceso`

### Funcionalidad

Muestra una tabla con todos los clientes que tienen estado "Instalación en Proceso".

### Filtros

- **Buscar**: Por nombre, teléfono, dirección, etc.
- **Fecha Desde**: Filtrar por fecha de contacto
- **Fecha Hasta**: Filtrar por fecha de contacto

### Columnas de la Tabla

1. **Nombre**: Nombre del cliente
2. **Teléfonos**: Número de teléfono
3. **Dirección**: Dirección completa
4. **Oferta**: Productos de la oferta (inversor, batería, paneles)
5. **Qué Falta**: Lo que falta para completar la instalación
6. **Acciones**: Botones de acción

### Acciones Disponibles

#### 1. Marcar como Instalado ✅
- **Botón**: Verde con ícono CheckCircle
- **Acción**: Cambia el estado del cliente a "Equipo Instalado con Éxito"
- **Endpoint**: `PUT /api/clientes/{numero}`
- **Body**: `{ "estado": "Equipo Instalado con Éxito" }`

#### 2. Asignar Brigada 👥
- **Botón**: Azul con ícono Users
- **Acción**: Asignar una brigada al trabajo (pendiente de implementar)
- **Estado**: Placeholder

#### 3. Editar Qué Falta ✏️
- **Botón**: Naranja con ícono Edit
- **Acción**: Abre diálogo para editar el campo `falta_instalacion`
- **Endpoint**: `PUT /api/clientes/{numero}`
- **Body**: `{ "falta_instalacion": "texto" }`

---

## Archivos Creados

### 1. `app/instalaciones/page.tsx`
Página principal con las 3 opciones (en proceso, nuevas, averías).

### 2. `app/instalaciones/en-proceso/page.tsx`
Página de instalaciones en proceso con filtros y tabla.

### 3. `components/feats/instalaciones/instalaciones-en-proceso-table.tsx`
Componente de tabla con:
- Filtros de búsqueda
- Vista móvil y escritorio
- Acciones para cada cliente
- Diálogo para editar "Qué falta"

### 4. `app/page.tsx` (modificado)
Agregado card de "Gestionar Instalaciones" en el dashboard.

---

## Flujo de Usuario

### Desde el Dashboard

1. Usuario hace clic en "Gestionar Instalaciones"
2. Ve las 3 opciones disponibles
3. Hace clic en "Instalaciones en Proceso"
4. Ve la tabla con todos los clientes en proceso
5. Puede:
   - Buscar y filtrar clientes
   - Marcar como instalado
   - Asignar brigada (pendiente)
   - Editar qué falta

### Marcar como Instalado

1. Usuario hace clic en botón verde (✅)
2. Se actualiza el estado a "Equipo Instalado con Éxito"
3. Toast de confirmación
4. Cliente desaparece de la tabla (ya no está en proceso)

### Editar Qué Falta

1. Usuario hace clic en botón naranja (✏️)
2. Se abre diálogo con campo de texto
3. Usuario escribe lo que falta
4. Guarda cambios
5. Toast de confirmación
6. Tabla se actualiza

---

## Endpoints Utilizados

### 1. GET /api/clientes/
Obtiene todos los clientes. El frontend filtra por estado "Instalación en Proceso".

### 2. PUT /api/clientes/{numero}
Actualiza datos del cliente:
- Cambiar estado
- Actualizar `falta_instalacion`

---

## Vistas Responsive

### Vista Móvil
- Cards individuales por cliente
- Información compacta
- Botones con texto e ícono

### Vista Escritorio
- Tabla completa con todas las columnas
- Botones solo con íconos
- Más información visible

---

## Pendientes de Implementación

### 1. Asignar Brigada
- Diálogo para seleccionar brigada
- Endpoint para asignar trabajo a brigada
- Notificación a la brigada

### 2. Instalaciones Nuevas
- Página `/instalaciones/nuevas`
- Tabla con clientes nuevos
- Filtros y acciones

### 3. Averías
- Página `/instalaciones/averias`
- Tabla con reportes de averías
- Sistema de tickets

---

## Estilos y Colores

### Card en Dashboard
- **Color**: Púrpura (`purple-600`)
- **Ícono**: Wrench (Llave inglesa)
- **Badge**: "Operaciones"

### Instalaciones en Proceso
- **Color principal**: Azul
- **Border**: `border-l-blue-600`
- **Badge**: "En Proceso" (azul)

### Botones de Acción
- **Instalado**: Verde (`border-green-300 text-green-700`)
- **Asignar**: Azul (`border-blue-300 text-blue-700`)
- **Editar**: Naranja (`border-orange-300 text-orange-700`)

---

## Formato de Ofertas

Las ofertas se muestran en formato compacto:

```
2x Inversor Growatt 5kW • 4x Batería Pylontech 3.5kWh • 8x Panel 550W
```

Formato:
- `{cantidad}x {nombre_producto}`
- Separados por ` • `
- Si hay múltiples ofertas, se separan por ` | `

---

## Testing Manual

### Caso 1: Ver instalaciones en proceso
1. Ir al dashboard
2. Click en "Gestionar Instalaciones"
3. Click en "Instalaciones en Proceso"
4. Verificar que se muestran solo clientes con estado "Instalación en Proceso"

### Caso 2: Marcar como instalado
1. En la tabla, click en botón verde (✅)
2. Verificar toast de éxito
3. Verificar que el cliente desaparece de la tabla

### Caso 3: Editar qué falta
1. Click en botón naranja (✏️)
2. Escribir texto en el campo
3. Click en "Guardar"
4. Verificar toast de éxito
5. Verificar que se actualiza en la tabla

### Caso 4: Filtros
1. Escribir en el campo de búsqueda
2. Verificar que filtra correctamente
3. Seleccionar fechas
4. Verificar que filtra por rango de fechas

---

**Fecha**: Enero 2026  
**Estado**: ✅ Implementado (Instalaciones en Proceso)  
**Pendiente**: Instalaciones Nuevas y Averías  
**Módulo**: Gestionar Instalaciones
