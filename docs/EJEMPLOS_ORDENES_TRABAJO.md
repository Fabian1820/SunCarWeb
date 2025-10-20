# 📝 Ejemplos Prácticos - Órdenes de Trabajo

Esta guía contiene ejemplos reales de uso del sistema de órdenes de trabajo.

---

## 🎯 Casos de Uso

### 1. Crear Orden para Instalación de Paneles Solares

**Escenario**: Una brigada debe instalar paneles solares en la casa de un cliente nuevo.

**Datos**:
- **Cliente**: Juan Pérez (Número: CLI-12345)
- **Brigada**: Brigada Solar Norte
- **Tipo**: Inversión
- **Fecha**: 15 de Noviembre, 2025
- **Comentarios**: "Instalación residencial de 12 paneles fotovoltaicos de 450W c/u. Total: 5.4 kWp. Incluye inversor híbrido y estructura metálica."

**Request API**:
```bash
curl -X POST "https://api.suncarsrl.com/api/ordenes-trabajo/" \
  -H "Authorization: Bearer suncar-token-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "brigada_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "cliente_numero": "CLI-12345",
    "tipo_reporte": "inversión",
    "fecha_ejecucion": "2025-11-15T08:00:00",
    "comentarios": "Instalación residencial de 12 paneles fotovoltaicos de 450W c/u. Total: 5.4 kWp. Incluye inversor híbrido y estructura metálica."
  }'
```

**Mensaje WhatsApp generado**:
```
📋 *ORDEN DE TRABAJO*

🔧 Tipo: INVERSIÓN
👤 Cliente: Juan Pérez
📍 N° Cliente: CLI-12345
👷 Brigada: Brigada Solar Norte
📅 Fecha de ejecución: 15 de noviembre de 2025

💬 Comentarios:
Instalación residencial de 12 paneles fotovoltaicos de 450W c/u. Total: 5.4 kWp. Incluye inversor híbrido y estructura metálica.

🔗 Link de reporte:
https://api.suncarsrl.com/app/crear/inversion/CLI-12345

_Generado por SunCar SRL_
```

---

### 2. Crear Orden para Reparación Urgente

**Escenario**: Un inversor dejó de funcionar y necesita reparación inmediata.

**Datos**:
- **Cliente**: Empresa ABC S.A. (Número: CLI-98765)
- **Brigada**: Brigada Mantenimiento Centro
- **Tipo**: Avería
- **Fecha**: Hoy (urgente)
- **Comentarios**: "URGENTE: Inversor Fronius 10kW fuera de servicio. Error E401. Cliente sin energía solar. Prioridad alta."

**Frontend - Código React**:
```typescript
const handleCrearOrdenUrgente = async () => {
  const ordenData: CreateOrdenTrabajoRequest = {
    brigada_id: "brigada-mantenimiento-001",
    cliente_numero: "CLI-98765",
    tipo_reporte: "avería",
    fecha_ejecucion: new Date().toISOString(), // HOY
    comentarios: "URGENTE: Inversor Fronius 10kW fuera de servicio. Error E401. Cliente sin energía solar. Prioridad alta."
  }

  const response = await createOrden(ordenData, "Brigada Mantenimiento Centro", "Empresa ABC S.A.")
  
  if (response.success) {
    toast({
      title: "✅ Orden Urgente Creada",
      description: "La brigada ha sido notificada",
    })
  }
}
```

---

### 3. Crear Orden para Mantenimiento Programado

**Escenario**: Mantenimiento anual preventivo de instalación existente.

**Datos**:
- **Cliente**: María González (Número: CLI-55555)
- **Brigada**: Brigada Instalación Sur
- **Tipo**: Mantenimiento
- **Fecha**: 1 de Diciembre, 2025
- **Comentarios**: "Mantenimiento anual preventivo. Incluye: limpieza de paneles, revisión de conexiones, medición de tensiones, verificación de inversor y estructura."

---

