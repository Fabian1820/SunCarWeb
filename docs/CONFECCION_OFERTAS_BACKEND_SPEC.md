# Especificación Backend - Confección de Ofertas con Reserva de Materiales

## Descripción General

Sistema completo para crear ofertas fotovoltaicas con materiales de almacenes específicos, secciones personalizadas, generación automática de nombres descriptivos y sistema de reserva temporal o definitiva de materiales.

## Modelo de Datos

### Relación Cliente-Oferta

**IMPORTANTE:** La oferta personalizada es un campo dentro del modelo Cliente, NO al revés.

```
Cliente
  ├── id
  ├── nombre
  ├── ... (otros campos)
  └── oferta_personalizada_id (FK a ofertas_confeccion)

Oferta Confeccion
  ├── id
  ├── tipo_oferta ('generica' | 'personalizada')
  └── ... (NO tiene cliente_id directo)
```

Para obtener el cliente de una oferta personalizada, se debe hacer:
```sql
SELECT c.* FROM clientes c 
WHERE c.oferta_personalizada_id = 'oferta_id'
```

## Endpoints Requeridos

### 1. Crear Oferta con Materiales y Secciones Personalizadas

**Endpoint:** `POST /api/ofertas/confeccion/`

**⚠️ IMPORTANTE:** La barra diagonal al final (`/`) es OBLIGATORIA

**Descripción:** Crea una oferta con materiales específicos de un almacén, secciones personalizadas (materiales, texto o costos extras) y genera automáticamente el nombre descriptivo.


**Request Body:**
```json
{
  "tipo_oferta": "generica" | "personalizada",
  "cliente_numero": "string (opcional, requerido si tipo_oferta es personalizada)",
  "almacen_id": "string (requerido)",
  "foto_portada": "string (URL de MinIO, opcional)",
  "estado": "en_revision" | "aprobada_para_enviar" | "enviada_a_cliente" | "confirmada_por_cliente" | "reservada",
  "items": [
    {
      "material_codigo": "string",
      "descripcion": "string",
      "precio": 0.00,
      "cantidad": 1,
      "categoria": "string",
      "seccion": "INVERSORES" | "BATERIAS" | "PANELES" | "MPPT" | "ESTRUCTURAS" | "CABLEADO_DC" | "CABLEADO_AC" | "CANALIZACION" | "TIERRA" | "PROTECCIONES_ELECTRICAS" | "MATERIAL_VARIO" | "CUSTOM_xxxxx"
    }
  ],
  "secciones_personalizadas": [
    {
      "id": "CUSTOM_1234567890",
      "label": "Instalación",
      "tipo": "materiales" | "extra",
      "tipo_extra": "escritura" | "costo",
      "categorias_materiales": ["CABLE", "ESTRUCTURA"],
      "contenido_escritura": "Texto libre para notas...",
      "costos_extras": [
        {
          "id": "COSTO_1234567890",
          "descripcion": "Mano de obra instalación",
          "cantidad": 1,
          "precio_unitario": 500.00
        }
      ]
    }
  ],
  "elementos_personalizados": [
    {
      "material_codigo": "string",
      "descripcion": "string",
      "precio": 0.00,
      "cantidad": 1,
      "categoria": "string"
    }
  ],
  "componentes_principales": {
    "inversor_seleccionado": "INV-001",
    "bateria_seleccionada": "BAT-001",
    "panel_seleccionado": "PAN-001"
  },
  "margen_comercial": 0.0,
  "costo_transportacion": 0.00,
  "total_materiales": 0.00,
  "subtotal_con_margen": 0.00,
  "total_elementos_personalizados": 0.00,
  "total_costos_extras": 0.00,
  "precio_final": 0.00
}
```

**Estados de Oferta:**

Para ofertas **genéricas**:
- `en_revision`: Oferta en proceso de revisión interna
- `aprobada_para_enviar`: Oferta aprobada y lista para ser enviada

Para ofertas **personalizadas** (incluye todos los anteriores más):
- `enviada_a_cliente`: Oferta enviada al cliente
- `confirmada_por_cliente`: Cliente confirmó la oferta
- `reservada`: Materiales reservados en el almacén


**Response:**
```json
{
  "id": "string",
  "numero_oferta": "OF-20260126-001",
  "nombre_automatico": "Oferta de 1x 5kW Inversor Growatt, 4x 2.4kWh Batería Pylontech y 10x 550W Paneles JA Solar",
  "tipo_oferta": "generica",
  "cliente_numero": null,
  "almacen_id": "alm-001",
  "almacen_nombre": "Almacén Central",
  "foto_portada": "https://minio.example.com/ofertas/of-001/portada.jpg",
  "items": [...],
  "secciones_personalizadas": [...],
  "elementos_personalizados": [...],
  "componentes_principales": {...},
  "margen_comercial": 15.0,
  "costo_transportacion": 500.00,
  "total_materiales": 15000.00,
  "subtotal_con_margen": 17647.06,
  "total_elementos_personalizados": 0.00,
  "total_costos_extras": 1500.00,
  "precio_final": 19647.00,
  "estado": "en_revision",
  "materiales_reservados": false,
  "fecha_creacion": "2026-01-26T10:30:00Z",
  "fecha_actualizacion": "2026-01-26T10:30:00Z"
}
```

**Lógica de Generación del Nombre Automático:**

El nombre se genera usando los componentes principales seleccionados:
```
"Oferta de {inversores} {baterías} y {paneles}"
```

Donde cada componente se construye así:

1. **Inversores:** `{cantidad}x {potencia}kW Inversor {marca}`
   - Usar `componentes_principales.inversor_seleccionado`
   - Buscar en items con ese material_codigo
   - Sumar cantidades si aparece en múltiples secciones
   - Extraer potencia del campo `potenciaKW` del material
   - Obtener marca del material usando `marca_id`
   - Ejemplo: "1x 5kW Inversor Growatt"

2. **Baterías:** `{cantidad}x {capacidad}kWh Batería {marca}`
   - Usar `componentes_principales.bateria_seleccionada`
   - Buscar en items con ese material_codigo
   - Sumar cantidades
   - Extraer capacidad del campo `potenciaKW` del material
   - Obtener marca usando `marca_id`
   - Ejemplo: "4x 2.4kWh Batería Pylontech"

3. **Paneles:** `{cantidad}x {potencia}W Paneles {marca}`
   - Usar `componentes_principales.panel_seleccionado`
   - Buscar en items con ese material_codigo
   - Sumar cantidades
   - Extraer potencia del campo `potenciaKW` del material (convertir a W si es necesario)
   - Obtener marca usando `marca_id`
   - Ejemplo: "10x 550W Paneles JA Solar"

