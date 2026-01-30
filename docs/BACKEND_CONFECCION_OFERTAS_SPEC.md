# Especificación Backend - Sistema de Confección de Ofertas

## Índice
1. [Resumen General](#resumen-general)
2. [Endpoints Requeridos](#endpoints-requeridos)
3. [Modelos de Datos](#modelos-de-datos)
4. [Validaciones](#validaciones)
5. [Casos de Uso](#casos-de-uso)

---

## Resumen General

El sistema de confección de ofertas permite crear ofertas personalizadas o genéricas con:
- Selección de materiales desde almacenes con control de stock
- Cálculo automático de márgenes comerciales distribuidos
- Gestión de secciones personalizadas (materiales, texto, costos extras)
- Reserva de materiales (temporal o definitiva)
- Soporte para múltiples tipos de contacto (cliente, lead, lead sin agregar)
- Configuración de pago (moneda, transferencia, contribución)
- Foto de portada para la oferta

---

## Endpoints Requeridos

### 1. Crear Oferta
**POST** `/ofertas/confeccion/`

**Request Body:**
```json
{
  "tipo_oferta": "generica" | "personalizada",
  "cliente_numero": "string (opcional, solo para personalizada con cliente)",
  "lead_id": "string (opcional, solo para personalizada con lead)",
  "nombre_lead_sin_agregar": "string (opcional, solo para personalizada con lead nuevo)",
  "almacen_id": "string (requerido)",
  "foto_portada": "string (URL, opcional)",
  "foto_portada_url": "string (URL, opcional - compatibilidad)",
  "estado": "en_revision" | "aprobada_para_enviar" | "enviada_a_cliente" | "confirmada_por_cliente" | "reservada",
  
  "items": [
    {
      "material_codigo": "string",
      "descripcion": "string",
      "precio": number,
      "cantidad": number,
      "categoria": "string",
      "seccion": "string",
      "margen_asignado": number
    }
  ],
  
  "servicios": [
    {
      "id": "string",
      "descripcion": "string",
      "cantidad": number,
      "costo": number,
      "porcentaje_margen_origen": number
    }
  ],
  
  "secciones_personalizadas": [
    {
      "id": "string",
      "label": "string",
      "tipo": "materiales" | "extra",
      "tipo_extra": "escritura" | "costo" (opcional, solo si tipo=extra),
      "categorias_materiales": ["string"] (opcional, solo si tipo=materiales),
      "contenido_escritura": "string" (opcional, solo si tipo_extra=escritura),
      "costos_extras": [
        {
          "id": "string",
          "descripcion": "string",
          "cantidad": number,
          "precio_unitario": number
        }
      ] (opcional, solo si tipo_extra=costo)
    }
  ],
  
  "elementos_personalizados": [
    {
      "material_codigo": "string",
      "descripcion": "string",
      "precio": number,
      "cantidad": number,
      "categoria": "string"
    }
  ],
  
  "componentes_principales": {
    "inversor_seleccionado": "string (código material, opcional)",
    "bateria_seleccionada": "string (código material, opcional)",
    "panel_seleccionado": "string (código material, opcional)"
  },
  
  "margen_comercial": number,
  "porcentaje_margen_materiales": number,
  "porcentaje_margen_instalacion": number,
  "margen_total": number,
  "margen_materiales": number,
  "margen_instalacion": number,
  "costo_transportacion": number,
  "total_materiales": number,
  "subtotal_con_margen": number,
  "total_elementos_personalizados": number,
  "total_costos_extras": number,
  "precio_final": number,
  
  "moneda_pago": "USD" | "EUR" | "CUP",
  "tasa_cambio": number,
  "pago_transferencia": boolean,
  "datos_cuenta": "string",
  "aplica_contribucion": boolean,
  "porcentaje_contribucion": number
}
```

**Response:**
```json
{
  "success": true,
  "message": "Oferta creada exitosamente",
  "data": {
    "id": "string",
    "numero_oferta": "string",
    "nombre_automatico": "string",
    "tipo_oferta": "string",
    "estado": "string",
    "fecha_creacion": "ISO 8601 datetime",
    "precio_final": number
  }
}
```

**Validaciones:**
- `almacen_id` debe existir
- Si `tipo_oferta` es "personalizada", debe tener uno de: `cliente_numero`, `lead_id`, o `nombre_lead_sin_agregar`
- Validar stock disponible en el almacén para cada material
- `items` no puede estar vacío
- `margen_comercial` debe estar entre 0 y 99
- `porcentaje_margen_materiales + porcentaje_margen_instalacion` debe ser 100


---

### 2. Actualizar Oferta
**PUT** `/ofertas/confeccion/{oferta_id}`

**Request Body:** Mismo formato que crear oferta

**Response:**
```json
{
  "success": true,
  "message": "Oferta actualizada exitosamente",
  "data": {
    "id": "string",
    "numero_oferta": "string",
    "nombre_automatico": "string",
    "tipo_oferta": "string",
    "estado": "string",
    "fecha_actualizacion": "ISO 8601 datetime",
    "precio_final": number
  }
}
```

**Validaciones:**
- Mismas validaciones que crear oferta
- La oferta debe existir
- Si la oferta tiene materiales reservados, validar que los cambios no excedan el stock

---

### 3. Calcular Márgenes Distribuidos
**POST** `/ofertas/confeccion/margen-materiales`

**Request Body:**
```json
{
  "margen_comercial": number,
  "porcentaje_margen_materiales": number,
  "items": [
    {
      "id": "string",
      "material_codigo": "string",
      "descripcion": "string",
      "precio": number,
      "cantidad": number,
      "categoria": "string",
      "seccion": "string"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "margen_total": number,
    "margen_materiales": number,
    "margen_instalacion": number,
    "items": [
      {
        "id": "string",
        "margen_asignado": number,
        "porcentaje_margen_item": number
      }
    ]
  }
}
```

**Lógica de Cálculo:**
1. Calcular total de materiales: `sum(precio * cantidad)`
2. Calcular margen total: `total_materiales * (margen_comercial / 100)`
3. Distribuir margen entre materiales e instalación según porcentajes
4. Distribuir margen de materiales proporcionalmente al costo de cada item


---

### 4. Subir Foto de Portada
**POST** `/ofertas/confeccion/upload-foto-portada`

**Request:** `multipart/form-data`
- `foto`: archivo de imagen (JPG, PNG, WebP)
- `tipo`: "oferta_portada"

**Response:**
```json
{
  "success": true,
  "url": "string (URL completa de la imagen)",
  "filename": "string",
  "size": number,
  "content_type": "string"
}
```

**Validaciones:**
- Tamaño máximo: 5MB
- Formatos permitidos: image/jpeg, image/png, image/webp
- Optimizar imagen antes de guardar (resize si es muy grande)

---

### 5. Reservar Materiales
**POST** `/ofertas/confeccion/{oferta_id}/reservar-materiales`

**Request Body:**
```json
{
  "tipo_reserva": "temporal" | "definitiva",
  "dias_reserva": number (opcional, solo para temporal),
  "fecha_expiracion": "ISO 8601 datetime (opcional, solo para temporal)",
  "notas": "string (opcional)"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Materiales reservados exitosamente",
  "data": {
    "reserva_id": "string",
    "tipo_reserva": "string",
    "fecha_expiracion": "ISO 8601 datetime (null si es definitiva)",
    "materiales_reservados": number,
    "almacen_id": "string"
  }
}
```

**Lógica:**
1. Validar que la oferta existe y tiene materiales
2. Validar stock disponible en el almacén
3. Crear registros de reserva para cada material
4. Actualizar stock del almacén (descontar cantidades reservadas)
5. Si es temporal, programar tarea para liberar automáticamente al vencer

---

### 6. Liberar Materiales Reservados
**POST** `/ofertas/confeccion/{oferta_id}/liberar-materiales`

**Response:**
```json
{
  "success": true,
  "message": "Materiales liberados exitosamente",
  "data": {
    "materiales_liberados": number,
    "almacen_id": "string"
  }
}
```

**Lógica:**
1. Buscar reservas activas de la oferta
2. Devolver cantidades al stock del almacén
3. Marcar reservas como canceladas
4. Actualizar estado de la oferta si corresponde


---

### 7. Obtener Oferta por ID
**GET** `/ofertas/confeccion/{oferta_id}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "string",
    "numero_oferta": "string",
    "tipo": "generica" | "personalizada",
    "estado": "string",
    "almacen_id": "string",
    "foto_portada": "string (URL)",
    
    "cliente_numero": "string (opcional)",
    "cliente_id": "string (opcional)",
    "lead_id": "string (opcional)",
    "nombre_lead_sin_agregar": "string (opcional)",
    
    "items": [...],
    "servicios": [...],
    "secciones_personalizadas": [...],
    "elementos_personalizados": [...],
    "componentes_principales": {...},
    
    "margen_comercial": number,
    "porcentaje_margen_materiales": number,
    "porcentaje_margen_instalacion": number,
    "margen_total": number,
    "margen_materiales": number,
    "margen_instalacion": number,
    "costo_transportacion": number,
    "total_materiales": number,
    "subtotal_con_margen": number,
    "total_elementos_personalizados": number,
    "total_costos_extras": number,
    "precio_final": number,
    
    "moneda_pago": "string",
    "tasa_cambio": number,
    "pago_transferencia": boolean,
    "datos_cuenta": "string",
    "aplica_contribucion": boolean,
    "porcentaje_contribucion": number,
    
    "materiales_reservados": boolean,
    "tipo_reserva": "string (opcional)",
    "fecha_expiracion_reserva": "ISO 8601 datetime (opcional)",
    
    "fecha_creacion": "ISO 8601 datetime",
    "fecha_actualizacion": "ISO 8601 datetime"
  }
}
```

---

### 8. Listar Ofertas
**GET** `/ofertas/confeccion/`

**Query Parameters:**
- `tipo`: "generica" | "personalizada" (opcional)
- `estado`: string (opcional)
- `almacen_id`: string (opcional)
- `fecha_desde`: ISO 8601 date (opcional)
- `fecha_hasta`: ISO 8601 date (opcional)
- `page`: number (default: 1)
- `limit`: number (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "ofertas": [...],
    "total": number,
    "page": number,
    "limit": number,
    "total_pages": number
  }
}
```

---

## Modelos de Datos

### Modelo: Oferta
```python
class Oferta:
    id: str
    numero_oferta: str  # Generado automáticamente (ej: "OF-2024-001")
    tipo: str  # "generica" | "personalizada"
    estado: str
    almacen_id: str
    foto_portada: str | None
    
    # Contacto (solo uno debe estar presente)
    cliente_numero: str | None
    cliente_id: str | None
    lead_id: str | None
    nombre_lead_sin_agregar: str | None
    
    # Items y configuración
    items: List[OfertaItem]
    servicios: List[OfertaServicio]
    secciones_personalizadas: List[SeccionPersonalizada]
    elementos_personalizados: List[ElementoPersonalizado]
    componentes_principales: ComponentesPrincipales
    
    # Márgenes y costos
    margen_comercial: float
    porcentaje_margen_materiales: float
    porcentaje_margen_instalacion: float
    margen_total: float
    margen_materiales: float
    margen_instalacion: float
    costo_transportacion: float
    total_materiales: float
    subtotal_con_margen: float
    total_elementos_personalizados: float
    total_costos_extras: float
    precio_final: float
    
    # Pago
    moneda_pago: str
    tasa_cambio: float
    pago_transferencia: bool
    datos_cuenta: str
    aplica_contribucion: bool
    porcentaje_contribucion: float
    
    # Reserva
    materiales_reservados: bool
    tipo_reserva: str | None
    fecha_expiracion_reserva: datetime | None
    
    # Auditoría
    fecha_creacion: datetime
    fecha_actualizacion: datetime
    usuario_creacion: str
    usuario_actualizacion: str
```


### Modelo: OfertaItem
```python
class OfertaItem:
    id: str
    oferta_id: str
    material_codigo: str
    descripcion: str
    precio: float
    cantidad: int
    categoria: str
    seccion: str
    margen_asignado: float
```

### Modelo: OfertaServicio
```python
class OfertaServicio:
    id: str
    oferta_id: str
    descripcion: str
    cantidad: int
    costo: float
    porcentaje_margen_origen: float
```

### Modelo: SeccionPersonalizada
```python
class SeccionPersonalizada:
    id: str
    oferta_id: str
    label: str
    tipo: str  # "materiales" | "extra"
    tipo_extra: str | None  # "escritura" | "costo"
    categorias_materiales: List[str] | None
    contenido_escritura: str | None
    costos_extras: List[CostoExtra] | None
```

### Modelo: CostoExtra
```python
class CostoExtra:
    id: str
    seccion_id: str
    descripcion: str
    cantidad: int
    precio_unitario: float
```

### Modelo: ElementoPersonalizado
```python
class ElementoPersonalizado:
    id: str
    oferta_id: str
    material_codigo: str
    descripcion: str
    precio: float
    cantidad: int
    categoria: str
```

### Modelo: ComponentesPrincipales
```python
class ComponentesPrincipales:
    oferta_id: str
    inversor_seleccionado: str | None
    bateria_seleccionada: str | None
    panel_seleccionado: str | None
```

### Modelo: ReservaMaterial
```python
class ReservaMaterial:
    id: str
    oferta_id: str
    almacen_id: str
    material_codigo: str
    cantidad: int
    tipo_reserva: str  # "temporal" | "definitiva"
    fecha_reserva: datetime
    fecha_expiracion: datetime | None
    estado: str  # "activa" | "cancelada" | "expirada" | "completada"
    notas: str | None
```

---

## Validaciones

### Validaciones de Negocio

1. **Stock Disponible:**
   - Al crear/actualizar oferta, validar que hay stock suficiente en el almacén
   - Considerar materiales ya reservados en otras ofertas
   - Mensaje de error específico: "Stock insuficiente para {material}: disponible {X}, solicitado {Y}"

2. **Tipo de Oferta:**
   - Ofertas genéricas NO pueden tener contacto asociado
   - Ofertas personalizadas DEBEN tener exactamente uno de: cliente, lead, o nombre_lead_sin_agregar
   - Estados disponibles según tipo:
     - Genérica: "en_revision", "aprobada_para_enviar"
     - Personalizada: todos los estados

3. **Márgenes:**
   - `margen_comercial` debe estar entre 0 y 99
   - `porcentaje_margen_materiales + porcentaje_margen_instalacion` debe ser exactamente 100
   - La suma de `margen_asignado` de todos los items debe ser aproximadamente igual a `margen_materiales` (tolerancia ±0.01)

4. **Reservas:**
   - Solo se pueden reservar materiales de ofertas ya creadas
   - No se puede reservar si ya hay una reserva activa
   - Reservas temporales deben tener `dias_reserva` > 0
   - Al expirar una reserva temporal, liberar automáticamente los materiales


5. **Secciones Personalizadas:**
   - Si `tipo` es "materiales", debe tener `categorias_materiales` (array no vacío)
   - Si `tipo` es "extra", debe tener `tipo_extra` ("escritura" o "costo")
   - Si `tipo_extra` es "escritura", puede tener `contenido_escritura`
   - Si `tipo_extra` es "costo", debe tener `costos_extras` (puede estar vacío inicialmente)

6. **Pago:**
   - Si `moneda_pago` no es "USD", debe tener `tasa_cambio` > 0
   - Si `pago_transferencia` es true, `datos_cuenta` es recomendado (no obligatorio)
   - Si `aplica_contribucion` es true, `porcentaje_contribucion` debe ser > 0

### Validaciones de Datos

1. **Campos Requeridos:**
   - `tipo_oferta`, `almacen_id`, `items` (no vacío)
   - `margen_comercial`, `porcentaje_margen_materiales`, `porcentaje_margen_instalacion`
   - `precio_final`, `total_materiales`

2. **Tipos de Datos:**
   - Todos los precios y montos deben ser números positivos
   - Todas las cantidades deben ser enteros positivos
   - Porcentajes deben estar entre 0 y 100
   - URLs deben ser válidas (foto_portada)

3. **Longitudes:**
   - `descripcion`: máximo 500 caracteres
   - `datos_cuenta`: máximo 1000 caracteres
   - `contenido_escritura`: máximo 5000 caracteres
   - `notas`: máximo 500 caracteres

---

## Casos de Uso

### Caso 1: Crear Oferta Genérica Simple

**Flujo:**
1. Usuario selecciona almacén
2. Usuario agrega materiales de diferentes secciones
3. Usuario configura margen comercial (ej: 30%)
4. Usuario distribuye margen entre materiales (60%) e instalación (40%)
5. Sistema calcula automáticamente márgenes por item
6. Usuario crea la oferta
7. Sistema genera número de oferta y nombre automático

**Datos de Ejemplo:**
```json
{
  "tipo_oferta": "generica",
  "almacen_id": "ALM001",
  "estado": "en_revision",
  "items": [
    {
      "material_codigo": "INV001",
      "descripcion": "Inversor 5kW Growatt",
      "precio": 850.00,
      "cantidad": 1,
      "categoria": "INVERSOR",
      "seccion": "INVERSORES",
      "margen_asignado": 153.00
    },
    {
      "material_codigo": "BAT001",
      "descripcion": "Batería 5.12kWh Pylontech",
      "precio": 1200.00,
      "cantidad": 2,
      "categoria": "BATERIA",
      "seccion": "BATERIAS",
      "margen_asignado": 432.00
    }
  ],
  "servicios": [
    {
      "id": "SERVICIO_INSTALACION",
      "descripcion": "Servicio de instalación y montaje",
      "cantidad": 1,
      "costo": 315.00,
      "porcentaje_margen_origen": 40
    }
  ],
  "componentes_principales": {
    "inversor_seleccionado": "INV001",
    "bateria_seleccionada": "BAT001"
  },
  "margen_comercial": 30,
  "porcentaje_margen_materiales": 60,
  "porcentaje_margen_instalacion": 40,
  "margen_total": 900.00,
  "margen_materiales": 585.00,
  "margen_instalacion": 315.00,
  "costo_transportacion": 0,
  "total_materiales": 3250.00,
  "subtotal_con_margen": 4150.00,
  "total_elementos_personalizados": 0,
  "total_costos_extras": 0,
  "precio_final": 4150.00,
  "moneda_pago": "USD",
  "tasa_cambio": 0,
  "pago_transferencia": false,
  "datos_cuenta": "",
  "aplica_contribucion": false,
  "porcentaje_contribucion": 0
}
```


### Caso 2: Crear Oferta Personalizada con Cliente

**Flujo:**
1. Usuario selecciona tipo "Personalizada"
2. Usuario selecciona "Cliente" y busca un cliente existente
3. Usuario agrega materiales y configura márgenes
4. Usuario agrega costo de transportación
5. Usuario configura pago en EUR con tasa de cambio
6. Usuario activa contribución del 5%
7. Usuario sube foto de portada
8. Usuario crea la oferta
9. Usuario reserva materiales (temporal, 7 días)

**Datos de Ejemplo:**
```json
{
  "tipo_oferta": "personalizada",
  "cliente_numero": "CLI-2024-001",
  "almacen_id": "ALM001",
  "estado": "enviada_a_cliente",
  "foto_portada": "https://storage.example.com/ofertas/portada-123.jpg",
  "items": [...],
  "servicios": [...],
  "componentes_principales": {...},
  "margen_comercial": 25,
  "porcentaje_margen_materiales": 70,
  "porcentaje_margen_instalacion": 30,
  "costo_transportacion": 150.00,
  "moneda_pago": "EUR",
  "tasa_cambio": 1.08,
  "pago_transferencia": true,
  "datos_cuenta": "Banco: XYZ\nTitular: Empresa Solar\nCuenta: 1234567890\nIBAN: ES12...",
  "aplica_contribucion": true,
  "porcentaje_contribucion": 5,
  "precio_final": 4500.00
}
```

**Después de crear, reservar materiales:**
```json
POST /ofertas/confeccion/OF-2024-001/reservar-materiales
{
  "tipo_reserva": "temporal",
  "dias_reserva": 7,
  "notas": "Reserva para cliente CLI-2024-001, pendiente confirmación"
}
```

### Caso 3: Crear Oferta con Lead Sin Agregar

**Flujo:**
1. Usuario selecciona tipo "Personalizada"
2. Usuario selecciona "Nuevo" (lead sin agregar)
3. Usuario ingresa nombre del contacto: "Juan Pérez"
4. Usuario agrega materiales y configura oferta
5. Usuario crea la oferta

**Datos de Ejemplo:**
```json
{
  "tipo_oferta": "personalizada",
  "nombre_lead_sin_agregar": "Juan Pérez",
  "almacen_id": "ALM001",
  "estado": "en_revision",
  "items": [...],
  "precio_final": 3800.00
}
```

### Caso 4: Oferta con Secciones Personalizadas

**Flujo:**
1. Usuario crea oferta normal
2. Usuario agrega sección personalizada de tipo "materiales" para "Ampliación de Sistema"
3. Usuario agrega sección de tipo "extra" > "escritura" para "Notas de instalación"
4. Usuario agrega sección de tipo "extra" > "costo" para "Costos adicionales"
5. Usuario agrega costos extras: "Permiso municipal", "Certificación"

**Datos de Ejemplo:**
```json
{
  "secciones_personalizadas": [
    {
      "id": "AMPLIACION_SISTEMA",
      "label": "Ampliación de Sistema",
      "tipo": "materiales",
      "categorias_materiales": ["*"]
    },
    {
      "id": "CUSTOM_1234",
      "label": "Notas de Instalación",
      "tipo": "extra",
      "tipo_extra": "escritura",
      "contenido_escritura": "La instalación requiere acceso al techo. Se debe coordinar con el cliente..."
    },
    {
      "id": "CUSTOM_5678",
      "label": "Costos Administrativos",
      "tipo": "extra",
      "tipo_extra": "costo",
      "costos_extras": [
        {
          "id": "COSTO_001",
          "descripcion": "Permiso municipal",
          "cantidad": 1,
          "precio_unitario": 50.00
        },
        {
          "id": "COSTO_002",
          "descripcion": "Certificación eléctrica",
          "cantidad": 1,
          "precio_unitario": 100.00
        }
      ]
    }
  ],
  "total_costos_extras": 150.00
}
```


### Caso 5: Editar Oferta Existente

**Flujo:**
1. Usuario carga oferta existente
2. Sistema llena todos los campos con datos actuales
3. Usuario modifica materiales (agrega/quita/cambia cantidades)
4. Usuario ajusta márgenes
5. Usuario guarda cambios (PUT)
6. Sistema valida stock nuevamente
7. Sistema actualiza oferta

**Importante:**
- Al editar, enviar TODOS los datos de la oferta, no solo los cambios
- Si la oferta tiene materiales reservados, validar que los cambios no excedan el stock
- Actualizar `fecha_actualizacion` y `usuario_actualizacion`

---

## Reglas de Negocio Adicionales

### Generación de Número de Oferta
- Formato: `OF-{AÑO}-{SECUENCIAL}`
- Ejemplo: `OF-2024-001`, `OF-2024-002`, etc.
- El secuencial se reinicia cada año
- Debe ser único en el sistema

### Generación de Nombre Automático
El nombre se genera basándose en los componentes principales seleccionados:

**Formato:**
```
Oferta de {cantidad}x {potencia} {tipo} {marca} [y {cantidad}x {potencia} {tipo} {marca}]...
```

**Ejemplos:**
- `Oferta de 1x 5kW Inversor Growatt`
- `Oferta de 1x 5kW Inversor Growatt y 2x 5.12kWh Batería Pylontech`
- `Oferta de 1x 5kW Inversor Growatt, 2x 5.12kWh Batería Pylontech y 10x 550W Paneles JA Solar`

**Reglas:**
1. Usar `inversor_seleccionado`, `bateria_seleccionada`, `panel_seleccionado` de `componentes_principales`
2. Obtener marca desde `marca_id` del material (usar tabla de marcas)
3. Obtener potencia desde `potenciaKW` del material
4. Para paneles, convertir kW a W si es necesario (ej: 0.55 kW → 550W)
5. Si no hay componentes principales, usar: "Oferta sin componentes principales"

### Estados de Oferta

**Para Ofertas Genéricas:**
- `en_revision`: Oferta en proceso de revisión interna
- `aprobada_para_enviar`: Oferta aprobada, lista para usar

**Para Ofertas Personalizadas (todos los anteriores más):**
- `enviada_a_cliente`: Oferta enviada al cliente/lead
- `confirmada_por_cliente`: Cliente confirmó interés
- `reservada`: Materiales reservados para esta oferta

**Transiciones Permitidas:**
```
en_revision → aprobada_para_enviar
aprobada_para_enviar → enviada_a_cliente (solo personalizada)
enviada_a_cliente → confirmada_por_cliente
confirmada_por_cliente → reservada
```

### Gestión de Stock y Reservas

**Stock Disponible:**
```
stock_disponible = stock_total - stock_reservado - stock_vendido
```

**Al Reservar Materiales:**
1. Validar que `stock_disponible >= cantidad_solicitada`
2. Crear registros en `ReservaMaterial`
3. NO modificar `stock_total`, solo marcar como reservado
4. Actualizar `oferta.materiales_reservados = true`

**Al Liberar Reserva:**
1. Marcar registros de `ReservaMaterial` como cancelados
2. Materiales vuelven a estar disponibles
3. Actualizar `oferta.materiales_reservados = false`

**Reservas Temporales:**
- Crear tarea programada (cron job) que revise reservas expiradas cada hora
- Al expirar: liberar automáticamente y notificar
- Permitir extensión de reserva antes de expirar

**Reservas Definitivas:**
- No expiran automáticamente
- Solo se liberan manualmente o al completar la venta
- Usar cuando el cliente ha confirmado y pagado señal


---

## Consideraciones Técnicas

### Performance

1. **Cálculo de Márgenes:**
   - Endpoint `/margen-materiales` debe ser rápido (< 200ms)
   - Se llama cada vez que cambia el margen o los items
   - Considerar caché si los cálculos son complejos

2. **Validación de Stock:**
   - Optimizar consultas para validar stock de múltiples materiales
   - Usar transacciones para reservas (evitar race conditions)
   - Considerar índices en `almacen_id` y `material_codigo`

3. **Subida de Imágenes:**
   - Procesar de forma asíncrona si es posible
   - Optimizar/redimensionar imágenes automáticamente
   - Usar CDN para servir imágenes

### Seguridad

1. **Autenticación:**
   - Todos los endpoints requieren autenticación
   - Validar permisos según rol del usuario

2. **Validación de Datos:**
   - Sanitizar todos los inputs
   - Validar tipos de datos estrictamente
   - Prevenir inyección SQL/NoSQL

3. **Archivos:**
   - Validar tipo MIME real del archivo (no solo extensión)
   - Escanear archivos por malware
   - Limitar tamaño de archivos

### Auditoría

Registrar en logs:
- Creación de ofertas (quién, cuándo, datos principales)
- Modificaciones de ofertas (qué cambió)
- Reservas y liberaciones de materiales
- Cambios de estado

### Notificaciones

Considerar enviar notificaciones cuando:
- Se crea una oferta personalizada
- Se envía oferta a cliente
- Cliente confirma oferta
- Reserva temporal está por expirar (24h antes)
- Reserva temporal expiró

---

## Errores Comunes y Manejo

### Error: Stock Insuficiente
```json
{
  "success": false,
  "error": "STOCK_INSUFICIENTE",
  "message": "Stock insuficiente para Inversor 5kW Growatt: disponible 2, solicitado 3",
  "details": {
    "material_codigo": "INV001",
    "disponible": 2,
    "solicitado": 3
  }
}
```

### Error: Oferta No Encontrada
```json
{
  "success": false,
  "error": "OFERTA_NO_ENCONTRADA",
  "message": "La oferta OF-2024-001 no existe",
  "details": {
    "oferta_id": "OF-2024-001"
  }
}
```

### Error: Validación de Márgenes
```json
{
  "success": false,
  "error": "VALIDACION_MARGENES",
  "message": "La suma de porcentajes de margen debe ser 100%",
  "details": {
    "porcentaje_materiales": 60,
    "porcentaje_instalacion": 30,
    "suma": 90
  }
}
```

### Error: Reserva Ya Existe
```json
{
  "success": false,
  "error": "RESERVA_EXISTENTE",
  "message": "Esta oferta ya tiene materiales reservados",
  "details": {
    "oferta_id": "OF-2024-001",
    "tipo_reserva": "temporal",
    "fecha_expiracion": "2024-02-15T10:00:00Z"
  }
}
```

### Error: Archivo Inválido
```json
{
  "success": false,
  "error": "ARCHIVO_INVALIDO",
  "message": "El archivo debe ser una imagen JPG, PNG o WebP menor a 5MB",
  "details": {
    "tipo_recibido": "application/pdf",
    "tamano_recibido": 6291456,
    "tamano_maximo": 5242880
  }
}
```

---

## Testing

### Tests Unitarios Requeridos

1. **Cálculo de Márgenes:**
   - Distribución proporcional correcta
   - Suma de márgenes = margen total
   - Casos extremos (margen 0%, margen 99%)

2. **Validación de Stock:**
   - Stock suficiente
   - Stock insuficiente
   - Stock con reservas existentes

3. **Generación de Nombres:**
   - Con todos los componentes
   - Con algunos componentes
   - Sin componentes

4. **Validaciones de Negocio:**
   - Tipo de oferta vs contacto
   - Suma de porcentajes de margen
   - Estados válidos según tipo

### Tests de Integración

1. **Flujo Completo:**
   - Crear oferta → Reservar → Liberar
   - Crear oferta → Editar → Actualizar

2. **Concurrencia:**
   - Múltiples usuarios reservando mismo material
   - Edición simultánea de oferta

3. **Expiración de Reservas:**
   - Reserva temporal expira correctamente
   - Stock se libera automáticamente

---

## Migración y Datos Iniciales

### Scripts de Migración

1. **Crear Tablas:**
   - `ofertas`
   - `oferta_items`
   - `oferta_servicios`
   - `secciones_personalizadas`
   - `costos_extras`
   - `elementos_personalizados`
   - `componentes_principales`
   - `reservas_materiales`

2. **Índices:**
   - `ofertas.numero_oferta` (único)
   - `ofertas.almacen_id`
   - `ofertas.cliente_numero`
   - `ofertas.lead_id`
   - `ofertas.estado`
   - `oferta_items.oferta_id`
   - `reservas_materiales.oferta_id`
   - `reservas_materiales.almacen_id`
   - `reservas_materiales.material_codigo`
   - `reservas_materiales.estado`

3. **Datos Iniciales:**
   - Estados predefinidos
   - Configuración de secuencial de números de oferta

---

## Próximos Pasos

1. **Implementar endpoints básicos:**
   - POST `/ofertas/confeccion/` (crear)
   - GET `/ofertas/confeccion/{id}` (obtener)
   - PUT `/ofertas/confeccion/{id}` (actualizar)

2. **Implementar cálculo de márgenes:**
   - POST `/ofertas/confeccion/margen-materiales`

3. **Implementar subida de fotos:**
   - POST `/ofertas/confeccion/upload-foto-portada`

4. **Implementar reservas:**
   - POST `/ofertas/confeccion/{id}/reservar-materiales`
   - POST `/ofertas/confeccion/{id}/liberar-materiales`

5. **Implementar tarea programada:**
   - Cron job para expirar reservas temporales

6. **Testing:**
   - Tests unitarios
   - Tests de integración
   - Tests de carga

---

## Contacto y Soporte

Para dudas o aclaraciones sobre esta especificación, contactar al equipo de frontend o revisar la documentación complementaria en `FRONTEND_CONFECCION_OFERTAS.md`.