### 4. Filtrar Órdenes Pendientes de una Brigada

**Request API**:
```bash
curl -X GET "https://api.suncarsrl.com/api/ordenes-trabajo/?brigada_id=brigada-001&estado=pendiente" \
  -H "Authorization: Bearer suncar-token-2025"
```

**Frontend - Código React**:
```typescript
// Usando el hook
const { filteredOrdenes, setFilterEstado, filterTipoReporte } = useOrdenesTrabajo()

// Filtrar solo pendientes
setFilterEstado("pendiente")

// Filtrar por tipo
setFilterTipoReporte("avería")

// Búsqueda por texto
setSearchTerm("Empresa ABC")
```

---

### 5. Actualizar Estado de Orden (De Pendiente a En Proceso)

**Escenario**: La brigada comienza el trabajo.

**Request API**:
```bash
curl -X PATCH "https://api.suncarsrl.com/api/ordenes-trabajo/65a1b2c..." \
  -H "Authorization: Bearer suncar-token-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "en_proceso",
    "comentarios": "Brigada en camino al sitio. ETA: 30 minutos."
  }'
```

**Frontend - Código React**:
```typescript
const handleIniciarTrabajo = async (ordenId: string) => {
  const updates: UpdateOrdenTrabajoRequest = {
    estado: "en_proceso",
    comentarios: "Brigada en camino al sitio. ETA: 30 minutos."
  }

  const success = await updateOrden(ordenId, updates)
  
  if (success) {
    toast({
      title: "✅ Orden Actualizada",
      description: "El estado cambió a 'En Proceso'",
    })
  }
}
```

---

### 6. Completar Orden de Trabajo

**Escenario**: El trabajo terminó exitosamente.

**Request API**:
```bash
curl -X PATCH "https://api.suncarsrl.com/api/ordenes-trabajo/65a1b2c..." \
  -H "Authorization: Bearer suncar-token-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "completada",
    "comentarios": "Trabajo finalizado correctamente. 12 paneles instalados y funcionando. Inversor configurado. Cliente satisfecho. Próxima inspección: 6 meses."
  }'
```

---

### 7. Cancelar Orden de Trabajo

**Escenario**: El cliente pospone el trabajo.

**Request API**:
```bash
curl -X PATCH "https://api.suncarsrl.com/api/ordenes-trabajo/65a1b2c..." \
  -H "Authorization: Bearer suncar-token-2025" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "cancelada",
    "comentarios": "Cliente solicitó posponer instalación. Motivo: problemas de presupuesto. Re-agendar en 2 meses."
  }'
```

---

### 8. Obtener Todas las Órdenes de un Cliente

**Request API**:
```bash
curl -X GET "https://api.suncarsrl.com/api/ordenes-trabajo/?cliente_numero=CLI-12345" \
  -H "Authorization: Bearer suncar-token-2025"
```

**Response**:
```json
{
  "success": true,
  "message": "Se encontraron 3 órdenes de trabajo",
  "data": [
    {
      "id": "orden-001",
      "brigada_id": "brigada-001",
      "brigada_nombre": "Brigada Solar Norte",
      "cliente_numero": "CLI-12345",
      "cliente_nombre": "Juan Pérez",
      "tipo_reporte": "inversión",
      "fecha_ejecucion": "2025-11-15T08:00:00",
      "estado": "completada",
      "comentarios": "Instalación residencial exitosa",
      "fecha_creacion": "2025-10-20T10:30:00"
    },
    {
      "id": "orden-002",
      "brigada_id": "brigada-002",
      "brigada_nombre": "Brigada Mantenimiento Centro",
      "cliente_numero": "CLI-12345",
      "cliente_nombre": "Juan Pérez",
      "tipo_reporte": "mantenimiento",
      "fecha_ejecucion": "2026-05-15T09:00:00",
      "estado": "pendiente",
      "comentarios": "Primer mantenimiento preventivo",
      "fecha_creacion": "2025-10-20T11:15:00"
    }
  ]
}
```