**Reglas de Generación:**
- Si no hay componente seleccionado, omitirlo del nombre
- Conectar componentes con comas y "y" antes del último
- Ejemplos:
  - Solo inversores: "Oferta de 1x 5kW Inversor Growatt"
  - Inversores y paneles: "Oferta de 1x 5kW Inversor Growatt y 10x 550W Paneles JA Solar"
  - Completo: "Oferta de 1x 5kW Inversor Growatt, 4x 2.4kWh Batería Pylontech y 10x 550W Paneles JA Solar"


**Validaciones:**
- Verificar que el almacén existe
- Verificar que todos los materiales existen
- Verificar que hay stock suficiente en el almacén para cada material
- Si tipo_oferta es "personalizada", verificar que el cliente existe
- Si tipo_oferta es "personalizada", actualizar el campo `oferta_personalizada_id` del cliente
- Si se proporciona `foto_portada`, verificar que la URL es válida y accesible
- Calcular y validar que los totales sean correctos
- Validar estructura de secciones personalizadas

**Códigos de Error:**
- `400` - Datos inválidos o stock insuficiente
- `404` - Almacén o cliente no encontrado
- `500` - Error interno del servidor

---

### 2. Reservar Materiales de Oferta (Temporal o Definitiva)

**Endpoint:** `POST /api/ofertas/{oferta_id}/reservar-materiales`

**Descripción:** Reserva los materiales de una oferta en el almacén con opción de reserva temporal (con fecha de expiración) o definitiva.

**Request Body:**
```json
{
  "tipo_reserva": "temporal" | "definitiva",
  "dias_reserva": 7,
  "notas": "string (opcional)"
}
```

**Response:**
```json
{
  "success": true,
  "oferta_id": "string",
  "reserva_id": "RES-20260126-001",
  "tipo_reserva": "temporal",
  "fecha_expiracion": "2026-02-02T10:35:00Z",
  "materiales_reservados": true,
  "movimientos_creados": [
    {
      "id": "mov-001",
      "tipo": "reserva_oferta",
      "material_codigo": "INV-001",
      "cantidad": 1,
      "almacen_id": "alm-001",
      "referencia": "Reserva temporal (7 días) para Oferta OF-20260126-001"
    }
  ],
  "stock_actualizado": [
    {
      "material_codigo": "INV-001",
      "stock_anterior": 10,
      "stock_actual": 9,
      "cantidad_reservada": 1
    }
  ],
  "fecha_reserva": "2026-01-26T10:35:00Z"
}
```

**Lógica de Reserva:**

1. **Validar estado de oferta:**
   - La oferta debe existir
   - La oferta no debe tener materiales ya reservados
   - La oferta debe estar en estado válido para reservar

2. **Calcular fecha de expiración:**
   - Si `tipo_reserva` es "temporal", calcular: `fecha_actual + dias_reserva`
   - Si `tipo_reserva` es "definitiva", `fecha_expiracion` es NULL

3. **Verificar stock disponible:**
   - Para cada item en la oferta, verificar stock suficiente
   - Stock disponible = stock total - stock reservado

4. **Crear movimientos de inventario:**
   - Tipo: "reserva_oferta"
   - Incluir tipo de reserva y fecha de expiración en referencia
   - Descontar del stock disponible

5. **Actualizar oferta:**
   - Marcar `materiales_reservados = true`
   - Guardar `reserva_id`, `tipo_reserva`, `fecha_expiracion`
   - Actualizar `fecha_reserva`

6. **Programar expiración automática:**
   - Si es temporal, crear job/tarea para cancelar automáticamente al vencer

**Validaciones:**
- Verificar que la oferta existe
- Verificar que los materiales no están ya reservados
- Verificar stock suficiente para todos los materiales
- Si es temporal, `dias_reserva` debe ser > 0
- Operación debe ser atómica (todo o nada)

**Códigos de Error:**
- `400` - Materiales ya reservados, datos inválidos o tipo de reserva inválido
- `404` - Oferta no encontrada
- `409` - Stock insuficiente para reservar
- `500` - Error interno del servidor

---

### 3. Cancelar Reserva de Materiales

**Endpoint:** `POST /api/ofertas/{oferta_id}/cancelar-reserva`

**Descripción:** Cancela la reserva de materiales de una oferta, devolviéndolos al stock disponible. Solo disponible para reservas temporales o por administradores.

**Request Body:**
```json
{
  "motivo": "string (requerido)",
  "notas": "string (opcional)"
}
```


**Response:**
```json
{
  "success": true,
  "oferta_id": "string",
  "reserva_id": "RES-20260126-001",
  "materiales_liberados": true,
  "movimientos_creados": [
    {
      "id": "mov-002",
      "tipo": "cancelacion_reserva",
      "material_codigo": "INV-001",
      "cantidad": 1,
      "almacen_id": "alm-001",
      "referencia": "Cancelación de reserva para Oferta OF-20260126-001: Cliente decidió no continuar"
    }
  ],
  "stock_actualizado": [
    {
      "material_codigo": "INV-001",
      "stock_anterior": 9,
      "stock_actual": 10,
      "cantidad_liberada": 1
    }
  ],
  "fecha_cancelacion": "2026-01-26T11:00:00Z"
}
```

**Lógica de Cancelación:**

1. **Validar permisos:**
   - Si es reserva temporal: cualquier usuario autorizado puede cancelar
   - Si es reserva definitiva: solo administradores pueden cancelar

2. **Validar estado:**
   - La oferta debe tener materiales reservados
   - Debe existir una reserva activa

3. **Crear movimientos inversos:**
   - Tipo: "cancelacion_reserva"
   - Devolver las cantidades al stock disponible
   - Incluir motivo en la referencia

4. **Actualizar oferta:**
   - Marcar `materiales_reservados = false`
   - Guardar `fecha_cancelacion` y `motivo_cancelacion`
   - Limpiar `reserva_id` y `fecha_expiracion`

5. **Cancelar job de expiración:**
   - Si era temporal, cancelar la tarea programada

**Validaciones:**
- Verificar que la oferta tiene materiales reservados
- Verificar permisos según tipo de reserva
- Verificar que la reserva existe y está activa

**Códigos de Error:**
- `400` - No hay materiales reservados
- `403` - Sin permisos para cancelar reserva definitiva
- `404` - Oferta o reserva no encontrada
- `500` - Error interno del servidor

---

### 4. Job Automático: Expirar Reservas Temporales

**Descripción:** Proceso automático que se ejecuta periódicamente (cada hora) para cancelar reservas temporales vencidas.

**Lógica:**

1. **Buscar reservas expiradas:**
```sql
SELECT * FROM ofertas_confeccion 
WHERE materiales_reservados = true 
  AND tipo_reserva = 'temporal'
  AND fecha_expiracion <= NOW()
  AND estado != 'completada'
```

2. **Para cada reserva expirada:**
   - Ejecutar lógica de cancelación automática
   - Motivo: "Expiración automática de reserva temporal"
   - Crear movimientos de liberación
   - Actualizar oferta
   - Registrar en log de auditoría

3. **Notificaciones:**
   - Enviar notificación al creador de la oferta
   - Alertar si había cliente asociado

**Configuración recomendada:**
- Ejecutar cada hora
- Incluir margen de 5 minutos para evitar problemas de timezone
- Registrar todas las expiraciones en log

---

### 5. Obtener Oferta con Detalles Completos

**Endpoint:** `GET /api/ofertas/{oferta_id}`

**Descripción:** Obtiene los detalles completos de una oferta incluyendo secciones personalizadas, información de reserva y datos del cliente.


**Response:**
```json
{
  "id": "string",
  "numero_oferta": "OF-20260126-001",
  "nombre_automatico": "Oferta de 1x 5kW Inversor Growatt, 4x 2.4kWh Batería Pylontech y 10x 550W Paneles JA Solar",
  "tipo_oferta": "personalizada",
  "cliente": {
    "numero": "CLI-001",
    "nombre": "Juan Pérez",
    "telefono": "+53 5 1234567",
    "direccion": "Calle 123, La Habana"
  },
  "almacen_id": "alm-001",
  "almacen_nombre": "Almacén Central",
  "items": [...],
  "secciones_personalizadas": [
    {
      "id": "CUSTOM_1234567890",
      "label": "Instalación",
      "tipo": "extra",
      "tipo_extra": "costo",
      "costos_extras": [
        {
          "id": "COSTO_1234567890",
          "descripcion": "Mano de obra",
          "cantidad": 1,
          "precio_unitario": 500.00,
          "total": 500.00
        }
      ],
      "subtotal": 500.00
    }
  ],
  "elementos_personalizados": [...],
  "componentes_principales": {
    "inversor_seleccionado": "INV-001",
    "bateria_seleccionada": "BAT-001",
    "panel_seleccionado": "PAN-001"
  },
  "margen_comercial": 15.0,
  "costo_transportacion": 500.00,
  "total_materiales": 15000.00,
  "subtotal_con_margen": 17647.06,
  "total_elementos_personalizados": 0.00,
  "total_costos_extras": 500.00,
  "precio_final": 18647.00,
  "estado": "reservada",
  "materiales_reservados": true,
  "reserva_id": "RES-20260126-001",
  "tipo_reserva": "temporal",
  "fecha_reserva": "2026-01-26T10:35:00Z",
  "fecha_expiracion": "2026-02-02T10:35:00Z",
  "dias_restantes": 7,
  "stock_disponible": [
    {
      "material_codigo": "INV-001",
      "stock_actual": 9,
      "cantidad_en_oferta": 1,
      "suficiente": true
    }
  ],
  "fecha_creacion": "2026-01-26T10:30:00Z",
  "fecha_actualizacion": "2026-01-26T10:35:00Z"
}
```

**Lógica Especial:**

1. **Obtener cliente:**
   - Si `tipo_oferta` es "personalizada", buscar cliente donde `oferta_personalizada_id = oferta.id`
   - Incluir datos básicos del cliente en la respuesta

2. **Calcular días restantes:**
   - Si hay `fecha_expiracion`, calcular: `dias_restantes = (fecha_expiracion - fecha_actual) / 86400`
   - Redondear hacia arriba

3. **Verificar stock actual:**
   - Para cada material, obtener stock disponible actual
   - Comparar con cantidad en oferta
   - Marcar si es suficiente

---

### 6. Listar Ofertas con Filtros Avanzados

**Endpoint:** `GET /api/ofertas/confeccion`

**Query Parameters:**
- `almacen_id` (opcional): Filtrar por almacén
- `tipo_oferta` (opcional): "generica" o "personalizada"
- `cliente_numero` (opcional): Filtrar por número de cliente
- `materiales_reservados` (opcional): true/false
- `tipo_reserva` (opcional): "temporal" o "definitiva"
- `estado` (opcional): "en_revision", "aprobada_para_enviar", etc.
- `expirando_pronto` (opcional): true (reservas que expiran en menos de 3 días)
- `fecha_desde` (opcional): Fecha inicio
- `fecha_hasta` (opcional): Fecha fin
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Items por página (default: 20)
- `sort` (opcional): "fecha_creacion", "precio_final", "fecha_expiracion"
- `order` (opcional): "asc" o "desc"


**Response:**
```json
{
  "ofertas": [
    {
      "id": "string",
      "numero_oferta": "OF-20260126-001",
      "nombre_automatico": "Oferta de 1x 5kW Inversor Growatt...",
      "tipo_oferta": "personalizada",
      "almacen_nombre": "Almacén Central",
      "cliente_nombre": "Juan Pérez",
      "cliente_numero": "CLI-001",
      "precio_final": 18647.00,
      "estado": "reservada",
      "materiales_reservados": true,
      "tipo_reserva": "temporal",
      "fecha_expiracion": "2026-02-02T10:35:00Z",
      "dias_restantes": 7,
      "expirando_pronto": false,
      "fecha_creacion": "2026-01-26T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "total_pages": 1,
  "estadisticas": {
    "total_ofertas": 1,
    "ofertas_reservadas": 1,
    "reservas_temporales": 1,
    "reservas_definitivas": 0,
    "expirando_en_3_dias": 0,
    "valor_total_ofertas": 18647.00
  }
}
```

---

### 7. Actualizar Oferta

**Endpoint:** `PUT /api/ofertas/{oferta_id}`

**Descripción:** Actualiza una oferta existente. No permite actualizar si tiene materiales reservados.

**Request Body:** (Mismo formato que crear oferta)

**Validaciones:**
- No permitir actualizar si `materiales_reservados = true`
- Sugerir cancelar reserva primero
- Recalcular nombre automático si cambian componentes principales
- Validar stock disponible para nuevos materiales

---

### 8. Eliminar Oferta

**Endpoint:** `DELETE /api/ofertas/{oferta_id}`

**Descripción:** Elimina una oferta. Solo permitido si no tiene materiales reservados.

**Response:**
```json
{
  "success": true,
  "message": "Oferta eliminada exitosamente"
}
```

**Validaciones:**
- No permitir eliminar si `materiales_reservados = true`
- Si es oferta personalizada, limpiar `oferta_personalizada_id` del cliente
- Si tiene foto de portada, eliminarla de MinIO
- Eliminar en cascada registros relacionados

**Lógica de Eliminación:**