---

### 9. Obtener Órdenes por Rango de Fechas

**Request API**:
```bash
curl -X GET "https://api.suncarsrl.com/api/ordenes-trabajo/?fecha_inicio=2025-11-01T00:00:00&fecha_fin=2025-11-30T23:59:59" \
  -H "Authorization: Bearer suncar-token-2025"
```

**Uso**: Planificación mensual de trabajos.

---

### 10. Eliminar Orden de Trabajo

**Escenario**: Orden creada por error.

**Request API**:
```bash
curl -X DELETE "https://api.suncarsrl.com/api/ordenes-trabajo/65a1b2c..." \
  -H "Authorization: Bearer suncar-token-2025"
```

**Frontend - Código React**:
```typescript
const handleEliminarOrden = async (ordenId: string) => {
  // Mostrar confirmación
  const confirmado = window.confirm("¿Eliminar esta orden? No se puede deshacer.")
  
  if (!confirmado) return

  const success = await deleteOrden(ordenId)
  
  if (success) {
    toast({
      title: "✅ Orden Eliminada",
      description: "La orden fue eliminada correctamente",
    })
  }
}
```

---

## 🔄 Flujos de Trabajo Comunes

### Flujo 1: Instalación Nueva (Inversión)

```
1. Cliente contacta → Crear orden tipo "inversión"
2. Asignar brigada disponible
3. Establecer fecha de instalación
4. Agregar comentarios con detalles técnicos
5. Enviar mensaje WhatsApp a brigada
6. Brigada confirma → Cambiar estado a "en_proceso"
7. Instalación completa → Cambiar estado a "completada"
8. Agregar comentarios finales (materiales usados, observaciones)
```

### Flujo 2: Reparación Urgente (Avería)

```
1. Cliente reporta falla → Crear orden tipo "avería" con prioridad
2. Asignar brigada de guardia
3. Fecha = HOY (urgente)
4. Comentarios: descripción del problema
5. Notificar brigada inmediatamente
6. Brigada se dirige al sitio → Estado "en_proceso"
7. Reparación completa → Estado "completada"
8. Comentarios: causa del problema, solución aplicada
```

### Flujo 3: Mantenimiento Programado

```
1. Sistema genera recordatorio → Crear orden tipo "mantenimiento"
2. Asignar brigada según disponibilidad
3. Coordinar fecha con cliente
4. Agregar checklist en comentarios
5. Enviar confirmación a cliente
6. Día del mantenimiento → Estado "en_proceso"
7. Completar checklist → Estado "completada"
8. Agendar próximo mantenimiento
```

---

## 📱 Uso desde la Interfaz Web

### Crear Orden - Paso a Paso

1. **Navegar** a http://localhost:3000/ordenes-trabajo
2. **Clic** en botón "Crear Orden" (naranja, esquina superior derecha)
3. **Seleccionar Brigada**:
   - Clic en campo "Brigada"
   - Escribir para buscar
   - Seleccionar de la lista
4. **Seleccionar Cliente**:
   - Clic en campo "Cliente"
   - Escribir número o nombre
   - Seleccionar de la lista
5. **Elegir Tipo de Reporte**:
   - Inversión (instalación nueva)
   - Avería (reparación)
   - Mantenimiento (revisión)
6. **Establecer Fecha**:
   - Clic en calendario
   - Seleccionar fecha de ejecución
7. **Agregar Comentarios** (opcional):
   - Escribir detalles del trabajo
   - Materiales necesarios
   - Instrucciones especiales
8. **Clic** "Crear Orden"
9. **Ver Mensaje** generado para WhatsApp
10. **Copiar** y enviar a brigada

### Filtrar Órdenes

**Búsqueda por Texto**:
```
Campo de búsqueda → Escribir "Pérez" → Filtra automáticamente
```