```javascript
async function eliminarOferta(ofertaId) {
  const oferta = await db.query(
    'SELECT * FROM ofertas_confeccion WHERE id = ?',
    [ofertaId]
  )
  
  if (!oferta) {
    throw new Error('Oferta no encontrada')
  }
  
  if (oferta.materiales_reservados) {
    throw new Error('No se puede eliminar una oferta con materiales reservados')
  }
  
  // Eliminar foto de portada de MinIO
  if (oferta.foto_portada) {
    const url = new URL(oferta.foto_portada)
    const filename = url.pathname.split('/').pop()
    await minioClient.removeObject('ofertas-portadas', filename)
  }
  
  // Limpiar referencia en cliente si es personalizada
  if (oferta.tipo_oferta === 'personalizada') {
    await db.query(
      'UPDATE clientes SET oferta_personalizada_id = NULL WHERE oferta_personalizada_id = ?',
      [ofertaId]
    )
  }
  
  // Eliminar oferta
  await db.query('DELETE FROM ofertas_confeccion WHERE id = ?', [ofertaId])
  
  return { success: true }
}
```

---

### 9. Verificar Stock Disponible

**Endpoint:** `POST /api/ofertas/verificar-stock`

**Descripción:** Verifica si hay stock suficiente para una lista de materiales antes de crear la oferta.

**Request:**
```json
{
  "almacen_id": "alm-001",
  "items": [
    {
      "material_codigo": "INV-001",
      "cantidad": 1
    },
    {
      "material_codigo": "BAT-001",
      "cantidad": 4
    }
  ]
}
```

**Response:**
```json
{
  "stock_suficiente": true,
  "detalles": [
    {
      "material_codigo": "INV-001",
      "descripcion": "Inversor Growatt 5kW",
      "cantidad_solicitada": 1,
      "stock_total": 10,
      "stock_reservado": 1,
      "stock_disponible": 9,
      "suficiente": true
    },
    {
      "material_codigo": "BAT-001",
      "descripcion": "Batería Pylontech 2.4kWh",
      "cantidad_solicitada": 4,
      "stock_total": 20,
      "stock_reservado": 5,
      "stock_disponible": 15,
      "suficiente": true
    }
  ],
  "materiales_insuficientes": []
}
```

---

### 10. Obtener Reservas Activas por Almacén

**Endpoint:** `GET /api/almacenes/{almacen_id}/reservas`

**Query Parameters:**
- `tipo_reserva` (opcional): "temporal" o "definitiva"
- `expirando_pronto` (opcional): true (expiran en menos de 3 días)


**Response:**
```json
{
  "almacen_id": "alm-001",
  "almacen_nombre": "Almacén Central",
  "reservas_activas": [
    {
      "reserva_id": "RES-20260126-001",
      "oferta_id": "of-001",
      "oferta_numero": "OF-20260126-001",
      "oferta_nombre": "Oferta de 1x 5kW Inversor Growatt...",
      "tipo_reserva": "temporal",
      "fecha_reserva": "2026-01-26T10:35:00Z",
      "fecha_expiracion": "2026-02-02T10:35:00Z",
      "dias_restantes": 7,
      "expirando_pronto": false,
      "cliente_nombre": "Juan Pérez",
      "materiales": [
        {
          "material_codigo": "INV-001",
          "descripcion": "Inversor Growatt 5kW",
          "cantidad_reservada": 1
        }
      ],
      "total_materiales": 1
    }
  ],
  "total_reservas": 1,
  "estadisticas": {
    "reservas_temporales": 1,
    "reservas_definitivas": 0,
    "expirando_en_3_dias": 0,
    "total_materiales_reservados": 1
  }
}
```

---

### 11. Subir Foto de Portada

**Endpoint:** `POST /api/ofertas/confeccion/upload-foto-portada`

**Descripción:** Sube una imagen a MinIO y retorna la URL para usar como foto de portada de la oferta.

**Content-Type:** `multipart/form-data`

**Request Body:**
```
foto: File (imagen)
tipo: "oferta_portada"
```

**Response:**
```json
{
  "success": true,
  "url": "https://minio.example.com/ofertas/portadas/1234567890_portada.jpg",
  "filename": "1234567890_portada.jpg",
  "size": 245678,
  "content_type": "image/jpeg"
}
```

**Lógica de Subida:**

1. **Validar archivo:**
   - Debe ser una imagen (JPEG, PNG, WebP)
   - Tamaño máximo: 5MB
   - Dimensiones recomendadas: 1200x675px (16:9)

2. **Procesar imagen:**
   - Optimizar calidad (80-85%)
   - Redimensionar si excede 1920px de ancho
   - Convertir a formato WebP para mejor compresión (opcional)

3. **Generar nombre único:**
   - Formato: `{timestamp}_{random}_portada.{ext}`
   - Ejemplo: `1706270400_a3f2b1_portada.jpg`

4. **Subir a MinIO:**
   - Bucket: `ofertas` o `ofertas-portadas`
   - Path: `/portadas/{filename}`
   - Metadata: content-type, tamaño, fecha
   - Permisos: público (lectura)

5. **Retornar URL:**
   - URL completa para acceso público
   - Guardar en campo `foto_portada` de la oferta

**Validaciones:**
- Archivo debe ser imagen válida
- Tamaño no debe exceder 5MB
- Formato debe ser JPEG, PNG o WebP

**Códigos de Error:**
- `400` - Archivo inválido o muy grande
- `415` - Tipo de archivo no soportado
- `500` - Error al subir a MinIO

**Ejemplo de Implementación (Node.js):**

```javascript
const Minio = require('minio')
const sharp = require('sharp')

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: parseInt(process.env.MINIO_PORT),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY
})

async function uploadFotoPortada(file) {
  // 1. Validar y optimizar imagen
  const buffer = await sharp(file.buffer)
    .resize(1920, null, { 
      withoutEnlargement: true,
      fit: 'inside'
    })
    .jpeg({ quality: 85 })
    .toBuffer()

  // 2. Generar nombre único
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(7)
  const filename = `${timestamp}_${random}_portada.jpg`

  // 3. Subir a MinIO
  const bucketName = 'ofertas-portadas'
  await minioClient.putObject(
    bucketName,
    filename,
    buffer,
    buffer.length,
    {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000'
    }
  )

  // 4. Generar URL pública
  const url = `${process.env.MINIO_PUBLIC_URL}/${bucketName}/${filename}`

  return {
    url,
    filename,
    size: buffer.length,
    content_type: 'image/jpeg'
  }
}
```

---

### 12. Eliminar Foto de Portada

**Endpoint:** `DELETE /api/ofertas/{oferta_id}/foto-portada`

**Descripción:** Elimina la foto de portada de una oferta de MinIO y actualiza el registro.

**Response:**
```json
{
  "success": true,
  "message": "Foto de portada eliminada exitosamente"
}
```

**Lógica:**

1. Obtener URL de la foto desde la oferta
2. Extraer nombre del archivo de la URL
3. Eliminar archivo de MinIO
4. Actualizar oferta: `foto_portada = NULL`

**Validaciones:**
- La oferta debe existir
- Debe tener una foto de portada

---

## Modelos de Base de Datos

### Tabla: ofertas_confeccion

```sql
CREATE TABLE ofertas_confeccion (
    id VARCHAR(50) PRIMARY KEY,
    numero_oferta VARCHAR(50) UNIQUE NOT NULL,
    nombre_automatico TEXT NOT NULL,
    tipo_oferta VARCHAR(20) NOT NULL, -- 'generica' o 'personalizada'
    almacen_id VARCHAR(50) NOT NULL,
    foto_portada TEXT, -- URL de MinIO
    
    -- Items y secciones
    items JSONB NOT NULL, -- Array de items con material_codigo, cantidad, precio, seccion, etc.
    secciones_personalizadas JSONB, -- Array de secciones personalizadas
    elementos_personalizados JSONB, -- Array de elementos personalizados
    componentes_principales JSONB, -- {inversor_seleccionado, bateria_seleccionada, panel_seleccionado}
    
    -- Cálculos financieros
    margen_comercial DECIMAL(5,2) DEFAULT 0,
    costo_transportacion DECIMAL(10,2) DEFAULT 0,
    total_materiales DECIMAL(10,2) NOT NULL,
    subtotal_con_margen DECIMAL(10,2) NOT NULL,
    total_elementos_personalizados DECIMAL(10,2) DEFAULT 0,
    total_costos_extras DECIMAL(10,2) DEFAULT 0,
    precio_final DECIMAL(10,2) NOT NULL,
    
    -- Estado y reserva
    estado VARCHAR(30) DEFAULT 'en_revision',
    materiales_reservados BOOLEAN DEFAULT FALSE,
    reserva_id VARCHAR(50),
    tipo_reserva VARCHAR(20), -- 'temporal' o 'definitiva'
    fecha_reserva TIMESTAMP,
    fecha_expiracion TIMESTAMP, -- NULL si es definitiva
    fecha_cancelacion TIMESTAMP,
    motivo_cancelacion TEXT,
    
    -- Auditoría
    notas TEXT,
    creado_por VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id)
);

CREATE INDEX idx_ofertas_confeccion_almacen ON ofertas_confeccion(almacen_id);
CREATE INDEX idx_ofertas_confeccion_estado ON ofertas_confeccion(estado);
CREATE INDEX idx_ofertas_confeccion_reservados ON ofertas_confeccion(materiales_reservados);
CREATE INDEX idx_ofertas_confeccion_tipo_reserva ON ofertas_confeccion(tipo_reserva);
CREATE INDEX idx_ofertas_confeccion_fecha_expiracion ON ofertas_confeccion(fecha_expiracion);
CREATE INDEX idx_ofertas_confeccion_fecha ON ofertas_confeccion(fecha_creacion);
CREATE INDEX idx_ofertas_confeccion_tipo ON ofertas_confeccion(tipo_oferta);
```

### Tabla: clientes (Actualización)

```sql
-- Agregar campo a tabla existente
ALTER TABLE clientes 
ADD COLUMN oferta_personalizada_id VARCHAR(50),
ADD FOREIGN KEY (oferta_personalizada_id) REFERENCES ofertas_confeccion(id);

CREATE INDEX idx_clientes_oferta ON clientes(oferta_personalizada_id);
```

### Tabla: reservas_materiales

```sql
CREATE TABLE reservas_materiales (
    id VARCHAR(50) PRIMARY KEY,
    reserva_id VARCHAR(50) NOT NULL,
    oferta_id VARCHAR(50) NOT NULL,
    almacen_id VARCHAR(50) NOT NULL,
    material_codigo VARCHAR(50) NOT NULL,
    cantidad INTEGER NOT NULL,
    tipo_reserva VARCHAR(20) NOT NULL, -- 'temporal' o 'definitiva'
    estado VARCHAR(20) DEFAULT 'activa', -- 'activa', 'cancelada', 'expirada', 'consumida'
    fecha_reserva TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion TIMESTAMP, -- NULL si es definitiva
    fecha_cancelacion TIMESTAMP,
    motivo_cancelacion TEXT,
    cancelada_automaticamente BOOLEAN DEFAULT FALSE,
    creado_por VARCHAR(50),
    FOREIGN KEY (oferta_id) REFERENCES ofertas_confeccion(id),
    FOREIGN KEY (almacen_id) REFERENCES almacenes(id),
    FOREIGN KEY (material_codigo) REFERENCES materiales(codigo)
);

CREATE INDEX idx_reservas_oferta ON reservas_materiales(oferta_id);
CREATE INDEX idx_reservas_almacen ON reservas_materiales(almacen_id);
CREATE INDEX idx_reservas_material ON reservas_materiales(material_codigo);
CREATE INDEX idx_reservas_estado ON reservas_materiales(estado);
CREATE INDEX idx_reservas_tipo ON reservas_materiales(tipo_reserva);
CREATE INDEX idx_reservas_expiracion ON reservas_materiales(fecha_expiracion);
CREATE INDEX idx_reservas_reserva_id ON reservas_materiales(reserva_id);
```


---

## Configuración de MinIO para Fotos de Portada

### Estructura de Buckets

```
ofertas-portadas/
  ├── 1706270400_a3f2b1_portada.jpg
  ├── 1706270500_b4g3c2_portada.jpg
  └── ...
```

### Configuración del Bucket

```javascript
// Crear bucket si no existe
const bucketName = 'ofertas-portadas'
const bucketExists = await minioClient.bucketExists(bucketName)

if (!bucketExists) {
  await minioClient.makeBucket(bucketName, 'us-east-1')
  
  // Configurar política de acceso público para lectura
  const policy = {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucketName}/*`]
      }
    ]
  }
  
  await minioClient.setBucketPolicy(
    bucketName, 
    JSON.stringify(policy)
  )
}
```

### Variables de Entorno

```env
# MinIO Configuration
MINIO_ENDPOINT=minio.example.com
MINIO_PORT=9000
MINIO_USE_SSL=true
MINIO_ACCESS_KEY=your_access_key
MINIO_SECRET_KEY=your_secret_key
MINIO_PUBLIC_URL=https://minio.example.com