**Filtro por Tipo**:
```
Dropdown "Tipo de Reporte" → Seleccionar "Avería" → Muestra solo averías
```

**Filtro por Estado**:
```
Dropdown "Estado" → Seleccionar "Pendiente" → Muestra solo pendientes
```

**Combinar Filtros**:
```
Búsqueda: "Solar"
Tipo: "Inversión"
Estado: "Pendiente"
→ Muestra inversiones pendientes con "Solar" en algún campo
```

---

## 🧪 Testing Manual

### Checklist de Pruebas

#### ✅ CREATE (Crear)
- [ ] Crear orden con todos los campos
- [ ] Crear orden sin comentarios (opcional)
- [ ] Validar campos requeridos
- [ ] Verificar mensaje WhatsApp generado
- [ ] Verificar que aparece en la lista

#### ✅ READ (Leer)
- [ ] Ver lista completa de órdenes
- [ ] Filtrar por tipo de reporte
- [ ] Filtrar por estado
- [ ] Buscar por texto (cliente, brigada)
- [ ] Ver detalles de una orden específica

#### ✅ UPDATE (Actualizar)
- [ ] Cambiar estado de pendiente a en_proceso
- [ ] Cambiar estado a completada
- [ ] Modificar comentarios
- [ ] Cambiar fecha de ejecución
- [ ] Cambiar brigada asignada

#### ✅ DELETE (Eliminar)
- [ ] Eliminar orden
- [ ] Confirmar diálogo de confirmación
- [ ] Verificar que desaparece de la lista
- [ ] Verificar mensaje de éxito

---

## 💡 Tips y Mejores Prácticas

### 1. Comentarios Efectivos

**❌ Mal**:
```
"Instalación solar"
```

**✅ Bien**:
```
"Instalación residencial de sistema solar fotovoltaico:
- 12 paneles Jinko Tiger Pro 450W
- Inversor Fronius Primo 5.0-1
- Estructura aluminio para techo inclinado
- 50 metros cable solar 6mm
- Protecciones DC y AC
Tiempo estimado: 6-8 horas"
```

### 2. Estados Claros

- **Pendiente**: Orden creada, esperando inicio
- **En Proceso**: Brigada trabajando activamente
- **Completada**: Trabajo terminado y verificado
- **Cancelada**: Cliente canceló o se pospuso

### 3. Fechas Realistas

- Considerar disponibilidad de brigada
- Tiempo de viaje al sitio
- Duración estimada del trabajo
- Clima (para trabajos externos)
- Disponibilidad del cliente

### 4. Priorización

**Alta Prioridad** (Averías):
- Fecha = HOY o próximo día hábil
- Estado = en_proceso inmediatamente
- Notificación urgente

**Media Prioridad** (Inversiones):
- Fecha = 1-2 semanas adelante
- Coordinación con cliente
- Preparación de materiales

**Baja Prioridad** (Mantenimientos):
- Fecha = 1 mes adelante
- Planificación mensual
- Agrupar por zona geográfica

---

## 🎓 Preguntas Frecuentes

### ¿Puedo cambiar la brigada de una orden ya creada?
Sí, usa el endpoint PATCH para actualizar el `brigada_id`.

### ¿Qué pasa si elimino una orden por error?
La eliminación es permanente. Se recomienda usar estado "cancelada" en lugar de eliminar.

### ¿Puedo tener múltiples órdenes para el mismo cliente?
Sí, un cliente puede tener muchas órdenes (histórico de trabajos).

### ¿Cómo busco todas las órdenes completadas de una brigada?
```bash
GET /api/ordenes-trabajo/?brigada_id=XXX&estado=completada
```

### ¿El campo comentarios tiene límite de caracteres?
No tiene límite técnico, pero se recomienda ser conciso y claro.

### ¿Puedo ver el historial de cambios de una orden?
Actualmente no, pero se puede implementar un sistema de auditoría.

---

**Última actualización**: 2025-10-20  
**Versión**: 1.0.0