# Bucket Names
MINIO_BUCKET_OFERTAS=ofertas-portadas
MINIO_BUCKET_MATERIALES=materiales-fotos
```

### Optimización de Imágenes

**Recomendaciones:**

1. **Formato:**
   - Preferir WebP para mejor compresión
   - Fallback a JPEG para compatibilidad
   - PNG solo para imágenes con transparencia

2. **Dimensiones:**
   - Ancho máximo: 1920px
   - Relación de aspecto: 16:9 (recomendado)
   - Redimensionar automáticamente si excede

3. **Calidad:**
   - JPEG: 80-85%
   - WebP: 80%
   - PNG: Compresión máxima

4. **Tamaño:**
   - Máximo: 5MB (antes de optimizar)
   - Objetivo: < 500KB (después de optimizar)

**Ejemplo con Sharp:**

```javascript
const sharp = require('sharp')

async function optimizarImagen(buffer, formato = 'jpeg') {
  const image = sharp(buffer)
  const metadata = await image.metadata()
  
  // Redimensionar si es muy grande
  if (metadata.width > 1920) {
    image.resize(1920, null, {
      withoutEnlargement: true,
      fit: 'inside'
    })
  }
  
  // Aplicar formato y calidad
  switch (formato) {
    case 'webp':
      return await image.webp({ quality: 80 }).toBuffer()
    case 'png':
      return await image.png({ compressionLevel: 9 }).toBuffer()
    default:
      return await image.jpeg({ quality: 85 }).toBuffer()
  }
}
```

### Limpieza de Fotos Huérfanas

**Job de Limpieza (Ejecutar semanalmente):**

```javascript
async function limpiarFotosHuerfanas() {
  // 1. Obtener todas las fotos en MinIO
  const stream = minioClient.listObjects('ofertas-portadas', '', true)
  const fotosEnMinio = []
  
  stream.on('data', obj => fotosEnMinio.push(obj.name))
  
  await new Promise((resolve, reject) => {
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  
  // 2. Obtener todas las URLs de fotos en la BD
  const fotosEnBD = await db.query(`
    SELECT foto_portada FROM ofertas_confeccion 
    WHERE foto_portada IS NOT NULL
  `)
  
  const urlsEnBD = new Set(
    fotosEnBD.map(row => {
      const url = new URL(row.foto_portada)
      return url.pathname.split('/').pop()
    })
  )
  
  // 3. Eliminar fotos que no están en la BD
  const fotosHuerfanas = fotosEnMinio.filter(
    foto => !urlsEnBD.has(foto)
  )
  
  for (const foto of fotosHuerfanas) {
    await minioClient.removeObject('ofertas-portadas', foto)
    console.log(`Foto huérfana eliminada: ${foto}`)
  }
  
  return {
    total_minio: fotosEnMinio.length,
    total_bd: urlsEnBD.size,
    eliminadas: fotosHuerfanas.length
  }
}
```

### Seguridad

1. **Validación de Archivos:**
   - Verificar magic bytes (no solo extensión)
   - Escanear con antivirus si es posible
   - Limitar tipos MIME permitidos

2. **Rate Limiting:**
   - Máximo 10 subidas por minuto por usuario
   - Máximo 100MB por hora por usuario

3. **Nombres de Archivo:**
   - Nunca usar nombres proporcionados por el usuario
   - Generar nombres únicos con timestamp + random
   - Sanitizar cualquier metadata

**Ejemplo de Validación:**

```javascript
const fileType = require('file-type')

async function validarImagen(buffer) {
  // Verificar magic bytes
  const type = await fileType.fromBuffer(buffer)
  
  if (!type) {
    throw new Error('Archivo no válido')
  }
  
  const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp']
  if (!tiposPermitidos.includes(type.mime)) {
    throw new Error(`Tipo de archivo no permitido: ${type.mime}`)
  }
  
  // Verificar tamaño
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Archivo muy grande (máximo 5MB)')
  }
  
  return type
}
```

---

## Tipos de Movimientos de Inventario

Agregar nuevos tipos a la tabla de movimientos:

- `reserva_oferta`: Reserva de materiales para una oferta (temporal o definitiva)
- `cancelacion_reserva`: Cancelación manual de reserva de materiales
- `expiracion_reserva`: Expiración automática de reserva temporal
- `consumo_reserva`: Consumo de materiales reservados (cuando se ejecuta la oferta)

**Estructura del movimiento:**
```json
{
  "tipo": "reserva_oferta",
  "material_codigo": "INV-001",
  "cantidad": 1,
  "almacen_id": "alm-001",
  "referencia": "Reserva temporal (7 días) para Oferta OF-20260126-001",
  "metadata": {
    "oferta_id": "of-001",
    "reserva_id": "RES-20260126-001",
    "tipo_reserva": "temporal",
    "fecha_expiracion": "2026-02-02T10:35:00Z"
  }
}
```

---

## Estructura de Secciones Personalizadas

### Sección de Materiales
```json
{
  "id": "CUSTOM_1234567890",
  "label": "Accesorios Adicionales",
  "tipo": "materiales",
  "categorias_materiales": ["CABLE", "ESTRUCTURA", "PROTECCION"]
}
```

### Sección de Escritura
```json
{
  "id": "CUSTOM_1234567891",
  "label": "Términos y Condiciones",
  "tipo": "extra",
  "tipo_extra": "escritura",
  "contenido_escritura": "La instalación incluye garantía de 2 años..."
}
```

### Sección de Costos Extras
```json
{
  "id": "CUSTOM_1234567892",
  "label": "Servicios de Instalación",
  "tipo": "extra",
  "tipo_extra": "costo",
  "costos_extras": [
    {
      "id": "COSTO_1234567890",
      "descripcion": "Mano de obra instalación",
      "cantidad": 1,
      "precio_unitario": 500.00
    },
    {
      "id": "COSTO_1234567891",
      "descripcion": "Transporte de equipo",
      "cantidad": 2,
      "precio_unitario": 100.00
    }
  ]
}
```

---

## Reglas de Negocio

### 1. Stock Disponible vs Stock Reservado

- **Stock Total:** Stock físico en almacén
- **Stock Reservado:** Suma de todas las reservas activas
- **Stock Disponible:** Stock Total - Stock Reservado
- Las reservas no eliminan el stock, solo lo marcan como no disponible

### 2. Reservas Temporales

- Tienen fecha de expiración calculada: `fecha_actual + dias_reserva`
- Se cancelan automáticamente al vencer (job cada hora)
- Pueden cancelarse manualmente antes de vencer
- Al cancelar o expirar, los materiales vuelven al stock disponible
- Notificar al usuario 1 día antes de expirar

### 3. Reservas Definitivas

- No tienen fecha de expiración
- Solo pueden cancelarse manualmente
- Requieren permisos de administrador para cancelar
- Se mantienen hasta que se complete la oferta o se cancelen explícitamente

### 4. Relación Cliente-Oferta

- **IMPORTANTE:** La oferta personalizada es un campo del cliente
- Al crear oferta personalizada, actualizar `cliente.oferta_personalizada_id`
- Al eliminar oferta personalizada, limpiar el campo del cliente
- Un cliente solo puede tener una oferta personalizada activa a la vez
- Para obtener el cliente de una oferta: `SELECT * FROM clientes WHERE oferta_personalizada_id = ?`

### 5. Generación de Nombres

- El nombre se genera usando `componentes_principales`
- Se puede regenerar si se modifican los componentes
- Debe ser descriptivo y legible
- Formato: "Oferta de {inversores}, {baterías} y {paneles}"

### 6. Estados de Oferta

**Para ofertas genéricas:**
- `en_revision` → `aprobada_para_enviar`

**Para ofertas personalizadas:**
- `en_revision` → `aprobada_para_enviar` → `enviada_a_cliente` → `confirmada_por_cliente` → `reservada`

### 7. Secciones Personalizadas

- Pueden ser de tipo "materiales" o "extra"
- Materiales: Filtran materiales por categorías específicas
- Extra-Escritura: Campo de texto libre
- Extra-Costo: Lista de costos con cantidad y precio
- Los costos extras se suman al precio final
- Las secciones se guardan en JSONB para flexibilidad

### 8. Transacciones Atómicas

- La reserva de materiales debe ser atómica (todo o nada)
- Si falla la reserva de un material, revertir todo
- Lo mismo aplica para cancelación y expiración
- Usar transacciones de base de datos

### 9. Cálculo de Totales

```
total_materiales = suma(items.precio * items.cantidad)
total_elementos_personalizados = suma(elementos.precio * elementos.cantidad)
total_costos_extras = suma(secciones[tipo=extra,tipo_extra=costo].costos.cantidad * precio_unitario)

subtotal_con_margen = total_materiales / (1 - margen_comercial/100)

precio_final = CEIL(subtotal_con_margen + costo_transportacion + total_elementos_personalizados + total_costos_extras)
```

---

## Ejemplos de Uso Completos

### Ejemplo 1: Crear Oferta Genérica con Secciones Personalizadas y Foto

```bash
# 1. Subir foto de portada
POST /api/ofertas/confeccion/upload-foto-portada
Content-Type: multipart/form-data

foto: [archivo de imagen]
tipo: "oferta_portada"

# Response:
{
  "url": "https://minio.example.com/ofertas-portadas/1706270400_a3f2b1_portada.jpg"
}

# 2. Crear oferta con la foto
POST /api/ofertas/confeccion/
{
  "tipo_oferta": "generica",
  "almacen_id": "alm-001",
  "estado": "en_revision",
  "foto_portada": "https://minio.example.com/ofertas-portadas/1706270400_a3f2b1_portada.jpg",
  "items": [
    {
      "material_codigo": "INV-GW-5K",
      "descripcion": "Inversor Growatt 5kW",
      "precio": 5000.00,
      "cantidad": 1,
      "categoria": "INVERSORES",
      "seccion": "INVERSORES"
    },
    {
      "material_codigo": "CABLE-10MM",
      "descripcion": "Cable 10mm",
      "precio": 50.00,
      "cantidad": 10,
      "categoria": "CABLE",
      "seccion": "CUSTOM_1234567890"
    }
  ],
  "secciones_personalizadas": [
    {
      "id": "CUSTOM_1234567890",
      "label": "Cableado Especial",
      "tipo": "materiales",
      "categorias_materiales": ["CABLE"]
    },
    {
      "id": "CUSTOM_1234567891",
      "label": "Instalación",
      "tipo": "extra",
      "tipo_extra": "costo",
      "costos_extras": [
        {
          "id": "COSTO_1",
          "descripcion": "Mano de obra",
          "cantidad": 1,
          "precio_unitario": 500.00
        }
      ]
    }
  ],
  "componentes_principales": {
    "inversor_seleccionado": "INV-GW-5K"
  },
  "margen_comercial": 15.0,
  "costo_transportacion": 200.00,
  "total_materiales": 5500.00,
  "subtotal_con_margen": 6470.59,
  "total_elementos_personalizados": 0.00,
  "total_costos_extras": 500.00,
  "precio_final": 7171.00
}
```


### Ejemplo 2: Crear Oferta Personalizada y Reservar Temporalmente

```bash
# 1. Crear oferta personalizada
POST /api/ofertas/confeccion/
{
  "tipo_oferta": "personalizada",
  "cliente_numero": "CLI-001",
  "almacen_id": "alm-001",
  "estado": "en_revision",
  "items": [...],
  "componentes_principales": {
    "inversor_seleccionado": "INV-001",
    "bateria_seleccionada": "BAT-001",
    "panel_seleccionado": "PAN-001"
  },
  ...
}

# Response: oferta_id = "of-001"
# Backend actualiza: clientes.oferta_personalizada_id = "of-001" WHERE numero = "CLI-001"

# 2. Reservar materiales temporalmente por 7 días
POST /api/ofertas/of-001/reservar-materiales
{
  "tipo_reserva": "temporal",
  "dias_reserva": 7,
  "notas": "Reserva mientras cliente confirma"
}

# Response: 
# - reserva_id = "RES-20260126-001"
# - fecha_expiracion = "2026-02-02T10:35:00Z"
# - Job programado para cancelar automáticamente el 2026-02-02

# 3. Cliente confirma antes de que expire
PUT /api/ofertas/of-001
{
  "estado": "confirmada_por_cliente"
}

# 4. Convertir a reserva definitiva (cancelar temporal y crear definitiva)
POST /api/ofertas/of-001/cancelar-reserva
{
  "motivo": "Convertir a definitiva"
}

POST /api/ofertas/of-001/reservar-materiales
{
  "tipo_reserva": "definitiva",
  "notas": "Cliente confirmó, reserva definitiva"
}
```

### Ejemplo 3: Expiración Automática de Reserva

```bash
# Job ejecutándose cada hora
# Fecha actual: 2026-02-02 10:36:00

# 1. Buscar reservas expiradas
SELECT * FROM ofertas_confeccion 
WHERE materiales_reservados = true 
  AND tipo_reserva = 'temporal'
  AND fecha_expiracion <= '2026-02-02 10:36:00'

# 2. Para cada oferta encontrada (ej: of-001)
# Ejecutar cancelación automática

POST /api/ofertas/of-001/cancelar-reserva (interno)
{
  "motivo": "Expiración automática de reserva temporal",
  "automatico": true
}

# 3. Actualizar estado
UPDATE reservas_materiales 
SET estado = 'expirada', 
    fecha_cancelacion = NOW(),
    cancelada_automaticamente = true
WHERE oferta_id = 'of-001'

# 4. Crear movimientos de liberación
INSERT INTO movimientos_inventario (...)

# 5. Notificar al usuario
# Enviar email/notificación: "Tu reserva para la oferta OF-20260126-001 ha expirado"
```

### Ejemplo 4: Consultar Reservas por Almacén

```bash
GET /api/almacenes/alm-001/reservas?expirando_pronto=true

# Response: Lista de reservas que expiran en menos de 3 días
{
  "almacen_id": "alm-001",
  "almacen_nombre": "Almacén Central",
  "reservas_activas": [
    {
      "reserva_id": "RES-20260126-002",
      "tipo_reserva": "temporal",
      "fecha_expiracion": "2026-01-28T15:00:00Z",
      "dias_restantes": 2,
      "expirando_pronto": true,
      "oferta_numero": "OF-20260126-002",
      "cliente_nombre": "María García",
      "materiales": [...]
    }
  ],
  "estadisticas": {
    "expirando_en_3_dias": 1
  }
}
```

---

## Consideraciones de Implementación

### 1. Performance

- Indexar campos de búsqueda frecuente (almacen_id, fecha_expiracion, tipo_reserva)
- Cachear información de stock disponible (actualizar al reservar/liberar)
- Usar transacciones para operaciones atómicas
- Optimizar consultas de reservas activas con índices compuestos
- Considerar particionamiento de tabla de movimientos por fecha

### 2. Seguridad

- Validar permisos de usuario para reservar/cancelar
- Auditar todas las operaciones de reserva
- Prevenir condiciones de carrera en reservas simultáneas (locks)
- Validar que el usuario tiene acceso al almacén
- Registrar IP y usuario en todas las operaciones

### 3. Job de Expiración

- Ejecutar cada hora (cron: `0 * * * *`)
- Incluir margen de 5 minutos para evitar problemas de timezone
- Registrar todas las expiraciones en log de auditoría
- Enviar notificaciones antes de expirar (1 día antes)
- Manejar errores y reintentos
- Monitorear tiempo de ejecución

### 4. Notificaciones

- Notificar cuando stock disponible es bajo
- Alertar sobre reservas próximas a expirar (1 día antes)
- Notificar liberaciones/cancelaciones de reserva
- Enviar resumen diario de reservas activas
- Alertar si una reserva no puede cancelarse automáticamente

### 5. Reportes y Analytics

- Dashboard de materiales reservados por almacén
- Historial de reservas por oferta
- Análisis de conversión de ofertas reservadas
- Tiempo promedio de reserva antes de conversión
- Materiales más reservados
- Tasa de expiración de reservas temporales

### 6. Validaciones Críticas

- **Stock suficiente:** Siempre verificar antes de reservar
- **Atomicidad:** Usar transacciones para reservas múltiples
- **Idempotencia:** Prevenir reservas duplicadas
- **Consistencia:** Mantener sincronizado stock y reservas
- **Integridad:** Validar relaciones cliente-oferta

### 7. Manejo de Errores

```javascript
// Ejemplo de manejo de errores en reserva
try {
  await db.transaction(async (trx) => {
    // 1. Verificar stock
    const stockCheck = await verificarStock(items, almacen_id, trx)
    if (!stockCheck.suficiente) {
      throw new Error('Stock insuficiente')
    }
    
    // 2. Crear reservas
    await crearReservas(oferta_id, items, trx)
    
    // 3. Crear movimientos
    await crearMovimientos(items, trx)
    
    // 4. Actualizar oferta
    await actualizarOferta(oferta_id, trx)
  })
} catch (error) {
  // Rollback automático
  logger.error('Error en reserva:', error)
  throw error
}
```

---

## Testing

### Tests Unitarios Requeridos

1. **Generación de nombres:**
   - Con todos los componentes
   - Con componentes parciales
   - Sin componentes

2. **Cálculo de totales:**
   - Con margen comercial
   - Con costos extras
   - Con elementos personalizados
   - Redondeo correcto

3. **Reservas:**
   - Reserva temporal exitosa
   - Reserva definitiva exitosa
   - Stock insuficiente
   - Cancelación manual
   - Expiración automática

4. **Validaciones:**
   - Cliente existe (personalizada)
   - Almacén existe
   - Materiales existen
   - Stock disponible

### Tests de Integración

1. Flujo completo: crear → reservar → cancelar
2. Flujo completo: crear → reservar temporal → expirar
3. Flujo completo: crear → reservar → convertir definitiva
4. Múltiples reservas simultáneas (race conditions)
5. Job de expiración con múltiples reservas

---

## Migración de Datos

Si ya existen ofertas en el sistema:

```sql
-- 1. Crear nueva tabla
CREATE TABLE ofertas_confeccion (...);

-- 2. Migrar ofertas existentes
INSERT INTO ofertas_confeccion (
  id, numero_oferta, nombre_automatico, tipo_oferta, ...
)
SELECT 
  id, numero, nombre, 'generica', ...
FROM ofertas_antiguas;

-- 3. Actualizar clientes con ofertas personalizadas
UPDATE clientes c
SET oferta_personalizada_id = o.id
FROM ofertas_confeccion o
WHERE o.tipo_oferta = 'personalizada'
  AND o.cliente_numero = c.numero;

-- 4. Verificar integridad
SELECT COUNT(*) FROM clientes WHERE oferta_personalizada_id IS NOT NULL;
```

---

## Monitoreo y Alertas

### Métricas a Monitorear

1. **Reservas:**
   - Total de reservas activas
   - Reservas temporales vs definitivas
   - Tasa de expiración
   - Tiempo promedio de reserva

2. **Stock:**
   - Stock disponible por almacén
   - Materiales con stock bajo
   - Materiales más reservados

3. **Performance:**
   - Tiempo de respuesta de endpoints
   - Tiempo de ejecución del job de expiración
   - Errores en reservas

### Alertas Críticas

- Stock disponible < 10% del total
- Reserva no puede cancelarse automáticamente
- Job de expiración falla
- Tiempo de respuesta > 5 segundos
- Múltiples errores de stock insuficiente

---

## Documentación API (OpenAPI/Swagger)

Incluir en la documentación Swagger:
- Todos los endpoints con ejemplos
- Modelos de datos
- Códigos de error
- Ejemplos de uso
- Flujos completos

---

## Changelog

### v1.0.0 (2026-01-26)
- Sistema completo de confección de ofertas
- Secciones personalizadas (materiales, texto, costos)
- Reservas temporales y definitivas
- Job de expiración automática
- Relación cliente-oferta correcta
- Generación automática de nombres
- **Foto de portada con MinIO:**
  - Subida de imágenes optimizadas
  - Almacenamiento en MinIO
  - Validación y procesamiento de imágenes
  - Limpieza automática de fotos huérfanas
  - Eliminación en cascada al borrar oferta
